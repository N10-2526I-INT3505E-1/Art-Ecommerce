import ollama
from .config import settings

def generate_consultation(room_image_bytes, candidates):
    """
    Hàm gọi Ollama để sinh lời tư vấn.
    Đã tối ưu cho model nhỏ (4B) bằng cách đơn giản hóa dữ liệu đầu vào.
    """
    try:
        print(f"⚡ Bắt đầu gọi AI ({settings.LLM_MODEL_ID}) để tư vấn...")

        # 1. CHUẨN BỊ DỮ LIỆU (Đơn giản hóa)
        # Thay vì gửi JSON, ta gửi text danh sách dễ đọc
        candidates_text = ""
        for i, p in enumerate(candidates, 1):
            # Lấy tối đa 5 tags quan trọng nhất
            tags = p.get('tags', [])[:5] 
            tags_str = ", ".join(tags)
            price_str = f"{p.get('price', 0):,} VNĐ"
            
            candidates_text += f"{i}. Tranh: {p.get('name')}\n   - Giá: {price_str}\n   - Đặc điểm: {tags_str}\n\n"

        # 2. VIẾT PROMPT (Ngắn gọn, trực diện)
        prompt = f"""
        Bạn là chuyên gia nội thất. Hãy nhìn ảnh phòng khách này và danh sách tranh có sẵn bên dưới:

        {candidates_text}

        NHIỆM VỤ:
        1. Nhận xét ngắn gọn màu sắc chủ đạo của phòng.
        2. Chọn ra 1 bức tranh hợp nhất trong danh sách trên.
        3. Giải thích tại sao chọn (dựa trên màu sắc và phong thủy).

        Trả lời ngắn gọn bằng tiếng Việt.
        """

        # 3. GỌI OLLAMA
        response = ollama.chat(
            model=settings.LLM_MODEL_ID,
            messages=[{
                'role': 'user',
                'content': prompt,
                'images': [room_image_bytes] # Gửi ảnh trực tiếp
            }],
            options={
                "temperature": 0.6, # Độ sáng tạo vừa phải
                "num_ctx": 4096     # Tăng bộ nhớ đệm để đọc hết danh sách tranh
            }
        )
        
        # 4. LOG DEBUG (Để bạn xem nó trả về cái gì trong terminal)
        print("🔍 Raw Response:", response)
        
        content = response['message']['content']
        
        if not content:
            print("⚠️ Cảnh báo: Ollama trả về rỗng!")
            return "AI đã quan sát được ảnh nhưng chưa đưa ra lời khuyên cụ thể. Dưới đây là các bức tranh phù hợp nhất về mặt thị giác:"

        return content

    except Exception as e:
        print(f"❌ Lỗi trong llm.py: {e}")
        return "Hệ thống AI đang bận. Dưới đây là các gợi ý tốt nhất từ kho dữ liệu:"