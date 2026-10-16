from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
from marking import calculate_scores, clean_section_name

base_url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"

parts = ["scratch/ssc_part_a.html", "scratch/ssc_part_b.html", "scratch/ssc_part_c.html"]

all_questions = []
details = {}

for p_idx, fname in enumerate(parts):
    with open(fname, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    # Candidate details (from first part)
    if not details:
        for tr in soup.find_all("tr"):
            tds = tr.find_all(["td", "th"])
            if len(tds) == 2:
                k = tds[0].get_text(strip=True).rstrip(":")
                v = tds[1].get_text(strip=True).lstrip(":").strip()
                k_clean = re.sub(r"\s+", " ", k)
                if "Roll No" in k_clean:
                    details["roll"] = v
                elif "Candidate Name" in k_clean:
                    details["name"] = v
                elif "Exam Level" in k_clean:
                    # check select or text
                    sel = tds[1].find("select")
                    if sel:
                        opt = sel.find("option", selected=True) or sel.find("option")
                        details["exam"] = opt.get_text(strip=True) if opt else v
                    else:
                        details["exam"] = v
                elif "Test Date" in k_clean:
                    details["date"] = v
                elif "Shift" in k_clean or "Test Time" in k_clean:
                    details["time"] = v
                elif "Centre" in k_clean or "Venue" in k_clean:
                    details["venue"] = v
                    
    # Section name
    lbl = soup.find(id="lblsubject")
    section_name = lbl.get_text(strip=True) if lbl else f"Part {p_idx+1}"
    
    # Find all question rows
    # Each question has a row with font containing Q.No:\s*\d+
    q_fonts = soup.find_all(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text()))
    for q_font in q_fonts:
        tr_q = q_font.find_parent("tr")
        m_qno = re.search(r"Q\.No\s*:\s*(\d+)", q_font.get_text())
        q_num = int(m_qno.group(1)) if m_qno else len(all_questions) + 1
        
        # Question stem cell
        q_tds = tr_q.find_all("td")
        stem_td = q_tds[1] if len(q_tds) > 1 else q_tds[0]
        
        # Fix image urls to absolute
        for img in stem_td.find_all("img"):
            if img.get("src"):
                img["src"] = urljoin(base_url, img["src"])
        stem_html = "".join(str(c) for c in stem_td.contents).strip()
        
        # Options
        options = []
        chosen = None
        correct = None
        is_not_answered = False
        
        curr = tr_q.find_next_sibling("tr")
        opt_idx = 1
        while curr:
            if curr.find(lambda tag: tag.name == "font" and re.search(r"Q\.No\s*:\s*\d+", tag.get_text())):
                break
            if curr.find("a", string=re.compile(r"Challenge Question No", re.I)):
                break
            # If a new section starts
            if curr.find(id="lblsubject"):
                break
                
            txt = curr.get_text(strip=True)
            if "Not Answered" in txt:
                is_not_answered = True
                
            tds = curr.find_all("td")
            if len(tds) >= 2 and opt_idx <= 4:
                ind_td = tds[0]
                cont_td = tds[1]
                
                bg = (ind_td.get("bgcolor") or "").lower()
                style_bg = (ind_td.get("style") or "").lower()
                
                # Check colors according to SSC legend:
                # Green: Correct Option selected (chosen == correct == opt_idx)
                # Red: Wrong Option selected (chosen == opt_idx)
                # Yellow: Correct Option (correct == opt_idx)
                if bg == "green" or "green" in style_bg:
                    chosen = str(opt_idx)
                    correct = str(opt_idx)
                elif bg == "red" or "red" in style_bg:
                    chosen = str(opt_idx)
                elif bg == "yellow" or "yellow" in style_bg:
                    correct = str(opt_idx)
                    
                # Fix image urls in option
                for img in cont_td.find_all("img"):
                    if img.get("src"):
                        img["src"] = urljoin(base_url, img["src"])
                        
                opt_html = "".join(str(c) for c in cont_td.contents).strip()
                options.append(opt_html)
                opt_idx += 1
                
            curr = curr.find_next_sibling("tr")
            
        if is_not_answered:
            chosen = None
            
        all_questions.append({
            "qNo": q_num,
            "section": section_name,
            "chosen": chosen,
            "correct": correct or "N/A",
            "stem": stem_html or f"Q.{q_num}",
            "optionTexts": options if len(options) == 4 else None,
            "questionId": str(q_num),
            "optionIds": [],
        })

print(f"Details extracted: {details}")
print(f"Total questions extracted: {len(all_questions)}")

# Calculate scores with SSC Steno scheme: pos=1.0, neg=0.25
score_res = calculate_scores(all_questions, pos=1.0, neg=0.25)
print("\nScore Results:")
print("Total Questions:", score_res["total_questions"])
print("Total Correct:", score_res["total_correct"])
print("Total Wrong:", score_res["total_wrong"])
print("Total Unattempted:", score_res["total_unattempted"])
print("Total Score:", score_res["total_score"])
print("Accuracy:", score_res["accuracy"])
print("Attempt Ratio:", score_res["attempt_ratio"])
print("\nSection breakdown:")
for sec, s in score_res["sections"].items():
    print(f"  {sec}: Correct={s['correct']}, Wrong={s['wrong']}, Left={s['unattempted']}, Score={s['score']}/{s['total']}")
