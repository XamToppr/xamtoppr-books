from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin

base_url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"

for part_name, filename in [("Part A", "scratch/ssc_part_a.html"), ("Part B", "scratch/ssc_part_b.html"), ("Part C", "scratch/ssc_part_c.html")]:
    with open(filename, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    # Subject label
    lbl = soup.find(id="lblsubject")
    subject = lbl.get_text(strip=True) if lbl else "N/A"
    
    # Candidate details (only print for Part A)
    if part_name == "Part A":
        details = {}
        for tr in soup.find_all("tr"):
            tds = tr.find_all(["td", "th"])
            if len(tds) == 2:
                k = tds[0].get_text(strip=True)
                v = tds[1].get_text(strip=True).lstrip(":").strip()
                if any(x in k for x in ["Roll No", "Candidate Name", "Exam Level", "Test Date", "Test Time", "Centre Name"]):
                    details[k] = v
        print("Candidate details:", details)

    # Questions inspection
    # Find all elements matching Q.No:
    q_elems = soup.find_all(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text()))
    print(f"\n[{part_name}] Subject: {subject} | Total Qs found: {len(q_elems)}")
    
    # Let's inspect the first 2 questions of this part
    for q_el in q_elems[:2]:
        tr_q = q_el.find_parent("tr")
        q_no_text = q_el.get_text(strip=True)
        # Check stem
        tds = tr_q.find_all("td")
        stem_td = tds[1] if len(tds) > 1 else tds[0]
        stem_imgs = [img.get("src") for img in stem_td.find_all("img")]
        stem_txt = stem_td.get_text(strip=True)
        
        # Options
        options = []
        chosen = None
        correct = None
        
        # Next sibling rows
        curr = tr_q.find_next_sibling("tr")
        opt_idx = 1
        is_not_answered = False
        while curr:
            if curr.find(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text())):
                break
            if curr.find("a", text=re.compile(r"Challenge Question No", re.I)):
                break
            
            row_txt = curr.get_text(strip=True)
            if "Not Answered" in row_txt:
                is_not_answered = True
            
            # Check if this row is an option row
            # Option rows have 2 cells: cell 0 (indicator with bgcolor), cell 1 (option content)
            c_tds = curr.find_all("td")
            if len(c_tds) >= 2 and opt_idx <= 4:
                bg = (c_tds[0].get("bgcolor") or "").lower()
                style_bg = (c_tds[0].get("style") or "").lower()
                
                # Check color
                if bg == "green" or "green" in style_bg:
                    chosen = str(opt_idx)
                    correct = str(opt_idx)
                elif bg == "red" or "red" in style_bg:
                    chosen = str(opt_idx)
                elif bg == "yellow" or "yellow" in style_bg:
                    correct = str(opt_idx)
                    
                opt_imgs = [img.get("src") for img in c_tds[1].find_all("img")]
                opt_txt = c_tds[1].get_text(strip=True)
                options.append({
                    "opt_no": opt_idx,
                    "bg": bg,
                    "imgs": opt_imgs,
                    "txt": opt_txt[:30]
                })
                opt_idx += 1
            
            curr = curr.find_next_sibling("tr")
            
        print(f"  {q_no_text} -> Chosen: {chosen} (NotAns={is_not_answered}), Correct: {correct}")
        print(f"    Stem: text='{stem_txt[:30]}', imgs={stem_imgs}")
        for o in options:
            print(f"    Opt {o['opt_no']}: bg={o['bg']}, imgs={o['imgs']}, txt='{o['txt']}'")
