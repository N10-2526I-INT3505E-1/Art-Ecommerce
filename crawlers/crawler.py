import requests
from bs4 import BeautifulSoup
import time
import random
import json
import unicodedata
import re

# Link trang danh mục (ví dụ: Tranh phong cảnh vùng cao)
BASE_URL = "https://bantranh.com"
LIST_URL = "https://bantranh.com/pc/tranh-phong-canh-vung-cao/page/{}/" # Trang này có thể không phân trang kiểu ?page=1, cần kiểm tra kỹ
API_URL = "http://localhost:3000/products"

TARGET_CATEGORIES = [
    # 1. HÀNH MỘC (Cây cối, Rừng)
    "https://bantranh.com/pc/tranh-phong-canh-vung-cao/page/{}/",
    "https://bantranh.com/pc/tranh-nui-rung/page/{}/",

    # 2. HÀNH HỎA (Ngựa, Hoa đỏ)
    "https://bantranh.com/pc/tranh-hoa-hong/page/{}",
    "https://bantranh.com/pc/tranh-hoa-mau-don/page/{}",
    "https://bantranh.com/pc/tranh-son-mai-phong-canh/page/{}",

    # 3. HÀNH THỦY (Nước, Cá, Thuyền)
    "https://bantranh.com/pc/tranh-phong-canh-bien/page/{}/",

    # 4. HÀNH THỔ (Núi, Làng quê)
    "https://bantranh.com/pc/tranh-phong-canh-dong-que/page/{}/",
    
    # 5. HÀNH KIM (Chim công - Thường có màu vàng kim/trắng)
    "https://bantranh.com/pc/tranh-son-mai-cac-loai-hoa/page/{}",


]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# --- TỪ ĐIỂN PHONG THỦY (Để sinh Tags cho AI) ---
# ==========================================
# 1. CẤU HÌNH VÀ TỪ ĐIỂN
# ==========================================

# Hàm phụ trợ: Biến "Bình Yên" -> "binh_yen", "Màu Đỏ" -> "mau_do"
def to_slug(text):
    if not text: return ""
    # 1. Chuẩn hóa unicode (NFKD) để tách dấu ra khỏi ký tự gốc
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    # 2. Chuyển về chữ thường
    text = text.lower()
    # 3. Thay khoảng trắng và gạch ngang bằng gạch dưới
    text = re.sub(r'[\s\-]+', '_', text)
    # 4. Xóa các ký tự đặc biệt còn sót lại (chỉ giữ chữ, số và _)
    text = re.sub(r'[^\w_]', '', text)
    return text

