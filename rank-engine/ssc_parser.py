"""
ssc_parser.py
=============
Dedicated parser and fetcher for SSC CBExams response sheets (e.g. SSC Stenographer,
SSC CGL/CHSL/MTS on cbexams.com).

Maintains complete isolation from RRB / DigiALM parsing logic.
Preserves question and option images, resolves relative image paths to absolute URLs,
and extracts candidate details, section names, candidate chosen options, and official answer keys.
"""

import re
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from curl_cffi import requests


def is_cbexams_url(url: str) -> bool:
    """Detects whether a URL belongs to SSC CBExams."""
    if not url:
        return False
    u = url.lower()
    return "cbexams.com" in u or "viewcandresponse.aspx" in u


def is_cbexams_html(html: str) -> bool:
    """Detects whether raw HTML source belongs to SSC CBExams response sheet."""
    if not html:
        return False
    return (
        "ViewCandResponse.aspx" in html
        or "GRIEVANCE SYSTEM" in html
        or "Click Here to Challenge Question No" in html
        or "lblsubject" in html
        or ("ddltest" in html and "qimg/" in html)
    )


def fetch_cbexams_full_html(url: str, timeout: int = 25) -> str:
    """
    Fetches SSC CBExams response sheet via curl_cffi Session.
    If multi-part ASP.NET buttons (P1, P2, P3, etc.) exist, automatically
    posts back to fetch and combine all exam parts into a single unified HTML document.
    """
    session = requests.Session()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    }

    try:
        r1 = session.get(url, impersonate="chrome120", headers=headers, timeout=timeout)
    except Exception as exc:
        raise RuntimeError(f"Failed to connect to SSC CBExams server: {exc}") from exc

    if r1.status_code != 200:
        raise RuntimeError(f"SSC CBExams server returned HTTP {r1.status_code}.")

    html_parts = [r1.text]
    soup1 = BeautifulSoup(r1.text, "html.parser")

    vs_elem = soup1.find("input", id="__VIEWSTATE")
    vsg_elem = soup1.find("input", id="__VIEWSTATEGENERATOR")
    ev_elem = soup1.find("input", id="__EVENTVALIDATION")

    if vs_elem and vsg_elem and ev_elem:
        vs1 = vs_elem["value"]
        vsg1 = vsg_elem["value"]
        ev1 = ev_elem["value"]

        # Check for multi-part submit buttons (e.g. P2, P3, P4...)
        part_buttons = soup1.find_all(
            "input",
            {"type": ["submit", "button"], "name": re.compile(r"^P[2-9]\d*$", re.I)},
        )
        for btn in part_buttons:
            btn_name = btn.get("name")
            btn_val = btn.get("value")
            payload = {
                "__VIEWSTATE": vs1,
                "__VIEWSTATEGENERATOR": vsg1,
                "__EVENTVALIDATION": ev1,
                btn_name: btn_val,
            }
            try:
                r_part = session.post(
                    url,
                    data=payload,
                    impersonate="chrome120",
                    headers=headers,
                    timeout=timeout,
                )
                if r_part.status_code == 200:
                    html_parts.append(r_part.text)
            except Exception:
                # If an individual part fails to fetch, proceed with retrieved parts
                pass

    if len(html_parts) == 1:
        return html_parts[0]

    # Combine parts into a single compound document separated by a marker
    return "\n<!-- SSC_PART_SPLIT -->\n".join(html_parts)


