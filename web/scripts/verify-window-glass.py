"""Read-only validation and comparison sheets for window-only AI edits."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1])
files = json.loads((root / 'files.json').read_text())
edits = json.loads((root / 'generated.json').read_text())
crops = json.loads((root / 'crops.json').read_text())
font = ImageFont.truetype('/System/Library/Fonts/STHeiti Light.ttc', 17)
results = []
def asset(index, kind):
    name = Path(files[index]).parent.name
    saved = root / {'before': f'before/{name}.webp', 'after': f'after/{name}.webp', 'mask': f'masks/{index}.png'}[kind]
    if saved.exists():
        return saved
    return {'before': Path(files[index]), 'after': root / f'{index}-final.webp', 'mask': root / f'{index}-mask.png'}[kind]

for edit in edits:
    index = edit['index']
    old = np.asarray(Image.open(asset(index, 'before')).convert('RGBA'))
    new = np.asarray(Image.open(asset(index, 'after')).convert('RGBA'))
    mask = np.asarray(Image.open(asset(index, 'mask')).convert('L'))
    assert old.shape == new.shape == (2048, 2048, 4), index
    # Unified retouches can repair transparent holes INSIDE real glass panes.
    unified = (root / 'audit.json').exists()
    if unified:
        assert np.array_equal(old[:, :, 3][mask == 0], new[:, :, 3][mask == 0]), f'{index}: alpha outside glass changed'
        for threshold in [0, 8, 32, 128, 250]:
            def bounds(alpha):
                ys, xs = np.where(alpha > threshold)
                return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
            assert bounds(old[:, :, 3]) == bounds(new[:, :, 3]), f'{index}: silhouette bounds changed'
    else:
        assert np.array_equal(old[:, :, 3], new[:, :, 3]), f'{index}: alpha changed'
    outside = (mask == 0) & (old[:, :, 3] > 0)
    assert np.array_equal(old[:, :, :3][outside], new[:, :, :3][outside]), f'{index}: non-glass pixels changed'
    assert np.any(old[:, :, :3][mask > 0] != new[:, :, :3][mask > 0]), f'{index}: no edit'
    results.append({'index': index, 'name': Path(files[index]).parent.name,
                    'size': [2048, 2048], 'alpha_unchanged': bool(np.array_equal(old[:,:,3],new[:,:,3])),
                    'alpha_outside_glass_unchanged': True, 'silhouette_bounds_unchanged': True,
                    'visible_pixels_outside_mask_unchanged': True})

for page in range((len(edits) + 5) // 6):
    sheet = Image.new('RGB', (1600, 800), '#24262a')
    draw = ImageDraw.Draw(sheet)
    for j, edit in enumerate(edits[page * 6:(page + 1) * 6]):
        index = edit['index']
        for side, source in enumerate([asset(index, 'before'), asset(index, 'after')]):
            with Image.open(source) as image:
                crop = image.crop(crops[str(index)]['crop'])
                crop.thumbnail((780, 100))
                sheet.paste(crop, (side * 800 + 10, j * 130 + 25), crop)
        draw.text((10, j * 130 + 2), f'{index} {Path(files[index]).parent.name} BEFORE / AFTER', font=font, fill='white')
    sheet.save(root / f'compare-{page}.png')
(root / 'verification.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(f'PASS: {len(results)} edits; dimensions, silhouette bounds and visible pixels/alpha outside glass masks unchanged.')
