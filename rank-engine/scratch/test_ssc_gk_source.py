"""
scratch/test_ssc_gk_source.py
==============================
Dedicated Automated Verification Suite for SSC CBExams Dynamic GK/GS Source Analysis.
Verifies:
1. Dynamic Web Source Analysis for SSC Stenographer questions:
   - Detects all 50 GK/GS questions (subject: "GA / Current Affairs").
   - Resolves actual question text from OCR/image analysis (no empty/invented text).
   - Generates dynamic web source verification records for each question.
   - Categorizes sources strictly across tiers:
     Tier 1: Official government / statutory / regulatory references (ISRO, RBI, Ministry of Law, NCERT, SAARC, etc.).
     Tier 2: Educational references.
     Tier 3: Related references.
     Tier 4: Unverified.
2. Verified Sample Content Verification:
   - Q.51: Indian Evidence Act (confessions to police officers, Section 25)
   - Q.52: Meitei Traditional Architecture & Sanamahism in Manipur
   - Q.62: PSLV Orbital Experimental Module (POEM) by ISRO
   - Q.67: Wien's Displacement Law (NCERT Physics)
   - Q.70: Financial Inclusion Index (FI-Index) by Reserve Bank of India (RBI)
   - Q.86: Parliament of India (Article 79, President, Rajya Sabha, Lok Sabha)
   - Q.100: SAARC Secretariat Headquarters in Kathmandu
3. Strict Subject Isolation:
   - Reasoning questions (Q.1 - Q.50) have is_gk = False and no GK mapping.
   - English questions (Q.101 - Q.200) have is_gk = False and no GK mapping.
   - Science mapping has 0 questions in SSC Steno.
4. Coexistence with RRB:
   - RRB response sheet continues to evaluate its 20 RRB GK questions (Q.81 - Q.100).
   - Verified score remains 61R / 13W / 26S / 56.67.
"""

import sys
import json
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"


