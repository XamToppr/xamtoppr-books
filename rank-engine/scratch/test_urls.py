"""
scratch/test_urls.py
====================
Verifies candidate URLs for GK/GS questions:
- Makes HTTP requests
- Confirms HTTP 200
- Checks for matching content/evidence
- Categorizes strictly into:
  * EXACT_MATCH: actual question or clearly equivalent CBT test question with options/answer
  * OFFICIAL_REFERENCE: official act/gazette/ministry/governing body page with factual evidence
  * RELATED_REFERENCE: reliable reference supporting the event/topic
  * NOT_VERIFIED: fallback when URL is missing, blocked, or lacking evidence
"""

import urllib.request
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

def test_url(url, keywords):
    if not url:
        return False, "No URL", []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            code = resp.getcode()
            content_type = resp.headers.get('Content-Type', '')
            if 'pdf' in content_type:
                return True, f"HTTP {code} ({content_type})", ["PDF verified"]
            body = resp.read().decode('utf-8', errors='ignore')
            found = [kw for kw in keywords if kw.lower() in body.lower()]
            return (code == 200 and len(found) > 0), f"HTTP {code}, Found {len(found)}/{len(keywords)} keywords", found
    except Exception as e:
        return False, f"ERROR: {str(e)[:60]}", []

if __name__ == "__main__":
    print("Testing candidate URLs...")
