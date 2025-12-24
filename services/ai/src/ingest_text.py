import os
import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from .config import settings
from .core import ai_models

client = QdrantClient(url=settings.QDRANT_URL)

def ingest():
    print("📚 Đang nạp kiến thức phong thủy (Dùng VietnamEmbedding)...")
    
    client.recreate_collection(
        collection_name=settings.DOCS_COLLECTION,
        vectors_config=models.VectorParams(size=settings.TEXT_VECTOR_SIZE, distance=models.Distance.COSINE),
    )
    
    path = "./knowledge/phongthuy.txt"
    if not os.path.exists(path):
        print(f"❌ Thiếu file {path}")
        return

    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    
    chunks = text.split("\n\n===")
    points = []
    
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk: continue
        
        vector = ai_models.get_text_embedding(chunk)
        
        points.append(models.PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk)),
            vector=vector,
            payload={"content": chunk}
        ))
            
    client.upsert(collection_name=settings.DOCS_COLLECTION, points=points)
    print(f"✅ Đã nạp {len(points)} kiến thức thành công!")

if __name__ == "__main__":
    ingest()