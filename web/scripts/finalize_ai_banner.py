from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


CANVAS_SIZE = (2048, 2048)


def latest_generated_image() -> Path:
    root = Path.home() / ".codex" / "generated_images"
    paths = [p for p in root.rglob("*") if p.suffix.lower() in {".png", ".webp", ".jpg", ".jpeg"}]
    if not paths:
        raise FileNotFoundError(f"no generated images found under {root}")
    return max(paths, key=lambda p: p.stat().st_mtime)


def remove_green_key(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    arr = np.asarray(rgb).astype(np.float32)
    border = np.concatenate([arr[:12].reshape(-1, 3), arr[-12:].reshape(-1, 3), arr[:, :12].reshape(-1, 3), arr[:, -12:].reshape(-1, 3)])
    key = np.median(border, axis=0)

    dist = np.sqrt(((arr - key) ** 2).sum(axis=2))
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    rb_max = np.maximum(r, b)
    green_excess = g - rb_max

    # Combine distance from sampled key with a green-excess key. The latter catches
    # green antialiasing that is no longer close to the exact background color.
    alpha_by_distance = np.clip((dist - 38.0) / (128.0 - 38.0), 0, 1) * 255
    alpha_by_green = np.clip(1 - ((green_excess - 8.0) / (58.0 - 8.0)), 0, 1) * 255
    alpha = np.minimum(alpha_by_distance, alpha_by_green)

    alpha[(green_excess > 18) & (g > 36)] = 0
    alpha[(dist < 52)] = 0
    alpha = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
    alpha_arr = np.asarray(alpha).astype(np.float32)
    alpha_arr = np.where(alpha_arr < 18, 0, alpha_arr)
    alpha_arr = np.where(alpha_arr > 238, 255, alpha_arr)

    # Despill: remove green from every visible non-background pixel. This is
    # intentionally strong because these banner cutouts should not contain green.
    max_non_green = np.maximum(r, b)
    arr[..., 1] = np.minimum(g, max_non_green * 1.02 + 2)

    edge = (alpha_arr > 0) & (alpha_arr < 255)
    # Semi-transparent edge pixels are the most visible on black; darken them
    # slightly after despill so no key color survives compression/compositing.
    arr[edge] *= 0.82
    arr[alpha_arr == 0] = 0

    return Image.fromarray(np.dstack([np.clip(arr, 0, 255).astype(np.uint8), alpha_arr.astype(np.uint8)]), "RGBA")


def remove_background_with_model(source: Image.Image) -> Image.Image:
    from rembg import new_session, remove

    session = new_session("isnet-general-use")
    return remove(source.convert("RGB"), session=session).convert("RGBA")


def clean_subject(rgba: Image.Image, source: Image.Image) -> Image.Image:
    arr = np.asarray(rgba.convert("RGBA")).astype(np.float32)
    alpha = arr[..., 3]

    # Keep the vehicle and nearby wheel/roof components, remove detached artifacts
    # left by generation or segmentation.
    labels, count = ndimage.label(alpha > 10)
    if count:
        areas = np.bincount(labels.ravel())
        areas[0] = 0
        largest_label = int(areas.argmax())
        largest = areas[largest_label]
        largest_bbox = ndimage.find_objects(labels == largest_label)[0]
        ly, lx = largest_bbox
        pad_x = int(alpha.shape[1] * 0.04)
        pad_y = int(alpha.shape[0] * 0.06)
        main_box = (
            max(0, lx.start - pad_x),
            max(0, ly.start - pad_y),
            min(alpha.shape[1], lx.stop + pad_x),
            min(alpha.shape[0], ly.stop + pad_y),
        )

        keep_labels = [largest_label]
        slices = ndimage.find_objects(labels)
        min_area = max(1200, largest * 0.012)
        for label, component_slice in enumerate(slices, start=1):
            if label == largest_label or component_slice is None or areas[label] < min_area:
                continue
            cy, cx = component_slice
            component_box = (cx.start, cy.start, cx.stop, cy.stop)
            intersects_main = not (
                component_box[2] < main_box[0]
                or component_box[0] > main_box[2]
                or component_box[3] < main_box[1]
                or component_box[1] > main_box[3]
            )
            if intersects_main:
                keep_labels.append(label)
        keep = np.isin(labels, keep_labels)
        alpha[~keep] = 0

    # Despill only near transparent edges, using the generated source border color
    # as the key. This avoids damaging legitimately colored cars.
    src = np.asarray(source.convert("RGB")).astype(np.float32)
    border = np.concatenate([src[:12].reshape(-1, 3), src[-12:].reshape(-1, 3), src[:, :12].reshape(-1, 3), src[:, -12:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    key_channels = key > (key.max() * 0.72)
    edge = (alpha > 0) & (alpha < 245)
    if key_channels.any():
        other_channels = ~key_channels
        if other_channels.any():
            other_max = arr[..., :3][..., other_channels].max(axis=2)
            for idx, is_key in enumerate(key_channels):
                if is_key:
                    arr[..., idx][edge] = np.minimum(arr[..., idx][edge], other_max[edge] * 1.08 + 3)

    arr[..., 3] = alpha
    arr[..., :3][alpha == 0] = 0
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def fit_square(rgba: Image.Image) -> Image.Image:
    rgba = rgba.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("generated image has no visible pixels after key removal")
    rgba = rgba.crop(bbox)
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    # Detail-page banners should have no transparent padding below the vehicle.
    # Keep a little horizontal breathing room while placing the visible bottom
    # exactly on the bottom edge of the square canvas.
    rgba.thumbnail((1980, 1220), Image.Resampling.LANCZOS)
    x = (CANVAS_SIZE[0] - rgba.width) // 2
    y = CANVAS_SIZE[1] - rgba.height
    canvas.alpha_composite(rgba, (x, y))
    return canvas


def save_transparent_webp(image: Image.Image, target: Path) -> None:
    arr = np.asarray(image.convert("RGBA")).copy()
    arr[..., :3][arr[..., 3] == 0] = 0
    cleaned = Image.fromarray(arr, "RGBA")
    cleaned.save(target, "WEBP", lossless=True, quality=100, method=6, exact=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--method", choices=["rembg", "chroma"], default="rembg")
    args = parser.parse_args()

    source = args.source or latest_generated_image()
    source_image = Image.open(source)
    if args.method == "rembg":
        cutout = remove_background_with_model(source_image)
    else:
        cutout = remove_green_key(source_image)
    cutout = clean_subject(cutout, source_image)
    final = fit_square(cutout)
    args.target.parent.mkdir(parents=True, exist_ok=True)
    save_transparent_webp(final, args.target)

    check = Image.open(args.target).convert("RGBA")
    alpha = check.getchannel("A")
    if check.size != CANVAS_SIZE or alpha.getextrema() != (0, 255):
        raise RuntimeError(f"validation failed for {args.target}")
    print(f"{source} -> {args.target}")


if __name__ == "__main__":
    main()
