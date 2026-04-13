#!/usr/bin/env python3
"""根据 carpark_feature_copy 与 carpark_vehicle_stats.json 生成 generated_features.json，供 apply_carpark_features.py 使用。"""
from __future__ import annotations

import json
from pathlib import Path

from carpark_feature_copy import three_features_for_folder

_DIR = Path(__file__).resolve().parent
_STATS = _DIR / "carpark_vehicle_stats.json"
_OUT = _DIR / "generated_features.json"


def main() -> None:
    stats = json.loads(_STATS.read_text(encoding="utf-8"))
    out_dict: dict[str, list] = {}
    for folder in sorted(stats.keys()):
        titles, descs = three_features_for_folder(folder)
        out_dict[folder] = [titles, descs]
    _OUT.write_text(json.dumps(out_dict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {_OUT} ({len(out_dict)} cars)")


if __name__ == "__main__":
    main()
