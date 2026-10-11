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
