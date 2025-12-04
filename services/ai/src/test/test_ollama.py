import ollama

MODEL = "qwen3-vl:4b" # <-- Điền đúng tên model của bạn

print(f"🤖 Đang test model {MODEL}...")
try:
    res = ollama.chat(
        model=MODEL,
        messages=[{'role': 'user', 'content': 'Chào bạn, hãy giới thiệu bản thân ngắn gọn.'}]
    )
    print("✅ Kết quả:", res['message']['content'])
except Exception as e:
    print("❌ Lỗi:", e)