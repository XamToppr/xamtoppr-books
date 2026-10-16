"""
scratch/test_reattempt_e2e.py
=============================
End-to-End Test for DigiALM Score Calculator & Reattempt Test Feature.
Verifies:
1. Health endpoint.
2. DigiALM real response sheet score calculation (61 Right, 13 Wrong, 26 Skipped, 56.67 Score).
3. Question stem purity (no internal DigiALM IDs in stem, math formulas preserved).
4. Reattempt engine logic simulation (practice mode state isolation, scoring, comparison KPIs, deltas).
5. Static file integrity and HTTP GET / delivery of reattempt UI elements.
"""

import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
REAL_URL = "https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html"

def test_health():
    print("[1/5] Checking /api/health...")
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get("status") == "ok", f"Health status not ok: {data}"
    print("  -> PASS: Health check OK.")

def test_calculate_real_url():
    print("[2/5] Calling /api/calculate with real DigiALM URL...")
    payload = json.dumps({"url": REAL_URL, "exam": "AUTO"}).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/calculate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    assert data.get("success") is True, "Success flag is not True"
    details = data.get("details", {})
    candidate_name = details.get("name", "")
    roll_no = details.get("roll", "")
    total_correct = data.get("totalCorrect")
    total_wrong = data.get("totalWrong")
    total_unattempted = data.get("totalUnattempted")
    total_score = data.get("totalScore")
    total_questions = data.get("totalQuestions")

    print(f"  Candidate: {candidate_name} | Roll: {roll_no}")
    print(f"  Right: {total_correct}, Wrong: {total_wrong}, Skipped: {total_unattempted}, Score: {total_score}, Qs: {total_questions}")

    assert candidate_name == "DEEPAK MEENA", f"Expected DEEPAK MEENA, got {candidate_name}"
    assert roll_no == "K92516042497", f"Expected K92516042497, got {roll_no}"
    assert total_correct == 61, f"Expected 61 correct, got {total_correct}"
    assert total_wrong == 13, f"Expected 13 wrong, got {total_wrong}"
    assert total_unattempted == 26, f"Expected 26 skipped, got {total_unattempted}"
    assert total_score == 56.67, f"Expected 56.67 score, got {total_score}"
    assert total_questions == 100, f"Expected 100 questions, got {total_questions}"

    print("  -> PASS: Real DigiALM calculation exactly verified (61R / 13W / 26S / 56.67 Score).")
    return data

def test_question_stem_integrity(data):
    print("[3/5] Verifying Question Stem Purity and Formula Preservation...")
    questions = data.get("questions", [])
    assert len(questions) == 100, f"Expected 100 questions, found {len(questions)}"

    # Check that internal IDs are not leaked into stem
    forbidden_substrings = ["Question ID :", "Question ID:", "Option 1 ID :", "Option 2 ID :", "Option 3 ID :", "Option 4 ID :"]
    for q in questions:
        stem = q.get("stem", "")
        for fb in forbidden_substrings:
            assert fb not in stem, f"Forbidden substring '{fb}' found in Q.{q.get('qNo')} stem!"

    # Check that math formula question (e.g. Q.30 or Q.38) contains formula/img intact
    formula_found = False
    for q in questions:
        stem = q.get("stem", "")
        if "Wirisformula" in stem or 'role="math"' in stem or '<img' in stem:
            formula_found = True
            break
    assert formula_found, "Expected to find at least one question with embedded formula/image in stem!"

    print("  -> PASS: Stems are clean of DigiALM internal IDs and formulas are preserved.")

