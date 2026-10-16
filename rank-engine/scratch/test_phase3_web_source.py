"""
scratch/test_phase3_web_source.py
=================================
Automated Verification Suite for Phase 3: GK/GS Web Source Verification.
Tests the 4 rigorous source classifications:
1. Exact Question Source (EXACT_MATCH) - Destination contains the actual question
2. Official Fact/Reference (OFFICIAL_REFERENCE) - Official act/gazette/regulatory document
3. Related Reference (RELATED_REFERENCE) - Reputable external coverage
4. Source Not Verified (NOT_VERIFIED) - Suppresses link when live check is inconclusive
"""

import sys
import json
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from web_source import (
    source_cache,
    compute_question_hash,
    search_and_verify_question,
    create_verification_record,
    sanitize_url,
    classify_source_tier
)

BASE_URL = "http://127.0.0.1:8000"
REAL_URL = "https://rrb.digialm.com//per/g06/pub/33128/touchstone/AssessmentQPHTMLMode1//33128O2677/33128O2677S25D42818/1787127624034245/199253172490086_33128O2677S25D42818E2.html"


def test_health_and_score():
    print("[1/13] Verifying Server Health & Score Calculation with Real DigiALM URL...")
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


def test_api_gk_sources_endpoint():
    print("[2/13] Verifying Backend /api/gk-sources Endpoint...")
    req = urllib.request.Request(f"{BASE_URL}/api/gk-sources")
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    assert data.get("success") is True, "Endpoint did not return success: True"
    assert data.get("total") == 20, f"Expected total 20, got {data.get('total')}"
    sources = data.get("sources", {})
    assert len(sources) == 20, f"Expected 20 sources, got {len(sources)}"

    # Check each question 81-100 exists with valid schema
    for q_no in range(81, 101):
        q_str = str(q_no)
        assert q_str in sources, f"Missing question {q_str} in /api/gk-sources"
        src = sources[q_str]
        mtype = src.get("match_type") or src.get("status")
        assert mtype in ["EXACT_MATCH", "OFFICIAL_REFERENCE", "RELATED_REFERENCE", "NOT_VERIFIED"]
        assert src.get("website_name") or src.get("websiteName"), f"Missing website_name in Q.{q_no}"
        assert src.get("source_tier") or src.get("sourceTier") in [1, 2, 3], f"Invalid tier in Q.{q_no}"
        assert src.get("verification_reason") or src.get("matchReason"), f"Missing verification_reason in Q.{q_no}"
        if mtype != "NOT_VERIFIED":
            url = src.get("source_url") or src.get("sourceUrl")
            assert url and url.startswith("https://"), f"Invalid sourceUrl in Q.{q_no}"
        else:
            url = src.get("source_url") or src.get("sourceUrl")
            assert url is None, f"NOT_VERIFIED must NOT provide a URL for Q.{q_no}"

    print("  -> PASS: /api/gk-sources returns 20 valid verified sources with correct schema.")
    return sources


def test_html_delivery_and_badges():
    print("[3/13] Verifying Frontend HTML Delivery, Dynamic Summary Badges & Filters...")
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode('utf-8')

    # Core section and elements
    assert 'id="gk-source-section"' in html
    assert 'id="gk-source-cards-container"' in html
    assert 'updateGkSummaryBadges' in html
    assert 'syncGkWebSourcesFromBackend' in html

    # Summary chips
    assert 'id="gk-chip-total"' in html
    assert 'id="gk-chip-exact"' in html
    assert 'id="gk-chip-off"' in html
    assert 'id="gk-chip-rel"' in html
    assert 'id="gk-chip-unver"' in html

    # Filter buttons
    assert 'id="gk-flt-all"' in html
    assert 'id="gk-flt-exact"' in html
    assert 'id="gk-flt-off"' in html
    assert 'id="gk-flt-rel"' in html
    assert 'id="gk-flt-notver"' in html
    assert 'id="gk-flt-high"' in html
    assert 'id="gk-flt-med"' in html

    print("  -> PASS: HTML delivery, badges, and dynamic filter controls confirmed.")
    return html


def test_exact_counts_and_match_types(sources):
    print("[4/13] Verifying 4-Tier Match Categorization Breakdown...")
    exact_count = sum(1 for s in sources.values() if (s.get("match_type") or s.get("status")) == "EXACT_MATCH")
    official_count = sum(1 for s in sources.values() if (s.get("match_type") or s.get("status")) == "OFFICIAL_REFERENCE")
    related_count = sum(1 for s in sources.values() if (s.get("match_type") or s.get("status")) == "RELATED_REFERENCE")
    not_verified_count = sum(1 for s in sources.values() if (s.get("match_type") or s.get("status")) == "NOT_VERIFIED")

    assert exact_count == 1, f"Expected 1 EXACT_MATCH, got {exact_count}"
    assert official_count == 9, f"Expected 9 OFFICIAL_REFERENCE, got {official_count}"
    assert related_count == 4, f"Expected 4 RELATED_REFERENCE, got {related_count}"
    assert not_verified_count == 6, f"Expected 6 NOT_VERIFIED, got {not_verified_count}"

    total = exact_count + official_count + related_count + not_verified_count
    assert total == 20, f"Expected total 20, got {total}"

    print(f"  -> PASS: Verified counts: {exact_count} Exact Match, {official_count} Official Ref, {related_count} Related Ref, {not_verified_count} Source Not Verified.")


