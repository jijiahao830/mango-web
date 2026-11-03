"""Read banner/backup alpha masks and print display-framing profiles; never edit images."""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def measure(path):
    with Image.open(path) as image:
        alpha = image.convert('RGBA').getchannel('A')
        labels, count = ndimage.label(np.asarray(alpha) > 128)
        if not count:
            raise ValueError(f'No opaque subject: {path}')
        areas = np.bincount(labels.ravel())
        areas[0] = 0
        ys, xs = ndimage.find_objects(labels == int(areas.argmax()))[0]
        return dict(size=list(image.size), alpha=list(alpha.getbbox()),
                    subject=[xs.start, ys.start, xs.stop, ys.stop])


def build(root):
    profiles = {}
    for path in sorted(root.glob('*/详情页-banner.webp')):
        backup = path.parent / '_backup_before_rebuild' / path.name
        if not backup.is_file():
            continue
        current, old = measure(path), measure(backup)
        if current['subject'] == old['subject'] and current['size'] == old['size']:
            continue
        profiles[path.parent.name] = dict(source=current, target=old)
    return profiles


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'media-webp/photos/carpark'
    profiles = build(root)
    print('{\n' + ',\n'.join('  ' + json.dumps(name, ensure_ascii=False) + ': ' +
          json.dumps(profile, ensure_ascii=False) for name, profile in profiles.items()) + '\n}')
