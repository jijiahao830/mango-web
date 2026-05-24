#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a recovery SQL file for the deleted MySQL cars table from carpark pages."""

from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CARPARK = ROOT / "carpark"
OUT = ROOT / "scripts" / "restore_cars_from_carpark.sql"
SCHEMA = ROOT / "scripts" / "create_cars_table.sql"


BRANDS = [
    "阿斯顿马丁",
    "Aston Martin",
    "兰博基尼",
    "劳斯莱斯",
    "玛莎拉蒂",
    "迈凯伦",
    "保时捷",
    "法拉利",
    "迈巴赫",
    "奔驰",
    "宝马",
    "奥迪",
    "宾利",
    "路虎",
    "路特斯",
    "特斯拉",
    "丰田",
    "日产",
    "理想",
    "腾势",
    "问界",
    "岚图",
    "小米",
    "坦克",
    "福特",
    "别克",
    "广汽传祺",
    "道奇",
    "五菱",
]


def sql_quote(value: object) -> str:
    s = "" if value is None else str(value)
    return "'" + s.replace("\\", "\\\\").replace("'", "''") + "'"


def attr(text: str, name: str) -> str:
    m = re.search(rf'\b{name}="([^"]*)"', text)
    return html.unescape(m.group(1)).strip() if m else ""


def infer_brand(name: str) -> str:
    compact = name.replace(" ", "")
    lookup = re.sub(r"^\d{2}\s*款\s*", "", name).strip()
    lookup_compact = lookup.replace(" ", "")
    aliases = {
        "古思特": "劳斯莱斯",
        "古斯特": "劳斯莱斯",
        "库里南": "劳斯莱斯",
        "帕拉梅拉": "保时捷",
        "考斯特": "丰田",
        "威霆": "奔驰",
        "全新宝马": "宝马",
    }
    for brand in BRANDS:
        brand_compact = brand.replace(" ", "")
        if (
            name.startswith(brand)
            or compact.startswith(brand_compact)
            or lookup.startswith(brand)
            or lookup_compact.startswith(brand_compact)
        ):
            return "阿斯顿马丁" if brand == "Aston Martin" else brand
    for key, brand in aliases.items():
        if key in name:
            return brand
    return lookup.split(" ", 1)[0] if lookup else name.split(" ", 1)[0]


def infer_model(name: str, brand: str) -> str:
    model = name
    if model.startswith(brand):
        model = model[len(brand) :].strip()
    if not model and brand:
        model = name
    return model


def infer_category(name: str) -> str:
    supercar = [
        "法拉利",
        "兰博基尼",
        "迈凯伦",
        "奥迪 R8",
        "日产 GT-R",
        "日产 GTR",
        "阿斯顿马丁 DB11",
        "路特斯 Emira",
    ]
    performance = [
        "AMG",
        "C63",
        "M2",
        "M3",
        "M4",
        "M5",
        "992",
        "Taycan",
        "帕拉梅拉",
        "小米 SU7",
    ]
    vans = ["埃尔法", "GL8", "威霆", "传祺 M8", "腾势 D9", "梦想家", "MEGA", "考斯特"]
    evs = ["特斯拉", "理想", "问界", "岚图", "小米 SU7", "腾势"]
    offroad = [
        "卫士",
        "揽胜",
        "G350",
        "G500",
        "G63",
        "G900",
        "普拉多",
        "酷路泽",
        "坦克",
        "猛禽",
        "霸王龙",
    ]
    lux_suv = ["库里南", "添越", "Urus", "卡宴", "X5", "DBX", "ELETRE", "莱万特", "Model X", "M9"]
    exec_sedan = [
        "迈巴赫",
        "S400",
        "S350",
        "E300",
        "A8",
        "A7L",
        "A7",
        "A6",
        "宝马 7",
        "宝马 530",
        "5 系",
        "飞驰",
        "慕尚",
        "幻影",
        "古思特",
        "古斯特",
        "总裁",
    ]
    if any(k in name for k in supercar):
        return "超跑"
    if any(k in name for k in performance):
        return "性能车"
    if any(k in name for k in vans):
        return "商务车"
    if any(k in name for k in evs):
        return "新能源"
    if any(k in name for k in offroad):
        return "越野车"
    if any(k in name for k in lux_suv):
        return "豪华SUV"
    if any(k in name for k in exec_sedan):
        return "行政级轿车"
    return "轿车"


def load_existing_db_comment(text: str) -> dict[str, str]:
    m = re.search(
        r"cars 表: brand=(.*?) model=(.*?) category=(.*?) rent_price=([0-9]+)",
        text,
        flags=re.S,
    )
    if not m:
        return {}
    return {
        "brand": html.unescape(m.group(1)).strip(),
        "model": html.unescape(m.group(2)).strip(),
        "category": html.unescape(m.group(3)).strip(),
        "rent_price": m.group(4).strip(),
    }


def main() -> None:
    rows: list[dict[str, object]] = []
    seen: set[str] = set()
    for car_dir in sorted([p for p in CARPARK.iterdir() if p.is_dir()], key=lambda p: p.name):
        car_html = car_dir / "car.html"
        if not car_html.exists():
            continue
        text = car_html.read_text(encoding="utf-8", errors="replace")
        car_name = car_dir.name.strip()
        if not car_name or car_name in seen:
            continue
        seen.add(car_name)

        comment = load_existing_db_comment(text)
        brand = comment.get("brand") or infer_brand(car_name)
        model = comment.get("model") or infer_model(car_name, brand)
        category = comment.get("category") or infer_category(car_name)
        price_raw = comment.get("rent_price") or attr(text, "data-daily-price") or "888"
        try:
            rent_price = int(str(price_raw).replace(",", "").strip())
        except ValueError:
            rent_price = 888
        if rent_price < 0:
            rent_price = 0

        rows.append(
            {
                "car_name": car_name,
                "brand": brand,
                "model": model,
                "rent_price": rent_price,
                "category": category,
                "status": 1,
            }
        )

    lines = [
        "-- Recovered from carpark/*/car.html. Review inferred brand/category/price if needed.",
        "",
        SCHEMA.read_text(encoding="utf-8").strip(),
        "",
        "INSERT INTO `cars` (`car_name`, `brand`, `model`, `rent_price`, `category`, `status`) VALUES",
    ]
    values = []
    for r in rows:
        values.append(
            "  ({}, {}, {}, {}, {}, {})".format(
                sql_quote(r["car_name"]),
                sql_quote(r["brand"]),
                sql_quote(r["model"]),
                int(r["rent_price"]),
                sql_quote(r["category"]),
                int(r["status"]),
            )
        )
    lines.append(",\n".join(values) + "\nON DUPLICATE KEY UPDATE")
    lines.extend(
        [
            "  `brand` = VALUES(`brand`),",
            "  `model` = VALUES(`model`),",
            "  `rent_price` = VALUES(`rent_price`),",
            "  `category` = VALUES(`category`),",
            "  `status` = VALUES(`status`);",
            "",
        ]
    )
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} with {len(rows)} cars")


if __name__ == "__main__":
    main()
