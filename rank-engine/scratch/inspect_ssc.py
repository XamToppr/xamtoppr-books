from bs4 import BeautifulSoup
import re

with open('scratch/ssc_sample.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# Find candidate details
print("--- CANDIDATE DETAILS SEARCH ---")
for tr in soup.find_all('tr'):
    txt = tr.get_text(strip=True)
    if any(k in txt for k in ['Roll No', 'Candidate Name', 'Exam Level', 'Test Date', 'Shift', 'Centre Name']):
        tds = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
        print("Detail row:", tds)

# Find all section headers
print("\n--- SECTION HEADERS SEARCH ---")
for span in soup.find_all(['span', 'p', 'b', 'td']):
    txt = span.get_text(strip=True)
    if 'PART-' in txt or 'lblsubject' in str(span.get('id', '')):
        print("Section tag:", span.name, span.get('id'), txt)

# Find question blocks
# Notice: 'Click Here to Challenge Question No.: X'
challenge_links = soup.find_all('a', text=re.compile(r'Challenge Question No', re.I))
print(f"\nTotal challenge links: {len(challenge_links)}")

# Inspect first 5 questions
q_indices = []
for idx, a in enumerate(challenge_links[:5], 1):
    print(f"\n==================== QUESTION {idx} ====================")
    # The question container is likely a table or sequence of tr's
    # Let's find parent tr
    tr_challenge = a.find_parent('tr')
    # Let's find following trs until next challenge link or end
    curr = tr_challenge.find_next_sibling('tr')
    row_count = 0
    while curr:
        if curr.find('a', text=re.compile(r'Challenge Question No', re.I)):
            break
        # Check if next section
        if curr.find('span', id='lblsubject'):
            break
        
        row_txt = curr.get_text(strip=True)
        imgs = [img.get('src') for img in curr.find_all('img')]
        bgcolors = [td.get('bgcolor') for td in curr.find_all('td') if td.get('bgcolor')]
        style_bgs = [td.get('style') for td in curr.find_all('td') if 'background' in (td.get('style') or '').lower()]
        classes = [td.get('class') for td in curr.find_all('td') if td.get('class')]
        
        print(f"  Row {row_count}: text='{row_txt}', bgcolors={bgcolors}, imgs={imgs}")
        curr = curr.find_next_sibling('tr')
        row_count += 1