# --- TỪ ĐIỂN PHONG THỦY ---
TAG_RULES = {
    # === 1. NGŨ HÀNH ===
    "hoa":  ["mã đáo", "ngựa", "mặt trời", "hoa mẫu đơn", "hướng dương", "đỏ", "cam", "lửa", "hoàng hôn", "phượng hoàng", "nhiệt", "chiều", "nắng"],
    "thuy": ["cửu ngư", "cá", "biển", "thuyền", "thuận buồm", "sông", "suối", "thác", "hồ", "sen", "mưa", "xanh dương"],
    "moc":  ["cây", "rừng", "tùng", "trúc", "cúc", "mai", "đào", "lá", "xanh lá", "đồi núi xanh", "vùng cao", "ruộng bậc thang"],
    "kim":  ["chim công", "dát vàng", "bạc", "trắng", "thiên nga", "tuyết", "hạc", "kim loại"],
    "tho":  ["núi", "non bộ", "làng quê", "đất", "ruộng", "bậc thang", "đá", "trâu", "cổng làng", "tường đá", "nâu"],

    # === 2. CHỦ ĐỀ ===
    "phong_canh": ["phong cảnh", "vùng cao", "ruộng bậc thang", "núi non", "rừng cây", "đồi", "sông suối", "biển", "thác nước", "hoàng hôn", "bình minh", "làng quê", "đồng quê"],
    "truu_tuong": ["trừu tượng", "abstract", "mảng màu", "hình học", "art line", "tối giản", "hình khối"],
    "dong_vat":   ["ngựa", "hổ", "voi", "chim công", "hươu", "cá", "rồng", "đại bàng", "chim", "thiên nga", "sói"],
    "phong_thuy": ["thuận buồm", "bình an", "tài lộc", "phát tài", "mã đáo", "cửu ngư", "chữ phúc", "hoa sen"],
    "phat_giao":  ["phật", "quán thế âm", "bồ tát", "thiền", "an yên", "chùa"],
    "dong_ho":    ["tranh đông hồ", "dân gian", "gà", "đám cưới chuột", "lợn"],
    "hoa_la":     ["hoa", "mẫu đơn", "cúc", "đào", "hoa hồng", "tulip", "lá cây", "tĩnh vật"],
    "thon_da":    ["làng quê", "đồng lúa", "sân đình", "cổng làng", "trâu", "tre làng"],
    "thien_nhien": ["hoa", "lá", "cây", "núi", "biển", "mây", "rừng"],
    "chau_a":     ["hạ long", "sapa", "ninh bình", "trường thành", "japan", "chùa", "đền", "cổng torii"],

    # === 3. Ý NGHĨA ===
    "tai_loc":    ["cửu ngư", "thuyền", "thuận buồm", "vàng", "lúa chín", "mùa gặt", "đồng tiền", "rồng vàng"],
    "cong_danh":  ["mã đáo", "đại bàng", "rồng", "bạch hổ", "đỉnh núi", "mặt trời", "thăng tiến"],
    "binh_an":    ["phật", "hoa sen", "làng quê", "cánh đồng", "trúc", "ánh sáng nhẹ", "thiền", "bình yên"],
    "suc_khoe":   ["cây xanh", "nước chảy", "sen", "rừng", "nắng nhẹ", "tùng hạc", "trường thọ"],
    "tinh_duyen": ["đôi", "uyên ương", "mẫu đơn", "chim công", "thiên nga", "cặp"],

    # === 4. PHONG CÁCH ===
    "hien_dai": ["hiện đại", "3d", "scandinavian", "tối giản", "bắc âu", "geometric", "abstract", "line art"],
    "co_dien":  ["cổ điển", "sơn dầu", "sơn mài", "thủy mặc", "đông hồ", "phục hưng"],
    "lang_man": ["mùa thu", "lá vàng", "paris", "châu âu", "hoa hồng", "ánh đèn", "couple", "lãng mạn"],
    "toi_gian": ["minimal", "đơn sắc", "line art", "geometry", "ít chi tiết"],

    # === 5. MÀU SẮC ===
    "mau_sac": ["trắng", "đen", "xám", "nâu", "vàng", "cam", "đỏ", "tím", "xanh dương", "xanh lá", "pastel", "gold", "silver"],

    # === 6. KHÔNG GIAN ===
    "phong_khach":    ["sofa", "living room", "khổ lớn", "panorama", "đa tấm"],
    "phong_ngu":      ["giường", "bedroom", "êm dịu", "màu pastel", "hoa nhẹ", "tĩnh lặng"],
    "phong_lam_viec": ["bàn làm việc", "bookshelf", "động lực", "năng lượng mạnh"],
    "phong_an":       ["bàn ăn", "ấm áp", "hoa quả", "tĩnh vật", "bếp"],
    "cau_thang":      ["dọc", "vertical", "1 tấm dài", "cầu thang"],

    # === 7. CẢM XÚC ===
    "cam_xuc": ["bình yên", "tĩnh lặng", "mạnh mẽ", "năng lượng", "ấm áp", "sang trọng", "lãng mạn", "hoài cổ", "tươi sáng", "huyền bí"],

    # === 8. CHẤT LIỆU ===
    "chat_lieu": ["canvas", "sơn dầu", "sơn mài", "gạo", "gỗ", "kính", "mica", "dát vàng", "in uv", "tranh bộ"],

    # === 9. BỐ CỤC ===
    "bo_cuc": ["cân bằng", "đối xứng", "bất đối xứng", "1 điểm tụ", "chiều sâu", "ánh sáng mạnh", "ánh sáng nhẹ"],

    # === 10. HƯỚNG TREO ===
    "huong_treo": ["quay vào nhà", "hướng vào trong", "tâm nhà"]
}

# Định nghĩa các nhóm Key để dễ xử lý
PHONG_THUY_KEYS = ["hoa", "thuy", "moc", "kim", "tho"]
INTENT_KEYS = ["tai_loc", "cong_danh", "binh_an", "tinh_duyen", "suc_khoe"]
STYLE_KEYS = ["hien_dai", "co_dien", "lang_man", "toi_gian"]
SPACE_KEYS = ["phong_khach", "phong_ngu", "phong_lam_viec", "phong_an", "cau_thang"]
COLOR_KEYS = ["mau_sac"]
MOOD_KEYS = ["cam_xuc"]
COMPOSITION_KEYS = ["bo_cuc"]
MATERIAL_KEYS = ["chat_lieu"]
TOPIC_KEYS = ["phong_canh", "truu_tuong", "dong_vat", "phong_thuy", "phat_giao", "dong_ho", "hoa_la", "thon_da", "thien_nhien", "chau_a"]
DIRECTION_KEYS = ["huong_treo"]

