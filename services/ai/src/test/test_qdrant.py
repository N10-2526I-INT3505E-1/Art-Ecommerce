from qdrant_client import QdrantClient 
from src.config import settings 

client = QdrantClient(url=settings.QDRANT_URL)

try : 
    res = client.scroll(
        collection_name=settings.COLLECTION_NAME,
        limit=1,
        with_payload=True,
        with_vectors=False
    )

    points = res[0]

    if not points :
        print("❌ Qdrant TRỐNG RỖNG! Chưa có dữ liệu nào.")
    else :
        p = points[0]
        print("✅ TEST THÀNH CÔNG! Đã tìm thấy dữ liệu trong Qdrant:")
        print("-" * 30)
        print(f"🆔 ID Vector: {p.id}")
        print(f"🖼️ Tên tranh: {p.payload.get('name')}")
        print(f"💰 Giá tiền:  {p.payload.get('price')}")
        print(f"🏷️ Tags:      {p.payload.get('tags')}")
        print("-" * 30)
        print("Hệ thống đã sẵn sàng để chạy AI!")

except Exception as e :
    print(f"❌ Lỗi kết nối Qdrant: {e}")