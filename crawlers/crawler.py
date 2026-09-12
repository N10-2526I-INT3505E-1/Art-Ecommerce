"""
Crawl demo products and load them into the Novus products database.

Source: Wikimedia Commons (https://commons.wikimedia.org).

Why this source is safe:
- Commons only hosts public-domain or freely-licensed media, and its API exposes a
  machine-readable license per file. We skip anything flagged `Copyrighted: true` and
  anything that is not a permissive license.
- Both the Commons API (commons.wikimedia.org) and the image CDN used for the returned
  thumbnail URLs (thumb.wikimedia.org / upload.wikimedia.org) reply with
  `Access-Control-Allow-Origin: *`. Every image URL is checked for that header before
  it is inserted, so `imageUrl` is safe to load cross-origin from the web app and from
  the AI service.

Note: Wikimedia only serves a fixed set of thumbnail widths. Do not rewrite the
thumbnail URL by hand; use the exact `thumburl` the API returns (we request 960px).

Usage:
    python crawler.py --limit 12            # crawl + insert
    python crawler.py --limit 12 --dry-run  # preview, no API/DB writes
    python crawler.py --search "filetype:bitmap watercolor"

Environment variables (flags win):
    API_BASE_URL   default http://localhost:3000
    API_USERNAME   default demo_manager
    API_PASSWORD   default demo123456
"""

import argparse
import json
import os
import random
import re
import sys
import time
from urllib.parse import urlparse, urlunparse

import requests

# Windows consoles default to cp1252, which cannot encode the Vietnamese/emoji output.
for _stream in (sys.stdout, sys.stderr):
	if hasattr(_stream, "reconfigure"):
		_stream.reconfigure(encoding="utf-8", errors="replace")

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
DEFAULT_SEARCH = "filetype:bitmap oil painting landscape"
DEFAULT_CATEGORY = "Tranh nghệ thuật"
CORS_ORIGIN = "https://novus.io.vn"
THUMB_WIDTH = "960"

ALLOWED_LICENSE_HINTS = ("public domain", "cc0", "cc-by", "cc by", "pd-")
BLOCKED_LICENSE_HINTS = (
	"non-commercial",
	"noncommercial",
	"nocreativecommons",
	"fair use",
	"non-free",
	"all rights reserved",
)

# Giá bán demo (VND) — chọn ngẫu nhiên để sản phẩm trông tự nhiên.
PRICE_TIERS = [450_000, 690_000, 890_000, 1_290_000, 1_890_000, 2_490_000]