# ==========================================
# 2. HÀM SINH TAGS (LOGIC CHÍNH)
# ==========================================
def generate_tags(text):
    text = text.lower()
    tags = []

    for key, keywords in TAG_RULES.items():
        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower in text:
                
                # --- NHÓM 1: Dùng KEY làm tên Tag (Gom nhóm chung) ---
                if key in PHONG_THUY_KEYS:
                    tags.append(f"menh_{key}")
                    break
                
                elif key in INTENT_KEYS:
                    tags.append(f"y_nghia_{key}")
                    break

                elif key in TOPIC_KEYS:
                    tags.append(f"chu_de_{key}")
                    break

                elif key in STYLE_KEYS:
                    tags.append(f"phong_cach_{key}")
                    break

                elif key in SPACE_KEYS:
                    tags.append(f"khong_gian_{key}")
                    break
                
                elif key in DIRECTION_KEYS:
                    tags.append(f"huong_{key}")
                    break

                # --- NHÓM 2: Dùng KEYWORD làm tên Tag (Cụ thể hóa) ---
                # Chúng ta dùng to_slug() để biến từ khóa tiếng Việt thành tag chuẩn
                # Ví dụ: "Màu Đỏ" -> "mau_do"
                
                elif key in COLOR_KEYS:
                    tags.append(f"mau_{to_slug(kw)}")
                    break

                elif key in MOOD_KEYS:
                    tags.append(f"cam_xuc_{to_slug(kw)}")
                    break

                elif key in COMPOSITION_KEYS:
                    tags.append(f"bo_cuc_{to_slug(kw)}")
                    break

                elif key in MATERIAL_KEYS:
                    tags.append(f"chat_lieu_{to_slug(kw)}")
                    break

    return list(set(tags))
# ----------------------------------------
# 1. Crawler
# ----------------------------------------
def get_product_links(category_url, page=1):
    print(f"🟦 Đang tải trang danh sách: {category_url}")
    url = category_url.format(page)
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    product_links = []

    cnt = 0
    copy_href = ""
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/pd" in href and copy_href != href:
            print(href)
            product_links.append(href)
            copy_href = href
            cnt += 1
    print(cnt)
        
    return product_links[:5]

def get_product_detail(url):
    time.sleep(random.uniform(0.5, 1.5))
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    title = soup.find("h1")
    title = title.text.strip() if title else "Untitle"

    price_tag = soup.select_one(".price") # Class .price phổ biến ở bantranh.com
    price_raw = price_tag.text.strip() if price_tag else "0"
    
    try:
        clean_price = float(price_raw.replace('.', '').replace(',', '').replace('₫', '').replace('vnđ', '').strip())
    except:
        clean_price = 0.0

    img_tag = soup.find("img", class_="wp-post-image skip-lazy")
    img_url = img_tag["src"] if img_tag else ""
    if img_url and not img_url.startswith("http"):
        img_url = "https:" + img_url # Xử lý nếu link thiếu https

    category = ""
    bread = soup.select_one(".woocommerce-breadcrumb") 
    if bread:
        items = bread.find_all("a")
        if len(items) > 1:
            # Lấy mục gần cuối (thường là danh mục chính)
            category = items[-1].text.strip()
        else:
            category = "Tranh treo tường" # Fallback
    else:
        category = "Tranh treo tường"

    auto_tags = generate_tags(f"{title} {category}")

    return {
        "name": title,
        "price": clean_price,
        "imageUrl": img_url,
        "categoryName": category,
        "tags": auto_tags,
        "description": f"Crawl from {url}",
        "sourceUrl": url
    }


PAGES_TO_CRAWL = 2 

print(f"🚀 BẮT ĐẦU CRAWL ĐA DẠNG DỮ LIỆU ({PAGES_TO_CRAWL} trang/danh mục)...")

total_success = 0

# 1. Duyệt qua từng danh mục
for cat_url in TARGET_CATEGORIES:
    category_slug = cat_url.split('/pc/')[1].split('/')[0]
    print(f"\n📂 DANH MỤC: {category_slug}")
    
    # 2. Duyệt qua từng trang (Page 1 -> Page N)
    for page_num in range(1, PAGES_TO_CRAWL + 1):
        print(f"   PAGE {page_num}: Đang quét link...")
        
        # Lấy link của trang hiện tại
        links = get_product_links(cat_url, page_num)
        
        if not links:
            print("      ⚠️ Không tìm thấy sản phẩm hoặc hết trang. Chuyển danh mục tiếp theo.")
            break # Hết trang thì thoát vòng lặp page, sang danh mục khác
            
        print(f"      -> Tìm thấy {len(links)} sản phẩm. Bắt đầu xử lý...")
        
        # 3. Duyệt qua từng sản phẩm trong trang
        for link in links:
            data = get_product_detail(link)
            
            if data:
                try:
                    # In ra console cho đẹp
                    # print(f"         + [{data['price']:,}đ] {data['name']}")
                    print(json.dumps(data, ensure_ascii=False, indent=2))
                    
                    # Gửi API
                    resp = requests.post(API_URL, json=data)
                    
                    if resp.status_code == 201:
                        total_success += 1
                    else:
                        print(f"           ❌ Lỗi API: {resp.text}")
                        
                except Exception as e:
                    print(f"           ❌ Lỗi Python: {e}")

print(f"\n🎉🎉🎉 HOÀN TẤT TOÀN BỘ! Tổng cộng đã thêm {total_success} sản phẩm vào Database.")
    
    


