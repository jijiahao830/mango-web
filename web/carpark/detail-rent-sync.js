/**
 * 详情页首屏加载：从 /api/cars-catalog 将当前车日租写入 body[data-daily-price]，
 * 供同价位模块、vehicle-click 等与租金相关的逻辑统一使用。
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
