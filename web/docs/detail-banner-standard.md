# Detail Page Banner Standard

`media-webp/photos/carpark/*/详情页-banner.webp` is the transparent hero cutout used by vehicle detail pages.

## Required Format

- File name: `详情页-banner.webp`
- Canvas: `2048x2048`
- Color mode: `RGBA`
- Transparency: real alpha channel, with fully transparent padding around the vehicle
- Background: transparent only; no baked black, white, or colored backdrop
- Output format: WebP with alpha

## Visual Standard

- Vehicle remains the original model and body style for that folder.
- Vehicle is centered horizontally on the canvas.
- The lowest visible vehicle pixel must sit on the bottom of the `2048x2048` canvas.
- Do not leave transparent padding below the tires/body shadow.
- Exterior cutout edges must be clean, anti-aliased, and free of stair-stepped pixels.
- No gray, white, green, or black fringe should appear around the vehicle when composited.
- Windows should read as premium dark smoked glass:
  - smooth dark tint
  - subtle highlight/reflection
  - no checkerboard texture
  - no dirty blocks or uneven gray patches
- Body paint, wheels, lights, and brand-specific shape should remain recognizable.
- No text, watermark, plate number, baked logo overlays, or extra decorative background.

## AI Reconstruction Standard

When a banner is marked for rebuild, it must be regenerated as a clean vehicle cutout, not repaired with a local filter pass.

- Use the vehicle folder name as the source model description.
- Generate a premium automotive catalog side-profile image.
- The car must face left unless the existing project source for that model clearly uses the opposite direction.
- Generate on a perfectly flat pure white product-photo background.
- Remove the background with subject segmentation, then save the final asset as transparent WebP.
- The output must replace `详情页-banner.webp` only after alpha validation passes.
- The generated source should be plain ecommerce/dealership inventory style, not an ad-style image with trails, panels, roads, floors, shadows, or motion effects.
- The car category, body style, color family, and obvious model identity must match the folder name.
- Do not use a local-only filter/edge-cleaning pass as a substitute for AI reconstruction.

## Batch Rebuild Rules

- Back up each original file before replacement.
- Preserve `RGBA 2048x2048` for every rebuilt asset.
- Preserve the detail-page cutout composition: vehicle centered horizontally, with the visible vehicle bottom aligned to the canvas bottom edge.
- Keep fully transparent pixels transparent.
- Validate every output has alpha range `(0, 255)`.

## Website display framing

`banner-layout.js` aligns rebuilt banners to each vehicle's original display frame
without changing the WebP files or the existing CSS/slide animations. It is loaded
by `carpark/detail-other-models.js`, `m2/index.js` and
`m2/carpark/shared-detail-rail.js`.

- `banner-layout-profiles.json` records the largest opaque subject component in
  the current image and its `_backup_before_rebuild` original. Detached dust is
  excluded. The renderer preserves aspect ratio, horizontal centre and baseline.
- The 118 vehicles with backups have individual profiles. The two without
  backups (`兰博基尼大牛`, `五菱宏光`) retain their existing display.
- Before correction, dimensions and the full alpha bounds must match the
  profiled source. Old cached banners or unexpected replacements remain intact.
- Canvas output is transparent PNG in memory, with an eight-image cache. An
  unavailable manifest or canvas security error leaves the source image intact.
  Preview via a same-origin HTTP server; `file://` may block fetch/canvas access.
- Read-only profile generation: `python3 scripts/build_banner_layout_profiles.py`
  prints JSON to stdout. Regenerate profiles after rebuilding source images.
- Verification: `node --test scripts/banner-layout.test.cjs`.
- Publish the new `banner-layout.js`, `banner-layout-profiles.json`, the three
  entry scripts above and the rebuilt `media-webp/photos/carpark/*/详情页-banner.webp`
  together. Invalidate cached entry scripts and image URLs when publishing; merely
  replacing image files does not install the display correction.
- PC detail pages now reference `detail-other-models.js?v=20261103-banner-frame`.
  Publish the updated `carpark/*/car.html` pages too: the previous script URL
  can stay cached for 12 hours and that older script does not load the framing
  helper. A successful direct request to the new script does not prove an
  already-open browser has replaced its cached entry script.
