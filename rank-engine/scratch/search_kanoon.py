import urllib.request
import re

url = 'https://indiankanoon.org/search/?formInput=Section+9+Digital+Personal+Data+Protection+Act%2C+2023'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8', errors='ignore')
    matches = re.findall(r'<a href="(/doc/\d+/)"[^>]*>(.*?)</a>', html)
    for link, title in matches[:10]:
        print(f"https://indiankanoon.org{link} -> {re.sub(r'<[^>]+>', '', title)}")
except Exception as e:
    print("Error:", e)
