#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
更新单一版本文件 asset-version.js
并输出：
版本号已由：原来版本号，更新到：新版本号
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VERSION_FILE = ROOT / "asset-version.js"
VERSION_RE = re.compile(r'window\.__MANGO_ASSET_VERSION__\s*=\s*"(?P<v>\d{12})"\s*;')


def main() -> None:
    old_version = "无"
    if VERSION_FILE.exists():
      raw = VERSION_FILE.read_text(encoding="utf-8")
      m = VERSION_RE.search(raw)
      if m:
          old_version = m.group("v")
    new_version = dt.datetime.now().strftime("%Y%m%d%H%M")
    VERSION_FILE.write_text(
        'window.__MANGO_ASSET_VERSION__ = "' + new_version + '";\n',
        encoding="utf-8",
    )

    print(f"版本号已由：{old_version}，更新到：{new_version}")


if __name__ == "__main__":
    main()