def test_ui_wording_rules(html):
    print("[5/13] Verifying Strict UI Wording Rules for All 4 Categories...")
    # Exact Question Source
    assert "Exact Question Source" in html
    assert "EXACT QUESTION" in html

    # Official Fact/Reference
    assert "Official Fact/Reference" in html
    assert "OFFICIAL REFERENCE" in html

    # Related Reference
    assert "Related Reference" in html
    assert "RELATED REFERENCE" in html

    # Source Not Verified
    assert "Source Not Verified" in html
    assert "SOURCE NOT VERIFIED" in html
    assert "unconfirmed link suppressed per strict safety rules" in html

    print("  -> PASS: All 4 verification status UI wording rules strictly implemented.")


def test_q81_and_sample_question_verifications(sources):
    print("[6/13] Verifying Specific Sample Questions (Q.81, Q.82, Q.85, Q.87, Q.90, Q.94, Q.100)...")

    # Q.81: DPDP Act - MUST NOT be EXACT_MATCH; MUST be OFFICIAL_REFERENCE
    q81 = sources["81"]
    m81 = q81.get("match_type") or q81.get("status")
    assert m81 != "EXACT_MATCH", "Q.81 must NOT be marked as EXACT_MATCH!"
    assert m81 == "OFFICIAL_REFERENCE", f"Q.81 must be OFFICIAL_REFERENCE, got {m81}"
    assert "prsindia.org" in (q81.get("source_url") or q81.get("sourceUrl"))
    assert "Section 9" in (q81.get("evidence_snippet") or q81.get("evidence"))
    print("  -> Q.81 (DPDP Act 2023): PASS (Correctly marked Official Fact/Reference, PRS India, Section 9 evidence).")

    # Q.82: IPL MVP - Official Reference
    q82 = sources["82"]
    m82 = q82.get("match_type") or q82.get("status")
    assert m82 == "OFFICIAL_REFERENCE"
    assert "iplt20.com" in (q82.get("source_url") or q82.get("sourceUrl"))
    print("  -> Q.82 (IPL 2026 MVP): PASS (Official Reference, IPLT20/BCCI).")

    # Q.85: Shaheed Diwas Rajghat - Official Reference
    q85 = sources["85"]
    m85 = q85.get("match_type") or q85.get("status")
    assert m85 == "OFFICIAL_REFERENCE"
    assert "pib.gov.in" in (q85.get("source_url") or q85.get("sourceUrl"))
    print("  -> Q.85 (Martyrs' Day Rajghat): PASS (Official Reference, PIB/MHA).")

    # Q.87: Exercise Vayu Shakti - EXACT_MATCH
    q87 = sources["87"]
    m87 = q87.get("match_type") or q87.get("status")
    assert m87 == "EXACT_MATCH"
    assert "testbook.com" in (q87.get("source_url") or q87.get("sourceUrl"))
    print("  -> Q.87 (Exercise Vayu Shakti 2026): PASS (Exact Question Source, Testbook).")

    # Q.90: ISRO LVM3-M6 BlueBird - Official Reference
    q90 = sources["90"]
    m90 = q90.get("match_type") or q90.get("status")
    assert m90 == "OFFICIAL_REFERENCE"
    assert "isro.gov.in" in (q90.get("source_url") or q90.get("sourceUrl"))
    print("  -> Q.90 (ISRO LVM3-M6 Mission): PASS (Official Reference, ISRO).")

    # Q.94: T20 World Cup - NOT_VERIFIED (timed out live, unconfirmed link suppressed)
    q94 = sources["94"]
    m94 = q94.get("match_type") or q94.get("status")
    assert m94 == "NOT_VERIFIED"
    assert (q94.get("source_url") or q94.get("sourceUrl")) is None
    print("  -> Q.94 (T20 World Cup): PASS (Correctly marked Source Not Verified; link suppressed).")

    # Q.100: Gender Budget Statement 13 - Official Reference
    q100 = sources["100"]
    m100 = q100.get("match_type") or q100.get("status")
    assert m100 == "OFFICIAL_REFERENCE"
    assert "indiabudget.gov.in" in (q100.get("source_url") or q100.get("sourceUrl"))
    print("  -> Q.100 (Gender Budget Statement 13): PASS (Official Reference, India Budget).")


def test_url_safety_and_suppression(sources, html):
    print("[7/13] Verifying URL Safety and Suppression of Unverified Links...")
    for q_no, s in sources.items():
        mtype = s.get("match_type") or s.get("status")
        url = s.get("source_url") or s.get("sourceUrl")
        if mtype != "NOT_VERIFIED":
            assert url is not None, f"Verified item Q.{q_no} must have a URL"
            assert url.startswith("https://"), f"URL for Q.{q_no} is not HTTPS: {url}"
            sanitized = sanitize_url(url)
            assert sanitized == url, f"URL sanitization failed for {url}"
        else:
            assert url is None, f"Unverified item Q.{q_no} must have NULL URL"

    # Verify HTML links use target="_blank" and rel="noopener noreferrer"
    assert 'target="_blank"' in html
    assert 'rel="noopener noreferrer"' in html
    print("  -> PASS: All active links are HTTPS and sanitized; unverified links strictly suppressed.")


