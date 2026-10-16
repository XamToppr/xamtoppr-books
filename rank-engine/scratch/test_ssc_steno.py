"""
scratch/test_ssc_steno.py
=========================
Dedicated Automated Verification Suite for SSC CBExams / Stenographer Response Sheet.
Verifies:
1. End-to-end API calculation with live test URL:
   https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs
2. Correct candidate metadata extraction:
   - Roll No: 226170020192
   - Candidate Name: SUNNY
   - Exam Level: Stenographer Grade C & D Examination, 2026
   - Test Date: 09 sep 2026
   - Shift / Time: 10:00 AM (Shift-1)
3. Question and scoring extraction across all 3 sections (200 total questions):
   - Correct: 99
   - Wrong: 51
   - Skipped / Unattempted: 50
   - Marking Scheme: +1.00 pos, -0.25 neg (SSC Stenographer)
   - Final Score: 86.25
   - Accuracy: 66.0%
   - Attempt Ratio: 75.0%
4. Section-wise scores:
   - Reasoning: 18 Correct, 5 Wrong, 27 Left, Score: 16.75 / 50
   - GA / Current Affairs: 20 Correct, 7 Wrong, 23 Left, Score: 18.25 / 50
   - English: 61 Correct, 39 Wrong, 0 Left, Score: 51.25 / 100
5. Image preservation:
   - All question stems and options contain absolute image URLs (https://sscexams.cbexams.com/...)
   - No image tag corruption.
6. Offline raw HTML calculation support.
"""

import sys
import json
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
TEST_URL = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"


