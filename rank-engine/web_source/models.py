"""
web_source/models.py
====================
Pydantic data models for GK/GS Web Source Verification.
Supports the 4 rigorous source classifications:
- EXACT_MATCH: Actual question or equivalent test question
- OFFICIAL_REFERENCE: Official statutory/government/regulatory reference documenting the underlying fact
- RELATED_REFERENCE: External reference supporting topic/event
- NOT_VERIFIED: Source not conclusively verified
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator

MatchType = Literal[
    "EXACT_MATCH",
    "OFFICIAL_REFERENCE",
    "RELATED_REFERENCE",
    "NOT_VERIFIED",
    # Backward-compatible aliases
    "STRONG_MATCH",
    "RELATED_SOURCE",
]
VerificationStatus = MatchType
SourceTier = Literal[1, 2, 3]


class SourceVerification(BaseModel):
    match_type: MatchType = Field(alias="status", default="NOT_VERIFIED", description="Verification classification")
    source_title: str = Field(alias="pageTitle", default="", description="Title or headline of the page")
    source_url: Optional[str] = Field(alias="sourceUrl", default=None, description="Direct URL to verified page")
    source_type: str = Field(alias="sourceType", default="Official Reference", description="Type of source document")
    evidence_snippet: str = Field(alias="evidence", default="", description="Specific quoted evidence from page")
    confidence: Literal["high", "medium", "low", "unverified"] = Field(default="high", description="Source confidence")
    verification_reason: str = Field(alias="matchReason", default="", description="Reason for match classification")
    website_name: str = Field(alias="websiteName", default="Authoritative Public Archives", description="Organization name")
    verified_answer: str = Field(alias="verifiedAnswer", default="", description="Answer/fact validated")
    source_tier: SourceTier = Field(alias="sourceTier", default=1, description="Tier 1 (Official), Tier 2 (Edu), Tier 3 (Other)")

    @model_validator(mode="after")
    def normalize_status(self):
        # Normalize legacy aliases
        if self.match_type == "STRONG_MATCH":
            self.match_type = "OFFICIAL_REFERENCE"
        elif self.match_type == "RELATED_SOURCE":
            self.match_type = "RELATED_REFERENCE"
        return self

    class Config:
        populate_by_name = True


class CacheEntry(BaseModel):
    question_hash: str
    question_text: str
    sourceVerification: SourceVerification
    checked_at: str
