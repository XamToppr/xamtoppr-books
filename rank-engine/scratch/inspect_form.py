from bs4 import BeautifulSoup

with open('scratch/ssc_sample.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

form = soup.find('form')
if form:
    print('Form action:', form.get('action'))
    print('Form method:', form.get('method'))
    inputs = form.find_all('input')
    for inp in inputs:
        if inp.get('type') == 'hidden':
            val = inp.get('value', '')
            print(f'Hidden: {inp.get("name")} (len={len(val)})')
        else:
            print(f'Input: {inp.get("type")}, name={inp.get("name")}, value={inp.get("value")}')
