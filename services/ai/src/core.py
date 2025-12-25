# core.py
# (AI Engine - Load Model SigLIP)
from transformers import AutoProcessor, AutoModel
from sentence_transformers import SentenceTransformer, CrossEncoder
from PIL import Image
import torch
import requests
import io
from .config import settings

class AIModels:

    # print(f"⏳ Đang tải Model {settings.EMBEDDING_MODEL_ID} trên {settings.DEVICE}...")
    # try:
    #     # Tải Processor (để xử lý ảnh) và Model (để tính toán)
    #     processor = AutoProcessor.from_pretrained(settings.EMBEDDING_MODEL_ID)
    #     model = AutoModel.from_pretrained(settings.EMBEDDING_MODEL_ID).to(settings.DEVICE)
    #     print("✅ SigLIP Core đã sẵn sàng!")
    # except Exception as e:
    #     print(f"❌ Lỗi tải Model: {e}")
    #     print("👉 Gợi ý: Kiểm tra mạng hoặc tên model.")
    #     exit(1)

    def __init__(self):
        print("🚀 Đang khởi động hệ thống AI (Loading Models)...")
        
        # 1. Load SigLIP (Cho ảnh)
        print(f"   🔹 Loading Vision: {settings.VISION_MODEL_ID}...")
        self.vision_processor = AutoProcessor.from_pretrained(settings.VISION_MODEL_ID)
        self.vision_model = AutoModel.from_pretrained(settings.VISION_MODEL_ID).to(settings.DEVICE)
        
        # 2. Load VietnamEmbedding (Cho tìm kiếm text thô)
        print(f"   🔹 Loading Text Embed: {settings.TEXT_MODEL_ID}...")
        self.text_model = SentenceTransformer(settings.TEXT_MODEL_ID, device=settings.DEVICE)
        
        # 3. Load Reranker (Cho chấm điểm tinh)
        print(f"   🔹 Loading Reranker: {settings.RERANKER_MODEL_ID}...")
        self.reranker = CrossEncoder(settings.RERANKER_MODEL_ID, device=settings.DEVICE)
        
        print("✅ AI Core Sẵn Sàng!")

    def get_image_embedding(self, image_source):
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
            inputs = self.vision_processor(images=image, return_tensors="pt").to(settings.DEVICE)
            
            # 3. Chạy qua model để lấy Vector
            with torch.no_grad():
                outputs = self.vision_model.get_image_features(**inputs)
                
            # 4. Chuẩn hóa Vector (L2 Norm) để dùng Cosine Similarity
            outputs = outputs / outputs.norm(p=2, dim=-1, keepdim=True)
            
            # Trả về list số thực (float) để lưu vào Qdrant
            return outputs[0].cpu().tolist()

        except Exception as e:
            print(f"⚠️ Lỗi Embed ảnh: {e}")
            return None
        
    def get_text_embedding(self, text):
        """VietnamEmbedding: Text -> Vector"""
        try:
            return self.text_model.encode(text).tolist()
        except Exception as e:
            print(f"❌ Lỗi Text Embed: {e}")
            return None
        
    def rerank_docs(self, query: str, docs: list[str], top_k=3):
        """PhoRanker: Chấm điểm lại độ liên quan"""
        if not docs: return []
        try:
            pairs = [[query, doc] for doc in docs]
            scores = self.reranker.predict(pairs)
            
            # Sắp xếp điểm cao lên đầu
            results = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
            return [doc for doc, score in results[:top_k]]
        except Exception as e:
            print(f"❌ Lỗi Rerank: {e}")
            return docs[:top_k]
ai_models = AIModels()