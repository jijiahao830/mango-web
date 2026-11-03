/* Keep rebuilt transparent banners in their previous display frame.
 * Original files and page layout/slide transforms remain unchanged.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function carName(url, base) {
    try {
      var parsed = new URL(url, base);
      if (!/^(https?:|file:)$/.test(parsed.protocol)) return null;
      var path = decodeURIComponent(parsed.pathname);
      var match = path.match(/\/media-webp\/photos\/carpark\/([^/]+)\/详情页-banner\.webp$/);
      return match ? match[1] : null;
    } catch (_) { return null; }
  }

  function placement(profile) {
    var s = profile.source.subject;
    var t = profile.target.subject;
    // Uniform scale: contain the new silhouette inside the old subject box,
    // preserve its proportions, horizontal centre and wheel baseline.
    var scale = Math.min((t[2] - t[0]) / (s[2] - s[0]), (t[3] - t[1]) / (s[3] - s[1]));
    var width = (s[2] - s[0]) * scale;
    var height = (s[3] - s[1]) * scale;
    return [(t[0] + t[2] - width) / 2, t[3] - height, width, height];
  }

  function alphaBounds(data, width, height) {
    var left = width, top = height, right = 0, bottom = 0;
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (!data[(y * width + x) * 4 + 3]) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
    }
    return [left, top, right, bottom];
  }

  function reframe(img, profile, createCanvas) {
    if (img.naturalWidth !== profile.source.size[0] || img.naturalHeight !== profile.source.size[1]) return null;
    var canvas = createCanvas();
    try {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      var bounds = alphaBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      // Old files may still be served during a rollout/cache refresh. Only
      // correct the verified new canvas, never shift an old image twice.
      if (!bounds.every(function (v, i) { return v === profile.source.alpha[i]; })) return null;
      canvas.width = profile.target.size[0]; canvas.height = profile.target.size[1];
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      var s = profile.source.subject;
      var dest = placement(profile);
      // Include antialiased perimeter pixels, but not detached background dust.
      var pad = 2;
      var x = Math.max(0, s[0] - pad), y = Math.max(0, s[1] - pad);
      var w = Math.min(img.naturalWidth, s[2] + pad) - x;
      var h = Math.min(img.naturalHeight, s[3] + pad) - y;
      var scale = dest[2] / (s[2] - s[0]);
      ctx.drawImage(img, x, y, w, h, dest[0] + (x - s[0]) * scale,
        dest[1] + (y - s[1]) * scale, w * scale, h * scale);
      return canvas.toDataURL('image/png');
    } finally {
      canvas.width = 1; canvas.height = 1;
    }
  }

  function install(win) {
    var doc = win.document;
    var script = doc.currentScript;
    if (!script || win.__mangoBannerLayoutInstalled) return;
    win.__mangoBannerLayoutInstalled = true;
    var profiles = null;
    var cache = new Map();
    function apply(img) {
      if (!profiles || !img || img.tagName !== 'IMG' || !img.complete || !img.naturalWidth) return;
      var url = img.currentSrc || img.src;
      var name = carName(url, doc.baseURI);
      if (!name || !profiles[name]) return;
      try {
        var data = cache.get(url);
        if (!data) {
          data = reframe(img, profiles[name], function () { return doc.createElement('canvas'); });
          if (!data) return;
          if (cache.size >= 8) cache.delete(cache.keys().next().value);
          cache.set(url, data);
        }
        // A <picture> source overrides img.src, so update both together.
        if (img.parentNode && img.parentNode.tagName === 'PICTURE') {
          img.parentNode.querySelectorAll('source').forEach(function (source) {
            source.removeAttribute('srcset');
          });
        }
        img.removeAttribute('srcset');
        img.src = data;
      } catch (_) {
        // A failed canvas read (e.g. local file security) leaves the original visible.
      }
    }
    doc.addEventListener('load', function (event) { apply(event.target); }, true);
    var manifest = new URL('banner-layout-profiles.json?v=20261103', script.src);
    win.fetch(manifest.href, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('banner layout profiles unavailable');
      return res.json();
    }).then(function (data) {
      profiles = data;
      doc.querySelectorAll('img').forEach(apply);
    }).catch(function () {});
  }

  return { carName: carName, placement: placement, alphaBounds: alphaBounds, reframe: reframe, install: install };
});