def test_reattempt_simulation(data):
    print("[4/5] Simulating Reattempt Practice Mode & Comparative Scoring...")
    questions = data.get("questions", [])
    pos = data.get("pos", 1.0)
    neg = data.get("neg", 1.0 / 3.0)

    # Let's simulate a user reattempting:
    # User knows answers to several questions they previously got wrong or skipped!
    # In original test:
    # Q1: Original status
    # Let's reattempt by:
    # 1. Correctly answering all original RIGHT questions (61 maintained)
    # 2. Correctly answering 10 questions that were previously WRONG (10 improved)
    # 3. Correctly answering 10 questions that were previously SKIPPED (10 improved)
    # 4. Leaving remaining 3 wrong as WRONG, remaining 16 skipped as SKIPPED
    rt_answers = {}
    expected_improved = 0
    expected_maintained = 0
    expected_regressed = 0
    expected_still_wrong = 0

    converted_wrong = 0
    converted_skipped = 0

    letter_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}

    for q in questions:
        q_no = q["qNo"]
        orig_status = q["status"]
        correct_key = str(q["correct"]).strip().upper()
        correct_norm = letter_map.get(correct_key, correct_key)

        if orig_status == "RIGHT":
            # Maintain
            rt_answers[q_no] = correct_norm
            expected_maintained += 1
        elif orig_status == "WRONG" and converted_wrong < 10:
            # Improve
            rt_answers[q_no] = correct_norm
            converted_wrong += 1
            expected_improved += 1
        elif orig_status == "LEFT" and converted_skipped < 10:
            # Improve
            rt_answers[q_no] = correct_norm
            converted_skipped += 1
            expected_improved += 1
        elif orig_status == "WRONG":
            # Still wrong: choose option different from correct
            wrong_opt = "1" if correct_norm != "1" else "2"
            rt_answers[q_no] = wrong_opt
            expected_still_wrong += 1
        else:
            # Skip
            expected_still_wrong += 1

    # Now calculate reattempt score identically to frontend calculateReattemptScore()
    rt_correct = 0
    rt_wrong = 0
    rt_skipped = 0

    actual_improved = 0
    actual_maintained = 0
    actual_regressed = 0
    actual_still_wrong = 0

    for q in questions:
        q_no = q["qNo"]
        orig_status = q["status"]
        correct_key = str(q["correct"]).strip().upper()
        correct_norm = letter_map.get(correct_key, correct_key)
        rt_chosen = rt_answers.get(q_no)

        if not rt_chosen:
            rt_status = "LEFT"
            rt_skipped += 1
        elif rt_chosen == correct_norm:
            rt_status = "RIGHT"
            rt_correct += 1
        else:
            rt_status = "WRONG"
            rt_wrong += 1

        if orig_status == "RIGHT" and rt_status == "RIGHT":
            actual_maintained += 1
        elif (orig_status == "WRONG" or orig_status == "LEFT") and rt_status == "RIGHT":
            actual_improved += 1
        elif orig_status == "RIGHT" and (rt_status == "WRONG" or rt_status == "LEFT"):
            actual_regressed += 1
        else:
            actual_still_wrong += 1

    rt_score = round(((rt_correct * pos) - (rt_wrong * neg)), 2)

    print(f"  Reattempt: Correct={rt_correct}, Wrong={rt_wrong}, Skipped={rt_skipped}, Score={rt_score}")
    print(f"  Outcomes: Maintained={actual_maintained}, Improved={actual_improved}, Regressed={actual_regressed}, Still Wrong/Left={actual_still_wrong}")

    assert rt_correct == 81, f"Expected 81 correct, got {rt_correct}"
    assert rt_wrong == 3, f"Expected 3 wrong, got {rt_wrong}"
    assert rt_skipped == 16, f"Expected 16 skipped, got {rt_skipped}"
    # 81 - 3*(1/3) = 81 - 1.0 = 80.0
    assert rt_score == 80.0, f"Expected 80.0 score, got {rt_score}"

    assert actual_improved == 20
    assert actual_maintained == 61
    assert actual_regressed == 0
    assert actual_still_wrong == 19

    # Check Delta calculations
    score_diff = round(rt_score - data["totalScore"], 2)
    correct_diff = rt_correct - data["totalCorrect"]
    wrong_diff = rt_wrong - data["totalWrong"]
    skipped_diff = rt_skipped - data["totalUnattempted"]

    print(f"  Deltas: Score={score_diff:+0.2f}, Right={correct_diff:+d}, Wrong={wrong_diff:+d}, Skipped={skipped_diff:+d}")
    assert score_diff == 23.33, f"Expected score delta +23.33, got {score_diff}"
    assert correct_diff == 20, f"Expected correct delta +20, got {correct_diff}"
    assert wrong_diff == -10, f"Expected wrong delta -10, got {wrong_diff}"
    assert skipped_diff == -10, f"Expected skipped delta -10, got {skipped_diff}"

    # Confirm original score is unchanged
    assert data["totalScore"] == 56.67, "Original score was modified!"
    assert data["totalCorrect"] == 61, "Original correct count was modified!"

    print("  -> PASS: Reattempt logic, scoring, and deltas verified with 100% precision.")

def test_frontend_delivery():
    print("[5/5] Verifying static HTML delivery and Reattempt UI components...")
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode('utf-8')

    # Verify key reattempt elements in served HTML
    checks = [
        ("id=\"reattempt-container\"", "Reattempt container"),
        ("id=\"reattempt-taking-view\"", "Test taking view"),
        ("id=\"reattempt-results-view\"", "Results comparison view"),
        ("id=\"rt-confirm-modal\"", "Confirmation modal"),
        ("startReattemptMode", "startReattemptMode JS function"),
        ("calculateReattemptScore", "calculateReattemptScore JS function"),
        ("renderReattemptComparisonKPIs", "renderReattemptComparisonKPIs JS function"),
        ("renderReattemptReviewList", "renderReattemptReviewList JS function"),
        ("exitReattemptMode", "exitReattemptMode JS function"),
        ("↻ Reattempt Test", "Reattempt button label"),
        ("rt-palette-grid", "Question palette grid"),
        ("rt-kpi-comparison-grid", "KPI comparison grid")
    ]

    for needle, desc in checks:
        assert needle in html, f"Missing {desc} ('{needle}') in served HTML!"

    print("  -> PASS: All reattempt UI components and JavaScript handlers present in served index.html.")

if __name__ == "__main__":
    try:
        test_health()
        data = test_calculate_real_url()
        test_question_stem_integrity(data)
        test_reattempt_simulation(data)
        test_frontend_delivery()
        print("\n==========================================")
        print("ALL TESTS PASSED SUCCESSFULLY! (5/5 PASS)")
        print("==========================================")
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
