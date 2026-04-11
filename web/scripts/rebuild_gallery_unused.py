#!/usr/bin/env python3
"""
将各车 car.html 中「实车图赏」区块改为仅使用该车 media 目录下、整页 HTML 中尚未引用过的图片。

规则：
- 扫描 media/photos/carpark/<车名>/ 下常见图片后缀；
- 从 car.html 提取（不含「实车图赏」区块）../../media/photos/carpark/<车名>/ 下出现过的文件名，按「去扩展名 stem」计为已使用；
- 实车图赏使用「未使用」的 stem 列表（始终排除 详情页-banner*、封面-thumb*、*透明图* 等；见 _is_gallery_banned_stem）；
- 若全部文件都已在文中出现，则退化为：除 封面、详情页-banner、展览、封面-thumb 外按文件名排序取可用的图；
- 个别车型可与横幅同构图但文件名不同：在 GALLERY_EXTRA_EXCLUDE_STEMS_BY_FOLDER 中按文件夹追加排除 stem（小写）；
- 若某 webp 与「详情页-banner.webp」字节完全相同（仅文件名不同），自动从图赏排除（_webp_stems_byte_identical_to_banner）。
"""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MEDIA_CARPARK = REPO / "media" / "photos" / "carpark"
WEB_CARPARK = REPO / "web" / "carpark"

IMG_EXT = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".avif"}
META_STEMS = {"封面-thumb", "封面_thumb"}
# 实车图赏绝不使用横幅素材（含 .png/.webp/.jpg 等同 stem）
GALLERY_EXCLUDE_STEMS = frozenset({*META_STEMS, "详情页-banner"})
# 按车型额外排除的 stem（小写）：与「详情页-banner」同构图、仅另一文件名时人工维护
GALLERY_EXTRA_EXCLUDE_STEMS_BY_FOLDER: dict[str, frozenset[str]] = {
    "路特斯 ELETRE": frozenset({"dsc00610"}),
    # 与「详情页-banner」同构图、不同导出尺寸（非 MD5 相同），需人工排除
    "法拉利 F8 Tributo": frozenset({"dsc05704"}),
}


def _is_gallery_banned_stem(stem_lower: str) -> bool:
    """排除横幅、封面缩略图、透明底素材（*透明图*.webp），以及「详情页-banner」任意后缀变体。"""
    if stem_lower in GALLERY_EXCLUDE_STEMS:
        return True
    if stem_lower.startswith("详情页-banner"):
        return True
    if stem_lower.startswith("封面-thumb") or stem_lower.startswith("封面_thumb"):
        return True
    if "透明图" in stem_lower:
        return True
    return False


def _file_md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _banner_webp_reference_path(folder: str) -> Path | None:
    """该车目录下用作「详情横幅」的 webp 文件（用于与其它 webp 比对是否同文件副本）。"""
    d = MEDIA_CARPARK / folder
    if not d.is_dir():
        return None
    direct = d / "详情页-banner.webp"
    if direct.is_file():
        return direct
    for name in sorted(os.listdir(d)):
        if name.lower().endswith(".webp") and name.startswith("详情页-banner"):
            return d / name
    return None


def _webp_stems_byte_identical_to_banner(folder: str) -> frozenset[str]:
    """
    与 详情页-banner.webp 内容（MD5）完全相同的其它 .webp 文件 stem（小写），须从实车图赏排除。
    （另文件名、同构图但不同导出时仍靠 GALLERY_EXTRA_EXCLUDE_STEMS_BY_FOLDER 人工维护。）
    """
    ref = _banner_webp_reference_path(folder)
    if not ref:
        return frozenset()
    try:
        banner_h = _file_md5(ref)
    except OSError:
        return frozenset()
    d = MEDIA_CARPARK / folder
    out: set[str] = set()
    for name in os.listdir(d):
        if not name.lower().endswith(".webp"):
            continue
        stem, _ = os.path.splitext(name)
        if stem.lower().startswith("详情页-banner"):
            continue
        p = d / name
        if not p.is_file():
            continue
        try:
            if _file_md5(p) != banner_h:
                continue
        except OSError:
            continue
        out.add(stem.lower())
    return frozenset(out)


def _extra_excluded_stems_for_folder(folder: str) -> frozenset[str]:
    manual = GALLERY_EXTRA_EXCLUDE_STEMS_BY_FOLDER.get(folder, frozenset())
    auto = _webp_stems_byte_identical_to_banner(folder)
    return frozenset(manual | auto)


def natural_key(s: str):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def collect_stems_from_html(html: str, folder: str) -> set[str]:
    prefix = f"../../media/photos/carpark/{folder}/"
    used: set[str] = set()
    for m in re.finditer(re.escape(prefix) + r"([^\"\'\s<>]+)", html):
        raw = m.group(1).split("?")[0].split("#")[0]
        stem, ext = os.path.splitext(raw)
        if ext.lower() in IMG_EXT:
            used.add(stem.lower())
    return used


def collect_used_outside_gallery(html: str, folder: str) -> set[str]:
    """不计入「实车图赏」区块内的引用，避免旧图占满「已使用」。"""
    stripped = re.sub(r'(?s)<section class="gallery-section">.*?</section>\s*', "", html, count=1)
    return collect_stems_from_html(stripped, folder)


def list_image_stems_on_disk(folder: str) -> dict[str, dict[str, str]]:
    """stem(lower) -> {ext: full filename}"""
    d = MEDIA_CARPARK / folder
    out: dict[str, dict[str, str]] = {}
    if not d.is_dir():
        return out
    for name in os.listdir(d):
        if name.startswith("."):
            continue
        stem, ext = os.path.splitext(name)
        el = ext.lower()
        if el not in IMG_EXT:
            continue
        key = stem.lower()
        out.setdefault(key, {})[el] = name
    return out


