/**
 * 详情页首屏加载：从 /api/cars-catalog 按 body[data-car-display-name] 匹配 cars.car_name，
 * 将日租写入 body[data-daily-price]；首屏标题：上行品牌（小字）、下行型号（大字 .hero-title-highlight）；主题色 --brand / --brand-light
 * 与选车页分类标签渐变一致（见 car.css 中各 *-badge 与 car.js categoryBadgeClass）。
 * 须在 car.js / similar-price-cars.js / vehicle-click.js 之前引入。
 *
 * 「查不到车」常见原因：① 静态页与 API 不同端口/域名且未设 window.MANGO_API_ORIGIN；
 * ② 库表 car_name 与页面 data-car-display-name 仅有空格/全角空格差异（已用 carNameMatchKey 对齐）。
 */
(function () {
  /** 与 cars.car_name、carpark 文件夹名比对：去掉所有空白、全角空格、零宽符 */
  function carNameMatchKey(s) {
    return String(s || '')
      .replace(/[\s\u00a0\u3000\u200b-\u200d\ufeff]+/g, '')
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

  /** 与 car.css 行政级 / luxsedan 角标一致（金→浅金） */
  var THEME_GOLD_EXEC = ['#f7a614', '#ffcc6a'];

  /**
   * 选车页为金/黄角标（行政级轿车等），但库里 category 可能为空或与映射不一致时，
   * 仍按车名强制与角标同色（避免详情页落回 car.css 默认橙）。
   */
  var THEME_BY_CAR_NAME = {
    宾利飞驰: THEME_GOLD_EXEC,
    宾利慕尚: THEME_GOLD_EXEC,
  };

  /** 与 car.css 分类标签双色渐变止点一致（car.js categoryBadgeClass 映射） */
  function categoryBrandColors(category) {
    var c = String(category || '').trim();
    var map = {
      行政级轿车: THEME_GOLD_EXEC,
      豪华SUV: ['#ec4899', '#f472b6'],
      豪华suv: ['#ec4899', '#f472b6'],
      超跑: ['#be123c', '#fb7185'],
      /* 与选车页、静态 data-category 文案对齐 */
      超级跑车: ['#be123c', '#fb7185'],
      性能车: ['#be123c', '#fb7185'],
      新能源: ['#059669', '#34d399'],
      商务车: ['#6366f1', '#8b5cf6'],
      轿车: ['#3b82f6', '#60a5fa'],
      /* 部分库表用「豪华轿车」，角标用 luxsedan 与行政级同款金色 */
      豪华轿车: THEME_GOLD_EXEC,
      越野车: ['#a8b4c4', '#c5d0de'],
      皮卡: ['#b45309', '#fbbf24'],
      即将上新: ['#6366f1', '#8b5cf6'],
    };
    if (map[c]) return map[c];
    return ['#ff6b35', '#ff8c69'];
  }

  function applyThemePair(pair) {
    document.documentElement.style.setProperty('--brand', pair[0]);
    document.documentElement.style.setProperty('--brand-light', pair[1]);
  }

  function resolveThemePair(category, carNameNorm) {
    if (THEME_BY_CAR_NAME[carNameNorm]) return THEME_BY_CAR_NAME[carNameNorm];
    return categoryBrandColors(category);
  }

  function applyThemeFromCategory(category) {
    applyThemePair(categoryBrandColors(category));
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

  var target = carNameMatchKey(displayName);
  window.__mangoRentSyncPromise = fetch(base + '/api/cars-catalog', { credentials: 'omit' })
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      if (!j || !j.ok || !Array.isArray(j.cars)) {
        if (typeof console !== 'undefined' && console.warn && j && !j.ok) {
          console.warn(
            '[mango] /api/cars-catalog 未成功（ok=false），详情页无法按库表匹配车辆。请检查 member_api、database.mysql，或静态页与 API 不同源时设置 window.MANGO_API_ORIGIN。',
            j.error || j.detail || ''
          );
        }
        return;
      }
      var i;
      for (i = 0; i < j.cars.length; i++) {
        var c = j.cars[i];
        if (carNameMatchKey(c.car_name) === target) {
          applyThemePair(resolveThemePair(c.category, target));
          try {
            body.setAttribute('data-category', String(c.category || '').trim());
          } catch (e) {}
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
      if (THEME_BY_CAR_NAME[target]) {
        applyThemePair(THEME_BY_CAR_NAME[target]);
      }
    })
    .catch(function (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[mango] /api/cars-catalog 请求失败，详情页无法按库表匹配。若用 Live Server 等与 API 不同源，请在页面中设置 window.MANGO_API_ORIGIN 为 API 根地址（如 http://127.0.0.1:8765）。',
          err
        );
      }
      if (THEME_BY_CAR_NAME[target]) {
        applyThemePair(THEME_BY_CAR_NAME[target]);
      }
    });
})();
