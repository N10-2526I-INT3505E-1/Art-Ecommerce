# (AI Engine - Load Model SigLIP)
from transformers import AutoProcessor, AutoModel
from PIL import Image
import torch
import requests
import io
from .config import settings

print(f"⏳ Đang tải Model {settings.EMBEDDING_MODEL_ID} trên {settings.DEVICE}...")
try:
    # Tải Processor (để xử lý ảnh) và Model (để tính toán)
    processor = AutoProcessor.from_pretrained(settings.EMBEDDING_MODEL_ID)
    model = AutoModel.from_pretrained(settings.EMBEDDING_MODEL_ID).to(settings.DEVICE)
    print("✅ SigLIP Core đã sẵn sàng!")
except Exception as e:
    print(f"❌ Lỗi tải Model: {e}")
    print("👉 Gợi ý: Kiểm tra mạng hoặc tên model.")
    exit(1)

def get_image_embedding(image_source):
    """
    Input: 
      - str (URL): Tải ảnh từ mạng
      - bytes: Ảnh upload từ frontend
      - Image: Đối tượng PIL
    Output: List[float] (Vector 1152 chiều)
    """
    try:
        image = None
        # 1. Chuẩn hóa đầu vào thành ảnh PIL
        if isinstance(image_source, str) and image_source.startswith("http"):
            response = requests.get(image_source, stream=True, timeout=10)
            if response.status_code == 200:
                image = Image.open(response.raw).convert("RGB")
        elif isinstance(image_source, bytes):
            image = Image.open(io.BytesIO(image_source)).convert("RGB")
        elif isinstance(image_source, Image.Image):
            image = image_source.convert("RGB")
            
        if not image: return None

        # 2. Tiền xử lý ảnh (Resize, Normalize theo chuẩn model)
        inputs = processor(images=image, return_tensors="pt").to(settings.DEVICE)
        
        # 3. Chạy qua model để lấy Vector
        with torch.no_grad():
            outputs = model.get_image_features(**inputs)
            
        # 4. Chuẩn hóa Vector (L2 Norm) để dùng Cosine Similarity
        outputs = outputs / outputs.norm(p=2, dim=-1, keepdim=True)
        
        # Trả về list số thực (float) để lưu vào Qdrant
        return outputs[0].cpu().tolist()

    except Exception as e:
        print(f"⚠️ Lỗi Embed ảnh: {e}")
        return None