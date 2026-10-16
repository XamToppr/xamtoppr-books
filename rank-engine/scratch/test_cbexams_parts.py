import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import ssl

url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Load Part A
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'})
with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
    html_a = resp.read().decode('utf-8', errors='ignore')
    # Get cookies
    cookies = resp.headers.get_all('Set-Cookie')
    print("Cookies:", cookies)

soup_a = BeautifulSoup(html_a, 'html.parser')
vs = soup_a.find('input', id='__VIEWSTATE')['value']
vsg = soup_a.find('input', id='__VIEWSTATEGENERATOR')['value']
ev = soup_a.find('input', id='__EVENTVALIDATION')['value']

cookie_str = ""
if cookies:
    cookie_str = "; ".join([c.split(';')[0] for c in cookies])

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Referer': url,
    'Origin': 'https://sscexams.cbexams.com',
    'Content-Type': 'application/x-www-form-urlencoded'
}
if cookie_str:
    headers['Cookie'] = cookie_str

# Test fetching PART-B
post_data_b = urllib.parse.urlencode({
    '__VIEWSTATE': vs,
    '__VIEWSTATEGENERATOR': vsg,
    '__EVENTVALIDATION': ev,
    'P2': 'Click Here for PART-B'
}).encode('utf-8')

req_b = urllib.request.Request(url, data=post_data_b, headers=headers)
with urllib.request.urlopen(req_b, context=ctx, timeout=20) as resp_b:
    html_b = resp_b.read().decode('utf-8', errors='ignore')
    soup_b = BeautifulSoup(html_b, 'html.parser')
    lbl_b = soup_b.find(id='lblsubject')
    print("Part B subject label:", lbl_b.get_text(strip=True) if lbl_b else "None")
    q_b = soup_b.find_all(lambda tag: tag.name == 'font' and 'Q.No' in tag.get_text())
    print("Part B Q.Nos found:", len(q_b), [q.get_text(strip=True) for q in q_b[:3]], "...", [q.get_text(strip=True) for q in q_b[-3:]])
    
    # Also get viewstate from B to fetch Part C
    vs_b = soup_b.find('input', id='__VIEWSTATE')['value']
    vsg_b = soup_b.find('input', id='__VIEWSTATEGENERATOR')['value']
    ev_b = soup_b.find('input', id='__EVENTVALIDATION')['value']

# Test fetching PART-C
post_data_c = urllib.parse.urlencode({
    '__VIEWSTATE': vs_b,
    '__VIEWSTATEGENERATOR': vsg_b,
    '__EVENTVALIDATION': ev_b,
    'P3': 'Click Here for PART-C'
}).encode('utf-8')

req_c = urllib.request.Request(url, data=post_data_c, headers=headers)
with urllib.request.urlopen(req_c, context=ctx, timeout=20) as resp_c:
    html_c = resp_c.read().decode('utf-8', errors='ignore')
    soup_c = BeautifulSoup(html_c, 'html.parser')
    lbl_c = soup_c.find(id='lblsubject')
    print("Part C subject label:", lbl_c.get_text(strip=True) if lbl_c else "None")
    q_c = soup_c.find_all(lambda tag: tag.name == 'font' and 'Q.No' in tag.get_text())
    print("Part C Q.Nos found:", len(q_c), [q.get_text(strip=True) for q in q_c[:3]], "...", [q.get_text(strip=True) for q in q_c[-3:]])
