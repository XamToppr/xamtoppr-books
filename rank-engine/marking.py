"""
marking.py
==========
Modular Exam Marking Scheme Engine for XamToppr Rank Calculator.
Supports Railway (RRB), SSC, Defence, and Teaching exams with official
positive/negative marking ratios and section score aggregation.
"""

import re
from typing import Dict, List, Tuple, Any

# Exam code to (positive_marks, negative_marks, display_name)
EXAM_MARKING_RULES: Dict[str, Tuple[float, float, str]] = {
    # ── Railway Recruitment Board (RRB) ──────────────────────────────────
    "RRB_GROUP_D": (1.0, 1.0 / 3.0, "RRB Group D (CBT 1)"),
    "RRB_NTPC_CBT1": (1.0, 1.0 / 3.0, "RRB NTPC CBT-1"),
    "RRB_NTPC_CBT2": (1.0, 1.0 / 3.0, "RRB NTPC CBT-2"),
    "RRB_ALP_CBT1": (1.0, 1.0 / 3.0, "RRB ALP CBT-1"),
    "RRB_ALP_CBT2": (1.0, 1.0 / 3.0, "RRB ALP CBT-2"),
    "RRB_JE": (1.0, 1.0 / 3.0, "RRB Junior Engineer (JE)"),
    "RRB_RPF": (1.0, 1.0 / 3.0, "RPF Constable & SI"),
    "RRB_PARAMEDICAL": (1.0, 1.0 / 3.0, "RRB Paramedical"),

    # ── Staff Selection Commission (SSC) ─────────────────────────────────
    "SSC_CGL_TIER1": (2.0, 0.50, "SSC CGL Tier-I"),
    "SSC_CGL_TIER2": (3.0, 1.00, "SSC CGL Tier-II (Mains)"),
    "SSC_CHSL_TIER1": (2.0, 0.50, "SSC CHSL Tier-I"),
    "SSC_CHSL_TIER2": (3.0, 1.00, "SSC CHSL Tier-II"),
    "SSC_MTS": (3.0, 1.00, "SSC MTS & Havaldar"),
    "SSC_GD": (2.0, 0.25, "SSC GD Constable"),
    "SSC_JE": (1.0, 0.25, "SSC JE (Junior Engineer)"),
    "SSC_CPO_TIER1": (2.0, 0.50, "SSC CPO Paper-I"),
    "SSC_CPO_TIER2": (2.0, 0.50, "SSC CPO Paper-II"),
    "SSC_STENO": (1.0, 0.25, "SSC Stenographer"),
    "SSC_JHT": (1.0, 0.25, "SSC Junior Hindi Translator"),
    "SSC_DELHI_POLICE": (2.0, 0.50, "SSC Delhi Police Constable"),
    "SSC_SELECTION_POST": (2.0, 0.50, "SSC Selection Post"),

    # ── Defence & Paramilitary ───────────────────────────────────────────
    "AFCAT": (3.0, 1.00, "AFCAT Exam"),
    "IAF_AGNIVEER": (1.0, 0.25, "IAF Agniveer (CASB)"),
    "NAVY_INET": (1.0, 0.25, "Indian Navy INET / Agniveer"),
    "PARAMILITARY": (1.0, 0.25, "SSB / ITBP / BSF / CISF"),

    # ── Teaching & Eligibility ───────────────────────────────────────────
    "UGC_NET": (2.0, 0.0, "UGC NET (No Negative)"),
    "CTET": (2.0, 0.0, "CTET (No Negative)"),
    "TEACHING_OTHER": (1.0, 0.0, "State TET / D.El.Ed"),
}


def clean_section_name(raw_name: str) -> str:
    """Normalizes raw section names into clean UI section buckets."""
    if not raw_name:
        return "General"
    s = raw_name.strip()
    s_upper = s.upper()

    if "SCIENCE" in s_upper:
        return "Science"
    elif "MATHEMATIC" in s_upper or "QUANT" in s_upper or "NUMERICAL" in s_upper:
        return "Quant / Maths"
    elif "INTELLIGENCE" in s_upper or "REASONING" in s_upper:
        return "Reasoning"
    elif "AWARENESS" in s_upper or "CURRENT" in s_upper or "GENERAL KNOWLEDGE" in s_upper:
        return "GA / Current Affairs"
    elif "ENGLISH" in s_upper or "COMPREHENSION" in s_upper:
        return "English"
    elif "HINDI" in s_upper:
        return "Hindi"
    elif "COMPUTER" in s_upper:
        return "Computer Knowledge"
    elif "TECHNICAL" in s_upper or "ENGINEERING" in s_upper:
        return "Technical"
    
    # Remove leading "Part A -", "Section :", etc.
    s = s.replace("Section :", "").replace("Section:", "").strip()
    if "-" in s:
        parts = s.split("-", 1)
        if len(parts[1].strip()) > 3:
            s = parts[1].strip()
    return s or "General"


