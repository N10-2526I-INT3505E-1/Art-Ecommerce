import ollama
from .config import settings

def chat_stream(user_text, user_image_bytes=None, products_context=[], knowledge_context=""):
    
    # Format danh sách tranh tìm được
    products_str = ""
    
    if isinstance(products_context, list) and len(products_context) > 0:
        products_str = "DANH SÁCH TRANH GỢI Ý TỪ KHO:\n"
        
        # 👇 SỬA LỖI Ở ĐÂY: Duyệt qua 'products_context' chứ không phải 'products_str'
        for i, p in enumerate(products_context, 1):
            # Kiểm tra an toàn: p phải là dict
            if isinstance(p, dict):
                tags = p.get('tags', [])
                # Xử lý tags nếu nó là list
                if isinstance(tags, list):
                    tags = tags[:5] # Lấy tối đa 5 tags
                tags_str = ", ".join(str(t) for t in tags)
                
                price = p.get('price', 0)
                price_str = f"{price:,} VNĐ" if isinstance(price, (int, float)) else str(price)
                
                name = p.get('name', 'Tranh không tên')
                
                products_str += f"{i}. Tranh: {name}\n   - Giá: {price_str}\n   - Đặc điểm: {tags_str}\n\n"

    prompt = f"""
VAI TRÒ:
Bạn là **chuyên gia tư vấn tranh treo và đồ decor phong thủy hiện đại**, thân thiện và chuyên nghiệp.
Mục tiêu của bạn là giúp khách **chọn tranh/đồ vật phù hợp mệnh gia chủ**, đảm bảo thẩm mỹ và sự an tâm,
KHÔNG mê tín, KHÔNG dọa nạt, KHÔNG phán số mệnh.

**QUAN TRỌNG: BẠN PHẢI TRẢ LỜI BẰNG TIẾNG VIỆT 100%. KHÔNG ĐƯỢC DÙNG TIẾNG ANH.**

========================
NGUYÊN TẮC BẮT BUỘC
========================
- Chỉ tư vấn dựa trên:
(1) [KIẾN THỨC CHUYÊN GIA]
(2) [SẢN PHẨM CÓ SẴN]
- **Không tự suy đoán** mệnh, hướng nhà, tuổi nếu khách chưa cung cấp.
- Nếu thiếu thông tin quan trọng → hỏi thêm **tối đa 2 câu ngắn**.
- Ưu tiên **gợi ý SẢN PHẨM CÓ SẴN** khi đủ điều kiện.
- Nếu không có sản phẩm phù hợp → nói rõ và gợi ý hướng khác an toàn.

========================
CẤM TUYỆT ĐỐI
========================
- Không dùng các từ: *tai họa, đại hung, phá sản, chết chóc, vận hạn*.
- Không khẳng định phong thủy có thể thay đổi số phận.
- Không bịa giá, bịa công dụng, bịa mệnh hoặc suy diễn thông tin.

========================
KIẾN THỨC CHUYÊN GIA
========================
{knowledge_context}

========================
SẢN PHẨM CÓ SẴN
========================
{products_str}

========================
CÂU HỎI / TIN NHẮN KHÁCH
========================
"{user_text}"

========================
CÁCH TRẢ LỜI
========================

**QUAN TRỌNG: Trả lời CHI TIẾT, ít nhất 3-4 đoạn văn.**

1️⃣ **NẾU khách hỏi chung chung**
(Ví dụ: "Cho tôi tư vấn", "Phòng khách nên treo tranh gì?")
- Trò chuyện tự nhiên, thân thiện
- Hỏi thêm thông tin cần thiết (mệnh, không gian phòng, sở thích màu sắc)
- Tư vấn phong thủy khái quát
- **CHƯA vội chốt sản phẩm**

2️⃣ **NẾU khách yêu cầu chọn sản phẩm hoặc phân tích ảnh**
(Ví dụ: "Chọn giúp tôi 1 tranh", "Phân tích căn phòng")
- **Bước 1**: Phân tích chi tiết không gian (ánh sáng, màu sắc, phong cách, cảm xúc)
- **Bước 2**: Đưa ra 1 lựa chọn chính với lý do cụ thể (ít nhất 3-4 lý do)
- **Bước 3**: Giải thích phong thủy (mệnh, hướng, ý nghĩa)
- **Bước 4**: Đưa thêm 1-2 lựa chọn thay thế với lý do ngắn gọn
- **Bước 5**: Tư vấn cách treo tranh (vị trí, chiều cao, kết hợp)

3️⃣ **NẾU khách chỉ trò chuyện**
(Ví dụ: "Cảm ơn", "Tôi thích màu xanh")
- Trả lời thân thiện
- Khai thác thêm nhu cầu
- Dẫn dắt tự nhiên sang tư vấn tranh/đồ vật nếu phù hợp

========================
QUY TẮC RA QUYẾT ĐỊNH
========================
Khi đã đủ thông tin, câu trả lời **BẮT BUỘC** có cấu trúc:
1. **Kết luận rõ ràng** (Tôi gợi ý… / Nên chọn…)
2. **Lý do phong thủy** (1–3 gạch đầu dòng)
3. **Lựa chọn thay thế** (nếu có)

========================
KHI KHÔNG ĐỦ DỮ LIỆU
========================
- KHÔNG suy đoán
- Hỏi thêm tối đa 2 câu
- Hoặc đưa ra 2–3 phương án **trung tính, an toàn**

========================
PHONG CÁCH TRÌNH BÀY
========================
- Thân thiện, gần gũi như người bạn tư vấn 🏠🌿✨
- Markdown rõ ràng, dễ đọc
- Emoji vừa phải (🏠 🌿 🎨 💡 ✨)
- Không cứng nhắc, không giáo điều

========================
VÍ DỤ THAM KHẢO
========================
AI:
"Tuyệt vời! 🌅 Hướng Đông mang năng lượng khởi đầu rất tốt.
Cho tôi hỏi thêm 2 điều nhé:
- Bạn thuộc mệnh gì? (Kim, Mộc, Thủy, Hỏa, Thổ)
- Bạn thích tông màu nào? 🎨
Để tôi tư vấn tranh phù hợp nhất cho bạn!"

AI:
"Quá hợp luôn! 🌿

Tôi gợi ý **Tranh số 1: Phong Cảnh Vùng Cao** (250.000 VNĐ)

**Vì sao nên chọn tranh này?**
✅ Tông xanh chủ đạo – hợp mệnh Mộc  
✅ Chủ đề thiên nhiên – tăng sinh khí  
✅ Phù hợp phòng khách, dễ treo

**Lựa chọn khác:** Tranh số 3 (200.000 VNĐ) cũng rất hài hòa và tiết kiệm hơn ✨
"""



    # Payload gửi Ollama
    # CRITICAL: Add system message to force direct response (no thinking)
    messages = [
        {
            "role": "system",
            "content": "You are a helpful Vietnamese feng shui consultant. IMPORTANT: Respond DIRECTLY in Vietnamese. Do NOT show your thinking process. Do NOT use English. Just give the final answer immediately."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    # Add image to user message if provided
    if user_image_bytes:
        messages[1]['images'] = [user_image_bytes]

    # Gọi Stream
    try:
        
        stream = ollama.chat(
            model=settings.LLM_MODEL_ID,
            messages=messages,  # Use messages array with system + user
            stream=True,
            options={
                "temperature": 0.7,  # Tăng để creative hơn
                "num_ctx": 8192,
                "num_predict": 2048,  # Tăng từ 1024 để trả lời dài hơn
            }
        )

        chunk_count = 0
        content_count = 0
        for chunk in stream:
            chunk_count += 1
            
            # Extract content from chunk
            message = chunk.message if hasattr(chunk, 'message') else chunk.get('message', {})
            
            # ONLY get content, IGNORE thinking
            content = getattr(message, 'content', '') or ''
            
            # Debug first chunk
            if chunk_count == 1:
                thinking = getattr(message, 'thinking', '') or ''
                print(f"🔍 First chunk - thinking: '{thinking[:50] if thinking else 'N/A'}', content: '{content[:50] if content else 'N/A'}'")
            
            # Only yield non-empty content (ignore thinking)
            if content:
                content_count += 1
                if content_count == 1:
                    print(f"✅ First content chunk: {content[:100]}...")
                yield content
            
        if content_count == 0:
            print(f"⚠️ No content chunks! Total chunks: {chunk_count}")
            yield "Xin lỗi, AI không trả lời được. Vui lòng thử lại."
        else:
            print(f"✅ Total: {chunk_count} chunks, {content_count} with content")
            
    except Exception as e:
        print(f"❌ Lỗi Ollama: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        yield f"Xin lỗi, hệ thống AI gặp lỗi: {str(e)}"