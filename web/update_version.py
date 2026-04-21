#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
回退为“版本号写在文件里”的方案：
1) 批量更新项目内 *.html/*.js/*.css 中的 ?v=YYYYMMDDHHMM
2) 移除页面中的 /asset-version.js 与 /asset-version-apply.js 引用
3) 输出：
   版本号已由：原来版本号，更新到：新版本号
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VERSION_RE = re.compile(r'([?&]v=)(?P<v>\d{12})')
BROKEN_VERSION_RE = re.compile(
    r'(\.(?:css|js|html))(?:P\d{10,12}|[?&]v=\d{12})',
    re.IGNORECASE,
)
ASSET_VERSION_TAG_RE = re.compile(
    r'^\s*<script\s+src="/asset-version(?:-apply)?\.js"\s*>\s*</script>\s*$',
    re.IGNORECASE,
)


def iter_target_files():
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in {".html", ".js", ".css"}:
            continue
        if p.name in {"asset-version.js", "asset-version-apply.js"}:
            continue
        yield p


def strip_asset_version_tags(text: str) -> str:
    lines = text.splitlines(keepends=True)
    kept = []
    for ln in lines:
        plain = ln.rstrip("\r\n")
        if ASSET_VERSION_TAG_RE.match(plain):
            continue
        kept.append(ln)
    return "".join(kept)


def main() -> None:
    old_version = "无"
    new_version = dt.datetime.now().strftime("%Y%m%d%H%M")
    target_files = list(iter_target_files())

    for fp in target_files:
        raw = fp.read_text(encoding="utf-8")
        if old_version == "无":
            m = VERSION_RE.search(raw)
            if m:
                old_version = m.group("v")

        next_text = strip_asset_version_tags(raw)
        next_text = BROKEN_VERSION_RE.sub(
            lambda m: m.group(1) + "?v=" + new_version, next_text
        )
        next_text = VERSION_RE.sub(
            lambda m: m.group(1) + new_version, next_text
        )
        if next_text != raw:
            fp.write_text(next_text, encoding="utf-8")

    print(f"版本号已由：{old_version}，更新到：{new_version}")


if __name__ == "__main__":
    main()
