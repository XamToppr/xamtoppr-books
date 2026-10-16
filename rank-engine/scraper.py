"""
scraper.py
==========
DigiALM Response Sheet Fetcher & Parser for XamToppr.
Uses curl_cffi for browser impersonation (bypassing TLS fingerprints and anti-bot blocks),
normalizes URLs, and extracts structured candidate data and question lists.
"""

import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from curl_cffi import requests


def normalize_digialm_url(raw_url: str) -> str:
    """
    Normalizes a DigiALM response sheet URL:
    - Trims whitespace
    - Removes accidental multiple slashes in the path while preserving https://
    - Verifies protocol scheme
    """
    url = raw_url.strip()
    if not url.startswith(("http://", "https://")):
        raise ValueError("Invalid URL: must start with http:// or https://")

    # Split scheme from path
    proto, rest = url.split("://", 1)
    # Deduplicate slashes in rest of URL
    cleaned_path = re.sub(r"/+", "/", rest)
    normalized = f"{proto}://{cleaned_path}"

    parsed = urlparse(normalized)
    if not parsed.netloc:
        raise ValueError("Invalid URL: missing valid host domain")

    return normalized


def fetch_response_sheet_html(url: str, timeout: int = 20) -> str:
    """
    Fetches response sheet HTML using curl_cffi with Chrome impersonation.
    Handles TLS fingerprinting and header verification.
    """
    normalized_url = normalize_digialm_url(url)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }

    try:
        response = requests.get(
            normalized_url,
            impersonate="chrome120",
            headers=headers,
            timeout=timeout,
            allow_redirects=True,
        )
    except Exception as exc:
        raise RuntimeError(f"Failed to connect to DigiALM server: {exc}") from exc

    if response.status_code == 404:
        raise RuntimeError("DigiALM response sheet not found (404). Link may be invalid or expired.")
    elif response.status_code != 200:
        raise RuntimeError(f"DigiALM server returned status {response.status_code}.")

    html = response.text
    if not html or len(html) < 200:
        raise RuntimeError("Received empty or incomplete response from DigiALM.")

    return html


