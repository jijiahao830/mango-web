#!/usr/bin/env python3
"""Sync m2 detail scenario sections from v1 carpark pages."""

from __future__ import annotations

import re
from pathlib import Path


WEB = Path(__file__).resolve().parent.parent
V1_CARPARK = WEB / "carpark"
M2_CARPARK = WEB / "m2" / "carpark"

SCENARIO_CSS_RE = re.compile(
    r"/\* ═+\n   ④ 使用场景区[\s\S]*?/\* ═+\n   ⑤ 图赏区",
    re.S,
)

M2_SCENARIO_RE = re.compile(
    r"  <section class=\"m2-car__scenario-section\" id=\"m2Scenario\">[\s\S]*?  </section>\n\n"
    r"  <section class=\"m2-car__gallery\"",
    re.S,
)

V1_SCENARIO_RE = re.compile(
    r"<section class=\"scenario-showcase-section\">[\s\S]*?</section>",
    re.S,
)


SCENARIO_CSS = """/* ════════════════════════════════════════
   ④ 使用场景区
   ════════════════════════════════════════ */
.m2-car__scenario-section {
  min-height: 100vh;
  background: url('../../../media-webp/photos/index/m2/通用背景图.webp') center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(env(safe-area-inset-top), 18px) 14px max(env(safe-area-inset-bottom), 18px);
  overflow: hidden;
}

.m2-scenario-card {
  position: relative;
  width: min(92vw, 520px);
  height: min(76vh, 680px);
  overflow: hidden;
  background: #05070d;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.52);
}

.m2-scenario-card::before {
  content: "";
  position: absolute;
  inset: 14px;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.16);
  pointer-events: none;
}

.m2-scenario-card::after {
  content: "";
  position: absolute;
  left: 28px;
  top: 32px;
  z-index: 3;
  width: 64px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0));
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.28);
  pointer-events: none;
}

.m2-scenario-card__image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 48% center;
  display: block;
  transform: scale(1.03);
}

.m2-scenario-card__shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 72% 30%, rgba(255, 255, 255, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(2, 4, 10, 0.1) 0%, rgba(2, 4, 10, 0.08) 42%, rgba(2, 4, 10, 0.48) 100%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0.04) 56%, rgba(0, 0, 0, 0.2) 100%);
}

.m2-scenario-card__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 22px 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(8, 10, 16, 0.34));
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.m2-scenario-card__title {
  font-size: clamp(30px, 8vw, 44px);
  line-height: 1.06;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
}

.m2-scenario-card__desc {
  max-width: 34em;
  font-size: clamp(13px, 3.35vw, 15px);
  line-height: 1.68;
  color: rgba(255, 255, 255, 0.84);
}

.m2-scenario-card__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.m2-scenario-card__list li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: clamp(12px, 3.15vw, 14px);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.82);
}

.m2-scenario-card__list li span {
  flex: 0 0 auto;
  min-width: 18px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 700;
}

/* ════════════════════════════════════════
   ⑤ 图赏区"""


def first_match(pattern: str, text: str, flags: int = re.S) -> str:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ""


def rel_image_for_m2(src: str) -> str:
    src = src.strip()
    if src.startswith("../../media-webp/"):
        return "../" + src
    if src.startswith("../../../media-webp/"):
        return src
    return src


def scenario_from_v1(v1_html: str) -> dict[str, object] | None:
    section_m = V1_SCENARIO_RE.search(v1_html)
    if not section_m:
        return None
    section = section_m.group(0)
    title = first_match(r'<h3 class="scenario-showcase-title">([\s\S]*?)</h3>', section)
    if not title:
        title = first_match(
            r'<button[^>]*class="[^"]*scenario-tab[^"]*active[^"]*"[^>]*>([\s\S]*?)</button>',
            section,
        )
    desc = first_match(r'<p[^>]*class="[^"]*scenario-showcase-desc[^"]*"[^>]*>([\s\S]*?)</p>', section)
    img = first_match(r'<img[^>]*src="([^"]+)"', section)
    alt = first_match(r'<img[^>]*alt="([^"]*)"', section)
    features_block = first_match(r'<ul[^>]*class="[^"]*scenario-features[^"]*"[^>]*>([\s\S]*?)</ul>', section)
    features = re.findall(r"<li>([\s\S]*?)</li>", features_block)
    features = [re.sub(r"\s+", " ", f).strip() for f in features if f.strip()]
    if not title or not desc or not img:
        return None
    return {
        "title": title,
        "desc": desc,
        "img": rel_image_for_m2(img),
        "alt": alt or "经典使用场景",
        "features": features,
    }


def build_m2_section(data: dict[str, object]) -> str:
    features = data["features"] if isinstance(data["features"], list) else []
    lis = []
    for item in features:
        item_text = str(item)
        mark = "✓"
        if item_text.startswith("✓"):
            item_text = item_text[1:].strip()
        lis.append(f"          <li><span>{mark}</span>{item_text}</li>")
    return (
        '  <section class="m2-car__scenario-section" id="m2Scenario">\n'
        '    <div class="m2-scenario-card">\n'
        f'      <img class="m2-scenario-card__image" src="{data["img"]}" alt="{data["alt"]}">\n'
        '      <div class="m2-scenario-card__shade"></div>\n\n'
        '      <div class="m2-scenario-card__content">\n'
        f'        <h3 class="m2-scenario-card__title">{data["title"]}</h3>\n'
        f'        <p class="m2-scenario-card__desc">{data["desc"]}</p>\n\n'
        '        <ul class="m2-scenario-card__list">\n'
        + "\n".join(lis)
        + "\n"
        '        </ul>\n'
        '      </div>\n'
        '    </div>\n'
        '  </section>\n\n'
        '  <section class="m2-car__gallery"'
    )


def sync_html() -> tuple[int, int]:
    updated = 0
    skipped = 0
    for m2_dir in sorted(p for p in M2_CARPARK.iterdir() if p.is_dir()):
        m2_html = m2_dir / "car.html"
        v1_html = V1_CARPARK / m2_dir.name / "car.html"
        if not m2_html.exists() or not v1_html.exists():
            skipped += 1
            continue
        data = scenario_from_v1(v1_html.read_text(encoding="utf-8", errors="replace"))
        if not data:
            skipped += 1
            continue
        text = m2_html.read_text(encoding="utf-8", errors="replace")
        new_text, n = M2_SCENARIO_RE.subn(build_m2_section(data), text, count=1)
        if n:
            if new_text != text:
                m2_html.write_text(new_text, encoding="utf-8")
                updated += 1
        else:
            skipped += 1
    return updated, skipped


def sync_css() -> tuple[int, int]:
    updated = 0
    skipped = 0
    for css_path in sorted(M2_CARPARK.glob("*/car.css")):
        text = css_path.read_text(encoding="utf-8", errors="replace")
        new_text, n = SCENARIO_CSS_RE.subn(SCENARIO_CSS, text, count=1)
        if n:
            if new_text != text:
                css_path.write_text(new_text, encoding="utf-8")
                updated += 1
        else:
            skipped += 1
    return updated, skipped


def main() -> int:
    html_updated, html_skipped = sync_html()
    css_updated, css_skipped = sync_css()
    print(f"html updated={html_updated} skipped={html_skipped}")
    print(f"css updated={css_updated} skipped={css_skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