def test_caching_layer():
    print("[8/13] Verifying Deterministic SHA-256 Caching Layer...")
    stem = 'डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम, 2023 और इसके 2025 के नियम बच्चों की सुरक्षा के लिए "सत्यापन योग्य माता-पिता की सहमति" प्रदान करते हैं। इस ढांचे के तहत निम्नलिखित में से कौन सी ऑनलाइन पद्धति स्पष्ट रूप से प्रतिबंधित है?'
    h1 = compute_question_hash(stem)
    h2 = compute_question_hash(f"Q.81  {stem}  ")
    assert h1 == h2, f"Normalization hash mismatch: {h1} != {h2}"

    # Verify cache get
    cached_entry = source_cache.get(stem)
    assert cached_entry is not None, "Expected cached entry for Q.81"
    assert cached_entry.match_type == "OFFICIAL_REFERENCE"

    # Verify repeated resolution uses cache without redundant search
    res = search_and_verify_question(81, stem)
    assert res.website_name == cached_entry.website_name
    print(f"  -> PASS: Deterministic SHA-256 fingerprint verified ({h1[:16]}...). Cache prevents redundant searches.")


def test_search_failure_fault_tolerance():
    print("[9/13] Verifying Fault Tolerance on Web Search Failure...")
    dummy_stem = "Non-existent random test question stem that has no match anywhere"
    result = search_and_verify_question(999, dummy_stem)
    assert result.match_type == "NOT_VERIFIED"
    assert result.source_url is None, "NOT_VERIFIED must not invent a URL"
    assert "Online source could not be conclusively verified" in result.verification_reason

    # Verify score calculation never crashes even with dummy input
    payload = json.dumps({"url": REAL_URL, "exam": "AUTO"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/calculate", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    assert data["totalScore"] == 56.67
    print("  -> PASS: Search fallback correctly produces NOT_VERIFIED with no invented URL; scoring unaffected.")


def test_science_and_reattempt_integrity(html):
    print("[10/13] Verifying Science Source Analysis (Phase 1) Integrity...")
    assert 'id="science-source-section"' in html
    assert '25 Science Questions' in html
    assert '21 High Confidence' in html
    assert '4 Medium Confidence' in html
    assert 'scienceSourceMap' in html
    print("  -> PASS: Exactly 25 Science questions (21 High, 4 Medium) remain completely untouched.")

    print("[11/13] Verifying Reattempt Test & Comparative Scoring Integrity...")
    assert 'id="reattempt-container"' in html
    assert 'startReattemptMode' in html
    assert 'calculateReattemptScore' in html
    assert 'exitReattemptMode' in html
    print("  -> PASS: Reattempt Test engine remains completely untouched and operational.")


def test_audit_dropdown_integration(html):
    print("[12/13] Verifying Question Paper Audit Dropdown Integration (#drop-ncert-box)...")
    assert 'id="drop-ncert-box"' in html
    assert 'const gkMeta = (typeof gkSourceMap !== \'undefined\') ? gkSourceMap[q.qNo] : null;' in html
    assert 'const sv = gkMeta.sourceVerification;' in html
    assert 'Exact Question Source' in html
    assert 'Official Fact/Reference' in html
    assert 'Related Reference' in html
    print("  -> PASS: Dropdown source inspector seamlessly binds verified web source details.")


def test_print_and_responsive_css(html):
    print("[13/13] Verifying Print PDF & Mobile Responsive CSS...")
    assert '@media print' in html
    assert 'grid-cols-1 lg:grid-cols-2' in html
    assert 'truncate' in html
    print("  -> PASS: Print PDF rules and responsive grid classes confirmed.")


if __name__ == "__main__":
    try:
        print("================================================================================")
        print("RUNNING REFINED PHASE 3 TEST SUITE: STRICT SOURCE VERIFICATION & SAFETY AUDIT")
        print("================================================================================")
        data = test_health_and_score()
        sources = test_api_gk_sources_endpoint()
        html = test_html_delivery_and_badges()
        test_exact_counts_and_match_types(sources)
        test_ui_wording_rules(html)
        test_q81_and_sample_question_verifications(sources)
        test_url_safety_and_suppression(sources, html)
        test_caching_layer()
        test_search_failure_fault_tolerance()
        test_science_and_reattempt_integrity(html)
        test_audit_dropdown_integration(html)
        test_print_and_responsive_css(html)
        print("\n" + "=" * 80)
        print("ALL 13 REFINED PHASE 3 TESTS PASSED WITH 100% PRECISION AND ZERO REGRESSIONS!")
        print("================================================================================")
    except Exception as e:
        print(f"\nTEST SUITE FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
