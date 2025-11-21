import requests
from bs4 import BeautifulSoup
import time
import random
import json

# Link trang danh mục (ví dụ: Tranh phong cảnh vùng cao)
BASE_URL = "https://bantranh.com"
LIST_URL = "https://bantranh.com/pc/tranh-phong-canh-vung-cao/page/{}/" # Trang này có thể không phân trang kiểu ?page=1, cần kiểm tra kỹ
API_URL = "http://localhost:3000/products"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# --- TỪ ĐIỂN PHONG THỦY (Để sinh Tags cho AI) ---
TAG_RULES = {
    "hoa": [
        "mặt trời", "bình minh", "hoàng hôn", "ánh dương",
        "đỏ", "cam", "nắng", "chiều tà",
        "ngựa", "mã đáo", "phượng hoàng"
    ],
    "thuy": [
        "biển", "bờ biển", "sóng", "thuyền", "thuận buồm",
        "thác", "thác nước", "sông", "suối", "hồ",
        "mưa", "đêm biển", "ban mai biển"
    ],
    "moc": [
        "cây", "rừng", "rừng thông", "thông", 
        "đồi chè", "đồi", "hoa", "vườn hoa",
        "mùa xuân", "đồi thông", "vùng cao",
        "ruộng bậc thang", "mùa lúa chín"
    ],
    "kim": [
        "tuyết", "trắng", "băng", 
        "ánh bạc", "kim loại", "công", "thiên nga"
    ],
    "tho": [
        "núi", "đồi núi", "núi non", "non nước",
        "hang động", "đá", "đèo", 
        "làng quê", "ruộng", "cánh đồng",
        "nâu", "đất", "phố cổ", "đền"
    ],

        "tai_loc": [
        "thuận buồm", "cửu ngư", "sóng biển",
        "lúa chín", "mùa gặt", "đồi chè",
        "ruộng bậc thang", "vàng", "ánh vàng"
    ],

    "cong_danh": [
        "đỉnh núi", "núi cao", "mặt trời mọc",
        "đại bàng", "ngựa", "thác nước lớn",
        "ánh sáng mạnh", "tuyết núi"
    ],

    "binh_an": [
        "làng quê", "cánh đồng", "hoa sen",
        "phật", "suối nhỏ", "thung lũng",
        "cây đơn", "nhà gỗ", "trời xanh"
    ],

    "tinh_duyen": [
        "đôi chim", "thiên nga", "uyên ương",
        "cặp đôi", "hoa hồng", "đêm paris",
        "ánh đèn đường", "mùa thu lãng mạn"
    ],

    "hien_dai": [
        "hiện đại", "3d", "sơn dầu hiện đại", "trừu tượng phong cảnh",
        "bắc âu", "scandinavia", "minimalist", "tối giản",
        "phản chiếu", "phong cảnh trừu tượng", "đường nét"
    ],

    "co_dien": [
        "sơn dầu cổ điển", "thủy mặc", 
        "phong cảnh xưa", "làng cổ", "phố cổ",
        "cầu ngói", "phong cách á đông"
    ],

    "lang_man": [
        "mùa thu", "lá vàng", "hoa", "công viên",
        "paris", "ánh đèn", "đêm", "đồi hoa"
    ],

        "phong_canh_nui": [
        "núi", "đồi núi", "đỉnh núi", "rừng núi",
        "mùa đông tuyết", "dãy núi", "đèo"
    ],

    "phong_canh_bien": [
        "biển", "bờ biển", "hải đăng", "thuyền buồm",
        "sóng", "cát trắng", "biển đêm"
    ],

    "phong_canh_lang_que": [
        "làng quê", "cánh đồng", "ruộng", 
        "trâu", "nhà tranh", "cổng làng", "đồng lúa"
    ],

    "phong_canh_chau_au": [
        "paris", "châu âu", "đường phố tây", 
        "cầu châu âu", "tháp eiffel", "tuyết châu âu"
    ],

    "phong_canh_thac_nuoc": [
        "thác", "thác nước", "dòng chảy", "suối trắng"
    ],

    "tone_xanh": ["xanh dương", "xanh biển", "xanh lá", "rừng xanh"],
    "tone_vang": ["vàng", "lúa chín", "mùa thu", "nắng vàng"],
    "tone_do": ["đỏ", "hoàng hôn", "mặt trời", "cam"],
    "tone_trang": ["trắng", "tuyết", "băng", "sương"],
    "tone_den": ["đen", "bóng đêm", "bầu trời đêm"],

    "mua_xuan": ["xuân", "hoa đào", "màu hồng", "nảy lộc"],
    "mua_he": ["hè", "rực nắng", "hoa hướng dương"],
    "mua_thu": ["mùa thu", "lá vàng", "lá đỏ"],
    "mua_dong": ["mùa đông", "tuyết", "lạnh", "trời xám"],

    "tay_bac": [
    "ruộng bậc thang", "núi rừng tây bắc",
    "nhà sàn", "bản làng", "mùa lúa chín"
    ],

    "treo_phong_khach": [
    "tranh phòng khách", "phòng khách", "khổ lớn"
    ],
    "treo_phong_ngu": [
        "phòng ngủ", "dễ chịu", "êm dịu", "lãng mạn"
    ],
    "treo_phong_lam_viec": [
        "thác nước", "núi cao", "đỉnh núi", "thuyền buồm"
    ],
}



def generate_tags(text):
    """Sinh tags từ tên danh mục/tên tranh"""
    text = text.lower()
    tags = []
    for key, keywords in TAG_RULES.items():
        for kw in keywords:
            if kw in text:
                if key in ["hoa", "thuy", "moc", "kim", "tho"]:
                    tags.append(f"phong_thuy_{key}")
                else:
                    tags.append(f"cau_{key}")
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
    
    


