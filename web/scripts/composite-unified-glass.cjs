// Composite generated glass inside reviewed local-cell polygons, preserving source alpha.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(process.argv[2]);
const files = JSON.parse(fs.readFileSync(path.join(dir, 'files.json')));
const crops = JSON.parse(fs.readFileSync(path.join(dir, 'crops.json')));
const polygons = Object.assign({}, ...fs.readdirSync(dir).filter(n => /^polygons(?:-.*)?\.json$/.test(n)).map(n => JSON.parse(fs.readFileSync(path.join(dir, n)))));
const run = args => execFileSync('magick', args, { stdio: 'pipe' });
const selected = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const completed = [];
for (const [key, panes] of Object.entries(polygons)) {
  const index = Number(key), meta = crops[index];
  if (selected && !selected.includes(index)) continue;
  const ai = path.join(dir, 'ai', `${index}.png`);
  if (!fs.existsSync(ai)) continue;
  const name = path.basename(path.dirname(files[index]));
  const source = path.join(dir, 'before', `${name}.webp`);
  const output = path.join(dir, 'after', `${name}.webp`);
  const mask = path.join(dir, 'masks', `${index}.png`);
  const patch = path.join(dir, 'inputs', `${index}-patch.png`);
  const alpha = path.join(dir, 'inputs', `${index}-alpha.png`);
  const sx = meta.cropSize[0] / meta.previewSize[0];
  const sy = meta.cropSize[1] / meta.previewSize[1];
  const draw = panes.map(points => 'polygon ' + points.map(([x,y]) => `${(meta.crop[0]+(x-10)*sx).toFixed(2)},${(meta.crop[1]+(y-30)*sy).toFixed(2)}`).join(' ')).join(' ');
  run(['-size','2048x2048','xc:black','-fill','white','-stroke','none','-draw',draw,'-blur','0x0.65','-depth','8',mask]);
  run([ai,'-resize','2048x2048!','-alpha','off',mask,'-compose','CopyOpacity','-composite',patch]);
  // Some source windows are punched-out transparent holes. Fill glass opacity
  // only inside the reviewed panes; keep every other source alpha pixel.
  run([source,'-alpha','extract',mask,'-compose','Lighten','-composite',alpha]);
  run([source,patch,'-compose','Over','-composite',alpha,'-compose','CopyOpacity','-composite','-depth','8','-define','webp:lossless=true','-define','webp:exact=true',output]);
  fs.unlinkSync(patch); fs.unlinkSync(alpha);
  completed.push({index,name,path:ai,status:'composited'});
  console.log(`${index}: ${name}`);
}
// Include all already-composited entries so incremental batches remain verifiable.
const all = Object.keys(polygons).map(Number).filter(i => fs.existsSync(path.join(dir,'after',path.basename(path.dirname(files[i]))+'.webp'))).map(index => ({index,name:path.basename(path.dirname(files[index])),path:path.join(dir,'ai',`${index}.png`)}));
fs.writeFileSync(path.join(dir,'generated.json'),JSON.stringify(all,null,2));
