import requests
import uuid
import json
from qdrant_client import QdrantClient
from qdrant_client.http import models
from .config import settings
from .core import get_image_embedding

# Kết nối Qdrant
client = QdrantClient(url=settings.QDRANT_URL)

def run_indexing():
    print(f"🔄 Bắt đầu Indexing vào Collection: {settings.COLLECTION_NAME}")

    # 1. Tạo lại Collection (Reset)
    client.recreate_collection(
        collection_name=settings.COLLECTION_NAME,
        vectors_config=models.VectorParams(size=settings.VECTOR_SIZE, distance=models.Distance.COSINE),
    )
    print("🗑️  Đã reset bộ nhớ AI.")

    # 2. Lấy dữ liệu từ Backend
    print(f"📥 Đang tải dữ liệu từ {settings.PRODUCT_SERVICE_URL}...")
    try:
        # Lấy limit lớn để index hết (ví dụ 1000 sản phẩm)
        resp = requests.get(settings.PRODUCT_SERVICE_URL, params={"limit": 1000})
        if resp.status_code != 200:
            print(f"❌ Lỗi API Backend: {resp.text}")
            return
            
        resp_json = resp.json()
        
        # --- SỬA LỖI: Lấy đúng mảng data từ API ---
        if isinstance(resp_json, list):
            products = resp_json
        elif "data" in resp_json:
            products = resp_json["data"]
        else:
            print("❌ Format dữ liệu API không đúng.")
            return
            
    except Exception as e:
        print(f"❌ Lỗi kết nối Product Service: {e}")
        return

    print(f"📦 Tìm thấy {len(products)} sản phẩm. Bắt đầu học...")
    
    # 3. Duyệt và Vector hóa
    points = []
    
    skipped_count = 0
    
    for p in products:
        try:
            # Bỏ qua nếu không có ảnh
            if not p.get('imageUrl'): 
                print(f"   ⚠️ BỎ QUA (Không có link ảnh): {p['name']}")
                skipped_count += 1
                continue
            
            print(f"   + Embed: {p['name']}")
            
            # Tạo Vector từ URL ảnh
            vector = get_image_embedding(p['imageUrl'])

            if vector is None:
                # In ra để biết tại sao lỗi
                print(f"   ⚠️ BỎ QUA (Lỗi tải/xử lý ảnh): {p['name']} - URL: {p['imageUrl']}")
                skipped_count += 1
                continue
            
            if vector:
                # Tạo ID chuẩn UUID cho Qdrant
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(p['id'])))
                
                # --- SỬA LỖI: Xử lý Tags an toàn ---
                tags_list = []
                
                if 'tags' in p and p['tags']:
                    tags_list = p['tags']

                elif 'productTags' in p and p['productTags']:
                    for pt in p['productTags'] : 
                        if 'tag' in pt and pt['tag'] and 'name' in pt['tag'] : 
                            if pt['tag']['name'] and pt['tag']['name'] not in tags_list : 
                                tags_list.append(pt['tag']['name'])

                # Metadata: Lưu lại thông tin
                payload = {
                    "original_id": p['id'],
                    "name": p['name'],
                    "price": p['price'],
                    "imageUrl": p['imageUrl'],
                    "category": p.get('category', {}).get('name', '') if p.get('category') else "",
                    "tags": tags_list
                }
                
                points.append(models.PointStruct(id=point_id, vector=vector, payload=payload))
        except Exception as e:
            print(f"   ⚠️ Lỗi sản phẩm {p.get('name')}: {e}")

    # 4. Upload lên Qdrant
    if points:
        client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
        print(f"✅ HOÀN TẤT! Đã nạp {len(points)} kiến thức vào não AI.")
        print(f"🚫 Bị bỏ qua: {skipped_count}")
    else:
        print("⚠️ Không có dữ liệu nào được lưu.")

if __name__ == "__main__":
    run_indexing()