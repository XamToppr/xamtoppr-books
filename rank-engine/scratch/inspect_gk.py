import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const gkSourceMap = {')
end = text.find('let currentGkSourceFilter', start)
js_block = text[start:end].strip()

keys_present = [q for q in range(81, 101) if f"{q}:" in js_block]
print(f"Total questions present in gkSourceMap: {len(keys_present)} (Expected 20: 81-100)")
print("Keys:", keys_present)

high_count = js_block.count('confidence: "high"')
med_count = js_block.count('confidence: "medium"')
low_count = js_block.count('confidence: "low"')
print(f"Confidence counts: High={high_count}, Medium={med_count}, Low={low_count}")

dom_loaded_pos = text.find('renderGkSourceCards()')
print("renderGkSourceCards() called in code:", dom_loaded_pos != -1)
