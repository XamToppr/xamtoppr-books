with open('static/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
idx = text.find('id="result-container"')
print('result-container starts at char:', idx)
pos = idx
depth = 0
while pos < len(text):
    m = re.search(r'</?div\b', text[pos:])
    if not m: break
    pos += m.start()
    tag = m.group(0)
    if tag == '<div':
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            line_no = text[:pos].count('\n') + 1
            print(f'result-container closes at line {line_no}: {text[pos:pos+100]!r}')
            break
    pos += len(tag)

idx2 = text.find('id="reattempt-container"')
print('reattempt-container starts at char:', idx2)
pos = idx2
depth = 0
while pos < len(text):
    m = re.search(r'</?div\b', text[pos:])
    if not m: break
    pos += m.start()
    tag = m.group(0)
    if tag == '<div':
        depth += 1
    else:
        depth -= 1
        if depth == 0:
            line_no = text[:pos].count('\n') + 1
            print(f'reattempt-container closes at line {line_no}: {text[pos:pos+100]!r}')
            break
    pos += len(tag)
