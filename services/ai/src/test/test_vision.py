import ollama
import os

# 1. Cấu hình tên model (Phải khớp cái bạn đã pull)
MODEL = "qwen3-vl:4b"

# 2. Đường dẫn ảnh test (Thay bằng 1 ảnh thật trên máy bạn)
IMAGE_PATH = r"C:\Users\diamo.pc\Downloads\ve-tranh-phong-canh-don-gian-22.jpg" # <--- SỬA ĐƯỜNG DẪN NÀY

print(f"📷 Đang test khả năng nhìn của {MODEL}...")

if not os.path.exists(IMAGE_PATH):
    print("❌ Không tìm thấy file ảnh! Hãy sửa đường dẫn.")
    exit()

try:
    # Gửi ảnh + Câu hỏi đơn giản
    with open(IMAGE_PATH, 'rb') as file:
        response = ollama.chat(
            model=MODEL,
            messages=[
              {
                'role': 'user',
                'content': 'Mô tả chi tiết bức ảnh này bằng tiếng Việt.',
                'images': [file.read()]
              }
            ]
        )
    
    print("\n✅ KẾT QUẢ:")
    print(response['message']['content'])

except Exception as e:
    print(f"\n❌ LỖI: {e}")