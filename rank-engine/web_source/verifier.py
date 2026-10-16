"""
web_source/verifier.py
======================
Source Match Verification and Tier Evaluation Engine.
Evaluates discovered sources against question stems and official answers,
classifying them into EXACT_MATCH, OFFICIAL_REFERENCE, RELATED_REFERENCE, or NOT_VERIFIED.
"""

from urllib.parse import urlparse
from typing import Dict, Any, Optional
from web_source.models import SourceVerification, MatchType, SourceTier

TIER_1_DOMAINS = {
    "gov.in", "nic.in", "pib.gov.in", "rbi.org.in", "isro.gov.in",
    "niti.gov.in", "eci.gov.in", "indiabudget.gov.in", "meity.gov.in",
    "mea.gov.in", "ramsar.org", "wto.org", "oca.asia", "bcci.tv",
    "iplt20.com", "icc-cricket.com", "olympics.com", "athleticsfederation.in",
    "prsindia.org", "goashipyard.in"
}

TIER_2_DOMAINS = {
    "testbook.com", "careers360.com", "jagranjosh.com", "indiabix.com",
    "byjus.com", "drishtiias.com", "insightsonindia.com", "gktoday.in",
    "vajiramandravi.com", "pmfias.com", "utkarsh.com"
}


def classify_source_tier(url: Optional[str]) -> SourceTier:
    """Classifies a URL into Tier 1 (Official), Tier 2 (Educational/Reference), or Tier 3 (Other)."""
    if not url:
        return 3
    try:
        parsed = urlparse(url)
        host = (parsed.netloc or "").lower()
        for d in TIER_1_DOMAINS:
            if host == d or host.endswith("." + d):
                return 1
        for d in TIER_2_DOMAINS:
            if host == d or host.endswith("." + d):
                return 2
        return 3
    except Exception:
        return 3


def sanitize_url(url: Optional[str]) -> Optional[str]:
    """Validates and ensures safety of external URLs."""
    if not url:
        return None
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return None
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return None
        return url
    except Exception:
        return None


def create_verification_record(
    match_type: MatchType = "NOT_VERIFIED",
    website_name: str = "Authoritative Public Archives",
    source_url: Optional[str] = None,
    source_title: str = "",
    source_type: str = "Official Reference",
    evidence_snippet: str = "",
    verification_reason: str = "",
    confidence: str = "high",
    verified_answer: str = "",
    source_tier: Optional[SourceTier] = None,
    # Backward compatibility keyword aliases
    status: Optional[str] = None,
    page_title: Optional[str] = None,
    match_reason: Optional[str] = None,
) -> SourceVerification:
    """Creates a validated SourceVerification model object with normalized attributes."""
    effective_match = status or match_type
    effective_title = page_title or source_title
    effective_reason = match_reason or verification_reason

    clean_url = sanitize_url(source_url)
    tier = source_tier or (classify_source_tier(clean_url) if clean_url else 3)

    return SourceVerification(
        match_type=effective_match,
        source_title=effective_title.strip(),
        source_url=clean_url if effective_match != "NOT_VERIFIED" else None,
        source_type=source_type.strip(),
        evidence_snippet=evidence_snippet.strip(),
        confidence=confidence if confidence in ["high", "medium", "low", "unverified"] else "high",
        verification_reason=effective_reason.strip(),
        website_name=website_name.strip(),
        verified_answer=verified_answer.strip(),
        source_tier=tier,
    )
