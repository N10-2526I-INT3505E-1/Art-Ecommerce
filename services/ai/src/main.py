# (API Server - FastAPI)

from fastapi import FastAPI, UploadFile, File, HTTPException
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from .config import settings
from .core import get_image_embedding
from .llm import generate_consultation

app = FastAPI(title="Art AI Service")

# Kết nối Qdrant
client = QdrantClient(url=settings.QDRANT_URL)

@app.get("/")
def health():
    return {"status": "AI Service is Ready!"}

# @app.post("/analyze")
# async def analyze_room(file: UploadFile = File(...)):
#     try:
#         # 1. Đọc ảnh upload
#         image_bytes = await file.read()
        
#         # 2. Vector hóa ảnh phòng (Retrieval)
#         # SigLIP sẽ biến "phòng màu trắng, sofa da" thành Vector
#         room_vector = get_image_embedding(image_bytes)
        
#         if not room_vector:
#             raise HTTPException(status_code=400, detail="Không xử lý được ảnh")

#         # 3. Tìm kiếm trong Qdrant
#         # "Tìm 4 tranh có vector gần giống vector phòng nhất"
#         points, _ = client.query_points(
#             collection_name=settings.COLLECTION_NAME,
#             query=room_vector,
#             limit=4
#         )
        
#         candidates = [p.payload for p in points]
        
#         if not candidates:
#             return {"analysis": "Không tìm thấy tranh phù hợp.", "products": []}

#         # 4. Tạo lời tư vấn (Generation)
#         advice = generate_consultation(image_bytes, candidates)

#         # 5. Trả kết quả JSON
#         return {
#             "analysis": advice,
#             "products": candidates
#         }

#     except Exception as e:
#         print(f"Server Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_room(file: UploadFile = File(...)):
    try:
        # 1. Đọc ảnh upload
        image_bytes = await file.read()

        # 2. Vector hóa ảnh
        room_vector = get_image_embedding(image_bytes)

        if not room_vector:
            raise HTTPException(status_code=400, detail="Không xử lý được ảnh")

        # 3. Query Qdrant (API mới, trả về 1 object)
        result = client.query_points(
            collection_name=settings.COLLECTION_NAME,
            query=room_vector,
            limit=4
        )

        points = result.points
        candidates = [p.payload for p in points]

        if not candidates:
            return {"analysis": "Không tìm thấy tranh phù hợp.", "products": []}

        # 4. LLM tư vấn
        advice = generate_consultation(image_bytes, candidates)

        return {
            "analysis": advice,
            "products": candidates
        }

    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Chạy server: uvicorn src.main:app --reload --port 8000