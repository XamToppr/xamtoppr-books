from curl_cffi import requests
from bs4 import BeautifulSoup

url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"

session = requests.Session()
r1 = session.get(url, impersonate="chrome120")
with open("scratch/ssc_part_a.html", "w", encoding="utf-8") as f:
    f.write(r1.text)

soup1 = BeautifulSoup(r1.text, "html.parser")
vs1 = soup1.find("input", id="__VIEWSTATE")["value"]
vsg1 = soup1.find("input", id="__VIEWSTATEGENERATOR")["value"]
ev1 = soup1.find("input", id="__EVENTVALIDATION")["value"]

# Fetch Part B
r2 = session.post(url, data={
    "__VIEWSTATE": vs1,
    "__VIEWSTATEGENERATOR": vsg1,
    "__EVENTVALIDATION": ev1,
    "P2": "Click Here for PART-B"
}, impersonate="chrome120")
with open("scratch/ssc_part_b.html", "w", encoding="utf-8") as f:
    f.write(r2.text)

# Fetch Part C
r3 = session.post(url, data={
    "__VIEWSTATE": vs1,
    "__VIEWSTATEGENERATOR": vsg1,
    "__EVENTVALIDATION": ev1,
    "P3": "Click Here for PART-C"
}, impersonate="chrome120")
with open("scratch/ssc_part_c.html", "w", encoding="utf-8") as f:
    f.write(r3.text)

print("Saved all 3 parts successfully!")
