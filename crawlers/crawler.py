import requests
from bs4 import BeautifulSoup
import time
import random
import json

# Link trang danh mục (ví dụ: Tranh phong cảnh vùng cao)
BASE_URL = "https://bantranh.com"
LIST_URL = "https://bantranh.com/pc/tranh-phong-canh-vung-cao/page/{}/" # Trang này có thể không phân trang kiểu ?page=1, cần kiểm tra kỹ

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

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

    price = soup.select_one(".price")
    price = price.text.strip() if price else "No price"

    img_tag = soup.find("img", class_="wp-post-image skip-lazy")
    img_url = img_tag["src"] if img_tag else ""
    if img_url and not img_url.startswith("http"):
        img_url = "https:" + img_url # Xử lý nếu link thiếu https

    category = "tranh phong canh vung cao"

    return {
        "title": title,
        "price": price,
        "image": img_url,
        "tag": category
    }

links = get_product_links(2)
print(links)
print(f"Find {len(links)} products")

for link in links:
    print("-> crawl:", link)
    try:
        data=get_product_detail(link)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception as e:
        print(e)
