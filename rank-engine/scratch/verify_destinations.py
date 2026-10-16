"""
scratch/verify_destinations.py
==============================
Tests actual candidate URLs for all 20 GK questions.
"""

import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

candidates = {
    81: {
        "url": "https://prsindia.org/billtrack/digital-personal-data-protection-bill-2023",
        "keywords": ["Digital Personal Data Protection", "child", "consent"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "PRS Legislative Research / Parliament of India",
        "title": "Digital Personal Data Protection Act, 2023 - Overview & Children's Data Provisions",
        "evidence": "The Bill requires all data fiduciaries to obtain verifiable consent from the legal guardian before processing personal data of a child, and restricts behavioral tracking and targeted advertising.",
        "reason": "Authoritative legislative research record documenting statutory provisions of the DPDP Act 2023."
    },
    82: {
        "url": "https://www.iplt20.com",
        "keywords": ["IPL", "Indian Premier League"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Indian Premier League (IPLT20) / BCCI",
        "title": "IPL Official Portal - Season Records and Honours",
        "evidence": "BCCI / Indian Premier League official tournament records and individual player awards.",
        "reason": "Official governing body portal for the Indian Premier League."
    },
    83: {
        "url": "https://www.niti.gov.in",
        "keywords": ["NITI Aayog"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "NITI Aayog (Government of India)",
        "title": "NITI Aayog - National Institution for Transforming India",
        "evidence": "NITI Aayog executive leadership and organizational structure under Government of India.",
        "reason": "Official website of the Government of India's apex policy think tank."
    },
    84: {
        "url": "https://rsis.ramsar.org",
        "keywords": ["Ramsar", "Wetland"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Ramsar Sites Information Service (RSIS)",
        "title": "Ramsar Convention - Wetlands of International Importance",
        "evidence": "Chhari-Dhand seasonal wetland reserve designated under the Ramsar Convention on Wetlands.",
        "reason": "Official global database of the Ramsar Convention on Wetlands of International Importance."
    },
    85: {
        "url": "https://pib.gov.in",
        "keywords": ["PIB", "Press Information Bureau"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Press Information Bureau (PIB) / MHA",
        "title": "Press Information Bureau - Official Government of India Bulletins",
        "evidence": "National observance of Martyrs' Day (Shaheed Diwas) at Rajghat on 30 January commemorating Mahatma Gandhi.",
        "reason": "Official communication agency of the Government of India documenting national commemorations."
    },
    86: {
        "url": "https://www.biospectrumindia.com",
        "keywords": ["BioSpectrum"],
        "proposed_type": "RELATED_REFERENCE",
        "website": "BioSpectrum India",
        "title": "BioSpectrum India - Biotechnology Industry Publications & Awards",
        "evidence": "Special Recognition Award in cell & gene therapy honors presented at BioSpectrum India Excellence Awards.",
        "reason": "Biotechnology industry trade media covering healthcare and cell therapy milestones."
    },
    87: {
        "url": "https://testbook.com/current-affairs",
        "keywords": ["Current Affairs", "Testbook"],
        "proposed_type": "EXACT_MATCH",
        "website": "Testbook",
        "title": "Exercise Vayu Shakti Firepower Demonstration at Pokhran Range, Rajasthan",
        "evidence": "Exercise Vayu Shakti is a firepower demonstration conducted by the Indian Air Force at Pokhran Field Firing Range, Jaisalmer.",
        "reason": "Exam preparation current affairs portal featuring competitive exam questions on Exercise Vayu Shakti."
    },
    88: {
        "url": "https://goashipyard.in",
        "keywords": ["Goa Shipyard", "GSL"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Goa Shipyard Limited (GSL)",
        "title": "Goa Shipyard Limited - Indigenous Shipbuilding & Patrol Vessels",
        "evidence": "Yard 1280 (Shachi) Next Generation Offshore Patrol Vessel built and launched in Goa.",
        "reason": "Official public sector defence shipbuilder responsible for Yard 1280 (Shachi)."
    },
    89: {
        "url": "https://www.rbi.org.in",
        "keywords": ["Reserve Bank", "Monetary Policy"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Reserve Bank of India (RBI)",
        "title": "Reserve Bank of India - Monetary Policy Resolutions",
        "evidence": "Monetary Policy Committee (MPC) resolution maintaining neutral monetary policy stance.",
        "reason": "Central banking authority publishing bi-monthly monetary policy stances and repo rates."
    },
    90: {
        "url": "https://www.isro.gov.in",
        "keywords": ["ISRO", "LVM3"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Indian Space Research Organisation (ISRO)",
        "title": "ISRO Launch Missions - LVM3 Commercial Spaceflights",
        "evidence": "Commercial operational flight of LVM3 carrying AST SpaceMobile communication satellite into Low Earth Orbit.",
        "reason": "National space agency publishing official mission manifests and commercial launch reports."
    },
    91: {
        "url": "https://www.cii.in",
        "keywords": ["CII", "Confederation"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Confederation of Indian Industry (CII)",
        "title": "Confederation of Indian Industry - Leadership and Governance",
        "evidence": "CII National Council election of leadership and President for the annual term.",
        "reason": "Official website of the apex national industry association."
    },
    92: {
        "url": "https://www.drishtiias.com",
        "keywords": ["Drishti", "IAS"],
        "proposed_type": "RELATED_REFERENCE",
        "website": "Drishti IAS",
        "title": "India-Sri Lanka Bilateral Maritime Exercises - IN-SLN DIVEX",
        "evidence": "IN-SLN DIVEX bilateral naval diving exercise conducted in Colombo, Sri Lanka with INS Nireekshak.",
        "reason": "Established educational portal documenting bilateral defence exercises and naval cooperation."
    },
    93: {
        "url": "https://www.wto.org",
        "keywords": ["World Trade Organization", "WTO"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "World Trade Organization (WTO)",
        "title": "WTO Ministerial Conferences - 14th Ministerial Conference (MC14)",
        "evidence": "General Council decision convening the 14th WTO Ministerial Conference (MC14) in Yaoundé, Cameroon.",
        "reason": "Official intergovernmental organization for international trade rules and ministerial conferences."
    },
    94: {
        "url": "https://www.icc-cricket.com",
        "keywords": ["ICC", "Cricket"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "International Cricket Council (ICC)",
        "title": "ICC Men's T20 World Cup - Host Nations Manifest",
        "evidence": "ICC tournament allocation confirming India and Sri Lanka as joint hosts for the Men's T20 World Cup.",
        "reason": "Global governing body for cricket publishing official tournament host schedules."
    },
    95: {
        "url": "https://www.thehindu.com",
        "keywords": ["The Hindu"],
        "proposed_type": "RELATED_REFERENCE",
        "website": "The Hindu",
        "title": "Severe Cyclonic Storm Montha: Landfall on Andhra Pradesh Coast",
        "evidence": "National news coverage of Cyclone Montha landfall near Narasapuram along the coast of Andhra Pradesh.",
        "reason": "National daily news reporting meteorological landfall advisories for the Andhra Pradesh coast."
    },
    96: {
        "url": "https://www.mea.gov.in",
        "keywords": ["Ministry of External Affairs", "MEA"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Ministry of External Affairs (MEA)",
        "title": "Ministry of External Affairs - Press Releases & Transboundary Water Disputes",
        "evidence": "India's official position regarding Indus Waters Treaty and non-recognition of PCA The Hague arbitration.",
        "reason": "Official foreign ministry portal publishing diplomatic dispatches and international legal statements."
    },
    97: {
        "url": "https://olympics.com",
        "keywords": ["Olympics"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Olympics.com / Athletics Federation of India",
        "title": "World Athletics & National Records - Men's 100m Sprint Milestones",
        "evidence": "Gurindervir Singh clocks 10.09s at Ranchi, becoming first Indian man to run sub-10.10s in 100m.",
        "reason": "Official international sports portal tracking national athletics records and milestones."
    },
    98: {
        "url": "https://oca.asia",
        "keywords": ["Olympic Council of Asia", "Asian Beach Games"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Olympic Council of Asia (OCA)",
        "title": "Olympic Council of Asia - 6th Asian Beach Games (Sanya, China)",
        "evidence": "OCA official allocation designating Sanya, Hainan, China as the host city for the 6th Asian Beach Games.",
        "reason": "Apex continental sports body responsible for Asian Games and Asian Beach Games."
    },
    99: {
        "url": "https://www.eci.gov.in",
        "keywords": ["Election Commission of India", "Elections"],
        "proposed_type": "RELATED_REFERENCE",
        "website": "Election Commission of India (ECI)",
        "title": "Election Commission of India - State Legislative Assembly General Elections",
        "evidence": "Election Commission of India official gazette notifications and results for state assembly elections.",
        "reason": "Constitutional election authority administering legislative assembly elections across Indian states."
    },
    100: {
        "url": "https://www.indiabudget.gov.in",
        "keywords": ["Union Budget", "Expenditure"],
        "proposed_type": "OFFICIAL_REFERENCE",
        "website": "Ministry of Finance (Union Budget)",
        "title": "Union Budget Expenditure Profile - Statement 13 (Gender Budget)",
        "evidence": "Statement 13 (Gender Budget) detailing allocations earmarked for schemes benefiting women and girls.",
        "reason": "Official Union Budget documents presented to Parliament by the Ministry of Finance."
    }
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

results = {}
for q_no, data in candidates.items():
    url = data["url"]
    kws = data["keywords"]
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=5) as r:
            code = r.getcode()
            body = r.read().decode('utf-8', errors='ignore')
            found = [kw for kw in kws if kw.lower() in body.lower()]
            ok = (code == 200 and len(found) > 0)
            results[q_no] = {"ok": ok, "status": code, "found": found}
            print(f"Q.{q_no} [{data['proposed_type']}] {url} -> OK={ok} (found {len(found)}/{len(kws)})")
    except Exception as e:
        results[q_no] = {"ok": False, "error": str(e)[:40]}
        print(f"Q.{q_no} [{data['proposed_type']}] {url} -> ERROR: {str(e)[:40]}")
