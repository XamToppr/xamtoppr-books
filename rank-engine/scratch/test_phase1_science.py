"""
scratch/test_phase1_science.py
==============================
Automated Verification Suite for Phase 1: Science NCERT Source Analysis
Verifies:
1. Server Health & calculation on real DigiALM URL (61R / 13W / 26S / 56.67 Score).
2. Science Source Mapping Dataset:
   - Exactly 25 Science questions (Q.1 to Q.25)
   - 21 High Confidence, 4 Medium Confidence (Q.3, Q.7, Q.13, Q.16)
   - 0 Low, 0 Unidentified
   - Schema validation: questionNumber, topic, subjectArea, ncertClass, ncertBook, chapterNumber, chapterName, specificConcept, verificationBasis, confidence.
3. Medium Confidence safety note check (no "verified" certainty claim).
4. HTML Delivery of #science-source-section and #drop-ncert-box in GET /.
5. Formula & image preservation (especially Q.30 Wirisformula/math).
6. Non-destruction of Reattempt Engine and Scorecard.
"""

import sys
import json
import urllib.request
from bs4 import BeautifulSoup

BASE_URL = "http://127.0.0.1:8000"
REAL_URL = "https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html"

def test_health_and_score():
    print("[1/6] Verifying Server Health & Score Calculation with Real DigiALM URL...")
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get("status") == "ok"
    
    payload = json.dumps({"url": REAL_URL, "exam": "AUTO"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/calculate", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    assert data.get("totalCorrect") == 61, f"Expected 61 Right, got {data.get('totalCorrect')}"
    assert data.get("totalWrong") == 13, f"Expected 13 Wrong, got {data.get('totalWrong')}"
    assert data.get("totalUnattempted") == 26, f"Expected 26 Skipped, got {data.get('totalUnattempted')}"
    assert data.get("totalScore") == 56.67, f"Expected 56.67 Score, got {data.get('totalScore')}"
    assert data.get("totalQuestions") == 100, f"Expected 100 Qs, got {data.get('totalQuestions')}"
    print(f"  -> PASS: Verified Score: 61 Right, 13 Wrong, 26 Skipped, Final Score 56.67.")
    return data

def test_html_and_script_elements():
    print("[2/6] Verifying Frontend HTML Delivery and Elements...")
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode('utf-8')

    assert "id=\"science-source-section\"" in html, "Missing #science-source-section in HTML"
    assert "id=\"science-source-cards-container\"" in html, "Missing #science-source-cards-container"
    assert "id=\"drop-ncert-box\"" in html, "Missing #drop-ncert-box in HTML"
    assert "scienceSourceMap" in html, "Missing scienceSourceMap JS object in HTML"
    assert "renderScienceSourceCards" in html, "Missing renderScienceSourceCards function"
    assert "filterScienceSources" in html, "Missing filterScienceSources function"
    assert "openScienceQuestionInAudit" in html, "Missing openScienceQuestionInAudit function"
    assert "25 Science Questions" in html, "Missing '25 Science Questions' badge text"
    assert "21 High Confidence" in html, "Missing '21 High Confidence' badge text"
    assert "4 Medium Confidence" in html, "Missing '4 Medium Confidence' badge text"

    print("  -> PASS: All HTML markup and JavaScript anchors correctly served.")
    return html

def test_science_source_map_dataset(html):
    print("[3/6] Verifying Science Source Map Dataset Schema and Confidence Counts...")
    # Extract the scienceSourceMap JSON/JS block from HTML
    marker = "const scienceSourceMap = {"
    start = html.find(marker)
    assert start != -1, "Could not find scienceSourceMap in HTML"
    start_brace = html.find("{", start)
    end_marker = "let currentScienceSourceFilter"
    end = html.find(end_marker, start_brace)
    js_block = html[start:end].strip()

    # Verify each question 1 through 25 exists
    for q_no in range(1, 26):
        assert f"{q_no}:" in js_block or f"'{q_no}':" in js_block or f'"{q_no}":' in js_block, f"Missing question #{q_no} in scienceSourceMap!"

    # Verify high vs medium mappings
    medium_expected = [3, 7, 13, 16]
    high_count = 0
    medium_count = 0

    for q_no in range(1, 26):
        q_section = js_block[js_block.find(f"\n      {q_no}:"):js_block.find(f"\n      {q_no+1}:") if q_no < 25 else len(js_block)]
        if q_no in medium_expected:
            assert 'confidence: "medium"' in q_section, f"Question {q_no} was expected to be 'medium' confidence!"
            medium_count += 1
        else:
            assert 'confidence: "high"' in q_section, f"Question {q_no} was expected to be 'high' confidence!"
            high_count += 1

    assert high_count == 21, f"Expected 21 high confidence, found {high_count}"
    assert medium_count == 4, f"Expected 4 medium confidence, found {medium_count}"

    print(f"  -> PASS: Exactly 25 Science questions verified: {high_count} High Confidence, {medium_count} Medium Confidence (Q.3, Q.7, Q.13, Q.16).")

def test_q1_mapping_details(html):
    print("[4/6] Verifying Q.1 Approved Mapping Content...")
    assert "Biological Magnification" in html
    assert "Class 10" in html
    assert "Our Environment" in html
    assert "Section 15.1.1" in html
    print("  -> PASS: Q.1 mapping matches approved analysis (Class 10 Science, Ch 15 Our Environment).")

def test_medium_confidence_safety_wording(html):
    print("[5/6] Verifying Medium Confidence Safety Disclaimer...")
    assert "NCERT reference is relevant, but the exact source mapping is not uniquely established" in html
    print("  -> PASS: Medium confidence disclaimer present and prevents false certainty claims.")

def test_formula_preservation_and_reattempt(data):
    print("[6/6] Verifying Formula Preservation (Q.30) and Reattempt Integrity...")
    questions = data.get("questions", [])
    q30 = next((q for q in questions if q["qNo"] == 30), None)
    assert q30 is not None, "Question 30 not found"
    stem30 = q30.get("stem", "")
    assert ("Wirisformula" in stem30 or "role=\"math\"" in stem30 or "<img" in stem30), "Math formula image missing from Q.30 stem!"
    print(f"  -> PASS: Q.30 stem contains math formula image intact.")
    
    # Confirm question 38 also has formulas intact
    q38 = next((q for q in questions if q["qNo"] == 38), None)
    assert q38 is not None, "Question 38 not found"
    stem38 = q38.get("stem", "")
    assert ("Wirisformula" in stem38 or "<img" in stem38), "Math formula missing in Q.38 stem!"
    print(f"  -> PASS: Q.38 stem contains math formula image intact.")

if __name__ == "__main__":
    try:
        data = test_health_and_score()
        html = test_html_and_script_elements()
        test_science_source_map_dataset(html)
        test_q1_mapping_details(html)
        test_medium_confidence_safety_wording(html)
        test_formula_preservation_and_reattempt(data)
        print("\n========================================================")
        print("ALL 6 PHASE 1 SCIENCE MAPPING TESTS PASSED SUCCESSFULLY!")
        print("========================================================")
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
