"""
web_source/cache.py
===================
Deterministic SHA-256 Question Fingerprinting & JSON File Cache for Web Source Verification.
Provides get/set methods to prevent redundant searches.
"""

import json
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

from web_source.models import SourceVerification, CacheEntry

CACHE_FILE_PATH = Path(__file__).resolve().parent.parent / "data" / "source_cache.json"


def normalize_question_stem(stem: str) -> str:
    """
    Normalizes a question stem for deterministic hashing:
    - Strips leading question labels like 'Q.81', 'Question 81', 'Q81'
    - Normalizes Unicode whitespace
    - Lowercases text
    - Strips extraneous trailing punctuation
    """
    if not stem:
        return ""
    # Remove HTML tags if present
    cleaned = re.sub(r"<[^>]+>", " ", stem)
    # Remove Q.81, Q 81, Question 81, etc.
    cleaned = re.sub(r"^(?:q(?:uestion)?\s*[\.\:\-]?\s*\d+\s*[\.\:\-]?\s*)", "", cleaned, flags=re.IGNORECASE)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


def compute_question_hash(stem: str) -> str:
    """Computes SHA-256 fingerprint from the normalized question stem."""
    normalized = normalize_question_stem(stem)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class SourceVerificationCache:
    """JSON file-backed persistent cache for web source verifications."""

    def __init__(self, cache_file: Optional[Path] = None):
        self.cache_file = cache_file or CACHE_FILE_PATH
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        """Loads cached verifications from disk."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception:
                self._cache = {}
        else:
            self._cache = {}

    def _save(self) -> None:
        """Persists the cache to disk safely with atomic write."""
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        temp_file = self.cache_file.with_suffix(".tmp")
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2, ensure_ascii=False)
            temp_file.replace(self.cache_file)
        except Exception:
            if temp_file.exists():
                temp_file.unlink(missing_ok=True)

    def get(self, stem: str) -> Optional[SourceVerification]:
        """Retrieves cached source verification for a given question stem."""
        q_hash = compute_question_hash(stem)
        entry_data = self._cache.get(q_hash)
        if entry_data and "sourceVerification" in entry_data:
            try:
                return SourceVerification(**entry_data["sourceVerification"])
            except Exception:
                return None
        return None

    def set(self, stem: str, verification: SourceVerification) -> None:
        """Stores a source verification into the cache."""
        q_hash = compute_question_hash(stem)
        now_str = datetime.now(timezone.utc).isoformat()
        entry = CacheEntry(
            question_hash=q_hash,
            question_text=stem.strip(),
            sourceVerification=verification,
            checked_at=now_str
        )
        self._cache[q_hash] = entry.model_dump()
        self._save()

    def count(self) -> int:
        """Returns total entries in cache."""
        return len(self._cache)

    def clear(self) -> None:
        """Clears memory and disk cache."""
        self._cache = {}
        if self.cache_file.exists():
            self.cache_file.unlink(missing_ok=True)


# Global singleton instance
source_cache = SourceVerificationCache()
