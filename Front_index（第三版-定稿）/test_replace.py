import re

with open("/Users/jijiahao/Desktop/芒果/web/Front_index（第三版-定稿）/car.html", "r", encoding="utf-8") as f:
    content = f.read()
    
# We want to replace this structure:
# <div class="filter-header">
#   <h2>筛选</h2>
#   ...
# </div>
# <div class="filter-result-count">已为您筛选出 66 种车型</div>

# with:
# <div class="filter-header" style="display: flex; align-items: center; gap: 10px;">
#   <h2>筛选</h2>
#   <span class="filter-result-count" style="font-size: 14px; margin-bottom: 0; padding-top: 5px;">已为您筛选出 66 种车型</span>
#   ...
# </div>
# <div class="search-box">
#   <input type="text" id="carSearchInput" placeholder="搜索车型..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05); color: #fff; margin-bottom: 20px;">
# </div>