def parse_single_cbexams_part(
    soup: BeautifulSoup,
    base_url: str = "",
    questions_list: Optional[List[Dict[str, Any]]] = None,
    seen_qnos: Optional[set] = None,
) -> Dict[str, Any]:
    """Parses candidate details and questions from a single CBExams part HTML."""
    if questions_list is None:
        questions_list = []
    if seen_qnos is None:
        seen_qnos = set()

    # 1. Candidate Details Extraction
    details: Dict[str, str] = {
        "roll": "",
        "name": "Candidate",
        "date": "",
        "time": "",
        "subject": "",
        "venue": "",
    }

    for tr in soup.find_all("tr"):
        tds = tr.find_all(["td", "th"])
        if len(tds) == 2:
            raw_k = tds[0].get_text(strip=True).rstrip(":")
            raw_v = tds[1].get_text(strip=True).lstrip(":").strip()
            k_clean = re.sub(r"\s+", " ", raw_k)

            if "Roll No" in k_clean and not details["roll"]:
                details["roll"] = raw_v
            elif "Candidate Name" in k_clean and details["name"] == "Candidate":
                details["name"] = raw_v
            elif "Exam Level" in k_clean and not details["subject"]:
                sel = tds[1].find("select")
                if sel:
                    opt = sel.find("option", selected=True) or sel.find("option")
                    details["subject"] = opt.get_text(strip=True) if opt else raw_v
                else:
                    details["subject"] = raw_v
            elif "Test Date" in k_clean and not details["date"]:
                details["date"] = raw_v
            elif ("Shift" in k_clean or "Test Time" in k_clean) and not details["time"]:
                details["time"] = raw_v
            elif ("Centre" in k_clean or "Venue" in k_clean) and not details["venue"]:
                details["venue"] = raw_v

    # 2. Section Name
    lbl_subject = soup.find(id="lblsubject")
    section_name = lbl_subject.get_text(strip=True) if lbl_subject else "General"

    # 3. Question Extraction
    # Each question begins with a <font> containing "Q.No : X" or "Q.No:\xa0X"
    q_fonts = soup.find_all(
        lambda tag: tag.name == "font"
        and re.search(r"Q\.No\s*:\s*\d+", tag.get_text())
    )

    for q_font in q_fonts:
        tr_q = q_font.find_parent("tr")
        if not tr_q:
            continue

        m_qno = re.search(r"Q\.No\s*:\s*(\d+)", q_font.get_text())
        q_num = int(m_qno.group(1)) if m_qno else len(questions_list) + 1

        if q_num in seen_qnos:
            continue
        seen_qnos.add(q_num)

        # Question stem cell (second td)
        q_tds = tr_q.find_all("td")
        stem_td = q_tds[1] if len(q_tds) > 1 else q_tds[0]

        # Make image paths absolute and responsive
        for img in stem_td.find_all("img"):
            if img.get("src"):
                if base_url:
                    img["src"] = urljoin(base_url, img["src"])
                # Add styling for clean responsive rendering
                img["style"] = "max-width: 100%; height: auto; display: block; margin: 4px 0;"
                img["loading"] = "lazy"

        stem_html = "".join(str(c) for c in stem_td.contents).strip()

        # Extract Options and Status
        options: List[str] = []
        chosen: Optional[str] = None
        correct: Optional[str] = None
        is_not_answered = False

        curr = tr_q.find_next_sibling("tr")
        opt_idx = 1

        while curr:
            # Stop if another question or section begins
            if curr.find(
                lambda tag: tag.name == "font"
                and re.search(r"Q\.No\s*:\s*\d+", tag.get_text())
            ):
                break
            if curr.find("a", string=re.compile(r"Challenge Question No", re.I)):
                break
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

                # SSC Legend evaluation:
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

                # Make option images absolute and responsive
                for img in cont_td.find_all("img"):
                    if img.get("src"):
                        if base_url:
                            img["src"] = urljoin(base_url, img["src"])
                        img["style"] = "max-width: 100%; height: auto; display: block; margin: 4px 0;"
                        img["loading"] = "lazy"

                opt_html = "".join(str(c) for c in cont_td.contents).strip()
                options.append(opt_html)
                opt_idx += 1

            curr = curr.find_next_sibling("tr")

        if is_not_answered:
            chosen = None

        questions_list.append(
            {
                "qNo": q_num,
                "section": section_name,
                "chosen": chosen,
                "correct": correct or "N/A",
                "stem": stem_html or f"Q.{q_num}",
                "optionTexts": options if len(options) == 4 else None,
                "questionId": str(q_num),
                "optionIds": [],
            }
        )

    return {"details": details, "questions": questions_list}


def parse_cbexams_html(html_content: str, base_url: str = "") -> Dict[str, Any]:
    """
    Parses SSC CBExams response sheet HTML (either a single part or multiple parts).
    Returns normalized schema matching parse_digialm_html.
    """
    # If content contains split markers from multi-part fetch
    if "<!-- SSC_PART_SPLIT -->" in html_content:
        part_htmls = html_content.split("<!-- SSC_PART_SPLIT -->")
    else:
        part_htmls = [html_content]

    unified_details: Dict[str, str] = {
        "roll": "",
        "name": "Candidate",
        "date": "",
        "time": "",
        "subject": "",
        "venue": "",
    }
    unified_questions: List[Dict[str, Any]] = []
    seen_qnos: set = set()

    for part_html in part_htmls:
        if not part_html.strip():
            continue
        soup = BeautifulSoup(part_html, "html.parser")
        part_res = parse_single_cbexams_part(
            soup,
            base_url=base_url,
            questions_list=unified_questions,
            seen_qnos=seen_qnos,
        )
        p_details = part_res.get("details", {})
        for k, v in p_details.items():
            if v and (not unified_details[k] or unified_details[k] == "Candidate"):
                unified_details[k] = v

    # Sort questions by qNo to maintain clean sequential order
    unified_questions.sort(key=lambda q: q["qNo"])

    return {
        "details": unified_details,
        "questions": unified_questions,
    }
