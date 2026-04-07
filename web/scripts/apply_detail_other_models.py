#!/usr/bin/env python3
"""批量将非兰博基尼详情页顶栏改为兰博基尼同款，并统一详情页横幅图为 详情页-banner.webp（封面.jpg 兜底）。"""
import re
from pathlib import Path
from urllib.parse import quote

WEB = Path(__file__).resolve().parent.parent


def enc_folder(folder: str) -> str:
    return quote(folder, safe="")


def build_mapping():
    text = (WEB / "car.html").read_text(encoding="utf-8")
    folder_to_info = {}
    brand_to_folders = {}
    idx = 0
    while True:
        m = re.search(r'<div class="brand-section" data-brand="([^"]+)">', text[idx:])
        if not m:
            break
        brand = m.group(1)
        block_start = idx + m.end()
        m_next = re.search(r'<div class="brand-section" data-brand="', text[block_start:])
        block_end = block_start + m_next.start() if m_next else len(text)
        block = text[block_start:block_end]
        for link in re.finditer(r'href="\./carpark/([^"]+)/car\.html"', block):
            folder = link.group(1)
            sub = block[link.start() : link.start() + 1500]
            nm = re.search(r'<div class="car-name">([^<]+)</div>', sub)
            name = nm.group(1).strip() if nm else folder
            folder_to_info[folder] = (brand, name)
            brand_to_folders.setdefault(brand, []).append(folder)
        idx = block_end
    if "五菱宏光" not in folder_to_info:
        folder_to_info["五菱宏光"] = ("五菱", "五菱宏光S")
        brand_to_folders.setdefault("五菱", []).append("五菱宏光")
    return folder_to_info, brand_to_folders


def make_dropdown(current_folder: str, folder_to_info, brand_to_folders) -> str:
    """
    顶栏始终展示「其他车型」下拉壳子；列表由 detail-other-models.js 从 /api/cars-catalog 填充。
    （不再因「同品牌无其它车」或未出现在 car.html 映射中而隐藏整段顶栏。）
    """
    return """    <div class="header-center-nav">
      <div class="dropdown-container">
        <span class="dropdown-trigger">其他车型 <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
        <div class="dropdown-menu">
          <div class="dropdown-menu-inner"></div>
          <div class="dropdown-grid">
            <!-- 同品牌车型由 detail-other-models.js 填充 -->
          </div>
        </div>
      </div>
    </div>
"""

HEADER_SUFFIX = """    <div class="header-right-logo">
      <a href="../../car.html">
        <img src="../../logo/logo2.png" alt="芒果超跑" class="header-right-logo-img">
      </a>
    </div>
  </header>
"""

HEADER_PREFIX = """  <header class="detail-header">
    <div class="header-left-btn">
      <a href="../../car.html#carGrid" class="back-btn">← 返回车库</a>
    </div>

"""


def new_header_full(current_folder, folder_to_info, brand_to_folders):
    return HEADER_PREFIX + make_dropdown(current_folder, folder_to_info, brand_to_folders) + HEADER_SUFFIX


OLD_HEADER_RE = re.compile(
    r"<header class=\"detail-header\">\s*"
    r'<a href="\.\./\.\./car\.html#carGrid" class="back-btn">← 返回车库</a>\s*'
    r'<div class="header-logo"><img src="\.\./\.\./logo/logo2\.png" alt="芒果超跑" class="header-logo-img"></div>\s*'
    r'<button class="btn-reserve"[^>]*>立即预约</button>\s*'
    r"</header>",
    re.DOTALL,
)


def main():
    folder_to_info, brand_to_folders = build_mapping()
    carpark_dir = WEB / "carpark"
    simple_count = 0
    failed = []
    for car_html in sorted(carpark_dir.glob("*/car.html")):
        folder = car_html.parent.name
        if folder.startswith("兰博基尼"):
            continue
        text = car_html.read_text(encoding="utf-8")
        if "header-logo" not in text:
            continue
        new_h = new_header_full(folder, folder_to_info, brand_to_folders)
        new_text, n = OLD_HEADER_RE.subn(new_h, text, count=1)
        if n != 1:
            failed.append(folder)
            continue
        if "detail-other-models.css" not in new_text:
            new_text = new_text.replace(
                '<link rel="stylesheet" href="./car.css">',
                '<link rel="stylesheet" href="./car.css">\n  <link rel="stylesheet" href="../detail-other-models.css">',
                1,
            )
        car_html.write_text(new_text, encoding="utf-8")
        simple_count += 1
    print("updated", simple_count, "detail pages")
    if failed:
        print("FAILED:", failed)

    for name in [
        "兰博基尼 V12 大牛 LP750-4 SV",
        "兰博基尼 570-4",
        "兰博基尼 Huracán LP580-2",
        "兰博基尼 Huracán LP610-4",
    ]:
        p = carpark_dir / name / "car.html"
        if not p.exists():
            continue
        t = p.read_text(encoding="utf-8")
        t2 = t.replace("详情页-banner.png", "封面.jpg")
        if t2 != t:
            p.write_text(t2, encoding="utf-8")
            print("Lamborghini img fallback -> 封面.jpg:", name)


if __name__ == "__main__":
    main()