def parse_digialm_html(html_content: str, base_url: str = "") -> Dict[str, Any]:
    """
    Parses TCS DigiALM / Online Exam response sheet HTML and returns:
    - Candidate details (name, roll, exam date, time, subject)
    - List of questions with chosen option, correct key, section name, stem, and options.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # ── 1. Candidate Details Extraction ────────────────────────────────────
    details: Dict[str, str] = {
        "roll": "",
        "name": "Candidate",
        "date": "",
        "time": "",
        "subject": "",
        "venue": "",
    }

    td_elements = soup.find_all("td")
    for i in range(len(td_elements) - 1):
        txt = td_elements[i].get_text().strip()
        val = td_elements[i + 1].get_text().strip()

        if any(k in txt for k in ["Roll Number", "Roll No", "Registration Number", "Participant ID"]):
            if not details["roll"] and val:
                details["roll"] = val
        elif any(k in txt for k in ["Candidate Name", "Participant Name", "Name"]):
            if details["name"] == "Candidate" and val:
                details["name"] = val
        elif any(k in txt for k in ["Test Date", "Exam Date"]):
            if not details["date"] and val:
                details["date"] = val
        elif any(k in txt for k in ["Test Time", "Exam Time", "Shift"]):
            if not details["time"] and val:
                details["time"] = val
        elif "Subject" in txt:
            if not details["subject"] and val:
                details["subject"] = val
        elif "Test Center Name" in txt or "Venue Name" in txt:
            if not details["venue"] and val:
                details["venue"] = val

    # ── 2. Questions Extraction ────────────────────────────────────────────
    panels = soup.find_all("div", class_="question-pnl")
    if not panels:
        panels = soup.find_all("table", class_="questionRowTbl")

    letter_map = {"A": "1", "B": "2", "C": "3", "D": "4"}
    questions: List[Dict[str, Any]] = []

    for idx, panel in enumerate(panels, start=1):
        # A. Section Name
        section_name = "General"
        prev_lbl = panel.find_previous("div", class_="section-lbl")
        if prev_lbl:
            section_name = prev_lbl.get_text().replace("Section :", "").replace("Section:", "").strip() or section_name

        # B. Chosen Option and Internal IDs from Menu Table
        chosen: Optional[str] = None
        question_id: Optional[str] = None
        option_ids: List[str] = []
        menu_table = panel.find("table", class_="menu-tbl")
        if menu_table:
            menu_text = menu_table.get_text()
            match = re.search(r"Chosen Option\s*:\s*([A-Da-d0-9\-\-]+)", menu_text, re.IGNORECASE)
            if match:
                raw_chosen = match.group(1).strip().upper()
                if raw_chosen in letter_map:
                    chosen = letter_map[raw_chosen]
                elif raw_chosen in ["1", "2", "3", "4"]:
                    chosen = raw_chosen
                else:
                    chosen = None  # '--' or empty

            m_qid = re.search(r"Question ID\s*:\s*(\d+)", menu_text)
            if m_qid:
                question_id = m_qid.group(1)
            for opt_idx in range(1, 5):
                m_oid = re.search(rf"Option {opt_idx} ID\s*:\s*(\d+)", menu_text)
                if m_oid:
                    option_ids.append(m_oid.group(1))

        # C. Correct Option from Question Row Table
        correct = "N/A"
        right_elems = panel.find_all(lambda tag: tag.has_attr("class") and any("rightans" in c.lower() for c in tag["class"]))

        for r_elem in right_elems:
            r_text = r_elem.get_text().strip()
            # Match Option 1, Ans 1, 1., (1), Option A, etc.
            m = re.search(r"(?:Option\s*|Ans\s*|Q\.\d+\s*|^)\s*\(?([1-4A-D])\)?[\.\)]?", r_text, re.IGNORECASE)
            if m and m.group(1):
                v = m.group(1).upper()
                correct = letter_map.get(v, v)
                break

            tr_parent = r_elem.find_parent("tr")
            if tr_parent:
                tr_text = tr_parent.get_text().strip()
                tm = re.search(r"(?:Option\s*|Ans\s*|Q\.\d+\s*|^)\s*\(?([1-4A-D])\)?[\.\)]?", tr_text, re.IGNORECASE)
                if tm and tm.group(1):
                    v = tm.group(1).upper()
                    correct = letter_map.get(v, v)
                    break

        # Fallback for Correct Option: check for green tick image
        if correct == "N/A":
            tick_img = panel.find("img", src=re.compile(r"(?:tick|right|correct)", re.I))
            if tick_img:
                tr_parent = tick_img.find_parent("tr")
                if tr_parent:
                    tm = re.search(r"(?:Option\s*|Ans\s*|Q\.\d+\s*|^)\s*\(?([1-4A-D])\)?[\.\)]?", tr_parent.get_text().strip(), re.IGNORECASE)
                    if tm and tm.group(1):
                        v = tm.group(1).upper()
                        correct = letter_map.get(v, v)

        # Fallback: inspect each row in questionRowTbl sequentially
        if correct == "N/A":
            options_table = panel.find("table", class_="questionRowTbl") or panel
            option_row_idx = 0
            for r in options_table.find_all("tr"):
                if r.find_parent("table", class_="menu-tbl"):
                    continue
                r_txt = r.get_text().strip()
                # Check if this row is marked right
                is_right_row = (
                    r.find(lambda t: t.has_attr("class") and any("rightans" in c.lower() for c in t.get("class", [])))
                    or (r.has_attr("class") and any("rightans" in c.lower() for c in r.get("class", [])))
                    or r.find("img", src=re.compile(r"(?:tick|right|correct)", re.I))
                    or "✓" in r_txt
                )
                m_opt = re.search(r"(?:Option\s*|^\(?)([1-4A-D])\)?[\.\)]", r_txt, re.IGNORECASE)
                if m_opt:
                    opt_val = m_opt.group(1).upper()
                    if is_right_row:
                        correct = letter_map.get(opt_val, opt_val)
                        break
                elif is_right_row and option_row_idx > 0 and option_row_idx <= 4:
                    correct = str(option_row_idx)
                    break
                if not is_right_row and ("Option" in r_txt or len(r_txt) > 0):
                    option_row_idx += 1

        # Resolve any images to absolute URLs if base_url is present
        if base_url:
            for img in panel.find_all("img"):
                if img.get("src") and not img["src"].startswith(("http://", "https://", "data:")):
                    img["src"] = urljoin(base_url, img["src"])

        # D. Question Stem / Statement
        stem = ""
        q_row = panel.find("table", class_="questionRowTbl") or panel

        # Primary method: find td starting with Q.<number>
        q_num_td = q_row.find(lambda tag: tag.name == "td" and re.match(r"^Q\.\s*\d+", tag.get_text(strip=True)))
        if q_num_td:
            q_label = q_num_td.get_text(strip=True)
            stem_td = q_num_td.find_next_sibling("td")
            if stem_td:
                content = "".join(str(c) for c in stem_td.contents).strip()
                stem = content if re.match(r"^Q\.\s*\d+", content) else f"{q_label} {content}"

        # Robust Fallback for non-standard sheets
        if not stem:
            for td in q_row.find_all("td"):
                if td.find_parent("table", class_="menu-tbl"):
                    continue
                if td.has_attr("class") and any(c in ["rightAns", "wrngAns"] for c in td.get("class", [])):
                    continue
                txt = td.get_text(strip=True)
                if len(txt) > 5 and not any(k in txt for k in ["Question ID", "Chosen Option", "Status :", "Option 1 ID"]):
                    content = "".join(str(c) for c in td.contents).strip()
                    stem = content if re.match(r"^Q\.\s*\d+", content) else f"Q.{idx} {content}"
                    break

        if not stem:
            stem = f"Q.{idx}"

        # E. Option Texts
        option_texts = []
        ans_tds = q_row.find_all(
            lambda tag: tag.name == "td" and tag.has_attr("class") and any(c in ["rightAns", "wrngAns"] for c in tag.get("class", []))
        )
        if len(ans_tds) == 4:
            for atd in ans_tds:
                atd_copy = BeautifulSoup(str(atd), "html.parser").find("td")
                if atd_copy:
                    for img in atd_copy.find_all("img"):
                        src = (img.get("src") or "").lower()
                        cls = " ".join(img.get("class", [])).lower()
                        if "tick" in cls or "cross" in src or "tick" in src:
                            img.decompose()
                    opt_html = "".join(str(c) for c in atd_copy.contents).strip()
                    cleaned_opt = re.sub(r"^(?:Option\s*)?[A-Da-d1-4][\.\)]\s*", "", opt_html).strip()
                    option_texts.append(cleaned_opt or opt_html)

        # Fallback method: inspect all trs not in menu-tbl
        if len(option_texts) != 4:
            option_texts = []
            for tr in q_row.find_all("tr"):
                if tr.find_parent("table", class_="menu-tbl"):
                    continue
                tr_copy = BeautifulSoup(str(tr), "html.parser").find("tr")
                if not tr_copy:
                    continue
                for img in tr_copy.find_all("img"):
                    src = (img.get("src") or "").lower()
                    cls = " ".join(img.get("class", [])).lower()
                    if "tick" in cls or "cross" in src or "tick" in src:
                        img.decompose()
                t = "".join(str(c) for c in tr_copy.contents).strip()
                t_clean = re.sub(r"^(?:Ans\s*)", "", t, flags=re.IGNORECASE).strip()
                m = re.match(r"^(?:Option\s*)?([1-4A-D])[\.\)]\s*(.*)", t_clean, re.IGNORECASE)
                if m and len(option_texts) < 4:
                    option_texts.append(m.group(2).strip() or t_clean)

        questions.append({
            "qNo": idx,
            "section": section_name,
            "chosen": chosen,
            "correct": correct,
            "stem": stem,
            "optionTexts": option_texts if len(option_texts) == 4 else None,
            "questionId": question_id,
            "optionIds": option_ids,
        })

    return {
        "details": details,
        "questions": questions,
    }
