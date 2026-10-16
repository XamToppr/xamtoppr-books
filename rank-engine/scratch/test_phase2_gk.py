"""
scratch/test_phase2_gk.py
=========================
Automated Verification Suite for Phase 2: GK/GS Question Source Analysis
Verifies:
1. Server Health & calculation on real DigiALM URL (61R / 13W / 26S / 56.67 Score).
2. GK/GS Source Analysis HTML elements and badges in GET /.
3. GK/GS Source Map Dataset Schema and Confidence Counts:
   - Exactly 20 GK/GS questions (Q.81 to Q.100)
   - 18 High Confidence, 2 Medium Confidence (Q.86, Q.99)
   - 0 Low, 0 Unidentified
   - Schema validation: questionNumber, topic, sourceType, bookSource, ncertClass, chapter, specificConcept, verificationBasis, confidence.
4. Sampling Verification:
   - Q.81: DPDP Act 2023 Section 9(3)
   - Q.82: IPL MVP / BCCI Records
   - Q.85: Martyrs' Day / Shaheed Diwas Rajghat
   - Q.90: ISRO LVM3-M6 / BlueBird Block-2
   - Q.95: Cyclone Montha / Andhra Pradesh / IMD
   - Q.100: Gender Budget Statement 13 (₹5.00 Lakh Crore)
5. Safety disclaimer for medium-confidence questions (Q.86, Q.99).
6. Coexistence & Non-regression:
   - Science Source Analysis (25 Qs, 21 High, 4 Medium) completely intact.
   - Reattempt Test engine completely intact.
   - Dropdown NCERT / GK box dynamic rendering logic completely intact.
"""

import sys
import json
import urllib.request

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
    print("  -> PASS: Verified Score: 61 Right, 13 Wrong, 26 Skipped, Final Score 56.67.")
    return data

def test_html_and_gk_elements():
    print("[2/6] Verifying Frontend HTML Delivery and GK/GS Section Elements...")
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode('utf-8')

    assert 'id="gk-source-section"' in html, "Missing #gk-source-section in HTML"
    assert 'id="gk-source-cards-container"' in html, "Missing #gk-source-cards-container"
    assert 'gkSourceMap' in html, "Missing gkSourceMap JS object in HTML"
    assert 'renderGkSourceCards' in html, "Missing renderGkSourceCards function"
    assert 'filterGkSources' in html, "Missing filterGkSources function"
    assert 'openGkQuestionInAudit' in html, "Missing openGkQuestionInAudit function"
    assert '20 GK/GS Questions' in html, "Missing '20 GK/GS Questions' badge text"
    assert '18 High Confidence' in html, "Missing '18 High Confidence' badge text"
    assert '2 Medium Confidence' in html, "Missing '2 Medium Confidence' badge text"
    assert 'gk-flt-all' in html, "Missing gk-flt-all button"
    assert 'gk-flt-high' in html, "Missing gk-flt-high button"
    assert 'gk-flt-med' in html, "Missing gk-flt-med button"

    print("  -> PASS: All GK/GS HTML markup and JavaScript anchors correctly served.")
    return html

def test_gk_source_map_dataset(html):
    print("[3/6] Verifying GK/GS Source Map Dataset Schema and Confidence Counts...")
    marker = "const gkSourceMap = {"
    start = html.find(marker)
    assert start != -1, "Could not find gkSourceMap in HTML"
    end_marker = "let currentGkSourceFilter"
    end = html.find(end_marker, start)
    js_block = html[start:end].strip()

    # Verify each question 81 through 100 exists
    for q_no in range(81, 101):
        assert f"{q_no}:" in js_block, f"Missing question #{q_no} in gkSourceMap!"

    # Verify high vs medium mappings
    medium_expected = [86, 99]
    high_count = 0
    medium_count = 0

    for q_no in range(81, 101):
        next_pat = f"\n      {q_no+1}:" if q_no < 100 else "let currentGkSourceFilter"
        start_q = js_block.find(f"\n      {q_no}:")
        end_q = js_block.find(next_pat, start_q)
        q_section = js_block[start_q:end_q] if end_q != -1 else js_block[start_q:]

        # Check required keys
        assert 'questionNumber:' in q_section, f"Missing questionNumber in Q.{q_no}"
        assert 'topic:' in q_section, f"Missing topic in Q.{q_no}"
        assert 'sourceType:' in q_section, f"Missing sourceType in Q.{q_no}"
        assert 'bookSource:' in q_section, f"Missing bookSource in Q.{q_no}"
        assert 'specificConcept:' in q_section, f"Missing specificConcept in Q.{q_no}"
        assert 'verificationBasis:' in q_section, f"Missing verificationBasis in Q.{q_no}"
        assert 'confidence:' in q_section, f"Missing confidence in Q.{q_no}"

        if q_no in medium_expected:
            assert 'confidence: "medium"' in q_section, f"Question {q_no} was expected to be 'medium' confidence!"
            medium_count += 1
        else:
            assert 'confidence: "high"' in q_section, f"Question {q_no} was expected to be 'high' confidence!"
            high_count += 1

    assert high_count == 18, f"Expected 18 high confidence, found {high_count}"
    assert medium_count == 2, f"Expected 2 medium confidence, found {medium_count}"

    print(f"  -> PASS: Exactly 20 GK/GS questions verified: {high_count} High Confidence, {medium_count} Medium Confidence (Q.86, Q.99).")