def test_ssc_api_live_url():
    print("[1/3] Testing /api/calculate with live SSC CBExams URL...")
    payload = json.dumps({"url": TEST_URL, "exam": "AUTO"}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    assert data.get("success") is True, "API did not return success: True"

    details = data.get("details", {})
    assert "226170020192" in details.get("roll", ""), f"Unexpected roll: {details.get('roll')}"
    assert "SUNNY" in details.get("name", "").upper(), f"Unexpected name: {details.get('name')}"
    assert "09 sep 2026" in details.get("date", "").lower(), f"Unexpected date: {details.get('date')}"
    assert "Shift-1" in details.get("time", ""), f"Unexpected shift: {details.get('time')}"
    print(f"  -> Candidate Details PASS: Roll={details['roll']}, Name={details['name']}, Date={details['date']}, Shift={details['time']}")

    assert data.get("examTitle") == "SSC Stenographer", f"Expected 'SSC Stenographer', got '{data.get('examTitle')}'"
    assert data.get("pos") == 1.0, f"Expected pos 1.0, got {data.get('pos')}"
    assert data.get("neg") == 0.25, f"Expected neg 0.25, got {data.get('neg')}"

    assert data.get("totalQuestions") == 200, f"Expected 200 Qs, got {data.get('totalQuestions')}"
    assert data.get("totalCorrect") == 99, f"Expected 99 Correct, got {data.get('totalCorrect')}"
    assert data.get("totalWrong") == 51, f"Expected 51 Wrong, got {data.get('totalWrong')}"
    assert data.get("totalUnattempted") == 50, f"Expected 50 Unattempted, got {data.get('totalUnattempted')}"
    assert data.get("totalScore") == 86.25, f"Expected 86.25 Score, got {data.get('totalScore')}"
    assert data.get("accuracy") == 66.0, f"Expected 66.0 Accuracy, got {data.get('accuracy')}"
    assert data.get("attemptRatio") == 75.0, f"Expected 75.0 Attempt Ratio, got {data.get('attemptRatio')}"
    print(f"  -> Aggregate Scores PASS: 99 Correct, 51 Wrong, 50 Skipped, Score=86.25 (Acc={data['accuracy']}%, Attempt={data['attemptRatio']}%)")

    # Section verification
    secs = data.get("sections", {})
    assert "Reasoning" in secs, f"Missing Reasoning in sections: {list(secs.keys())}"
    assert secs["Reasoning"]["correct"] == 18
    assert secs["Reasoning"]["wrong"] == 5
    assert secs["Reasoning"]["unattempted"] == 27
    assert secs["Reasoning"]["score"] == 16.75

    assert "GA / Current Affairs" in secs, f"Missing GA in sections: {list(secs.keys())}"
    assert secs["GA / Current Affairs"]["correct"] == 20
    assert secs["GA / Current Affairs"]["wrong"] == 7
    assert secs["GA / Current Affairs"]["unattempted"] == 23
    assert secs["GA / Current Affairs"]["score"] == 18.25

    assert "English" in secs, f"Missing English in sections: {list(secs.keys())}"
    assert secs["English"]["correct"] == 61
    assert secs["English"]["wrong"] == 39
    assert secs["English"]["unattempted"] == 0
    assert secs["English"]["score"] == 51.25
    print("  -> Section Breakdown PASS: Reasoning (16.75), GA (18.25), English (51.25)")

    # Image preservation verification
    questions = data.get("questions", [])
    assert len(questions) == 200, "Questions array length mismatch"
    q1 = questions[0]
    assert "<img" in q1.get("stem", ""), "Question stem missing <img> tag"
    assert "https://sscexams.cbexams.com" in q1.get("stem", ""), "Question stem image URL is not absolute"
    assert q1.get("optionTexts") is not None and len(q1["optionTexts"]) == 4, "Option texts missing or not length 4"
    assert all("<img" in opt for opt in q1["optionTexts"]), "Option images missing"
    assert all("https://sscexams.cbexams.com" in opt for opt in q1["optionTexts"]), "Option images not absolute"
    print("  -> Image Integrity PASS: Absolute image URLs preserved across stems and options.")
    return data


def test_ssc_offline_raw_html():
    print("[2/3] Testing /api/calculate with offline concatenated raw HTML...")
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
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    assert data.get("totalQuestions") == 200
    assert data.get("totalCorrect") == 99
    assert data.get("totalWrong") == 51
    assert data.get("totalScore") == 86.25
    print("  -> Offline Raw HTML PASS: Exact match with live calculation.")


def test_schema_conformance():
    print("[3/3] Validating frontend schema conformance for scorecard rendering...")
    part_a = Path("scratch/ssc_part_a.html").read_text(encoding="utf-8")
    payload = json.dumps({"html": part_a, "exam": "AUTO"}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    # Required top-level fields for index.html UI
    required_keys = [
        "success", "details", "examTitle", "pos", "neg",
        "totalScore", "totalCorrect", "totalWrong", "totalUnattempted",
        "totalQuestions", "accuracy", "attemptRatio", "sections", "questions"
    ]
    for k in required_keys:
        assert k in data, f"Missing required top-level key: {k}"

    q = data["questions"][0]
    required_q_keys = [
        "qNo", "question_no", "section", "subject", "chosen", "selected_option",
        "correct", "correct_option", "stem", "question_text", "status", "cleanSection"
    ]
    for qk in required_q_keys:
        assert qk in q, f"Missing required question key: {qk}"

    print("  -> Frontend Schema Conformance PASS: All scorecard UI and normalized attributes present.")


def test_architectural_ncert_subject_isolation(ssc_data=None):
    print("[4/4] Verifying Architectural NCERT Subject Isolation & Data-Source Unity...")
    if not ssc_data:
        # Fetch live calculation for SSC Steno
        payload = json.dumps({"url": TEST_URL, "exam": "AUTO"}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/calculate",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=50) as resp:
            ssc_data = json.loads(resp.read().decode("utf-8"))

    questions = ssc_data.get("questions", [])
    q1 = next((q for q in questions if q["qNo"] == 1), None)
    assert q1 is not None, "Q1 not found in SSC questions"

    # 1. Single source of truth check: Subject detection
    assert q1.get("subject") == "Reasoning", f"Expected Q1 subject 'Reasoning', got '{q1.get('subject')}'"
    assert q1.get("cleanSection") == "Reasoning"
    assert q1.get("subject") != "Science", "Q1 must NOT be marked as Science!"

    # 2. NCERT mapping check: Q1 must not receive science mapping
    is_science = (q1.get("subject") == "Science")
    assert is_science is False, "Q1 is Reasoning and must evaluate isScience = False"

    # 3. Overall question set check: SSC Steno has 0 Science questions
    science_qs = [q for q in questions if q.get("subject") == "Science" or q.get("cleanSection") == "Science"]
    assert len(science_qs) == 0, f"Expected 0 Science questions in SSC Steno, found {len(science_qs)}"

    # 4. Verify RRB paper still correctly yields 25 Science questions
    REAL_RRB_URL = "https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html"
    rrb_payload = json.dumps({"url": REAL_RRB_URL, "exam": "AUTO"}).encode("utf-8")
    req_rrb = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=rrb_payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req_rrb, timeout=50) as resp:
        rrb_data = json.loads(resp.read().decode("utf-8"))

    rrb_qs = rrb_data.get("questions", [])
    rrb_sci_qs = [q for q in rrb_qs if q.get("subject") == "Science" or q.get("cleanSection") == "Science"]
    assert len(rrb_sci_qs) == 25, f"Expected 25 Science questions in RRB paper, found {len(rrb_sci_qs)}"
    rrb_q1 = next((q for q in rrb_qs if q["qNo"] == 1), None)
    assert rrb_q1 is not None and rrb_q1.get("subject") == "Science", "RRB Q1 must be Science"

    print("  -> Data-Source Unity PASS: Question Paper Audit subject drives NCERT mapping. SSC Q1 is Reasoning (0 Science Qs), RRB Q1 is Science (25 Science Qs).")


if __name__ == "__main__":
    try:
        ssc_data = test_ssc_api_live_url()
        test_ssc_offline_raw_html()
        test_schema_conformance()
        test_architectural_ncert_subject_isolation(ssc_data=ssc_data)
        print("\n" + "=" * 60)
        print("ALL SSC STENOGRAPHER TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
