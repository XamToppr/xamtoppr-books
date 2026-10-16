import urllib.request
import json
from bs4 import BeautifulSoup

payload = json.dumps({
    'url': 'https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html',
    'exam': 'AUTO'
}).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/calculate',
    data=payload,
    headers={'Content-Type': 'application/json'}
)

with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode('utf-8'))

sci_qs = [q for q in data['questions'] if q.get('cleanSection') == 'General Science' or q.get('section') == 'General Science']

output_lines = []
for q in sci_qs:
    soup = BeautifulSoup(q.get('stem', ''), 'html.parser')
    clean_stem = soup.get_text(separator=' ', strip=True)
    q_out = [f"=== Q.{q['qNo']} (Official Key: {q['correct']}) ==="]
    q_out.append(f"STEM: {clean_stem}")
    opts = q.get('optionTexts', [])
    for idx, opt in enumerate(opts, 1):
        opt_soup = BeautifulSoup(opt, 'html.parser')
        q_out.append(f"  ({idx}) {opt_soup.get_text(separator=' ', strip=True)}")
    output_lines.append("\n".join(q_out))

with open('scratch/science_questions.txt', 'w', encoding='utf-8') as f:
    f.write("\n\n".join(output_lines))

print(f"Successfully extracted {len(sci_qs)} science questions to scratch/science_questions.txt")
