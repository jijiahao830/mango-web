#!/usr/bin/env python3
"""将非兰博基尼详情页的 CTA 内按钮改为右侧悬浮条（与兰博基尼一致）。"""
import re
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
CARPARK = WEB / "carpark"

CTA_ACTIONS_RE = re.compile(
    r"[ \t]*<div class=\"cta-actions\">\s*<button[^>]*>.*?</button>\s*<button[^>]*>.*?</button>\s*</div>\s*",
    re.DOTALL,
)

FAB_BLOCK = """  <div class="detail-fab-actions" id="detailFabActions" aria-hidden="true">
    <button type="button" class="btn-primary btn-lg detail-fab-btn">立即预约</button>
    <button type="button" class="btn-ghost btn-lg detail-fab-btn">咨询客服</button>
  </div>

"""

JS_REPLACE_OLD = "document.querySelectorAll('.btn-reserve, .btn-primary').forEach"
JS_REPLACE_NEW = (
    "document.querySelectorAll('.btn-reserve, .btn-primary, #detailFabActions .btn-ghost').forEach"
)


def patch_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "detail-other-models.css" not in text:
        return False
    if "id=\"detailFabActions\"" in text:
        return False
    if "class=\"cta-actions\"" not in text:
        return False
    new_text, n = CTA_ACTIONS_RE.subn("", text, count=1)
    if n != 1:
        print("WARN cta-actions pattern:", path.parent.name)
        return False
    if "<footer class=\"detail-footer\">" not in new_text:
        print("WARN no footer:", path.parent.name)
        return False
    new_text = new_text.replace(
        "<footer class=\"detail-footer\">",
        FAB_BLOCK + "<footer class=\"detail-footer\">",
        1,
    )
    if "detail-fab.js" not in new_text:
        new_text = new_text.replace(
            '<script src="./car.js"></script>',
            '<script src="./car.js"></script>\n  <script src="../detail-fab.js"></script>',
            1,
        )
    path.write_text(new_text, encoding="utf-8")
    return True


def patch_car_js(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if JS_REPLACE_OLD not in text:
        return False
    path.write_text(text.replace(JS_REPLACE_OLD, JS_REPLACE_NEW, 1), encoding="utf-8")
    return True


def main():
    n_html = 0
    for p in sorted(CARPARK.glob("*/car.html")):
        if "兰博基尼" in p.parent.name:
            continue
        if patch_html(p):
            n_html += 1
            print("html:", p.parent.name)

    n_js = 0
    for p in sorted(CARPARK.glob("*/car.js")):
        if "兰博基尼" in p.parent.name:
            continue
        if patch_car_js(p):
            n_js += 1

    print("done html", n_html, "js", n_js)


if __name__ == "__main__":
    main()