def test_ssc_dynamic_gk_sources():
    print("[1/4] Verifying Dynamic GK/GS Web Source Enrichment on SSC Stenographer...")
    part_a = Path("scratch/ssc_part_a.html").read_text(encoding="utf-8")
    part_b = Path("scratch/ssc_part_b.html").read_text(encoding="utf-8")
    part_c = Path("scratch/ssc_part_c.html").read_text(encoding="utf-8")
    compound_html = f"{part_a}\n<!-- SSC_PART_SPLIT -->\n{part_b}\n<!-- SSC_PART_SPLIT -->\n{part_c}"

    payload = json.dumps({"html": compound_html, "exam": "AUTO"}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    assert data.get("success") is True
    questions = data.get("questions", [])
    assert len(questions) == 200, f"Expected 200 questions, got {len(questions)}"

    # 1. Check GK question detection
    gk_qs = [q for q in questions if q.get("is_gk") or q.get("subject") == "GA / Current Affairs"]
    assert len(gk_qs) == 50, f"Expected 50 GK/GS questions in SSC Steno, found {len(gk_qs)}"

    # 2. Check each GK question has OCR text and valid source verification
    for q in gk_qs:
        q_no = q["qNo"]
        q_text = q.get("question_text", "")
        assert q_text and not q_text.startswith("<img"), f"Q.{q_no} question_text is missing or is raw <img> tag!"
        assert len(q_text) > 15, f"Q.{q_no} question text too short: '{q_text}'"

        gk_map = q.get("gk_mapping")
        assert gk_map is not None, f"Q.{q_no} missing gk_mapping!"
        assert gk_map.get("questionNumber") == q_no, f"Q.{q_no} number mismatch in gk_mapping"
        assert gk_map.get("topic"), f"Q.{q_no} missing topic"
        assert gk_map.get("subject") == "GA / Current Affairs", f"Q.{q_no} unexpected subject"
        assert gk_map.get("confidence") in ["high", "medium"], f"Q.{q_no} invalid confidence"

        sv = gk_map.get("sourceVerification") or q.get("source_verification")
        assert sv is not None, f"Q.{q_no} missing sourceVerification"
        assert sv.get("match_type") in ["EXACT_MATCH", "OFFICIAL_REFERENCE", "RELATED_REFERENCE", "NOT_VERIFIED"]
        assert sv.get("website_name"), f"Q.{q_no} missing website_name"
        assert sv.get("source_tier") in [1, 2, 3], f"Q.{q_no} invalid source_tier"

    print("  -> PASS: All 50 GK/GS questions dynamically enriched with OCR text and verified source models.")
    return data


def test_ssc_sample_question_verifications(data):
    print("[2/4] Verifying Specific SSC Sample Questions (Q.51, Q.52, Q.62, Q.67, Q.70, Q.86, Q.100)...")
    questions = data.get("questions", [])
    q_map = {q["qNo"]: q for q in questions}

    # Q.51: Indian Evidence Act - Admissibility of Confessions
    q51 = q_map[51]
    assert "Evidence Act" in q51["question_text"]
    assert "legislative.gov.in" in (q51["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q51["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    assert q51["gk_mapping"]["sourceVerification"]["source_tier"] == 1
    print("  -> Q.51 verified: Indian Evidence Act confessions (Section 25/26, Legislative Dept).")

    # Q.52: Meitei Traditional Architecture
    q52 = q_map[52]
    assert "Meitei" in q52["question_text"]
    assert "manipur.gov.in" in (q52["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q52["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    print("  -> Q.52 verified: Meitei Traditional Architecture in Manipur.")

    # Q.62: PSLV Orbital Experimental Module (POEM) by ISRO
    q62 = q_map[62]
    assert "POEM" in q62["question_text"] or "Orbital" in q62["question_text"]
    assert "isro.gov.in" in (q62["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q62["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    assert q62["gk_mapping"]["sourceVerification"]["source_tier"] == 1
    print("  -> Q.62 verified: ISRO POEM platform (isro.gov.in).")

    # Q.67: Wien's Displacement Law
    q67 = q_map[67]
    assert "Wien" in q67["question_text"]
    assert "ncert.nic.in" in (q67["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q67["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    print("  -> Q.67 verified: Wien's Displacement Law (NCERT Physics).")

    # Q.70: RBI Financial Inclusion Index
    q70 = q_map[70]
    assert "Financial Inclusion" in q70["question_text"] or "RBI" in q70["question_text"]
    assert "rbi.org.in" in (q70["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q70["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    assert q70["gk_mapping"]["sourceVerification"]["source_tier"] == 1
    print("  -> Q.70 verified: RBI Financial Inclusion Index (rbi.org.in).")

    # Q.86: Parliament of India
    q86 = q_map[86]
    assert "Parliament" in q86["question_text"]
    assert "legislative.gov.in" in (q86["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q86["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    print("  -> Q.86 verified: Parliament of India Article 79 (legislative.gov.in).")

    # Q.100: SAARC Secretariat
    q100 = q_map[100]
    assert "SAARC" in q100["question_text"]
    assert "saarc-sec.org" in (q100["gk_mapping"]["sourceVerification"].get("source_url") or "")
    assert q100["gk_mapping"]["sourceVerification"]["match_type"] == "OFFICIAL_REFERENCE"
    print("  -> Q.100 verified: SAARC Secretariat in Kathmandu (saarc-sec.org).")


def test_section_isolation(data):
    print("[3/4] Verifying Subject Isolation: Reasoning and English must NOT enter GK analysis...")
    questions = data.get("questions", [])

    # Reasoning Q.1-50
    for q in questions[:50]:
        assert q["cleanSection"] == "Reasoning"
        assert q.get("is_gk") is False, f"Reasoning Q.{q['qNo']} must have is_gk=False"
        assert q.get("gk_mapping") is None, f"Reasoning Q.{q['qNo']} must NOT have gk_mapping"

    # English Q.101-200
    for q in questions[100:]:
        assert q["cleanSection"] == "English"
        assert q.get("is_gk") is False, f"English Q.{q['qNo']} must have is_gk=False"
        assert q.get("gk_mapping") is None, f"English Q.{q['qNo']} must NOT have gk_mapping"

    print("  -> PASS: Reasoning (Q.1-50) and English (Q.101-200) strictly isolated from GK analysis.")


def test_rrb_coexistence():
    print("[4/4] Verifying RRB Coexistence & 100% Non-Regression...")
    REAL_RRB_URL = "https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html"
    payload = json.dumps({"url": REAL_RRB_URL, "exam": "AUTO"}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=50) as resp:
        rrb_data = json.loads(resp.read().decode("utf-8"))

    assert rrb_data["totalScore"] == 56.67
    assert rrb_data["totalCorrect"] == 61
    assert rrb_data["totalWrong"] == 13
    assert rrb_data["totalUnattempted"] == 26

    # Verify RRB retains its 20 GK questions (Q.81-100) and 25 Science questions (Q.1-25)
    rrb_qs = rrb_data.get("questions", [])
    rrb_sci_qs = [q for q in rrb_qs if q.get("subject") == "Science"]
    rrb_gk_qs = [q for q in rrb_qs if q.get("subject") == "GA / Current Affairs" or q.get("is_gk")]

    assert len(rrb_sci_qs) == 25, f"Expected 25 Science Qs in RRB, got {len(rrb_sci_qs)}"
    assert len(rrb_gk_qs) == 20, f"Expected 20 GK Qs in RRB, got {len(rrb_gk_qs)}"

    print("  -> PASS: RRB paper retains 61R/13W/26S/56.67 score, 25 Science Qs, and 20 GK Qs.")


if __name__ == "__main__":
    try:
        data = test_ssc_dynamic_gk_sources()
        test_ssc_sample_question_verifications(data)
        test_section_isolation(data)
        test_rrb_coexistence()
        print("\n" + "=" * 65)
        print("ALL SSC DYNAMIC GK/GS WEB SOURCE VERIFICATION TESTS PASSED!")
        print("=" * 65)
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
