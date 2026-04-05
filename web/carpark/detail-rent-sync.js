/**
 * 详情页首屏加载：从 /api/cars-catalog 按 body[data-car-display-name] 匹配 cars.car_name，
 * 将日租写入 body[data-daily-price]；首屏标题用 brand / model；主题色 --brand / --brand-light
 * 与选车页分类标签渐变一致（见 car.css 中各 *-badge 与 car.js categoryBadgeClass）。
 * 须在 car.js / similar-price-cars.js / vehicle-click.js 之前引入。
 */
(function () {
  function normName(s) {
    return String(s || '')
      .replace(/\s+/g, ' ')
      .replace(/：/g, ':')
      .trim();
  }

  function apiCatalogBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || (typeof location !== 'undefined' ? String(location.origin).replace(/\/$/, '') : '');
  }

  var body = document.body;
  if (!body) {
    window.__mangoRentSyncPromise = Promise.resolve();
    return;
  }

  var displayName = (body.getAttribute('data-car-display-name') || '').trim();
  if (!displayName || typeof fetch === 'undefined') {
    window.__mangoRentSyncPromise = Promise.resolve();
    return;
  }

  var base = apiCatalogBase();
  if (!base) {
    window.__mangoRentSyncPromise = Promise.resolve();
    return;
  }

  /** 与 car.css 分类标签双色渐变止点一致（car.js categoryBadgeClass 映射） */
  function categoryBrandColors(category) {
    var c = String(category || '').trim();
    var map = {
      行政级轿车: ['#f7a614', '#ffcc6a'],
      豪华SUV: ['#ec4899', '#f472b6'],
      豪华suv: ['#ec4899', '#f472b6'],
      超跑: ['#be123c', '#fb7185'],
      性能车: ['#be123c', '#fb7185'],
      新能源: ['#059669', '#34d399'],
      商务车: ['#6366f1', '#8b5cf6'],
      轿车: ['#3b82f6', '#60a5fa'],
      越野车: ['#a8b4c4', '#c5d0de'],
      皮卡: ['#0ea5e9', '#38bdf8'],
      即将上新: ['#6366f1', '#8b5cf6'],
    };
    if (map[c]) return map[c];
    return ['#ff6b35', '#ff8c69'];
  }

  function applyThemeFromCategory(category) {
    var pair = categoryBrandColors(category);
    document.documentElement.style.setProperty('--brand', pair[0]);
    document.documentElement.style.setProperty('--brand-light', pair[1]);
  }

  function applyHeroFromCatalog(brand, model) {
    var h1 =
      document.querySelector('.hero-detail h1.hero-title') ||
      document.querySelector('h1.hero-title');
    if (!h1) return;
    var b = String(brand == null ? '' : brand).trim();
    var m = String(model == null ? '' : model).trim();
    if (!b && !m) return;
    while (h1.firstChild) {
      h1.removeChild(h1.firstChild);
    }
    if (b && m) {
      h1.appendChild(document.createTextNode(b));
      h1.appendChild(document.createElement('br'));
      var span = document.createElement('span');
      span.className = 'hero-title-highlight';
      span.textContent = m;
      h1.appendChild(span);
      return;
    }
    var spanOnly = document.createElement('span');
    spanOnly.className = 'hero-title-highlight';
    spanOnly.textContent = b || m;
    h1.appendChild(spanOnly);
  }

  var target = normName(displayName);
  window.__mangoRentSyncPromise = fetch(base + '/api/cars-catalog', { credentials: 'omit' })
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      if (!j || !j.ok || !Array.isArray(j.cars)) return;
      var i;
      for (i = 0; i < j.cars.length; i++) {
        var c = j.cars[i];
        if (normName(c.car_name) === target) {
          applyThemeFromCategory(c.category);
          applyHeroFromCatalog(c.brand, c.model);
          var p = parseInt(String(c.rent_price), 10);
          if (!isNaN(p) && p > 0) {
            body.setAttribute('data-daily-price', String(p));
            try {
              document.dispatchEvent(
                new CustomEvent('mango:daily-price-updated', {
                  detail: { price: p, carName: displayName },
                })
              );
            } catch (e) {}
            document.querySelectorAll('[data-mango-daily-rent]').forEach(function (el) {
              el.textContent = '¥' + p.toLocaleString('zh-CN');
            });
          }
          return;
        }
      }
    })
    .catch(function () {});
})();
