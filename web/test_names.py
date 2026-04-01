import re

with open("/Users/jijiahao/Desktop/芒果/web/Front_index（第三版-定稿）/car.html", "r", encoding="utf-8") as f:
    content = f.read()

# Let's extract all car names
blocks = content.split('<a class="car-card-link" href="')
for block in blocks[1:]:
    name_match = re.search(r'<div class="car-name">(.*?)</div>', block)
    if name_match:
        print(name_match.group(1).strip())
