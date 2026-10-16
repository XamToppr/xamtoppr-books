"""
web_source
==========
Modular Web Source Verification Engine for XamToppr.
Includes:
- models.py: Pydantic schemas for verification states & cache entries
- cache.py: Deterministic SHA-256 fingerprinting & JSON cache
- verifier.py: Match classifier & source tier evaluation
- search.py: Server-side search & resolution
"""

from web_source.models import SourceVerification, VerificationStatus, SourceTier
from web_source.cache import source_cache, compute_question_hash
from web_source.verifier import create_verification_record, sanitize_url, classify_source_tier
from web_source.search import search_and_verify_question, populate_initial_cache, VERIFIED_KNOWLEDGE_BASE
from web_source.dynamic_ssc import enrich_gk_question_sources

__all__ = [
    "SourceVerification",
    "VerificationStatus",
    "SourceTier",
    "source_cache",
    "compute_question_hash",
    "create_verification_record",
    "sanitize_url",
    "classify_source_tier",
    "search_and_verify_question",
    "populate_initial_cache",
    "VERIFIED_KNOWLEDGE_BASE",
    "enrich_gk_question_sources",
]
