from qdrant_client import QdrantClient
from .config import settings
from .core import ai_models

client = QdrantClient(url=settings.QDRANT_URL)

# --- 1. TÌM TRANH (Bằng ảnh phòng) ---
def search_paintings_by_image(image_bytes, limit=3):
    vector = ai_models.get_image_embedding(image_bytes)
    if not vector: return []
    
    try:
        results = client.query_points(
            collection_name=settings.PAINTINGS_COLLECTION,
            query=vector,  # Lưu ý: tham số là 'query' chứ không phải 'query_vector'
            limit=limit
        )
        # Kết quả trả về nằm trong thuộc tính .points
        return [point.payload for point in results.points]
        
    except Exception as e:
        print(f"⚠️ Lỗi tìm tranh: {e}")
        return []

# --- 2. TÌM KIẾN THỨC (Bằng câu hỏi) - RAG CHUẨN ---
def search_knowledge(query_text, limit=3):
    if not query_text: return ""
    
    # Bước 1: Retrieval (Tìm thô bằng VietnamEmbedding)
    vector = ai_models.get_text_embedding(query_text)
    if not vector: return ""
    
    try:
        results = client.query_points(
            collection_name=settings.DOCS_COLLECTION,
            query=vector,
            limit=10 # Lấy dư ra 10 đoạn để Reranker chọn
        )
        
        # Trích xuất nội dung từ kết quả thô
        rough_docs = [point.payload['content'] for point in results.points]
        
        # Bước 2: Reranking (Lọc tinh bằng PhoRanker)
        final_docs = ai_models.rerank_docs(query_text, rough_docs, top_k=limit)
        
        return "\n\n".join(final_docs)
        
    except Exception as e:
        print(f"⚠️ Lỗi tìm kiến thức: {e}")
        return ""