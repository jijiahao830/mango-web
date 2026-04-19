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

  function pricingConfig() {
    var cfg = window.mangoPricingConfig || {
      day7: { multiplier: 6.5, divisor: 7 },
      day15: { multiplier: 13, divisor: 15 },
      day30: { multiplier: 23, divisor: 30 },
    };
    return cfg;
  }

  function formatDayPrice(price) {
    // 与“加入清单”弹窗保持一致：不加千分位，统一「¥xxx/天」
    return '¥' + String(parseInt(String(price || 0), 10) || 0) + '/天';
  }

  function ensureDesktopRentCardStyles() {
    if (document.getElementById('mango-rent-card-desktop-style')) return;
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    var style = document.createElement('style');
    style.id = 'mango-rent-card-desktop-style';
    style.textContent =
      '@media (min-width: 769px) {' +
      '.stats-section .stats-grid.stats-grid--rent{' +
      'display:grid !important;' +
      'grid-template-columns:repeat(4,minmax(0,1fr)) !important;' +
      'gap:18px !important;' +
      'overflow:visible !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stats-rent-table-head{' +
      'display:none !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card{' +
      'display:flex !important;' +
      'flex-direction:column !important;' +
      'align-items:center !important;' +
      'justify-content:center !important;' +
      'min-height:160px !important;' +
      'padding:22px 16px 18px !important;' +
      'text-align:center !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card .stat-icon{' +
      'display:flex !important;' +
      'align-items:center !important;' +
      'justify-content:center !important;' +
      'order:1 !important;' +
      'width:96px !important;' +
      'height:56px !important;' +
      'margin:0 0 6px !important;' +
      'line-height:1 !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card .stat-label{' +
      'display:block !important;' +
      'order:2 !important;' +
      'margin:0 0 10px !important;' +
      'font-size:12px !important;' +
      'font-weight:500 !important;' +
      'line-height:1.35 !important;' +
      'color:var(--muted,#8b93a7) !important;' +
      'text-align:center !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card .stat-icon.stat-icon--rent-image img{' +
      'display:block !important;' +
      'width:100% !important;' +
      'height:100% !important;' +
      'object-fit:contain !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card .stat-value{' +
      'order:3 !important;' +
      'margin:0 !important;' +
      'font-size:var(--rent-month-price-size,30px) !important;' +
      'font-weight:800 !important;' +
      'line-height:1.2 !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card.stat-card--rent-day .stat-value{' +
      'font-size:calc(var(--rent-month-price-size,30px) - 6px) !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card.stat-card--rent-week .stat-value{' +
      'font-size:calc(var(--rent-month-price-size,30px) - 4px) !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card.stat-card--rent-halfmonth .stat-value{' +
      'font-size:calc(var(--rent-month-price-size,30px) - 2px) !important;' +
      '}' +
      '.stats-section .stats-grid.stats-grid--rent>.stat-card.stat-card--rent-month .stat-value{' +
      'font-size:var(--rent-month-price-size,30px) !important;' +
      '}' +
      '}';
    head.appendChild(style);
  }

  function syncStatsSectionRentCards(dailyPrice) {
    var price = parseInt(String(dailyPrice), 10);
    if (isNaN(price) || price <= 0) return;
    ensureDesktopRentCardStyles();

    var grid = document.querySelector('.stats-section .stats-grid');
    if (!grid) return;

    if (!grid.querySelector('.stats-rent-table-head')) {
      var head = document.createElement('div');
      head.className = 'stats-rent-table-head';
      head.setAttribute('role', 'row');
      head.innerHTML =
        '<span class="stats-rent-table-head__days">租用天数</span>' +
        '<span class="stats-rent-table-head__price">价格</span>';
      grid.insertBefore(head, grid.firstChild);
    }
    try {
      grid.classList.add('stats-grid--rent');
    } catch (e) {}

    var cards = grid.querySelectorAll('.stat-card');
    if (!cards || cards.length < 4) return;

    var cfg = pricingConfig();
    var p1 = price;
    var p7 = Math.floor((price * cfg.day7.multiplier) / cfg.day7.divisor);
    var p15 = Math.floor((price * cfg.day15.multiplier) / cfg.day15.divisor);
    var p30 = Math.floor((price * cfg.day30.multiplier) / cfg.day30.divisor);
    // 与 car.js / car-mobile.js 的 openDaysSelectModal 文案完全一致
    var items = [
      {
        text: '单日 (24小时)',
        iconSrc: '../../media-webp/photos/carpark/common/日.webp',
        iconAlt: '日租',
        value: formatDayPrice(p1),
        label: '',
      },
      {
        text: '一周 (7天)',
        iconSrc: '../../media-webp/photos/carpark/common/周.webp',
        iconAlt: '周租',
        value: formatDayPrice(p7),
        label: '',
      },
      {
        text: '半月 (15天)',
        iconSrc: '../../media-webp/photos/carpark/common/半月.webp',
        iconAlt: '半月租',
        value: formatDayPrice(p15),
        label: '',
      },
      {
        text: '整月 (30天)',
        iconSrc: '../../media-webp/photos/carpark/common/月.webp',
        iconAlt: '月租',
        value: formatDayPrice(p30),
        label: '',
      },
    ];
    var isDesktop = !!(
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(min-width: 769px)').matches
    );

    items.forEach(function (item, index) {
      var card = cards[index];
      if (!card) return;
      var iconEl = card.querySelector('.stat-icon');
      var valueEl = card.querySelector('.stat-value');
      var labelEl = card.querySelector('.stat-label');
      card.classList.remove(
        'stat-card--rent-day',
        'stat-card--rent-week',
        'stat-card--rent-halfmonth',
        'stat-card--rent-month'
      );
      if (index === 0) card.classList.add('stat-card--rent-day');
      if (index === 1) card.classList.add('stat-card--rent-week');
      if (index === 2) card.classList.add('stat-card--rent-halfmonth');
      if (index === 3) card.classList.add('stat-card--rent-month');
      if (iconEl) {
        if (isDesktop) {
          iconEl.classList.add('stat-icon--rent-image');
          iconEl.innerHTML = '<img src="' + item.iconSrc + '" alt="' + item.iconAlt + '" loading="lazy">';
        } else {
          iconEl.classList.remove('stat-icon--rent-image');
          iconEl.textContent = item.text;
        }
        iconEl.style.fontSize = '';
        iconEl.style.fontWeight = '';
        iconEl.style.lineHeight = '';
        iconEl.style.marginBottom = '';
      }
      if (valueEl) {
        valueEl.textContent = item.value;
        valueEl.style.fontSize = '';
      }
      if (labelEl) {
        labelEl.textContent = isDesktop ? item.text : item.label;
        labelEl.style.display = isDesktop || item.label ? '' : 'none';
      }
    });
  }

  document.addEventListener('mango:daily-price-updated', function (e) {
    var detail = e && e.detail ? e.detail : {};
    syncStatsSectionRentCards(detail.price);
  });

  window.setTimeout(function () {
    syncStatsSectionRentCards(body.getAttribute('data-daily-price'));
  }, 0);

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
            syncStatsSectionRentCards(p);
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