def pick_display_name(html: str, folder: str) -> str:
    m = re.search(r'data-car-display-name="([^"]*)"', html)
    if m:
        return m.group(1).strip() or folder
    return folder


def primary_pair(files: dict[str, str]) -> tuple[str, str, str]:
    """
    实车图赏统一 WebP：返回 (data_image, source_webp, img_src) 三者均为同一路径的 .webp 文件名。
    无 webp 时退回 None（调用方应跳过该 stem）。
    """
    by_ext = {k.lower(): v for k, v in files.items()}
    webp_name = by_ext.get(".webp")
    if not webp_name:
        return "", "", ""
    return webp_name, webp_name, webp_name


def _stem_sort_key(on_disk: dict[str, dict[str, str]], sk: str) -> list:
    name = min(on_disk[sk].values())
    return natural_key(name)


def gallery_stems(
    used: set[str], on_disk: dict[str, dict[str, str]], folder: str
) -> list[str]:
    """返回排序后的 stem key（小写）列表，用于实车图赏。"""
    extra_excl = _extra_excluded_stems_for_folder(folder)
    all_keys = list(on_disk.keys())
    pool = [
        k
        for k in all_keys
        if not _is_gallery_banned_stem(k) and k not in extra_excl and ".webp" in on_disk[k]
    ]
    unused = [k for k in pool if k not in used]
    unused.sort(key=lambda x: _stem_sort_key(on_disk, x))

    if unused:
        return unused

    # 退化：页面上已用尽素材时，仍避免仅用封面/横幅/展览等
    meta_prefixes = ("封面", "详情页-banner", "展览", "场景", "封面-thumb")
    relaxed = [
        k
        for k in pool
        if not any(k.startswith(m.lower()) for m in meta_prefixes) and not _is_gallery_banned_stem(k)
    ]
    relaxed.sort(key=lambda x: _stem_sort_key(on_disk, x))
    if relaxed:
        return relaxed

    pool.sort(key=lambda x: _stem_sort_key(on_disk, x))
    return pool


def build_gallery_html(folder: str, display_name: str, stems: list[str], on_disk: dict[str, dict[str, str]]) -> str:
    base = f"../../media/photos/carpark/{folder}/"
    extra_excl = _extra_excluded_stems_for_folder(folder)
    stems = [s for s in stems if ".webp" in on_disk.get(s, {})]
    if not stems:
        candidates = [
            k
            for k in on_disk.keys()
            if not _is_gallery_banned_stem(k)
            and k not in extra_excl
            and ".webp" in on_disk[k]
        ]
        candidates.sort(key=lambda x: _stem_sort_key(on_disk, x))
        stems = candidates[:1] if candidates else []

    if not stems:
        return ""

    thumbs_html = []
    for i, sk in enumerate(stems):
        di_name, webp_name, fb_name = primary_pair(on_disk[sk])
        data_path = base + di_name
        src_webp = base + webp_name
        src_fb = base + fb_name
        active = " active" if i == 0 else ""
        alt = f"{display_name} 细节"
        thumbs_html.append(
            f'          <div class="thumbnail-item{active}" data-image="{data_path}">\n'
            f'            <picture>\n'
            f'              <source srcset="{src_webp}" type="image/webp">\n'
            f'              <img src="{src_fb}" alt="{alt}">\n'
            f"            </picture>\n"
            f"          </div>"
        )

    first = stems[0]
    di0, w0, fb0 = primary_pair(on_disk[first])
    feat_webp = base + w0
    feat_fb = base + fb0

    inner = f"""  <section class="gallery-section">
    <div class="container">
      <h2 class="section-title">实车图赏</h2>
      <div class="gallery-main">
        <div class="gallery-featured">
          <picture id="featuredPicture">
            <source id="featuredSource" srcset="{feat_webp}" type="image/webp">
            <img src="{feat_fb}" alt="{display_name} 实车图赏" class="featured-image" id="featuredImage">
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
{chr(10).join(thumbs_html)}
        </div>
      </div>
    </div>
  </section>"""
    return inner


def patch_file(path: Path) -> tuple[bool, str]:
    folder = path.parent.name
    html = path.read_text(encoding="utf-8")
    used = collect_used_outside_gallery(html, folder)
    on_disk = list_image_stems_on_disk(folder)
    if not on_disk:
        return False, f"{folder}: 无 media 目录或图片，跳过"

    display_name = pick_display_name(html, folder)
    stems = gallery_stems(used, on_disk, folder)
    if not stems:
        return False, f"{folder}: 无可用 stem，跳过"

    new_section = build_gallery_html(folder, display_name, stems, on_disk)
    if not new_section.strip():
        return False, f"{folder}: 无 webp 实车图素材，跳过"

    start = html.find('<section class="gallery-section">')
    if start == -1:
        return False, f"{folder}: 无 gallery-section，跳过"
    svc = html.find('<section class="services-section">', start)
    if svc == -1:
        return False, f"{folder}: 无 services-section（无法定位图赏区块结束），跳过"
    chunk = html[start:svc]
    end_rel = chunk.rfind("</section>")
    if end_rel == -1:
        return False, f"{folder}: 图赏区块未闭合，跳过"
    end = start + end_rel + len("</section>")
    new_html = html[:start] + new_section + "\n\n" + html[end:]
    path.write_text(new_html, encoding="utf-8")
    n = new_section.count('class="thumbnail-item')
    return True, f"{folder}: {n} 张(webp)"


def main() -> None:
    ok = 0
    for p in sorted(WEB_CARPARK.glob("*/car.html")):
        success, msg = patch_file(p)
        print(msg)
        if success:
            ok += 1
    print(f"完成: {ok} 个文件已更新")


if __name__ == "__main__":
    main()
