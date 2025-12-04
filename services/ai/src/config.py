# (Cấu hình chung: URL, Constant)
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Load từ file .env hoặc lấy giá trị mặc định
    PRODUCT_SERVICE_URL: str = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3000/api/products")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    
    EMBEDDING_MODEL_ID: str = os.getenv("EMBEDDING_MODEL_ID", "google/siglip-so400m-patch14-384")
    LLM_MODEL_ID: str = os.getenv("LLM_MODEL_ID", "qwen3-vl:4b")
    
    # SigLIP so400m luôn có vector size là 1152
    VECTOR_SIZE: int = 1152
    COLLECTION_NAME: str = "paintings_siglip"
    
    # Ép chạy CPU cho thư viện Torch (Vì cấu hình AMD trên Windows phức tạp)
    DEVICE: str = "cpu"

settings = Settings()