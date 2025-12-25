from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import base64
import json
import httpx

from .rag_service import search_paintings_by_image, search_knowledge
from .llm import chat_stream

async def fetch_image_from_url(url: str) -> Optional[bytes]:
    """
    Download image from URL and return as bytes.
    Returns None if download fails.
    """
    if not url:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    print(f"✅ Downloaded image from {url[:50]}... ({len(response.content)} bytes)")
                    return response.content
                else:
                    print(f"⚠️ URL is not an image: {content_type}")
                    return None
            else:
                print(f"⚠️ Failed to download image: HTTP {response.status_code}")
                return None
    except Exception as e:
        print(f"⚠️ Error downloading image: {e}")
        return None

class FengShuiProfile(BaseModel):
    dung_than: List[str] = []      # Favorable elements (Dụng Thần)
    hy_than: List[str] = []        # Helpful elements (Hỷ Thần)
    ky_than: List[str] = []        # Unfavorable elements (Kỵ Thần)
    hung_than: List[str] = []      # Harmful elements (Hung Thần)
    day_master_element: Optional[str] = None
    day_master_status: Optional[str] = None  # Vượng/Nhược

app = FastAPI(title="Art AI Service")

# ✅ CORS Middleware (cho phép frontend gọi API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CurrentProduct(BaseModel):
    id: str
    name: str
    price: float
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    categoryName: Optional[str] = None
    tags: Optional[List[str]] = []

class ChatRequest(BaseModel):
    text: str
    feng_shui_profile: Optional[FengShuiProfile] = None
    current_product: Optional[CurrentProduct] = None

# ==========================================
# 1. API TEST UPLOAD ẢNH (Visual Search)
# ==========================================
@app.post("/analyze")
async def analyze_room(
    file: UploadFile = File(...),
    feng_shui_profile: Optional[str] = Form(None)
):
    """
    Endpoint này dùng để Test tính năng Upload ảnh & Tìm tranh.
    - Input: File ảnh (Multipart/Form-data), optional feng_shui_profile JSON
    - Output: JSON chứa lời tư vấn và danh sách tranh tìm được.
    """
    try:
        # 1. Đọc ảnh
        image_bytes = await file.read()
        
        # 2. Parse feng shui profile if provided
        feng_shui_data = None
        if feng_shui_profile:
            try:
                feng_shui_data = json.loads(feng_shui_profile)
                print(f"📊 Received Feng Shui profile: Dụng Thần={feng_shui_data.get('dung_than', [])}, Kỵ Thần={feng_shui_data.get('ky_than', [])}")
            except json.JSONDecodeError:
                print("⚠️ Failed to parse feng_shui_profile JSON")

        # 3. Tìm tranh trong Qdrant (Visual Search)
        # Logic này nằm trong rag_service.py
        products_found = search_paintings_by_image(image_bytes, limit=8)  # Get more products for filtering

        if not products_found:
            return {
                "message": "Không tìm thấy tranh phù hợp.",
                "analysis": "AI không tìm thấy tranh nào tương đồng trong kho.",
                "products": []
            }

        # 4. Gọi LLM tư vấn (Non-stream)
        # Chúng ta dùng lại hàm chat_stream nhưng gom lại thành 1 chuỗi
        print("🤖 AI đang phân tích ảnh...")
        
        prompt_trigger = "Hãy phân tích căn phòng trong ảnh và gợi ý tranh phù hợp từ danh sách."
        
        generator = chat_stream(
            user_text=prompt_trigger,
            user_image_bytes=image_bytes,
            products_context=products_found,
            feng_shui_profile=feng_shui_data
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
    - Input: JSON { "text": "Mệnh kim hợp màu gì?", "feng_shui_profile": {...}, "current_product": {...} }
    - Output: JSON câu trả lời.
    """
    try:
        user_text = request.text
        feng_shui_data = request.feng_shui_profile.model_dump() if request.feng_shui_profile else None
        
        # Extract current product data
        current_product_data = None
        product_image_bytes = None
        
        if request.current_product:
            current_product_data = request.current_product.model_dump()
            print(f"🛍️ Sản phẩm đang xem: {current_product_data.get('name')}")
            
            # Fetch product image if available
            image_url = current_product_data.get('imageUrl')
            if image_url:
                print(f"🖼️ Đang tải ảnh sản phẩm từ: {image_url[:50]}...")
                product_image_bytes = await fetch_image_from_url(image_url)
                if product_image_bytes:
                    print(f"✅ Đã tải ảnh sản phẩm ({len(product_image_bytes)} bytes)")
                else:
                    print(f"⚠️ Không thể tải ảnh sản phẩm")
        
        if feng_shui_data:
            print(f"📊 Hồ sơ bát tự: Dụng Thần={feng_shui_data.get('dung_than', [])}")
        
        # 1. Tìm kiến thức phong thủy (Text RAG)
        # Logic nằm trong rag_service.py (VietnamEmbedding + PhoRanker)
        knowledge_found = search_knowledge(user_text)
        
        # 2. Gọi LLM trả lời (Non-stream)
        print(f"🤖 AI đang suy nghĩ câu hỏi: {user_text}")
        
        generator = chat_stream(
            user_text=user_text,
            knowledge_context=knowledge_found,
            feng_shui_profile=feng_shui_data,
            current_product=current_product_data,
            product_image_bytes=product_image_bytes
        )
        
        full_response = ""
        for chunk in generator:
            full_response += chunk
            
        return {
            "question": user_text,
            "context_found": bool(knowledge_found),
            "has_feng_shui_profile": feng_shui_data is not None,
            "has_current_product": current_product_data is not None,
            "has_product_image": product_image_bytes is not None,
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
            feng_shui_data = data.get("feng_shui_profile")

            if user_image_bytes:
                products_found = search_paintings_by_image(user_image_bytes, limit=8)
            
            if user_text:
                knowledge_found = search_knowledge(user_text)
            
            if products_found:
                await websocket.send_json({
                    "type": "products",
                    "data": products_found
                })

            # --- PHASE 2: TRẢ LỜI STREAM ---
            generator = chat_stream(
                user_text,
                user_image_bytes,
                products_found,
                knowledge_found,
                feng_shui_profile=feng_shui_data
            )
            
            for token in generator:
                await websocket.send_text(token)
                
    except WebSocketDisconnect:
        print("👋 Client Disconnected")
    except Exception as e:
        print(f"❌ Error: {e}")
        await websocket.close()