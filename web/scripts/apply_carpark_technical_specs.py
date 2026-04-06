#!/usr/bin/env python3
"""根据 scripts/carpark_vehicle_technical_specs.json 批量更新各车型 car.html 的 specs-section（11 项 spec-value，卡片标题不变）。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
JSON_PATH = Path(__file__).resolve().parent / "carpark_vehicle_technical_specs.json"

# 与 build_carpark_technical_specs.py 输出字段顺序一致
VALUE_KEYS = [
    "engine",
    "max_power",
    "max_torque",
    "gearbox",
    "accel",
    "vmax",
    "drive",
    "suspension",
    "dimensions",
    "wheelbase",
    "weight",
]


def patch_specs_section(html: str, values: list[str]) -> str:
    if len(values) != 11:
        raise ValueError("need exactly 11 spec values")
    m = re.search(r'<section class="specs-section">.*?</section>', html, re.S)
    if not m:
        return html
    block = m.group(0)
    n = len(re.findall(r'<span class="spec-value">', block))
    if n != 11:
        raise ValueError(f"expected 11 spec-value in specs-section, got {n}")
    idx = [0]

    def repl(_mm: re.Match[str]) -> str:
        v = values[idx[0]]
        idx[0] += 1
        return f'<span class="spec-value">{v}</span>'

    new_block = re.sub(r'<span class="spec-value">[^<]*</span>', repl, block)
    if idx[0] != 11:
        raise ValueError(f"replaced {idx[0]} spec-value, expected 11")
    return html[: m.start()] + new_block + html[m.end() :]


def main() -> int:
    if not JSON_PATH.is_file():
        print("missing", JSON_PATH, file=sys.stderr)
        print("run: python3 scripts/build_carpark_technical_specs.py", file=sys.stderr)
        return 1
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    carpark = WEB / "carpark"
    n_ok = 0
    n_skip = 0
    for car_html in sorted(carpark.glob("**/car.html")):
        text = car_html.read_text(encoding="utf-8", errors="replace")
        if "specs-section" not in text:
            n_skip += 1
            continue
        folder = car_html.parent.name
        if folder not in data:
            print("warn: no technical specs for", folder, file=sys.stderr)
            continue
        row = data[folder]
        values = [row[k] for k in VALUE_KEYS]
        try:
            new_text = patch_specs_section(text, values)
        except ValueError as e:
            print("warn:", folder, e, file=sys.stderr)
            continue
        if new_text != text:
            car_html.write_text(new_text, encoding="utf-8")
            n_ok += 1
    print("updated", n_ok, "pages; skipped (no specs-section)", n_skip)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
