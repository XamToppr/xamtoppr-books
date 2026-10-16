"""
scratch/test_all_urls.py
========================
Tests real HTTP responses for candidate URLs for all 20 GK questions.
"""

import urllib.request
import re

candidate_sources = {
    81: {
        "url": "https://prsindia.org/billtrack/digital-personal-data-protection-bill-2023",
        "keywords": ["Digital Personal Data Protection", "children", "consent"]
    },
    82: {
        "url": "https://www.iplt20.com",
        "keywords": ["IPL", "Indian Premier League"]
    },
    83: {
        "url": "https://www.niti.gov.in",
        "keywords": ["NITI Aayog", "National Institution"]
    },
    84: {
        "url": "https://www.gujarattourism.com/kutch/wetlands/chhari-dhand.html",
        "keywords": ["Chhari", "Dhand", "wetland"]
    },
    85: {
        "url": "https://www.drishtiias.com/daily-updates/daily-news-analysis/martyrs-day",
        "keywords": ["Martyrs' Day", "Rajghat", "Gandhiji"]
    },
    86: {
        "url": "https://www.biospectrumindia.com",
        "keywords": ["BioSpectrum", "Excellence Awards"]
    },
    87: {
        "url": "https://presidentofindia.gov.in",
        "keywords": ["President", "India"]
    },
    88: {
        "url": "https://goashipyard.in",
        "keywords": ["Goa Shipyard", "vessels"]
    },
    89: {
        "url": "https://www.rbi.org.in",
        "keywords": ["Reserve Bank", "Monetary Policy"]
    },
    90: {
        "url": "https://www.isro.gov.in",
        "keywords": ["ISRO", "LVM3"]
    },
    91: {
        "url": "https://www.cii.in",
        "keywords": ["Confederation of Indian Industry", "CII"]
    },
    92: {
        "url": "https://www.drishtiias.com/daily-updates/daily-news-analysis/bilateral-exercises",
        "keywords": ["Navy", "Exercise"]
    },
    93: {
        "url": "https://www.wto.org",
        "keywords": ["World Trade Organization", "Ministerial Conference"]
    },
    94: {
        "url": "https://www.icc-cricket.com",
        "keywords": ["ICC", "T20 World Cup"]
    },
    95: {
        "url": "https://mausam.imd.gov.in",
        "keywords": ["India Meteorological Department", "Cyclone"]
    },
    96: {
        "url": "https://www.mea.gov.in",
        "keywords": ["Ministry of External Affairs", "Indus"]
    },
    97: {
        "url": "https://olympics.com",
        "keywords": ["Olympics", "athletics"]
    },
    98: {
        "url": "https://oca.asia",
        "keywords": ["Olympic Council of Asia", "Asian Beach Games"]
    },
    99: {
        "url": "https://www.eci.gov.in",
        "keywords": ["Election Commission of India", "Elections"]
    },
    100: {
        "url": "https://www.indiabudget.gov.in",
        "keywords": ["Union Budget", "Expenditure"]
    }
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

for q_no, data in candidate_sources.items():
    url = data["url"]
    kws = data["keywords"]
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as r:
            code = r.getcode()
            body = r.read().decode('utf-8', errors='ignore')
            found = [kw for kw in kws if kw.lower() in body.lower()]
            print(f"Q.{q_no} {url} -> HTTP {code}, found {len(found)}/{len(kws)} {found}")
    except Exception as e:
        print(f"Q.{q_no} {url} -> ERROR: {str(e)[:50]}")
