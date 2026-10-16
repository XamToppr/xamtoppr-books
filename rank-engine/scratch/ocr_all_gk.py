import os
import io
import re
import json
from pathlib import Path
from PIL import Image
import pytesseract
from curl_cffi import requests
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

url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"
session = requests.Session()
r = session.get(url, impersonate="chrome120")

# Fetch part B
soup1 = BeautifulSoup(r.text, "html.parser")
vs = soup1.find("input", id="__VIEWSTATE")["value"]
vsg = soup1.find("input", id="__VIEWSTATEGENERATOR")["value"]
ev = soup1.find("input", id="__EVENTVALIDATION")["value"]

r_b = session.post(url, data={
    "__VIEWSTATE": vs,
    "__VIEWSTATEGENERATOR": vsg,
    "__EVENTVALIDATION": ev,
    "P2": "Click Here for PART-B"
}, impersonate="chrome120")

soup_b = BeautifulSoup(r_b.text, "html.parser")
q_fonts = soup_b.find_all(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text()))

print(f"Total GK questions in Part B: {len(q_fonts)}")

for q_font in q_fonts:
    tr = q_font.find_parent("tr")
    m = re.search(r"Q\.No\s*:\s*(\d+)", q_font.get_text())
    q_num = m.group(1) if m else "?"
    
    # Check if already cached
    if q_num in cache and cache[q_num]:
        print(f"Q.{q_num} [CACHED]: {cache[q_num][:60]}...")
        continue
        
    imgs = [img["src"] for img in tr.find_all("img") if img.get("src") and "_EN" in img["src"]]
    if not imgs:
        imgs = [img["src"] for img in tr.find_all("img") if img.get("src")]
    if imgs:
        img_url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/" + imgs[0]
        try:
            r_img = session.get(img_url, impersonate="chrome120", timeout=10)
            img = Image.open(io.BytesIO(r_img.content))
            txt = pytesseract.image_to_string(img).strip()
            # Clean OCR artifacts
            txt = re.sub(r'[\x00-\x1f\x7f-\x9f\ufffd]', '', txt)
            txt = re.sub(r'\s+', ' ', txt).strip()
            cache[q_num] = txt
            print(f"Q.{q_num}: {txt[:60]}...")
        except Exception as e:
            print(f"Q.{q_num} ERROR: {e}")

CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved {len(cache)} OCR results to {CACHE_FILE}")