HEADERS = {
	"User-Agent": "NovusDemoCrawler/1.0 (demo seeding; contact: demo_manager@novus.io.vn)"
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


def generate_tags(text):
    text = text.lower()
    tags = []

    for key, keywords in TAG_RULES.items():
        for kw in keywords:
            kw = kw.lower()
            if kw in text:

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
                elif key in COMPOSITION_KEYS:
                    tags.append(f"bo_cuc_{key}")
                    break

                # 9. Chất liệu
                elif key in MATERIAL_KEYS:
                    tags.append(f"chat_lieu_{kw}")
                    break

    return list(set(tags))


# ----------------------------------------
# 1. Wikimedia Commons source
# ----------------------------------------
def strip_html(value):
	return re.sub(r"<[^>]+>", " ", value or "").strip()


def strip_query(url):
	"""Drop tracking query params (e.g. ?utm_source=...) from a URL."""
	return urlunparse(urlparse(url)._replace(query=""))


def clean_date(value):
	"""Strip Commons' hidden Wikidata markup (e.g. '1831 date QS:P571,...') from a date."""
	return re.split(r"\s*(?:date |label )?QS:", strip_html(value))[0].strip(" ,;")


def commons_request(params):
	params = {**params, "format": "json", "origin": "*"}
	res = requests.get(COMMONS_API, params=params, headers=HEADERS, timeout=30)
	res.raise_for_status()
	return res.json()


def parse_artwork(page):
	"""Map a Commons API page to product fields, or None if not reusable."""
	info = (page.get("imageinfo") or [{}])[0]
	meta = info.get("extmetadata") or {}

	license_name = strip_html(meta.get("LicenseShortName", {}).get("value"))
	lowered = license_name.lower()
	copyrighted = strip_html(meta.get("Copyrighted", {}).get("value")).lower()

	if copyrighted == "true":
		return None
	if any(bad in lowered for bad in BLOCKED_LICENSE_HINTS):
		return None
	if license_name and not any(hint in lowered for hint in ALLOWED_LICENSE_HINTS):
		return None

	image_url = strip_query(info.get("thumburl") or info.get("url") or "")
	source_url = info.get("descriptionurl")
	if not image_url or not source_url:
		return None

	title = strip_html(page.get("title", ""))
	title = re.sub(r"^File:", "", title)
	title = re.sub(r"\.(jpe?g|png|webp|tiff?|gif)$", "", title, flags=re.IGNORECASE).strip()

	categories = strip_html(meta.get("Categories", {}).get("value"))

	return {
		"name": title or "Untitled artwork",
		"imageUrl": image_url,
		"sourceUrl": source_url,
		"artist": strip_html(meta.get("Artist", {}).get("value")),
		"medium": strip_html(meta.get("Medium", {}).get("value")),
		"date": clean_date(meta.get("DateTimeOriginal", {}).get("value")),
		"license": license_name or "Free license",
		"categories": [c for c in categories.split("|") if c],
	}


def fetch_artworks(limit, search):
	artworks = []
	offset = None

	while len(artworks) < limit:
		params = {
			"action": "query",
			"generator": "search",
			"gsrsearch": search,
			"gsrnamespace": "6",  # File: namespace
			"gsrlimit": str(min(50, limit - len(artworks))),
			"prop": "imageinfo",
			"iiprop": "url|extmetadata",
			"iiurlwidth": THUMB_WIDTH,
		}
		if offset is not None:
			params["gsroffset"] = str(offset)

		data = commons_request(params)
		pages = (data.get("query") or {}).get("pages") or {}
		if not pages:
			break

		for page in pages.values():
			art = parse_artwork(page)
			if art:
				artworks.append(art)
				if len(artworks) >= limit:
					break

		offset = (data.get("continue") or {}).get("gsroffset")
		if offset is None:
			break
		time.sleep(0.2)

	return artworks


def is_cors_enabled(url):
	"""Return True when the image host allows cross-origin reads."""
	try:
		res = requests.get(
			url, headers={**HEADERS, "Origin": CORS_ORIGIN}, stream=True, timeout=30
		)
		res.close()
		allowed = res.headers.get("Access-Control-Allow-Origin")
		return allowed in ("*", CORS_ORIGIN)
	except requests.RequestException as exc:
		print(f"    ! Không kiểm tra được CORS: {exc}")
		return False


# ----------------------------------------
# 2. Build the product payload
# ----------------------------------------
def slugify(value):
	return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def build_product(art, category):
	haystack = " ".join(
		[art["name"], art["artist"], art["medium"], " ".join(art["categories"])]
	)
	tags = generate_tags(haystack)
	tags.append(f"giay_phep_{slugify(art['license'])}")
	tags.append("nguon_wikimedia-commons")
	if art["artist"]:
		tags.append(f"tac_gia_{slugify(art['artist'])}")
	if art["medium"]:
		tags.append(f"chat_lieu_{slugify(art['medium'])}")

	description = [art["name"]]
	if art["artist"]:
		description.append(f"bởi {art['artist']}")
	if art["date"]:
		description.append(art["date"])
	if art["medium"]:
		description.append(art["medium"])

	return {
		"name": art["name"][:180],
		"price": random.choice(PRICE_TIERS),
		"imageUrl": art["imageUrl"],
		"description": ", ".join(description)
		+ f". Nguồn ảnh: Wikimedia Commons ({art['license']}).",
		"sourceUrl": art["sourceUrl"],
		"categoryName": category,
		"tags": sorted(set(tags))[:25],
		"stock": random.randint(1, 20),
	}


# ----------------------------------------
# 3. Novus API client
# ----------------------------------------
def login(session, base_url, username, password):
	res = session.post(
		f"{base_url}/v1/sessions",
		json={"username": username, "password": password},
		timeout=30,
	)
	if res.status_code not in (200, 201):
		raise SystemExit(f"❌ Đăng nhập thất bại ({res.status_code}): {res.text}")
	return res.json()["accessToken"]


def push_product(session, base_url, token, product):
	return session.post(
		f"{base_url}/v1/products",
		json=product,
		headers={"Authorization": f"Bearer {token}"},
		timeout=30,
	)


# ----------------------------------------
# 4. Entry point
# ----------------------------------------
def main():
	parser = argparse.ArgumentParser(
		description="Crawl ảnh public-domain từ Wikimedia Commons vào API Novus."
	)
	parser.add_argument("--limit", type=int, default=12, help="Số sản phẩm cần crawl.")
	parser.add_argument("--search", default=DEFAULT_SEARCH, help="Từ khóa tìm trên Commons.")
	parser.add_argument("--category", default=DEFAULT_CATEGORY, help="categoryName gửi lên API.")
	parser.add_argument(
		"--api-base-url", default=os.environ.get("API_BASE_URL", "http://localhost:3000")
	)
	parser.add_argument("--username", default=os.environ.get("API_USERNAME", "demo_manager"))
	parser.add_argument("--password", default=os.environ.get("API_PASSWORD", "demo123456"))
	parser.add_argument("--dry-run", action="store_true", help="Chỉ in dữ liệu, không ghi API/DB.")
	parser.add_argument("--skip-cors-check", action="store_true", help="Bỏ qua kiểm tra CORS.")
	args = parser.parse_args()

	print(f"🔎 Tìm {args.limit} tác phẩm trên Wikimedia Commons: {args.search!r}")
	artworks = fetch_artworks(args.limit, args.search)
	if not artworks:
		sys.exit("❌ Không tìm thấy tác phẩm nào phù hợp (thử đổi --search).")

	base_url = args.api_base_url.rstrip("/")
	session = requests.Session()
	token = None
	if not args.dry_run:
		token = login(session, base_url, args.username, args.password)

	inserted = 0
	for art in artworks:
		product = build_product(art, args.category)
		print(f"\n→ {product['name']}  [{art['license']}]")
		print(f"  {product['imageUrl']}")

		if not args.skip_cors_check and not is_cors_enabled(product["imageUrl"]):
			print("  ⏭  Bỏ qua: ảnh không cho phép CORS.")
			continue

		if args.dry_run:
			print(json.dumps(product, ensure_ascii=False, indent=2))
			inserted += 1
			continue

		res = push_product(session, base_url, token, product)
		if res.status_code == 201:
			print(f"  ✅ Đã thêm vào DB (id={res.json().get('id')})")
			inserted += 1
		else:
			print(f"  ❌ API {res.status_code}: {res.text}")

	print(f"\n🎉 Hoàn tất: {inserted}/{len(artworks)} sản phẩm.")


if __name__ == "__main__":
	main()
