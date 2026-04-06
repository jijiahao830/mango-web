#!/usr/bin/env python3
"""根据 scripts/carpark_vehicle_stats.json 批量更新各车型 car.html 的 stats-section 四宫格数据。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
JSON_PATH = Path(__file__).resolve().parent / "carpark_vehicle_stats.json"


def patch_stats_section(html: str, values: list[str]) -> str:
    if len(values) != 4:
        raise ValueError("need exactly 4 stat values")
    m = re.search(r'<section class="stats-section">.*?</section>', html, re.S)
    if not m:
        return html
    block = m.group(0)
    n = len(re.findall(r'<div class="stat-value">', block))
    if n != 4:
        raise ValueError(f"expected 4 stat-value, got {n}")
    idx = [0]

    def replace_one(_m: re.Match[str]) -> str:
        v = values[idx[0]]
        idx[0] += 1
        return f'<div class="stat-value">{v}</div>'

    new_block = re.sub(r"<div class=\"stat-value\">[^<]*</div>", replace_one, block)
    if idx[0] != 4:
        raise ValueError(f"replaced {idx[0]} stat-value, expected 4")
    return html[: m.start()] + new_block + html[m.end() :]


def main() -> int:
    if not JSON_PATH.is_file():
        print("missing", JSON_PATH, file=sys.stderr)
        return 1
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    carpark = WEB / "carpark"
    n_ok = 0
    n_skip = 0
    for car_html in sorted(carpark.glob("**/car.html")):
        text = car_html.read_text(encoding="utf-8", errors="replace")
        if "stats-section" not in text:
            n_skip += 1
            continue
        folder = car_html.parent.name
        if folder not in data:
            print("warn: no stats for", folder, file=sys.stderr)
            continue
        vals = data[folder]
        if len(vals) != 4:
            print("warn: bad length", folder, file=sys.stderr)
            continue
        new_text = patch_stats_section(text, vals)
        if new_text != text:
            car_html.write_text(new_text, encoding="utf-8")
            n_ok += 1
    print("updated", n_ok, "pages; skipped (no stats-section)", n_skip)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
