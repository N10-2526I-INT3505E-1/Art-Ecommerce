import requests
from bs4 import BeautifulSoup
import time
import random
import json
import unicode

# Link trang danh mục (ví dụ: Tranh phong cảnh vùng cao)
BASE_URL = "https://bantranh.com"
LIST_URL = "https://bantranh.com/pc/tranh-phong-canh-vung-cao/page/{}/" # Trang này có thể không phân trang kiểu ?page=1, cần kiểm tra kỹ
API_URL = "http://localhost:3000/products"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# --- TỪ ĐIỂN PHONG THỦY (Để sinh Tags cho AI) ---
TAG_RULES = {

    # ============================
    # 1. NGŨ HÀNH (Phong thủy)
    # ============================
    "hoa": [
        "mã đáo", "ngựa", "mặt trời", "hoa mẫu đơn", "hướng dương",
        "đỏ", "cam", "lửa", "hoàng hôn", "phượng hoàng", "nhiệt",
    ],
    "thuy": [
        "cửu ngư", "cá koi", "biển", "thuyền", "thuận buồm", "sông",
        "suối", "thác nước", "mặt hồ", "sen", "mưa", "xanh dương",
    ],
    "moc": [
        "cây", "rừng", "tùng", "trúc", "cúc", "mai", "đào", "lá",
        "xanh lá", "đồi núi xanh", "vùng cao", "ruộng bậc thang",
    ],
    "kim": [
        "chim công", "dát vàng", "bạc", "trắng", "thiên nga", "tuyết",
        "hạc", "hoa văn kim loại",
    ],
    "tho": [
        "núi", "non bộ", "làng quê", "đất", "ruộng", "bậc thang",
        "đá", "trâu", "cổng làng", "tường đá", "nâu",
    ],

    # =======================================
    # 2. CHỦ ĐỀ TRANH (Theo danh mục Website)
    # =======================================
    "phong_canh": [
        "phong cảnh", "vùng cao", "ruộng bậc thang", "núi non",
        "rừng cây", "đồi", "sông suối", "biển", "thác nước",
        "hoàng hôn", "bình minh", "làng quê", "cảnh đồng quê",
    ],
    "truu_tuong": [
        "trừu tượng", "abstract", "mảng màu", "hình học",
        "art line", "tối giản", "hình khối",
    ],
    "dong_vat": [
        "ngựa", "hổ", "voi", "chim công", "hươu", "cá koi",
        "rồng", "đại bàng", "chim", "thiên nga", "sói",
    ],
    "phong_thuy": [
        "thuận buồm", "bình an", "tài lộc", "phát tài",
        "mã đáo thành công", "cửu ngư", "chữ phúc", "hoa sen",
    ],
    "phat_giao": [
        "phật", "quán thế âm", "bồ tát", "thiền", "an yên",
    ],
    "dong_ho": [
        "tranh đông hồ", "dân gian", "gà", "đám cưới chuột", "lợn",
    ],
    "hoa_la": [
        "hoa sen", "mẫu đơn", "cúc", "đào", "hoa hồng",
        "tulip", "lá cây", "tĩnh vật hoa",
    ],
    "thon_da": [
        "làng quê", "đồng lúa", "sân đình", "cổng làng",
        "trâu", "tre làng",
    ],
    "thien_nhien": [
        "hoa", "lá", "cây", "núi", "biển", "mây", "rừng",
    ],
    "canh_thien_nhien_chau_a": [
        "hạ long", "sapa", "ninh bình", "trường thành", "japan",
        "chùa", "đền", "cổng torii",
    ],

    # ======================================
    # 3. Ý NGHĨA PHONG THỦY (Người mua hay hỏi)
    # ======================================
    "tai_loc": [
        "cửu ngư", "thuyền", "thuận buồm", "vàng", "lúa chín",
        "mùa gặt", "cá", "đồng tiền", "rồng vàng",
    ],
    "cong_danh": [
        "mã đáo", "đại bàng", "rồng", "bạch hổ",
        "đỉnh núi", "mặt trời",
    ],
    "binh_an": [
        "phật", "hoa sen", "làng quê", "cánh đồng", "trúc",
        "ánh sáng nhẹ", "thiền",
    ],
    "suc_khoe": [
        "cây xanh", "nước chảy", "sen", "rừng", "nắng nhẹ",
    ],
    "tinh_duyen": [
        "đôi", "uyên ương", "mẫu đơn", "chim công", "thiên nga",
    ],

    # ====================
    # 4. PHONG CÁCH TRANH
    # ====================
    "hien_dai": [
        "hiện đại", "3d", "scandinavian", "tối giản",
        "bắc âu", "geometric", "abstract", "line art",
    ],
    "co_dien": [
        "cổ điển", "sơn dầu", "sơn mài", "sơn thủy",
        "thủy mặc", "đông hồ",
    ],
    "lang_man": [
        "mùa thu", "lá vàng", "paris", "châu âu", "hoa hồng",
        "ánh đèn", "couple",
    ],
    "toi_gian": [
        "minimal", "đơn sắc", "line art", "geometry",
    ],

    # =========================
    # 5. MÀU SẮC (Color Tags)
    # =========================
    "mau_sac": [
        "trắng", "đen", "xám", "nâu", "vàng", "cam",
        "đỏ", "tím", "xanh dương", "xanh lá",
        "pastel", "gold", "silver",
    ],

    # ================================
    # 6. KHÔNG GIAN TREO (Interior)
    # ================================
    "phong_khach": [
        "sofa", "living room", "khổ lớn", "panorama", "đa tấm",
    ],
    "phong_ngu": [
        "giường", "bedroom", "êm dịu", "màu pastel",
        "hoa nhẹ", "tĩnh lặng",
    ],
    "phong_lam_viec": [
        "bàn làm việc", "bookshelf", "động lực", "năng lượng mạnh",
    ],
    "phong_an": [
        "bàn ăn", "ấm áp", "hoa quả", "tĩnh vật",
    ],
    "cau_thang": [
        "dọc", "vertical", "1 tấm dài", "trừu tượng",
    ],

    # ===============================
    # 7. CẢM XÚC / TONE (Mood Tags)
    # ===============================
    "cam_xuc": [
        "bình yên", "tĩnh lặng", "mạnh mẽ", "năng lượng",
        "ấm áp", "sang trọng", "lãng mạn", "hoài cổ",
        "tươi sáng", "minimal", "vintage", "huyền bí",
    ],

    # ======================
    # 8. CHẤT LIỆU TRANH
    # ======================
    "chat_lieu": [
        "canvas", "sơn dầu", "sơn mài", "gạo", "gỗ",
        "kính", "mica", "dát vàng", "in uv", "tranh bộ 3",
    ],

    # =======================================
    # 9. ĐẶC ĐIỂM BỐ CỤC (Composition Tags)
    # =======================================
    "bo_cuc": [
        "cân bằng", "đối xứng", "bất đối xứng", "đuổi góc",
        "leading lines", "1 điểm tụ", "nhiều lớp", "chiều sâu",
        "ánh sáng mạnh", "ánh sáng nhẹ",
    ],

    # =====================================
    # 10. VỊ TRÍ – HƯỚNG TREO PHONG THỦY
    # =====================================
    "huong_treo": [
        "đầu ngựa quay vào nhà",
        "mũi thuyền hướng vào nhà",
        "núi treo phía sau ghế",
        "cá hướng vào trong",
        "ánh sáng hướng vào tâm nhà",
    ],
}

