#!/usr/bin/env python3
"""
批量更新各车型 car.html 的 features-section：三组 feature-title / feature-desc。

先运行同目录下 generate_all_features.py（内部使用 carpark_feature_copy）生成
generated_features.json；人工卖点见 carpark_feature_copy.MANUAL_FEATURES。
"""
from __future__ import annotations

import re
from pathlib import Path

import json

WEB = Path(__file__).resolve().parent.parent
CARPARK = WEB / "carpark"

def load_generated_features():
    path = Path(__file__).resolve().parent / "generated_features.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def patch_features(html: str, titles: list[str], descs: list[str]) -> str:
    if len(titles) != 3 or len(descs) != 3:
        raise ValueError("need 3 titles and 3 descs")
    m = re.search(r'<section class="features-section">.*?</section>', html, re.S)
    if not m:
        return html
    block = m.group(0)

    hi = [0]

    def repl_h3(_mm: re.Match[str]) -> str:
        t = titles[hi[0]]
        hi[0] += 1
        return f'<h3 class="feature-title">{t}</h3>'

    block = re.sub(r'<h3 class="feature-title">[^<]*</h3>', repl_h3, block)
    if hi[0] != 3:
        raise ValueError(f"expected 3 feature-title, got {hi[0]}")

    pi = [0]

    def repl_p(_mm: re.Match[str]) -> str:
        d = descs[pi[0]]
        pi[0] += 1
        return f'<p class="feature-desc">{d}</p>'

    block = re.sub(r'<p class="feature-desc">[^<]*</p>', repl_p, block)
    if pi[0] != 3:
        raise ValueError(f"expected 3 feature-desc, got {pi[0]}")

    alts = titles[:]
    ai = [0]

    def repl_alt(_mm: re.Match[str]) -> str:
        a = alts[ai[0]]
        ai[0] += 1
        return f'alt="{a}"'

    inner = re.search(r'(<section class="features-section">)(.*)(</section>)', block, re.S)
    if inner:
        mid = inner.group(2)
        mid_new = re.sub(r'alt="[^"]*"', repl_alt, mid)
        if ai[0] != 3:
            raise ValueError(f"expected 3 img alt, got {ai[0]}")
        block = inner.group(1) + mid_new + inner.group(3)
    return html[: m.start()] + block + html[m.end() :]


def main() -> int:
    n = 0
    features_dict = load_generated_features()
    for car_html in sorted(CARPARK.glob("**/car.html")):
        text = car_html.read_text(encoding="utf-8", errors="replace")
        if "features-section" not in text:
            continue
        n_h3 = len(re.findall(r'<h3 class="feature-title">', text))
        n_p = len(re.findall(r'<p class="feature-desc">', text))
        if n_h3 != 3 or n_p != 3:
            continue
        folder = car_html.parent.name
        
        if folder not in features_dict:
            print(f"Skipping {folder}, not found in generated features")
            continue
            
        titles, descs = features_dict[folder]
        new_text = patch_features(text, titles, descs)
        if new_text != text:
            car_html.write_text(new_text, encoding="utf-8")
            n += 1
    print("updated", n, "car.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
