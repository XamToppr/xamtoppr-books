import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import ssl

url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'})
with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
    html_a = resp.read().decode('utf-8', errors='ignore')
    cookies = resp.headers.get_all('Set-Cookie')

soup_a = BeautifulSoup(html_a, 'html.parser')
vs = soup_a.find('input', id='__VIEWSTATE')['value']
vsg = soup_a.find('input', id='__VIEWSTATEGENERATOR')['value']
ev = soup_a.find('input', id='__EVENTVALIDATION')['value']

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Referer': url,
    'Origin': 'https://sscexams.cbexams.com',
    'Content-Type': 'application/x-www-form-urlencoded'
}
if cookies:
    headers['Cookie'] = "; ".join([c.split(';')[0] for c in cookies])

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
for b in soup_b.find_all('input', {'type': ['submit', 'button']}):
    print('Button on B page:', b.get('id'), b.get('value'), b.get('class'))
