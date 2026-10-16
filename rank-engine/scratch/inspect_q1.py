import sys, os
from bs4 import BeautifulSoup

with open("scratch/sample_q2.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
panel1 = soup.find('div', class_='question-pnl')

with open("scratch/panel1_structure.txt", "w", encoding="utf-8") as out:
    out.write("=== PANEL 1 HTML ===\n")
    out.write(str(panel1)[:4000])
    out.write("\n\n=== TABLES INSIDE PANEL 1 ===\n")
    tables = panel1.find_all('table')
    for idx, t in enumerate(tables):
        out.write(f"Table {idx} class={t.get('class')} id={t.get('id')}:\n")
        for r_idx, tr in enumerate(t.find_all('tr')):
            tds = [td.get_text(strip=True) for td in tr.find_all('td')]
            classes = [td.get('class') for td in tr.find_all('td')]
            out.write(f"  Row {r_idx} (classes={classes}): {tds}\n")

print("Done writing panel1_structure.txt")
