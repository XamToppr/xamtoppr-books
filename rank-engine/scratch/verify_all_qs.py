from bs4 import BeautifulSoup
import re
import sys
sys.path.insert(0, ".")

parts = ["scratch/ssc_part_a.html", "scratch/ssc_part_b.html", "scratch/ssc_part_c.html"]

for p_idx, fname in enumerate(parts):
    with open(fname, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    q_fonts = soup.find_all(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text()))
    for q_font in q_fonts:
        tr_q = q_font.find_parent("tr")
        m_qno = re.search(r"Q\.No\s*:\s*(\d+)", q_font.get_text())
        q_num = int(m_qno.group(1))
        
        # Check following rows
        curr = tr_q.find_next_sibling("tr")
        row_types = []
        opt_bgs = []
        while curr:
            if curr.find(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text())):
                break
            if curr.find("a", string=re.compile(r"Challenge Question No", re.I)):
                break
            if curr.find(id="lblsubject"):
                break
            
            tds = curr.find_all("td")
            txt = curr.get_text(strip=True)
            if len(tds) >= 2:
                bg = (tds[0].get("bgcolor") or "").lower()
                opt_bgs.append(bg)
                row_types.append(f"opt({bg})")
            elif "Not Answered" in txt:
                row_types.append("not_answered")
            else:
                row_types.append(f"other({txt[:15]})")
            curr = curr.find_next_sibling("tr")
            
        # Verify exactly 4 options
        if len(opt_bgs) != 4:
            print(f"Warning: Q.{q_num} has {len(opt_bgs)} options! Rows: {row_types}")
