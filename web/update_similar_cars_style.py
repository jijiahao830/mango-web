import re
import os

directories = [
    "cars/兰博基尼 570-4（橙色）",
    "cars/兰博基尼 580-2（紫色）",
    "cars/兰博基尼 610-4（浅蓝）",
    "cars/兰博基尼750-4（黄色）"
]

base_dir = "/Users/jijiahao/Desktop/芒果/web/Front_index（第三版-定稿）"

css_to_add = """
    /* 同价位卡片特定样式：隐藏价格，重排标签和介绍 */
    .similar-cars-carousel .car-price {
      display: none !important;
    }
    
    .similar-cars-carousel .car-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .similar-cars-carousel .car-name {
      margin-bottom: 4px;
    }
    
    .similar-cars-carousel .car-meta-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
    }
    
    .similar-cars-carousel .car-badge {
      margin-bottom: 0 !important;
    }
    
    .similar-cars-carousel .car-meta {
      margin-top: 0 import re
import os
"

js_to_add = """
                // 特殊处import o??directo的    "cars/兰?    "cars/兰博基尼 580-2（紫色）"      "cars/兰博基尼 610-4（浅蓝）"" cars/兰博基尼750-4（黄色）