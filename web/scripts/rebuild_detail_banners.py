from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter


CANVAS_SIZE = (2048, 2048)
BANNER_NAME = "详情页-banner.webp"
BACKUP_DIR = "_backup_before_rebuild"


def _bbox_from_alpha(alpha: Image.Image) -> tuple[int, int, int, int]:
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("image has no visible pixels")
    return bbox


def _clean_alpha(alpha: Image.Image) -> Image.Image:
    # Remove low-alpha dust and slightly contract the visible matte. The blur restores
    # antialiasing so edges do not turn into hard stair-steps.
    a = alpha.point(lambda p: 0 if p < 14 else p)
    contracted = a.filter(ImageFilter.MinFilter(3))
    soft = contracted.filter(ImageFilter.GaussianBlur(0.45))
    return ImageChops.lighter(soft, a.point(lambda p: 255 if p > 245 else p))


def _neutralize_edge_fringe(rgb: np.ndarray, old_a: np.ndarray, new_a: np.ndarray) -> np.ndarray:
    out = rgb.copy()
    edge = (new_a > 0) & (new_a < 245)
    # Transparent-edge RGB often contains old matte colors. Pull edge pixels toward
    # neutral dark paint so compositing does not reveal a pale halo.
    dark = np.array([8, 9, 10], dtype=np.float32)
    strength = np.clip((245 - new_a) / 245, 0, 1) * 0.55
    out[edge] = out[edge] * (1 - strength[edge, None]) + dark * strength[edge, None]
    out[old_a == 0] = 0
    return out


def _smoke_glass(rgba: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image:
    # Generic upper-cabin pass. It avoids hard polygons so it works across sedans,
    # SUVs, MPVs, and sports cars while keeping the original model silhouette.
    arr = np.asarray(rgba).astype(np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    x0, y0, x1, y1 = bbox
    bw = max(1, x1 - x0)
    bh = max(1, y1 - y0)

    yy, xx = np.mgrid[0 : rgba.height, 0 : rgba.width]
    upper_cabin = (
        (alpha > 80)
        & (xx > x0 + bw * 0.20)
        & (xx < x0 + bw * 0.96)
        & (yy > y0 + bh * 0.08)
        & (yy < y0 + bh * 0.44)
    )

    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    saturation = (maxc - minc) / np.maximum(maxc, 1)
    brightness = rgb.mean(axis=2)

    # Windows in the source set are usually neutral/gray and brighter than black paint.
    likely_glass = upper_cabin & (saturation < 0.34) & (brightness > 34)
    if not likely_glass.any():
        return rgba

    mask = Image.fromarray((likely_glass.astype(np.uint8)) * 255, "L")
    mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3.0))
    m = np.asarray(mask).astype(np.float32) / 255.0

    blurred = np.asarray(rgba.filter(ImageFilter.GaussianBlur(4))).astype(np.float32)[..., :3]
    tint = np.zeros_like(rgb)
    tint[..., 0] = 34
    tint[..., 1] = 40
    tint[..., 2] = 42
    smoked = tint * 0.72 + blurred * 0.28

    blend = m * 0.58
    rgb = rgb * (1 - blend[..., None]) + smoked * blend[..., None]

    arr[..., :3] = rgb
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def rebuild_one(path: Path, backup: bool) -> None:
    original = Image.open(path).convert("RGBA")
    if original.size != CANVAS_SIZE:
        original = original.resize(CANVAS_SIZE, Image.Resampling.LANCZOS)

    if backup:
        backup_path = path.parent / BACKUP_DIR / path.name
        backup_path.parent.mkdir(exist_ok=True)
        if not backup_path.exists():
            shutil.copy2(path, backup_path)

    rgb = np.asarray(original.convert("RGB")).astype(np.float32)
    old_alpha_img = original.getchannel("A")
    old_alpha = np.asarray(old_alpha_img).astype(np.float32)
    bbox = _bbox_from_alpha(old_alpha_img)
    new_alpha_img = _clean_alpha(old_alpha_img)
    new_alpha = np.asarray(new_alpha_img).astype(np.float32)

    rgb = _neutralize_edge_fringe(rgb, old_alpha, new_alpha)
    rebuilt = Image.fromarray(
        np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), np.clip(new_alpha, 0, 255).astype(np.uint8)]),
        "RGBA",
    )
    rebuilt = _smoke_glass(rebuilt, bbox)
    rebuilt.save(path, "WEBP", quality=95, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="media-webp/photos/carpark")
    parser.add_argument("--no-backup", action="store_true")
    parser.add_argument(
        "--local-cleanup-only",
        action="store_true",
        help="Legacy local matte cleanup. Do not use this as a substitute for AI reconstruction.",
    )
    args = parser.parse_args()
    if not args.local_cleanup_only:
        raise SystemExit(
            "This legacy script only performs local cleanup. For true banner rebuilds, use the AI reconstruction workflow documented in docs/detail-banner-standard.md. "
            "Pass --local-cleanup-only only when you explicitly want the old conservative matte cleanup."
        )

    paths = sorted(Path(args.root).glob(f"*/{BANNER_NAME}"))
    if not paths:
        raise SystemExit(f"No {BANNER_NAME} files found under {args.root}")

    for path in paths:
        rebuild_one(path, backup=not args.no_backup)
        im = Image.open(path)
        alpha = im.convert("RGBA").getchannel("A")
        if im.size != CANVAS_SIZE or alpha.getextrema() != (0, 255):
            raise RuntimeError(f"validation failed: {path}")
        print(path)

    print(f"rebuilt {len(paths)} detail banners")


if __name__ == "__main__":
    main()
