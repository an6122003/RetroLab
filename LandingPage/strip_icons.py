import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove <div class="arch-node-icon">...</div>
html = re.sub(r'\s*<div class="arch-node-icon">[^<]+</div>', '', html)

# Remove <div class="metric-card-icon">...</div>
html = re.sub(r'\s*<div class="metric-card-icon">[^<]+</div>', '', html)

# Remove <div class="pm-icon">...</div>
html = re.sub(r'\s*<div class="pm-icon">[^<]+</div>', '', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Icons stripped from index.html")