def get_marking_scheme(exam_code: str, subject_hint: str = "") -> Tuple[float, float, str]:
    """
    Returns (positive_mark, negative_mark, display_title) based on exam code
    or subject keywords if set to AUTO.
    """
    exam_key = (exam_code or "AUTO").strip().upper()

    if exam_key != "AUTO" and exam_key in EXAM_MARKING_RULES:
        return EXAM_MARKING_RULES[exam_key]

    # Auto-detection from subject or exam name string
    hint = f"{exam_code} {subject_hint}".upper()

    if "TIER-II" in hint or "TIER 2" in hint or "MAINS" in hint:
        if "CGL" in hint or "CHSL" in hint:
            return (3.0, 1.00, "SSC Tier-II Mains")

    if "CGL" in hint or "COMBINED GRADUATE" in hint:
        return (2.0, 0.50, "SSC CGL Tier-I")
    if "CHSL" in hint or "COMBINED HIGHER" in hint:
        return (2.0, 0.50, "SSC CHSL Tier-I")
    if "GD" in hint:
        return (2.0, 0.25, "SSC GD Constable")
    if "MTS" in hint or "HAVALDAR" in hint:
        return (3.0, 1.00, "SSC MTS")
    if "JE" in hint or "JUNIOR ENGINEER" in hint:
        return (1.0, 0.25, "SSC JE")
    if "CPO" in hint:
        return (2.0, 0.50, "SSC CPO")
    if "STENO" in hint or "STENOGRAPHER" in hint:
        return (1.0, 0.25, "SSC Stenographer")
    if "AFCAT" in hint:
        return (3.0, 1.00, "AFCAT Exam")
    if "NET" in hint or "CTET" in hint or "TET" in hint:
        return (2.0, 0.0, "Teaching Exam (No Negative)")

    # Default fallback: RRB Group D / NTPC
    return (1.0, 1.0 / 3.0, "RRB Online Exam")


def calculate_scores(
    questions: List[Dict[str, Any]],
    pos: float,
    neg: float
) -> Dict[str, Any]:
    """
    Evaluates questions, calculates section-wise and overall scores,
    and returns comprehensive statistics.
    """
    sections: Dict[str, Dict[str, Any]] = {}
    total_correct = 0
    total_wrong = 0
    total_unattempted = 0

    for q in questions:
        raw_sec = q.get("section") or "General"
        clean_sec = clean_section_name(raw_sec)
        q["cleanSection"] = clean_sec
        q["subject"] = clean_sec
        q["question_no"] = q.get("qNo") or q.get("question_no") or 0
        q["question_text"] = q.get("stem") or q.get("question_text") or ""
        if "image_url" not in q:
            stem_str = q.get("stem") or ""
            m_img = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', stem_str, re.IGNORECASE)
            q["image_url"] = m_img.group(1) if m_img else None

        if clean_sec not in sections:
            sections[clean_sec] = {
                "total": 0,
                "correct": 0,
                "wrong": 0,
                "unattempted": 0,
                "score": 0.0,
            }
        sections[clean_sec]["total"] += 1

        chosen = str(q.get("chosen") or "").strip().upper()
        correct = str(q.get("correct") or "").strip().upper()

        # Check attempt status
        if not chosen or chosen in ["NONE", "--", "NULL", "", "-1"]:
            q["status"] = "LEFT"
            sections[clean_sec]["unattempted"] += 1
            total_unattempted += 1
        elif chosen == correct and correct not in ["N/A", "NONE", ""]:
            q["status"] = "RIGHT"
            sections[clean_sec]["correct"] += 1
            total_correct += 1
        else:
            q["status"] = "WRONG"
            sections[clean_sec]["wrong"] += 1
            total_wrong += 1

        q["selected_option"] = q.get("chosen")
        q["correct_option"] = q.get("correct")

    # Compute section scores
    total_score = 0.0
    for sec_name, s in sections.items():
        score = round((s["correct"] * pos) - (s["wrong"] * neg), 2)
        s["score"] = score
        total_score += score

    total_score = round(total_score, 2)
    attempts = total_correct + total_wrong
    accuracy = round((total_correct / attempts * 100), 1) if attempts > 0 else 0.0
    total_q = len(questions)
    attempt_ratio = round((attempts / total_q * 100), 1) if total_q > 0 else 0.0

    return {
        "total_score": total_score,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_unattempted": total_unattempted,
        "total_questions": total_q,
        "accuracy": accuracy,
        "attempt_ratio": attempt_ratio,
        "sections": sections,
    }
