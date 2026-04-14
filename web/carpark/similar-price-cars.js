document.addEventListener('DOMContentLoaded', function () {
  var body = document.body;
  var similarCarsGrid = document.getElementById('similarCarsGrid');
  var similarCarsSection = document.getElementById('similarCarsSection');
  if (!similarCarsGrid || !similarCarsSection) return;

  var currentCarName = (body.getAttribute('data-car-display-name') || '').trim();
  if (!currentCarName) return;

  function normName(s) {
    return String(s || '')
      .replace(/\s+/g, ' ')
      .replace(/：/g, ':')
      .trim();
  }

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

  /** 优先使用 detail-rent-sync.js 已发起的目录请求；未引入该脚本时在此补拉一次 */
  function syncDailyPriceFromCatalog() {
    var base = apiCatalogBase();
    if (!base || typeof fetch === 'undefined') return Promise.resolve();
    var target = carNameMatchKey(currentCarName);
    return fetch(base + '/api/cars-catalog', { credentials: 'omit' })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok || !Array.isArray(j.cars)) return;
        var i;
        for (i = 0; i < j.cars.length; i++) {
          var c = j.cars[i];
          if (carNameMatchKey(c.car_name) === target) {
            var p = parseInt(String(c.rent_price), 10);
            if (!isNaN(p) && p > 0) {
              body.setAttribute('data-daily-price', String(p));
            }
            return;
          }
        }
      })
      .catch(function () {});
  }

  var rentReady =
    typeof window.__mangoRentSyncPromise !== 'undefined' &&
    window.__mangoRentSyncPromise &&
    typeof window.__mangoRentSyncPromise.then === 'function'
      ? window.__mangoRentSyncPromise
      : syncDailyPriceFromCatalog();

  rentReady.then(function () {
    var currentPrice = parseInt(body.getAttribute('data-daily-price'), 10);
    if (!currentPrice || isNaN(currentPrice)) return;

    var currentCarNameKey = carNameMatchKey(currentCarName);

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function categoryBadgeClass(cat) {
    var c = String(cat || '');
    var m = {
      行政级轿车: 'exec-badge',
      豪华轿车: 'luxsedan-badge',
      豪华SUV: 'luxsuv-badge',
      豪华suv: 'luxsuv-badge',
      超跑: 'perf-badge',
      超级跑车: 'perf-badge',
      性能车: 'perf-badge',
      新能源: 'ev-badge',
      商务车: 'biz-badge',
      轿车: 'sedan-badge',
      越野车: 'off-badge',
      皮卡: 'pickup-badge',
      即将上新: 'biz-badge',
    };
    return m[c] || 'car-badge-inline';
  }

  function formatPriceYuan(n) {
    var x = parseInt(String(n), 10);
    if (isNaN(x)) return '¥0';
    return '¥' + x.toLocaleString('zh-CN');
  }

  function taglinesJsonUrl() {
    var path = typeof location !== 'undefined' ? String(location.pathname || '') : '';
    return path.indexOf('/carpark/') !== -1 ? '../../car_card_taglines.json' : './car_card_taglines.json';
  }

  function ensureCardTaglines() {
    if (window.__mangoCardTaglines && Object.keys(window.__mangoCardTaglines).length) {
      return Promise.resolve(window.__mangoCardTaglines);
    }
    if (window.__mangoCardTaglinesPromise) return window.__mangoCardTaglinesPromise;
    window.__mangoCardTaglinesPromise = fetch(taglinesJsonUrl(), { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('taglines');
        return r.json();
      })
      .then(function (j) {
        window.__mangoCardTaglines = j && typeof j === 'object' ? j : {};
        return window.__mangoCardTaglines;
      })
      .catch(function () {
        window.__mangoCardTaglines = {};
        return window.__mangoCardTaglines;
      });
    return window.__mangoCardTaglinesPromise;
  }

  function cardMetaLine(car) {
    var apiTag = String(car.card_tagline || '').trim();
    if (apiTag) return apiTag;
    var map = typeof window.__mangoCardTaglines === 'object' && window.__mangoCardTaglines
      ? window.__mangoCardTaglines
      : {};
    var k = String(car.car_name || '').trim();
    if (map[k]) return map[k];
    return (String(car.brand || '') + ' ' + String(car.model || '')).trim() || String(car.car_name || '');
  }

  /** 与选车页 car.js 卡片结构一致；链接与封面相对当前详情页（carpark/当前车/car.html） */
  function buildCarCardHtmlFromCatalog(car) {
    var folder = encodeURIComponent(car.car_name);
    var href = '../' + folder + '/car.html';
    var webp = '/media-webp/photos/carpark/' + folder + '/封面-thumb.webp';
    var jpg = '/media-webp/photos/carpark/' + folder + '/封面-thumb.webp';
    var cat = escHtml(car.category);
    var name = escHtml(car.car_name);
    var badge = categoryBadgeClass(car.category);
    var priceHtml = formatPriceYuan(car.rent_price) + '<span class="car-price-unit">/天</span>';
    var meta = escHtml(cardMetaLine(car));
    return (
      '<a class="car-card-link" href="' +
      escHtml(href) +
      '">' +
      '<div class="car-card" data-category="' +
      cat +
      '">' +
      '<picture><source srcset="' +
      escHtml(webp) +
      '" type="image/webp">' +
      '<img class="car-image car-image-photo" loading="lazy" src="' +
      escHtml(jpg) +
      '" alt="' +
      name +
      '">' +
      '</picture>' +
      '<div class="car-info">' +
      '<div class="car-badge car-badge-inline ' +
      badge +
      '">' +
      cat +
      '</div>' +
      '<div class="car-name">' +
      name +
      '</div>' +
      '<div class="car-price">' +
      priceHtml +
      '</div>' +
      '<div class="car-meta">' +
      meta +
      '</div>' +
      '</div></div></a>'
    );
  }

  function formatPriceThousands(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function updateSimilarRowLayout() {
    var row = similarCarsGrid;
    if (!row || !row.children.length) return;
    row.classList.remove('is-centered');
    requestAnimationFrame(function () {
      var styles = window.getComputedStyle(row);
      var gap = parseFloat(styles.columnGap || styles.gap) || 20;
      var total = 0;
      var i;
      for (i = 0; i < row.children.length; i++) {
        total += row.children[i].getBoundingClientRect().width;
      }
      if (row.children.length > 1) total += gap * (row.children.length - 1);
      if (total <= row.clientWidth + 2) {
        row.classList.add('is-centered');
      }
    });
  }

  var layoutResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(layoutResizeTimer);
    layoutResizeTimer = setTimeout(updateSimilarRowLayout, 120);
  });

  function appendSimilarCarCard(link) {
    var originalHref = link.getAttribute('href');
    if (originalHref && originalHref.startsWith('./carpark/')) {
      link.setAttribute('href', originalHref.replace('./carpark/', '../'));
    }
    link.querySelectorAll('source').forEach(function (source) {
      var srcset = source.getAttribute('srcset');
      if (srcset && srcset.indexOf('./carpark/') !== -1) {
        source.setAttribute('srcset', srcset.replace(/\.\/carpark\//g, '../'));
      }
    });
    link.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src');
      if (src && src.indexOf('./carpark/') !== -1) {
        img.setAttribute('src', src.replace(/\.\/carpark\//g, '../'));
      }
    });
    if (!link.querySelector('.car-info')) return;
    similarCarsGrid.appendChild(link.cloneNode(true));
  }

  function collectSamePriceLinks(doc) {
    var out = [];
    var seenHref = {};
    doc.querySelectorAll('.car-card-link').forEach(function (link) {
      if (link.closest('#recommendSection')) return;
      if (link.closest('#comingSoonSection')) return;
      var priceElem = link.querySelector('.car-price');
      var nameElem = link.querySelector('.car-name');
      if (!priceElem || !nameElem) return;
      var price = parseInt(priceElem.textContent.replace(/[^0-9]/g, ''), 10);
      var name = carNameMatchKey(nameElem.textContent);
      if (name === currentCarNameKey) return;
      if (price !== currentPrice) return;
      var href = (link.getAttribute('href') || '').trim();
      if (!href || seenHref[href]) return;
      seenHref[href] = true;
      out.push(link);
    });
    return out;
  }

  function resolveCarListUrl() {
    var path = location.pathname;
    var m = path.match(/^(.*)\/carpark\/[^/]+\/car\.html$/);
    if (m) {
      var base = m[1] || '';
      return new URL(base + '/car.html', location.origin).href;
    }
    return new URL('../../car.html', location.href).href;
  }

  function fetchCarListHtml() {
    var urls = [resolveCarListUrl(), new URL('../../car.html', location.href).href];
    var seen = {};
    urls = urls.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });
    function tryFetch(i) {
      if (i >= urls.length) {
        return Promise.reject(new Error('car list fetch failed'));
      }
      return fetch(urls[i], { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + urls[i]);
          return r.text();
        })
        .catch(function () {
          return tryFetch(i + 1);
        });
    }
    return tryFetch(0);
  }

  function fetchCatalogCars() {
    var url = apiCatalogBase() + '/api/cars-catalog';
    return fetch(url, { credentials: 'omit' })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      })
      .then(function (o) {
        if (o.ok && o.j && o.j.ok && Array.isArray(o.j.cars)) return o.j.cars;
        return [];
      })
      .catch(function (e) {
        console.warn('[同价位] /api/cars-catalog', e);
        return [];
      });
  }

  function fillFromCatalog(cars) {
    if (!cars || !cars.length) return;
    cars.forEach(function (car) {
      var price = parseInt(String(car.rent_price), 10);
      if (isNaN(price) || price !== currentPrice) return;
      if (carNameMatchKey(car.car_name) === currentCarNameKey) return;
      var html = buildCarCardHtmlFromCatalog(car);
      var t = document.createElement('template');
      t.innerHTML = html.trim();
      var node = t.content.firstElementChild;
      if (node) similarCarsGrid.appendChild(node);
    });
  }

  function setSubtitle(html) {
    var subEl = document.querySelector('.similar-cars-subtitle');
    if (subEl) subEl.innerHTML = html;
  }

  function finishLayout() {
    var n = similarCarsGrid.children.length;
    var priceStr = formatPriceThousands(currentPrice);
    if (n > 0) {
      setSubtitle(
        '共 <strong>' +
          n +
          '</strong> 辆 · 日租 <strong>¥' +
          priceStr +
          '/天</strong> 与您所选车型相同；车多时可左右滑动浏览'
      );
      updateSimilarRowLayout();
      setTimeout(updateSimilarRowLayout, 50);
      window.addEventListener('load', updateSimilarRowLayout, { once: true });
    } else {
      setSubtitle(
        '当前车库中<strong>暂无其他</strong>与日租 <strong>¥' +
          priceStr +
          '/天</strong> 相同的车型。'
      );
    }
  }

  ensureCardTaglines()
    .then(function () {
      similarCarsSection.style.display = 'block';
      return fetchCarListHtml()
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          if (doc.querySelector('.car-card-link')) {
            collectSamePriceLinks(doc).forEach(function (link) {
              appendSimilarCarCard(link);
            });
            return;
          }
          console.warn(
            '[同价位] car.html 中无静态卡片（选车页由 car.js 动态渲染），改从 /api/cars-catalog 加载。'
          );
          return fetchCatalogCars().then(fillFromCatalog);
        })
        .catch(function () {
          return fetchCatalogCars().then(fillFromCatalog);
        });
    })
    .then(function () {
      finishLayout();
    });
  });
});
