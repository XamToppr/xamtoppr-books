import os
import io
import re
import json
import ssl
import urllib.request
from pathlib import Path
from PIL import Image
import pytesseract
from bs4 import BeautifulSoup

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

CACHE_FILE = Path("data/ssc_ocr_cache.json")
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

cache = {}
if CACHE_FILE.exists():
    try:
        cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        cache = {}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with open("scratch/ssc_part_b.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
q_fonts = soup.find_all(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text()))
print(f"Total Part B questions: {len(q_fonts)}")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

for q_font in q_fonts:
    tr = q_font.find_parent("tr")
    m = re.search(r"Q\.No\s*:\s*(\d+)", q_font.get_text())
    q_num = m.group(1) if m else "?"

    if q_num in cache and cache[q_num]:
        continue

    imgs = [img["src"] for img in tr.find_all("img") if img.get("src") and "_EN" in img["src"]]
    if not imgs:
        imgs = [img["src"] for img in tr.find_all("img") if img.get("src")]

    if imgs:
        img_rel = imgs[0].split("?")[0]
        img_url = f"https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/{img_rel}"
    for attempt in range(4):
        try:
            req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = resp.read()
            img = Image.open(io.BytesIO(data))
            txt = pytesseract.image_to_string(img).strip()
            txt = re.sub(r'[\x00-\x1f\x7f-\x9f\ufffd]', '', txt)
            txt = re.sub(r'\s+', ' ', txt).strip()
            cache[q_num] = txt
            CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"Q.{q_num}: {txt[:65]}...")
            break
        except Exception as e:
            if attempt < 3:
                import time
                time.sleep(1.5)
            else:
                print(f"Q.{q_num} Error after {attempt+1} attempts: {e}")

CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Done! Cached {len(cache)} questions in {CACHE_FILE}")
