import os
import re

count = 0
for root, dirs, files in os.walk('web/carpark'):
    if 'car.html' in files:
        filepath = os.path.join(root, 'car.html')
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract features section
        match = re.search(r'<section class="features-section">(.*?)</section>', content, re.DOTALL)
        if match:
            features = match.group(1)
            if '封面' in features or '封面-thumb' in features:
                count += 1
                print(f"Found 封面 in {filepath}")

print(f"Total {count} files have 封面 in features-section")
