import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Backend (để lấy danh sách sản phẩm)
    PRODUCT_SERVICE_URL: str = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3000/products")
    
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    
    # --- 1. MODEL TÌM TRANH (Vision) ---
    VISION_MODEL_ID: str = "google/siglip-so400m-patch14-384"
    VISION_VECTOR_SIZE: int = 1152
    PAINTINGS_COLLECTION: str = "paintings_siglip"
    
    # --- 2. MODEL TÌM TÀI LIỆU (Text Retrieval) ---
    TEXT_MODEL_ID: str = "bkai-foundation-models/vietnamese-bi-encoder"
    TEXT_VECTOR_SIZE: int = 768
    DOCS_COLLECTION: str = "feng_shui_docs"
    
    # --- 3. MODEL CHẤM ĐIỂM (Reranker) ---
    RERANKER_MODEL_ID: str = "itdainb/PhoRanker"
    
    # --- 4. MODEL TƯ VẤN (LLM) ---
    LLM_MODEL_ID: str = "qwen2.5:7b"
    
    DEVICE: str = "cuda"

settings = Settings()