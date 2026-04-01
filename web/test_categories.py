import re

file_path = "/Users/jijiahao/Desktop/芒果/web/Front_index（第三版-定稿）/car.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find all actual data-category used in the car cards
categories_in_html = set()
for m in re.finditer(r'<div class="car-card" data-category="(.*?)">', content):
    categories_in_html.add(m.group(1))

print("Categories actually assigned to cars in HTML:", categories_in_html)

# Let's find all the buttons
btn_categories = set()
for m in re.finditer(r'<button class="filter-btn" data-category="(.*?)">', content):
    if m.group(1) != 'all':
        btn_categories.add(m.group(1))

print("Categories that have buttons:", btn_categories)

print("Buttons that have no cars:", btn_categories - categories_in_html)

