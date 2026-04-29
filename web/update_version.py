#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
回退为“版本号写在文件里”的方案：
1) 批量更新项目内 *.html/*.js/*.css 中的 ?v=<Unix 毫秒时间戳>
2) m2/ 下 *.html：插入或更新 window.__MANGO_ASSET_VERSION__，并为未带 v= 的本地 .css/.js/.html 链接补版本号
3) 更新 m2-actions.js 内 m2FallbackAssetV 兜底版本（与全站时间戳一致）
4) 移除页面中的 /asset-version.js 与 /asset-version-apply.js 引用
5) 输出：
   版本号已由：原来版本号，更新到：新版本号
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent
M2_ROOT = ROOT / "m2"
# 匹配旧 12 位日期串与 10–13 位秒戳 / 13 位毫秒时间戳等同源版本占位
VERSION_TOKEN = r"\d{10,15}"
VERSION_RE = re.compile(rf"([?&]v=)(?P<v>{VERSION_TOKEN})")
BROKEN_VERSION_RE = re.compile(
    rf"(\.(?:css|js|html))(?:P\d{{10,12}}|[?&]v={VERSION_TOKEN})",
    re.IGNORECASE,
)
ASSET_VERSION_TAG_RE = re.compile(
    r'^\s*<script\s+src="/asset-version(?:-apply)?\.js"\s*>\s*</script>\s*$',
    re.IGNORECASE,
)
INLINE_ASSET_VER_RE = re.compile(
    rf"(window\.__MANGO_ASSET_VERSION__\s*=\s*)(['\"])({VERSION_TOKEN})\2"
)
M2_FALLBACK_ASSIGN_RE = re.compile(
    rf"(\bm2FallbackAssetV\s*=\s*)(['\"])({VERSION_TOKEN})\2"
)

ATTR_URL_RE = re.compile(
    r"\b(href|src|data-pkg-href)\s*=\s*(['\"])([^'\"]*)\2",
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


def is_under_m2(path: Path) -> bool:
    try:
        path.resolve().relative_to(M2_ROOT)
        return True
    except ValueError:
        return False


def strip_asset_version_tags(text: str) -> str:
    lines = text.splitlines(keepends=True)
    kept = []
    for ln in lines:
        plain = ln.rstrip("\r\n")
        if ASSET_VERSION_TAG_RE.match(plain):
            continue
        kept.append(ln)
    return "".join(kept)


def ensure_m2_inline_version(text: str, ver: str) -> str:
    if "__MANGO_ASSET_VERSION__" in text:
        return text
    ins = "  <script>window.__MANGO_ASSET_VERSION__='" + ver + "';</script>\n"
    m = re.search(r"<head[^>]*>", text, re.I)
    if m:
        i = m.end()
        return text[:i] + "\n" + ins + text[i:]
    return text


def m2_inject_v_in_attr(url: str, ver: str) -> str:
    u = url.strip()
    if not u or u.startswith("#") or u.startswith("javascript:") or u.startswith("mailto:"):
        return url
    if u.startswith("http://") or u.startswith("https://") or u.startswith("//"):
        return url
    low_path = u.split("?")[0].split("#")[0].lower()
    if not (low_path.endswith(".css") or low_path.endswith(".js") or low_path.endswith(".html")):
        return url
    if re.search(rf"[?&]v={VERSION_TOKEN}", u):
        return url
    frag = ""
    main = u
    if "#" in main:
        main, frag = main.split("#", 1)
        frag = "#" + frag
    if "?" in main:
        base, qs = main.split("?", 1)
        return f"{base}?v={ver}&{qs}{frag}"
    return f"{main}?v={ver}{frag}"


def patch_m2_html_attrs(text: str, ver: str) -> str:
    def repl(m: re.Match[str]) -> str:
        attr, q, val = m.group(1), m.group(2), m.group(3)
        newv = m2_inject_v_in_attr(val, ver)
        return f"{attr}={q}{newv}{q}"

    return ATTR_URL_RE.sub(repl, text)


def current_version_ms_shanghai() -> str:
    z = ZoneInfo("Asia/Shanghai")
    return str(int(dt.datetime.now(z).timestamp() * 1000))


def main() -> None:
    old_version = "无"
    new_version = current_version_ms_shanghai()
    target_files = list(iter_target_files())

    for fp in target_files:
        raw = fp.read_text(encoding="utf-8")
        if old_version == "无":
            m = VERSION_RE.search(raw)
            if m:
                old_version = m.group("v")

        next_text = strip_asset_version_tags(raw)
        if fp.suffix.lower() == ".html" and is_under_m2(fp):
            next_text = ensure_m2_inline_version(next_text, new_version)
            next_text = patch_m2_html_attrs(next_text, new_version)
        next_text = BROKEN_VERSION_RE.sub(
            lambda m: m.group(1) + "?v=" + new_version, next_text
        )
        next_text = VERSION_RE.sub(
            lambda m: m.group(1) + new_version, next_text
        )
        next_text = INLINE_ASSET_VER_RE.sub(
            lambda m: m.group(1) + m.group(2) + new_version + m.group(2), next_text
        )
        next_text = M2_FALLBACK_ASSIGN_RE.sub(
            lambda m: m.group(1) + m.group(2) + new_version + m.group(2), next_text
        )
        if next_text != raw:
            fp.write_text(next_text, encoding="utf-8")

    print(f"版本号已由：{old_version}，更新到：{new_version}")


if __name__ == "__main__":
    main()
