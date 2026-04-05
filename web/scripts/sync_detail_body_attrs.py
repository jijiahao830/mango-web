#!/usr/bin/env python3
"""
根据根目录 car.html 里每个车型的「车名 + 日租价」，同步到各详情页 carpark/<车型>/car.html 的 <body> 上：

  data-daily-price="数字"
  data-car-display-name="与选车页 .car-name 完全一致"

用于「同价位其他车」模块：必须与首页列表一致，否则匹配不到同价车。

用法（在 web 目录下执行）：

  python3 scripts/sync_detail_body_attrs.py

可选：先预览再写入（不修改文件）：

  python3 scripts/sync_detail_body_attrs.py --dry-run

说明：
- 首页价格为 ¥??? 或无法解析时，对应详情页会恢复为纯 <body>（无 data-*），同价位区块不会跑脚本。
- 兰博基尼详情页不修改（仍用手写 body 属性）。
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def esc_attr(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def parse_car_listing(html: str) -> dict[str, tuple[str, int | None]]:
    """folder -> (car_name, daily_price_or_none)"""
    folder_to: dict[str, tuple[str, int | None]] = {}
    for m in re.finditer(r'<a class="car-card-link" href="\./carpark/([^"]+)/car\.html">', html):
        folder = m.group(1)
        chunk = html[m.end() : m.end() + 8000]
        ia = chunk.find("</a>")
        if ia == -1:
            continue
        block = chunk[:ia]
        nm = re.search(r'<div class="car-name">([^<]+)</div>', block)
        if not nm:
            continue
        name = nm.group(1).strip()
        pr = re.search(r'<div class="car-price">[\s\S]*?¥([\d,]+)', block)
        price = int(pr.group(1).replace(",", "")) if pr else None
        folder_to[folder] = (name, price)
    return folder_to


def main() -> None:
    ap = argparse.ArgumentParser(description="从 car.html 同步 data-daily-price / data-car-display-name 到各详情页 body")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印将要修改的文件，不写盘",
    )
    args = ap.parse_args()

    web = Path(__file__).resolve().parent.parent
    car_list = web / "car.html"
    carpark_dir = web / "carpark"

    if not car_list.is_file():
        raise SystemExit(f"找不到选车页: {car_list}")

    html = car_list.read_text(encoding="utf-8")
    folder_map = parse_car_listing(html)

    updated = 0
    skipped = 0
    missing: list[str] = []

    for folder, (name, price) in sorted(folder_map.items()):
        if "兰博基尼" in folder:
            continue
        p = carpark_dir / folder / "car.html"
        if not p.is_file():
            missing.append(folder)
            continue

        t = p.read_text(encoding="utf-8")
        if not price or price <= 0:
            new_t = re.sub(r"<body[^>]*>", "<body>", t, count=1)
        else:
            new_t = re.sub(
                r"<body[^>]*>",
                f'<body data-daily-price="{price}" data-car-display-name="{esc_attr(name)}">',
                t,
                count=1,
            )

        if new_t == t:
            skipped += 1
            continue

        print(f"{'[dry-run] ' if args.dry_run else ''}update: {folder}")
        if not args.dry_run:
            p.write_text(new_t, encoding="utf-8")
        updated += 1

    print(f"完成：写入 {updated} 个文件，未变化 {skipped} 个，跳过兰博基尼；选车页共 {len(folder_map)} 条链接。")
    if missing:
        print("警告：以下文件夹在 carpark/ 下没有 car.html：", ", ".join(missing))


if __name__ == "__main__":
    main()