PHONG_THUY_KEYS = ["hoa", "thuy", "moc", "kim", "tho"]
INTENT_KEYS = ["tai_loc", "cong_danh", "binh_an", "tinh_duyen", "suc_khoe"]
STYLE_KEYS = ["hien_dai", "co_dien", "lang_man", "toi_gian"]
SPACE_KEYS = ["phong_khach", "phong_ngu", "phong_lam_viec", "phong_an", "cau_thang"]
COLOR_KEYS = ["mau_sac"]
MOOD_KEYS = ["cam_xuc"]
COMPOSITION_KEYS = ["bo_cuc"]
MATERIAL_KEYS = ["chat_lieu"]
TOPIC_KEYS = [
    "phong_canh", "truu_tuong", "dong_vat", "phong_thuy",
    "phat_giao", "dong_ho", "hoa_la", "thon_da",
    "thien_nhien", "canh_thien_nhien_chau_a"
]


def normalize(txt: str):
    return unidecode.unidecode(txt.lower())

def generate_tags(text):
    text = normalize(text)
    tags = []

    for key, keywords in TAG_RULES.items():
        for kw in keywords:
            if normalize(kw) in text:

                # 1. Ngũ hành
                if key in PHONG_THUY_KEYS:
                    tags.append(f"menh_{key}")  # ví dụ: menh_moc, menh_hoa
                    break

                # 2. Ý nghĩa phong thủy
                elif key in INTENT_KEYS:
                    tags.append(f"y_nghia_{key}")
                    break

                # 3. Chủ đề
                elif key in TOPIC_KEYS:
                    tags.append(f"chu_de_{key}")
                    break

                # 4. Phong cách nội thất
                elif key in STYLE_KEYS:
                    tags.append(f"phong_cach_{key}")
                    break

                # 5. Không gian treo
                elif key in SPACE_KEYS:
                    tags.append(f"khong_gian_{key}")
                    break

                # 6. Màu sắc
                elif key in COLOR_KEYS:
                    tags.append(f"mau_{kw}")
                    break

                # 7. Cảm xúc
                elif key in MOOD_KEYS:
                    tags.append(f"cam_xuc_{kw}")
                    break

                # 8. Bố cục
                    tags.append(f"bo_cuc_{key}")
                    break

                # 9. Chất liệu
                elif key in MATERIAL_KEYS:
                    tags.append(f"chat_lieu_{kw}")
                    break

    return list(set(tags))

# ----------------------------------------
# 1. Crawler
# ----------------------------------------
def get_product_links(page):
    print(f"🟦 Đang tải trang danh sách: {LIST_URL}")
    url = LIST_URL.format(page)
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
        
    return product_links[:1]

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

    category = "tranh phong cảnh vùng cao"
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

links = get_product_links(1)
print(links)
print(f"Find {len(links)} products")

for link in links:
    print("-> crawl:", link)
    try:
        data=get_product_detail(link)
        print(json.dumps(data, ensure_ascii=False, indent=2))


        resp = requests.post(API_URL, json=data)
        if resp.status_code != 201:
            print(f"    ❌ Lỗi API: {resp.text}")
    except Exception as e:
        print(e)
    
    


