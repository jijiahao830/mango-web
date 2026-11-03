const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../banner-layout.js');
const profiles = require('../banner-layout-profiles.json');

test('all 118 rebuilt vehicles fit their own old frame without distortion', () => {
  assert.equal(Object.keys(profiles).length, 118);
  for (const [name, profile] of Object.entries(profiles)) {
    const s = profile.source.subject, t = profile.target.subject;
    const [x, y, w, h] = api.placement(profile);
    assert.ok(x >= t[0] - 1e-6 && x + w <= t[2] + 1e-6, name);
    assert.ok(y >= t[1] - 1e-6 && y + h <= t[3] + 1e-6, name);
    assert.ok(Math.abs(x + w / 2 - (t[0] + t[2]) / 2) < 1e-6, name);
    assert.ok(Math.abs(y + h - t[3]) < 1e-6, name);
    assert.ok(Math.abs(w / h - (s[2] - s[0]) / (s[3] - s[1])) < 1e-6, name);
  }
});

test('GTR baseline returns to old mid-canvas frame', () => {
  const p = profiles['日产 GT-R R35 战神'];
  const [x, y, w, h] = api.placement(p);
  assert.ok(y >= 762 && y < 770);
  assert.equal(y + h, 1333);
  // New and old silhouettes differ slightly in aspect ratio; preserve it.
  assert.ok(Math.abs(x - 76) < 2);
  assert.ok(Math.abs(w - 1899) < 2);
});

test('matches encoded or raw banner URLs, excludes covers and transformed images', () => {
  const folder = encodeURIComponent('日产 GT-R R35 战神');
  const url = `https://example.com/media-webp/photos/carpark/${folder}/详情页-banner.webp?v=1`;
  assert.equal(api.carName(url), '日产 GT-R R35 战神');
  assert.equal(api.carName(decodeURIComponent(url)), '日产 GT-R R35 战神');
  assert.equal(api.carName(url.replace('详情页-banner', '封面')), null);
  assert.equal(api.carName('data:image/png;base64,AA'), null);
});

function fixture(old = false) {
  const pixels = new Uint8ClampedArray(4 * 4 * 4);
  pixels[((old ? 1 : 3) * 4 + 1) * 4 + 3] = 255;
  const draws = [];
  const canvas = { width: 0, height: 0,
    getContext: () => ({ drawImage: (...args) => draws.push(args), getImageData: () => ({ data: pixels }) }),
    toDataURL: () => 'data:image/png;base64,corrected' };
  const profile = { source: { size: [4, 4], alpha: [1, 3, 2, 4], subject: [1, 3, 2, 4] },
    target: { size: [4, 4], subject: [1, 1, 2, 2] } };
  return { canvas, profile, draws };
}

test('rewrites a verified new image and releases canvas backing memory', () => {
  const { canvas, profile, draws } = fixture();
  const img = { naturalWidth: 4, naturalHeight: 4 };
  assert.equal(api.reframe(img, profile, () => canvas), 'data:image/png;base64,corrected');
  assert.equal(draws.length, 2);
  assert.deepEqual(draws[1].slice(1), [0, 1, 4, 3, 0, -1, 4, 3]);
  assert.equal(canvas.width, 1);
});

test('old server/cached images and unexpected dimensions are not shifted', () => {
  const { canvas, profile, draws } = fixture(true);
  assert.equal(api.reframe({ naturalWidth: 4, naturalHeight: 4 }, profile, () => canvas), null);
  assert.equal(draws.length, 1);
  assert.equal(api.reframe({ naturalWidth: 8, naturalHeight: 4 }, profile, () => { throw Error('unused'); }), null);
});

test('picture sources and subsequent carousel loads use the same correction', async () => {
  const { canvas, profile } = fixture();
  const src = 'https://example.com/media-webp/photos/carpark/Test/详情页-banner.webp';
  let listener;
  let removed = 0;
  const img = { tagName: 'IMG', complete: true, naturalWidth: 4, naturalHeight: 4, src,
    removeAttribute: () => {},
    parentNode: { tagName: 'PICTURE', querySelectorAll: () => [{ removeAttribute: () => removed++ }] } };
  const doc = { currentScript: { src: 'https://example.com/banner-layout.js' }, baseURI: src,
    createElement: () => canvas, addEventListener: (_, fn) => { listener = fn; }, querySelectorAll: () => [img] };
  api.install({ document: doc, fetch: async () => ({ ok: true, json: async () => ({ Test: profile }) }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(img.src, /^data:image\/png/);
  assert.equal(removed, 1);
  img.src = src;
  listener({ target: img });
  assert.match(img.src, /^data:image\/png/);
  img.src = src.replace('详情页-banner', '封面');
  listener({ target: img });
  assert.match(img.src, /封面.webp$/);
});

test('manifest failure keeps the original image and handles later load events', async () => {
  let listener;
  const img = { tagName: 'IMG', complete: true, naturalWidth: 4, src: 'original.webp' };
  api.install({ document: {
    currentScript: { src: 'https://example.com/banner-layout.js' },
    addEventListener: (_, fn) => { listener = fn; },
    querySelectorAll: () => [img]
  }, fetch: async () => ({ ok: false }) });
  await new Promise(resolve => setImmediate(resolve));
  listener({ target: img });
  assert.equal(img.src, 'original.webp');
});
