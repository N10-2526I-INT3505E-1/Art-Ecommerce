from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
import json

from .rag_service import search_paintings_by_image, search_knowledge
from .llm import chat_stream

app = FastAPI(title="Art AI Service")

# ✅ CORS Middleware (cho phép frontend gọi API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    text: str

# ==========================================
# 1. API TEST UPLOAD ẢNH (Visual Search)
# ==========================================
@app.post("/analyze")
async def analyze_room(file: UploadFile = File(...)):
    """
    Endpoint này dùng để Test tính năng Upload ảnh & Tìm tranh.
    - Input: File ảnh (Multipart/Form-data)
    - Output: JSON chứa lời tư vấn và danh sách tranh tìm được.
    """
    try:
        # 1. Đọc ảnh
        image_bytes = await file.read()

        # 2. Tìm tranh trong Qdrant (Visual Search)
        # Logic này nằm trong rag_service.py
        products_found = search_paintings_by_image(image_bytes, limit=4)

        if not products_found:
            return {
                "message": "Không tìm thấy tranh phù hợp.",
                "analysis": "AI không tìm thấy tranh nào tương đồng trong kho.",
                "products": []
            }

        # 3. Gọi LLM tư vấn (Non-stream)
        # Chúng ta dùng lại hàm chat_stream nhưng gom lại thành 1 chuỗi
        print("🤖 AI đang phân tích ảnh...")
        
        prompt_trigger = "Hãy phân tích căn phòng trong ảnh và gợi ý tranh phù hợp từ danh sách."
        
        generator = chat_stream(
            user_text=prompt_trigger, 
            user_image_bytes=image_bytes, 
            products_context=products_found
        )
        
        full_advice = ""
        chunk_count = 0
        for chunk in generator:
            chunk_count += 1
            full_advice += chunk
            if chunk_count % 100 == 0:  # Log mỗi 100 chunks
                print(f"📝 Accumulated {chunk_count} chunks, length: {len(full_advice)}")
        
        print(f"✅ Final analysis length: {len(full_advice)} chars from {chunk_count} chunks")

        return {
            "products": products_found,
            "analysis": full_advice
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 2. API TEST CHAT TEXT (Text RAG)
# ==========================================
@app.post("/api/chat")
async def chat_http(request: ChatRequest):
    """
    Endpoint này dùng để Test tính năng Hỏi đáp phong thủy (RAG).
    - Input: JSON { "text": "Mệnh kim hợp màu gì?" }
    - Output: JSON câu trả lời.
    """
    try:
        user_text = request.text
        
        # 1. Tìm kiến thức phong thủy (Text RAG)
        # Logic nằm trong rag_service.py (VietnamEmbedding + PhoRanker)
        knowledge_found = search_knowledge(user_text)
        
        # 2. Gọi LLM trả lời (Non-stream)
        print(f"🤖 AI đang suy nghĩ câu hỏi: {user_text}")
        
        generator = chat_stream(
            user_text=user_text,
            knowledge_context=knowledge_found
        )
        
        full_response = ""
        for chunk in generator:
            full_response += chunk
            
        return {
            "question": user_text,
            "context_found": bool(knowledge_found), # True nếu tìm thấy tài liệu
            "answer": full_response
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 3. WEBSOCKET (Chat Real-time - Giữ nguyên)
# ==========================================
@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🔌 Client Connected via WebSocket")
    
    try:
        while True:
            # Nhận JSON: { "text": "...", "image": "base64..." }
            data = await websocket.receive_json()
            
            user_text = data.get("text", "")
            image_b64 = data.get("image")
            
            # Decode ảnh Base64
            user_image_bytes = None
            if image_b64:
                if "," in image_b64: image_b64 = image_b64.split(",")[1]
                user_image_bytes = base64.b64decode(image_b64)

            # --- PHASE 1: TÌM KIẾM DỮ LIỆU ---
            products_found = []
            knowledge_found = ""

            if user_image_bytes:
                products_found = search_paintings_by_image(user_image_bytes)
            
            if user_text:
                knowledge_found = search_knowledge(user_text)
            
            if products_found:
                await websocket.send_json({
                    "type": "products", 
                    "data": products_found
                })

            # --- PHASE 2: TRẢ LỜI STREAM ---
            generator = chat_stream(user_text, user_image_bytes, products_found, knowledge_found)
            
            for token in generator:
                await websocket.send_text(token)
                
    except WebSocketDisconnect:
        print("👋 Client Disconnected")
    except Exception as e:
        print(f"❌ Error: {e}")
        await websocket.close()