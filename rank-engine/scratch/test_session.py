from bs4 import BeautifulSoup
from curl_cffi import requests
import re

url = "https://sscexams.cbexams.com/StenoCD2026QchallengeldjfosdfSEP09/ViewCandResponse.aspx?enckey=04dcdTRdodcddsfs"

session = requests.Session()
r1 = session.get(url, impersonate="chrome120")
print("R1 Status:", r1.status_code)
soup1 = BeautifulSoup(r1.text, "html.parser")
vs1 = soup1.find("input", id="__VIEWSTATE")["value"]
vsg1 = soup1.find("input", id="__VIEWSTATEGENERATOR")["value"]
ev1 = soup1.find("input", id="__EVENTVALIDATION")["value"]

print("Part A subject:", soup1.find(id="lblsubject").get_text(strip=True))
q1 = [f.get_text(strip=True) for f in soup1.find_all(lambda t: t.name == "font" and "Q.No" in t.get_text())]
print(f"Part A Qs: count={len(q1)}, first={q1[0]}, last={q1[-1]}")

# Fetch Part B
payload_b = {
    "__VIEWSTATE": vs1,
    "__VIEWSTATEGENERATOR": vsg1,
    "__EVENTVALIDATION": ev1,
    "P2": "Click Here for PART-B"
}
r2 = session.post(url, data=payload_b, impersonate="chrome120")
print("R2 Status:", r2.status_code)
soup2 = BeautifulSoup(r2.text, "html.parser")
vs2 = soup2.find("input", id="__VIEWSTATE")["value"]
vsg2 = soup2.find("input", id="__VIEWSTATEGENERATOR")["value"]
ev2 = soup2.find("input", id="__EVENTVALIDATION")["value"]

print("Part B subject:", soup2.find(id="lblsubject").get_text(strip=True))
q2 = [f.get_text(strip=True) for f in soup2.find_all(lambda t: t.name == "font" and "Q.No" in t.get_text())]
print(f"Part B Qs: count={len(q2)}, first={q2[0]}, last={q2[-1]}")

# Fetch Part C
payload_c = {
    "__VIEWSTATE": vs2,
    "__VIEWSTATEGENERATOR": vsg2,
    "__EVENTVALIDATION": ev2,
    "P3": "Click Here for PART-C"
}
r3 = session.post(url, data=payload_c, impersonate="chrome120")
print("R3 Status:", r3.status_code)
soup3 = BeautifulSoup(r3.text, "html.parser")
print("Part C subject:", soup3.find(id="lblsubject").get_text(strip=True))
q3 = [f.get_text(strip=True) for f in soup3.find_all(lambda t: t.name == "font" and "Q.No" in t.get_text())]
print(f"Part C Qs: count={len(q3)}, first={q3[0]}, last={q3[-1]}")
