#!/usr/bin/env python3
"""
扫描「车型素材目录」中的实际图片，写回对应 car.html 的 features-section、实车图赏；
古思特一代另更新「经典使用场景」配图。

素材目录按顺序在以下路径查找磁盘文件（任一处存在 `photos/carpark/<车型文件夹>` 即用）：
  1) web/media-webp/photos/carpark
  2) <仓库根>/media-webp/photos/carpark
  3) <仓库上一级>/media-webp/photos/carpark

写回 car.html 时统一使用相对路径：`../../media-webp/photos/carpark/…`（与全站多数详情页一致）。

仅使用 .webp 素材（忽略同目录下的 jpg/png 等）。

在仓库根目录执行：  python3 web/scripts/sync_ghost_car_media.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import quote

WEB = Path(__file__).resolve().parent.parent
REPO = WEB.parent

# 与全站多数车型详情页一致（从 web/carpark/<车型>/car.html 指向 web/media-webp/…）
CARPARK_URL_BASE = "../../media-webp/photos/carpark"

IMG_EXT = {".webp"}


def find_model_folder(folder_name: str) -> Path | None:
    candidates = [
        WEB / "media" / "photos" / "carpark" / folder_name,
        REPO / "media" / "photos" / "carpark" / folder_name,
        REPO.parent / "media" / "photos" / "carpark" / folder_name,
    ]
    for path in candidates:
        if path.is_dir():
            return path
    return None


def rewrite_carpark_folder_paths(html: str, folder_name: str, url_base: str) -> str:
    """把本车型在 carpark 下的路径统一为 url_base（任意 ../ 深度，避免误替换已正确路径中的子串）。"""
    base = url_base.rstrip("/")
    # 可能出现的「车型目录」URL 片段写法（与页面里 hero / srcset 一致）
    segments: list[str] = [folder_name, quote(folder_name, safe="/"), quote(folder_name, safe="")]
    if " " in folder_name:
        segments.append(folder_name.replace(" ", "%20"))
    seen: set[str] = set()
    for seg in segments:
        if not seg or seg in seen:
            continue
        seen.add(seg)
        pat = re.compile(r"(?:\.\./)+(media-webp/photos/carpark/" + re.escape(seg) + r"/)")
        html = pat.sub(f"{base}/{seg}/", html)
    return html


def list_images(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    out = []
    for p in folder.iterdir():
        if p.is_file() and p.suffix.lower() in IMG_EXT:
            out.append(p.name)
    return sorted(out, key=lambda s: s.lower())


def is_cover_filename(name: str) -> bool:
    """文件名含「封面」的视为头图素材（含 封面-thumb 等），不用于卖点/图赏/场景。"""
    return "封面" in name


def classify(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ("内", "舱", "椅", "星空", "顶", "后排", "座", "中控", "仪表")):
        return "cabin"
    if any(k in n for k in ("机", "擎", "泵", "进气", "轮", "刹", "排", "v12", "涡轮")):
        return "power"
    return "presence"


def pick_features(files: list[str]) -> tuple[str, str, str]:
    if not files:
        raise ValueError("无图片文件")
    by_c: dict[str, list[str]] = {"presence": [], "cabin": [], "power": []}
    for f in files:
        by_c[classify(f)].append(f)
    presence = by_c["presence"][0] if by_c["presence"] else files[0]
    cabin = by_c["cabin"][0] if by_c["cabin"] else files[min(1, len(files) - 1)]
    power = by_c["power"][0] if by_c["power"] else files[min(2, len(files) - 1)]
    picked = [presence, cabin, power]
    seen: set[str] = set()
    uniq: list[str] = []
    for p in picked:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    i = 0
    while len(uniq) < 3 and i < len(files):
        if files[i] not in seen:
            seen.add(files[i])
            uniq.append(files[i])
        i += 1
    while len(uniq) < 3:
        uniq.append(files[0])
    return uniq[0], uniq[1], uniq[2]


def srcset_url(url_base: str, folder: str, fn: str) -> str:
    return f"{url_base}/" + quote(f"{folder}/{fn}", safe="/")


def img_src(url_base: str, folder: str, fn: str) -> str:
    return f"{url_base}/{folder}/{fn}"


def swap_three_feature_pictures(
    section: str,
    url_base: str,
    folder: str,
    f1: str,
    f2: str,
    f3: str,
) -> str:
    triple = [f1, f2, f3]
    it = iter(triple)

    def repl(m: re.Match[str]) -> str:
        fn = next(it)
        return m.group(1) + srcset_url(url_base, folder, fn) + m.group(2) + img_src(url_base, folder, fn) + m.group(3)

    return re.sub(
        r'(<source srcset=")[^"]+(" type="image/webp">\s*<img loading="lazy" src=")[^"]+(")',
        repl,
        section,
        count=3,
    )


def scenario_pick(
    files: list[str],
    reserved: set[str],
    feat: tuple[str, str, str],
    preferred: tuple[str, ...],
) -> str:
    for key in preferred:
        if key in files and key not in feat:
            return key
    for f in files:
        if f not in reserved and f not in feat:
            return f
    return feat[0]


def build_gallery_section(
    url_base: str,
    folder: str,
    display_name: str,
    gallery: list[str],
) -> str:
    if not gallery:
        return ""
    first = gallery[0]
    thumbs = []
    for i, fn in enumerate(gallery):
        active = " active" if i == 0 else ""
        thumbs.append(
            f'''          <div class="thumbnail-item{active}" data-image="{img_src(url_base, folder, fn)}">
            <picture>
              <source srcset="{srcset_url(url_base, folder, fn)}" type="image/webp">
              <img loading="lazy" src="{img_src(url_base, folder, fn)}" alt="{display_name} 细节">
            </picture>
          </div>'''
        )
    return f'''  <section class="gallery-section">
    <div class="container">
      <h2 class="section-title">实车图赏</h2>
      <div class="gallery-main">
        <div class="gallery-featured">
          <picture id="featuredPicture">
            <source id="featuredSource" srcset="{srcset_url(url_base, folder, first)}" type="image/webp">
            <img src="{img_src(url_base, folder, first)}" alt="{display_name} 实车图赏" class="featured-image" id="featuredImage">
          </picture>
          <button class="gallery-arrow gallery-arrow-prev" id="prevBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button class="gallery-arrow gallery-arrow-next" id="nextBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div class="gallery-thumbnails">
{chr(10).join(thumbs)}
        </div>
      </div>
    </div>
  </section>'''


def process_car(
    folder_name: str,
    car_html_rel: str,
    display_name: str,
    *,
    scenario_mode: str,
    scenario_preferred: tuple[str, ...],
    exclude_cover_from_lower_sections: bool = False,
) -> None:
    found = find_model_folder(folder_name)
    if not found:
        print(
            f"跳过 {folder_name}：未找到素材目录。已尝试：\n"
            f"  {WEB / 'media' / 'photos' / 'carpark' / folder_name}\n"
            f"  {REPO / 'media' / 'photos' / 'carpark' / folder_name}\n"
            f"  {REPO.parent / 'media' / 'photos' / 'carpark' / folder_name}",
            file=sys.stderr,
        )
        return

    model_dir = found
    url_base = CARPARK_URL_BASE
    files = list_images(model_dir)
    if not files:
        print(f"跳过 {folder_name}：目录无 .webp 图片 {model_dir}", file=sys.stderr)
        return

    if exclude_cover_from_lower_sections:
        section_files = [f for f in files if not is_cover_filename(f)]
        if not section_files:
            print(
                f"跳过 {folder_name}：除封面类图片外无可用 .webp（卖点/图赏需要非封面素材） {model_dir}",
                file=sys.stderr,
            )
            return
        pool = section_files
        reserved = set()
        scenario_pool = section_files
        cover_assets = {f for f in files if is_cover_filename(f)}
    else:
        hero_reserved = {"封面.webp"}
        reserved = {h for h in hero_reserved if h in files}
        pool = [f for f in files if f not in reserved]
        if len(pool) < 3:
            pool = list(files)
        scenario_pool = files
        cover_assets = set()
        gallery_source = files

    if exclude_cover_from_lower_sections:
        gallery_source = section_files

    f1, f2, f3 = pick_features(pool)
    feat_set = {f1, f2, f3}

    if scenario_mode == "scene_or_exhibit":
        scen = scenario_pick(scenario_pool, reserved, (f1, f2, f3), scenario_preferred)
    else:
        scen = ""

    used = feat_set | reserved | cover_assets
    if scenario_mode == "scene_or_exhibit":
        used.add(scen)

    gallery = [f for f in gallery_source if f not in used]
    if not gallery:
        gallery = [f for f in gallery_source if f not in feat_set]
    if not gallery:
        gallery = list(gallery_source)

    path = WEB / car_html_rel
    html = path.read_text(encoding="utf-8")

    fs = re.search(
        r"(<section class=\"features-section\">)(.*?)(</section>)",
        html,
        flags=re.S,
    )
    if not fs:
        raise SystemExit(f"{path}: 未找到 features-section")
    new_fs_body = swap_three_feature_pictures(fs.group(2), url_base, folder_name, f1, f2, f3)
    html = html[: fs.start()] + fs.group(1) + new_fs_body + fs.group(3) + html[fs.end() :]

    if scenario_mode == "scene_or_exhibit" and scen:
        html = re.sub(
            r'(<div class="scenario-showcase-image">\s*<picture>\s*<source srcset=")[^"]+(" type="image/webp">\s*<img src=")[^"]+(" alt="经典使用场景">)',
            rf"\1{srcset_url(url_base, folder_name, scen)}\2{img_src(url_base, folder_name, scen)}\3",
            html,
            count=1,
        )

    gs = re.search(
        r"<section class=\"gallery-section\">.*?</section>",
        html,
        flags=re.S,
    )
    if not gs:
        raise SystemExit(f"{path}: 未找到 gallery-section")
    html = html[: gs.start()] + build_gallery_section(url_base, folder_name, display_name, gallery) + html[gs.end() :]

    html = rewrite_carpark_folder_paths(html, folder_name, url_base)

    path.write_text(html, encoding="utf-8")
    print(
        f"OK {folder_name}: media={url_base} | 卖点={f1}, {f2}, {f3} | 图赏 {len(gallery)} 张"
        + (f" | 场景={scen}" if scen else "")
    )


def main() -> None:
    process_car(
        "古思特一代",
        "carpark/古思特一代/car.html",
        "古思特一代",
        scenario_mode="scene_or_exhibit",
        scenario_preferred=("场景.webp", "展览.webp"),
    )
    process_car(
        "24 款古思特加长",
        "carpark/24 款古思特加长/car.html",
        "24 款古思特加长",
        scenario_mode="scene_or_exhibit",
        scenario_preferred=("展览.webp", "场景.webp"),
        exclude_cover_from_lower_sections=True,
    )


if __name__ == "__main__":
    main()