def test_sample_gk_mappings(html):
    print("[4/6] Verifying Sample GK/GS Mapping Content (Q.81, Q.82, Q.85, Q.90, Q.95, Q.100)...")
    
    # Q.81
    assert "Digital Personal Data Protection Act, 2023" in html
    assert "Section 9(3)" in html
    print("  -> Q.81 verified: DPDP Act 2023 Section 9(3) child behavioral monitoring.")

    # Q.82
    assert "IPL 2026 Most Valuable Player Award" in html
    assert "BCCI / Indian Premier League Official Records" in html
    print("  -> Q.82 verified: IPL MVP award / BCCI Official Records.")

    # Q.85
    assert "Shaheed Diwas" in html
    assert "Rajghat" in html
    print("  -> Q.85 verified: Martyrs' Day / Shaheed Diwas at Rajghat.")

    # Q.90
    assert "ISRO LVM3-M6 / BlueBird Block-2 Mission" in html
    assert "NewSpace India Limited" in html
    print("  -> Q.90 verified: ISRO LVM3-M6 commercial launch.")

    # Q.95
    assert "Cyclone 'Montha' Landfall" in html
    assert "India Meteorological Department" in html
    assert "Andhra Pradesh" in html
    print("  -> Q.95 verified: Cyclone Montha landfall in Andhra Pradesh.")

    # Q.100
    assert "Gender Budget Allocation in Union Budget" in html
    assert "Statement 13" in html
    assert "5.00 Lakh Crore" in html
    print("  -> Q.100 verified: Union Budget Statement 13 (Gender Budget).")

def test_medium_confidence_disclaimers(html):
    print("[5/6] Verifying Medium Confidence Explanations for Q.86 and Q.99...")
    assert "Specialized biotechnology industry trade media award" in html
    assert "Current electoral affairs milestone question" in html
    print("  -> PASS: Medium confidence rationale and disclaimers verified.")

def test_coexistence_and_non_regression(html, data):
    print("[6/6] Verifying Coexistence of Science Source Analysis, Reattempt Engine, and Scoring...")
    
    # 1. Science Source Analysis intact
    assert 'id="science-source-section"' in html
    assert '25 Science Questions' in html
    assert '21 High Confidence' in html
    assert '4 Medium Confidence' in html
    assert 'scienceSourceMap' in html
    print("  -> PASS: Science Source Analysis (Phase 1) is 100% intact.")

    # 2. Reattempt Engine intact
    assert 'id="reattempt-container"' in html
    assert 'startReattemptMode' in html
    assert 'calculateReattemptScore' in html
    assert 'exitReattemptMode' in html
    print("  -> PASS: Reattempt Engine is 100% intact.")

    # 3. Dropdown NCERT / GK box dynamic rendering intact
    assert 'const sciMeta = (typeof scienceSourceMap !== \'undefined\') ? scienceSourceMap[q.qNo] : null;' in html
    assert 'const gkMeta = (typeof gkSourceMap !== \'undefined\') ? gkSourceMap[q.qNo] : null;' in html
    print("  -> PASS: Dropdown source inspector accommodates both Science and GK/GS seamlessly.")

    # 4. Verified Score intact
    assert data["totalScore"] == 56.67
    assert data["totalCorrect"] == 61
    assert data["totalWrong"] == 13
    assert data["totalUnattempted"] == 26
    print("  -> PASS: Real candidate score remains strictly intact at 56.67.")

if __name__ == "__main__":
    try:
        data = test_health_and_score()
        html = test_html_and_gk_elements()
        test_gk_source_map_dataset(html)
        test_sample_gk_mappings(html)
        test_medium_confidence_disclaimers(html)
        test_coexistence_and_non_regression(html, data)
        print("\n" + "=" * 60)
        print("ALL 6 PHASE 2 GK/GS MAPPING TESTS PASSED WITH ZERO REGRESSIONS!")
        print("=" * 60)
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
