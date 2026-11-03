// Composite AI-edited glass only. Never replace body pixels with regenerated paint.
// Usage: node scripts/composite-window-glass.cjs <audit-directory>
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(process.argv[2]);
const files = JSON.parse(fs.readFileSync(path.join(dir, 'files.json')));
const crops = JSON.parse(fs.readFileSync(path.join(dir, 'crops.json')));
const edits = JSON.parse(fs.readFileSync(path.join(dir, 'generated.json')));
const polygons = require('./window-glass-polygons.json');
const run = args => execFileSync('magick', args, { stdio: 'pipe' });
const selected = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
for (const edit of edits) {
  if (selected && !selected.includes(edit.index)) continue;
  const i = edit.index, meta = crops[i];
  const ox = (meta.cell % 2) * 800 + 10;
  const oy = Math.floor(meta.cell / 2) * 220 + 30;
  const sx = meta.cropSize[0] / meta.previewSize[0];
  const sy = meta.cropSize[1] / meta.previewSize[1];
  const draw = polygons[i].map(points => 'polygon ' + points.map(([x, y]) =>
    `${(meta.crop[0] + (x - ox) * sx).toFixed(2)},${(meta.crop[1] + (y - oy) * sy).toFixed(2)}`
  ).join(' ')).join(' ');
  const mask = path.join(dir, `${i}-mask.png`);
  const patch = path.join(dir, `${i}-patch.png`);
  const alpha = path.join(dir, `${i}-alpha.png`);
  const output = path.join(dir, `${i}-final.webp`);
  run(['-size', '2048x2048', 'xc:black', '-fill', 'white', '-stroke', 'none',
    '-draw', draw, '-blur', '0x0.65', '-depth', '8', mask]);
  run([edit.path, '-resize', '2048x2048!', '-alpha', 'off', mask,
    '-compose', 'CopyOpacity', '-composite', patch]);
  run([files[i], '-alpha', 'extract', alpha]);
  run([files[i], patch, '-compose', 'Over', '-composite', alpha,
    '-compose', 'CopyOpacity', '-composite', '-depth', '8',
    '-define', 'webp:lossless=true', '-define', 'webp:exact=true', output]);
  console.log(`${i}: ${path.basename(path.dirname(files[i]))}`);
}
