#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
批量更新 HTML 中本地 css/js/html 资源链接的版本号参数 v=YYYYMMDDHHMM
并输出：
版本号已由：原来版本号，更新到：新版本号
"""

from __future__ import annotations

import collections
import datetime as dt
import re
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parent
HTML_FILES = list(ROOT.rglob("*.html"))

ATTR_RE = re.compile(
    r'(?P<prefix>\b(?:href|src)\s*=\s*["\'])(?P<url>[^"\']+)(?P<suffix>["\'])',
    re.IGNORECASE,
)

SKIP_PREFIXES = (
    "http://",
    "https://",
    "//",
    "data:",
    "javascript:",
    "mailto:",
    "tel:",
    "#",
)


def should_process_url(url: str) -> bool:
    s = url.strip()
    low = s.lower()
    if low.startswith(SKIP_PREFIXES):
        return False
    path = urlsplit(s).path.lower()
    return path.endswith(".css") or path.endswith(".js") or path.endswith(".html")


def get_current_version_candidates() -> list[str]:
    versions: list[str] = []
    for f in HTML_FILES:
        try:
            txt = f.read_text(encoding="utf-8")
        except Exception:
            continue
        for m in ATTR_RE.finditer(txt):
            url = m.group("url")
            if not should_process_url(url):
                continue
            parts = urlsplit(url)
            for k, v in parse_qsl(parts.query, keep_blank_values=True):
                if k.lower() == "v" and v:
                    versions.append(v)
    return versions


def pick_old_version(versions: list[str]) -> str:
    if not versions:
        return "无"
    counter = collections.Counter(versions)
    return counter.most_common(1)[0][0]


def replace_version_in_url(url: str, new_version: str) -> tuple[str, bool]:
    if not should_process_url(url):
        return url, False
    parts = urlsplit(url.strip())
    pairs = parse_qsl(parts.query, keep_blank_values=True)
    pairs = [(k, v) for (k, v) in pairs if k.lower() != "v"]
    pairs.append(("v", new_version))
    new_query = urlencode(pairs)
    new_url = urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))
    return new_url, (new_url != url)


def main() -> None:
    old_versions = get_current_version_candidates()
    old_version = pick_old_version(old_versions)
    new_version = dt.datetime.now().strftime("%Y%m%d%H%M")

    for f in HTML_FILES:
        txt = f.read_text(encoding="utf-8")
        changed = [False]

        def repl(m: re.Match[str]) -> str:
            url = m.group("url")
            new_url, has_changed = replace_version_in_url(url, new_version)
            if has_changed:
                changed[0] = True
                return f"{m.group('prefix')}{new_url}{m.group('suffix')}"
            return m.group(0)

        new_txt = ATTR_RE.sub(repl, txt)
        if changed[0]:
            f.write_text(new_txt, encoding="utf-8")

    print(f"版本号已由：{old_version}，更新到：{new_version}")


if __name__ == "__main__":
    main()

