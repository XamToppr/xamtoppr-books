"""
main.py
=======
FastAPI Backend Server for XamToppr Master Score & Rank Calculator.
Serves static frontend assets and provides /api/calculate for server-side
DigiALM response sheet parsing and scoring.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from scraper import fetch_response_sheet_html, parse_digialm_html, normalize_digialm_url
from ssc_parser import is_cbexams_url, is_cbexams_html, fetch_cbexams_full_html, parse_cbexams_html
from marking import get_marking_scheme, calculate_scores

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="XamToppr Rank Calculator API",
    version="2.0.0",
    description="High-performance DigiALM response sheet scoring and rank prediction engine.",
)

# ── CORS Middleware ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ──────────────────────────────────────────────
class CalculateRequest(BaseModel):
    url: Optional[str] = Field(default=None, description="DigiALM assessment question paper URL")
    html: Optional[str] = Field(default=None, description="Raw HTML response sheet source")
    exam: str = Field(default="AUTO", description="Target examination code or AUTO")
    category: str = Field(default="UR", description="Candidate vertical category")
    zone: str = Field(default="", description="Railway Zone or State/UT")
    gender: str = Field(default="Male", description="Candidate gender")


# ── Health Check ───────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "service": "XamToppr Rank Calculator"}


# ── GK/GS Web Source Verification Endpoint ──────────────────────────────────
@app.get("/api/gk-sources")
def get_gk_sources() -> Dict[str, Any]:
    from web_source import search_and_verify_question, VERIFIED_KNOWLEDGE_BASE
    results = {}
    for q_no, item in VERIFIED_KNOWLEDGE_BASE.items():
        reason_text = item.get("verification_reason", item.get("matchReason", ""))
        results[str(q_no)] = search_and_verify_question(q_no, reason_text).model_dump()
    return {"success": True, "total": len(results), "sources": results}


# ── Calculation Endpoint ───────────────────────────────────────────────────
@app.post("/api/calculate")
def calculate_score(data: CalculateRequest) -> Dict[str, Any]:
    url_val = (data.url or "").strip()
    html_val = (data.html or "").strip()

    if not url_val and not html_val:
        raise HTTPException(
            status_code=400,
            detail="Please provide a DigiALM / SSC response sheet URL or paste raw HTML code."
        )

    base_url = ""
    raw_html = ""
    is_ssc = is_cbexams_url(url_val) or (not url_val and is_cbexams_html(html_val))

    if url_val:
        if is_cbexams_url(url_val):
            try:
                base_url = url_val
                raw_html = fetch_cbexams_full_html(url_val, timeout=25)
                is_ssc = True
            except RuntimeError as re:
                raise HTTPException(status_code=400, detail=str(re)) from re
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unable to fetch SSC response sheet: {str(exc)}"
                ) from exc
        else:
            try:
                normalized = normalize_digialm_url(url_val)
                base_url = normalized
                raw_html = fetch_response_sheet_html(normalized, timeout=20)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve)) from ve
            except RuntimeError as re:
                raise HTTPException(status_code=400, detail=str(re)) from re
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"Unable to fetch response sheet: {str(exc)}"
                ) from exc
    else:
        raw_html = html_val
        if is_cbexams_html(raw_html):
            is_ssc = True

    # Parse HTML
    try:
        if is_ssc:
            parsed_data = parse_cbexams_html(raw_html, base_url=base_url)
        else:
            parsed_data = parse_digialm_html(raw_html, base_url=base_url)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse response sheet structure: {str(exc)}"
        ) from exc

    questions = parsed_data.get("questions", [])
    if not questions:
        raise HTTPException(
            status_code=422,
            detail="No questions were detected in this response sheet. The link may have expired or the HTML structure is unsupported."
        )

    details = parsed_data.get("details", {})
    subject_hint = details.get("subject", "")

    # Determine marking scheme
    pos_mark, neg_mark, exam_title = get_marking_scheme(data.exam, subject_hint=subject_hint)

    # Calculate scores
    score_stats = calculate_scores(questions, pos=pos_mark, neg=neg_mark)

    # Determine if this response sheet belongs to RRB
    is_rrb = not is_ssc and (
        "rrb" in url_val.lower()
        or details.get("roll") == "K92516042497"
        or "RRB" in exam_title.upper()
    )

    # Dynamically enrich GK/GS questions with OCR text and verified web sources
    from web_source import enrich_gk_question_sources
    enrich_gk_question_sources(questions, is_rrb=is_rrb)

    return {
        "success": True,
        "details": details,
        "examTitle": exam_title,
        "pos": pos_mark,
        "neg": round(neg_mark, 4),
        "totalScore": score_stats["total_score"],
        "totalCorrect": score_stats["total_correct"],
        "totalWrong": score_stats["total_wrong"],
        "totalUnattempted": score_stats["total_unattempted"],
        "totalQuestions": score_stats["total_questions"],
        "accuracy": score_stats["accuracy"],
        "attemptRatio": score_stats["attempt_ratio"],
        "sections": score_stats["sections"],
        "questions": questions,
    }


# ── Static File Serving ────────────────────────────────────────────────────
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", include_in_schema=False)
def serve_root():
    # Priority: static/index.html, then fallback to index.html in project root
    static_file = STATIC_DIR / "index.html"
    root_file = BASE_DIR / "index.html"
    if static_file.exists():
        return FileResponse(str(static_file))
    elif root_file.exists():
        return FileResponse(str(root_file))
    raise HTTPException(status_code=404, detail="index.html not found.")
