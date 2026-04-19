/**
 * 详情页顶栏「其他车型」：拉取 /api/cars-catalog，筛选与当前车同品牌（brand 规范化 + 车名前缀推断）、排除当前车，
 * 按 rent_price 降序，填入 .dropdown-grid。车型名仅展示接口字段 model；缩略图用各车「详情页-banner.webp」，失败用占位图。
 * 点击同品牌链接时向 /api/vehicle-click 上报（需已登录 sessionStorage.mango_driver_name）；成功则目标详情页 vehicle-click.js 跳过重复上报。
 *
 * 站点外观：GET /api/site-ui 返回的 cta-section（与 web/app_config.json 顶层 cta-section 一致，由 member_api 提供）。
 */
(function () {
  function isMobileClient() {
    var byMedia = !!(
      window.matchMedia &&
      (window.matchMedia('(max-width: 900px)').matches ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    );
    var nav = window.navigator || {};
    var ua = String(nav.userAgent || '');
    var byUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua);
    var byTouch = (nav.maxTouchPoints || 0) > 0;
    return !!(byMedia || (byTouch && byUA));
  }

  function fromMobileCarList() {
    try {
      var q = new URLSearchParams(String(location.search || ''));
      if (q.get('from') === 'car-mobile') return true;
    } catch (e) {}
    var ref = String(document.referrer || '');
    return /\/car-mobile\.html(?:[?#]|$)/i.test(ref);
  }

  function syncMobileBackLink() {
    if (!isMobileClient() || !fromMobileCarList()) return;
    document.querySelectorAll('.detail-header .back-btn').forEach(function (a) {
      a.setAttribute('href', '../../car-mobile.html');
    });
  }

  syncMobileBackLink();
})();

(function () {
  if (typeof fetch === 'undefined') return;
  function apiCatalogBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || (typeof location !== 'undefined' ? String(location.origin).replace(/\/$/, '') : '');
  }
  var base = apiCatalogBase();
  if (!base) return;
  fetch(base + '/api/site-ui', { credentials: 'omit' })
    .then(function (r) {
      return r.ok ? r.json() : {};
    })
    .then(function (cfg) {
      if (!cfg || !cfg.ok || cfg['cta-section'] !== false) return;
      document.querySelectorAll('.cta-section').forEach(function (el) {
        el.setAttribute('hidden', '');
        el.style.setProperty('display', 'none', 'important');
      });
    })
    .catch(function () {});
})();

/** 实车图赏：移除误放的「详情页-banner」「*透明图*」缩略图并修正主图（与 rebuild_gallery_unused 规则一致） */
(function () {
  function shouldStripGalleryImage(u) {
    if (typeof u !== 'string') return false;
    if (u.indexOf('详情页-banner') !== -1) return true;
    if (u.indexOf('透明图') !== -1) return true;
    return false;
  }
  function run() {
    var sec = document.querySelector('section.gallery-section');
    if (!sec) return;
    sec.querySelectorAll('.thumbnail-item').forEach(function (el) {
      if (shouldStripGalleryImage(el.getAttribute('data-image'))) el.remove();
    });
    var thumbs = sec.querySelectorAll('.thumbnail-item');
    var featSrc = sec.querySelector('#featuredSource');
    var featImg = document.getElementById('featuredImage');
    if (featImg && shouldStripGalleryImage(featImg.getAttribute('src'))) {
      if (thumbs.length) {
        var first = thumbs[0].getAttribute('data-image') || '';
        var webp = /\.webp$/i.test(first) ? first : first.replace(/\.(jpe?g|png)$/i, '.webp');
        if (featSrc) featSrc.setAttribute('srcset', webp.replace(/ /g, '%20'));
        featImg.setAttribute('src', webp);
      } else {
        sec.style.setProperty('display', 'none', 'important');
      }
    }
    thumbs.forEach(function (t, i) {
      t.classList.toggle('active', i === 0);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

(function () {
  var PLACEHOLDER_IMG =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">' +
        '<rect fill="#1e2128" width="800" height="400"/>' +
        '<text x="400" y="210" text-anchor="middle" fill="#5c6370" font-size="28" font-family="system-ui,sans-serif">暂无封面</text>' +
        '</svg>'
    );

  function apiCatalogBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || (typeof location !== 'undefined' ? String(location.origin).replace(/\/$/, '') : '');
  }

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

  function normBrand(s) {
    return String(s || '').trim();
  }

  /**
   * 与选车页 car.js 一致：车名以品牌开头时推断 brand（库表 brand 为空、或「一汽丰田」等与同门不一致时用）
   */
  var KNOWN_BRAND_PREFIXES = [
    '阿斯顿马丁', '劳斯莱斯', '兰博基尼', '玛莎拉蒂', '雷克萨斯', '保时捷',
    '法拉利', '迈巴赫', '奔驰', '宝马', '奥迪', '路虎', '特斯拉', '理想',
    '小米', '路特斯', '岚图', '雪佛兰', '丰田', '宾利', '日产', '福特', '道奇',
    '别克', '传祺', '腾势', '问界', '坦克', '五菱宏光', '五菱', '房车', '其他',
  ].sort(function (a, b) {
    return b.length - a.length;
  });

  var BRAND_ALIASES = {
    一汽丰田: '丰田',
    广汽丰田: '丰田',
    进口丰田: '丰田',
    丰田汽车: '丰田',
    一汽大众: '大众',
    上汽大众: '大众',
  };

  function inferBrandFromCarName(carName) {
    var s = String(carName || '').trim();
    if (!s) return '';
    var i;
    for (i = 0; i < KNOWN_BRAND_PREFIXES.length; i++) {
      var br = KNOWN_BRAND_PREFIXES[i];
      if (s.indexOf(br) === 0) return br;
    }
    return '';
  }

  function canonicalBrand(brand, carName) {
    var raw = normBrand(brand);
    if (raw && Object.prototype.hasOwnProperty.call(BRAND_ALIASES, raw)) {
      raw = BRAND_ALIASES[raw];
    }
    if (raw) return raw;
    var inf = inferBrandFromCarName(carName);
    if (inf && Object.prototype.hasOwnProperty.call(BRAND_ALIASES, inf)) {
      return BRAND_ALIASES[inf];
    }
    return inf || '';
  }

  function folderNameFromUrl() {
    try {
      var path = String(location.pathname || '');
      var m = path.match(/\/carpark\/([^/]+)\/car\.html$/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {}
    return '';
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function siblingBase(carName) {
    return '../' + encodeURIComponent(String(carName).trim()) + '/';
  }

  /** 顶栏「其他车型」文案：仅使用接口返回的 model 字段 */
  function modelFromCatalog(c) {
    return String(c.model != null ? c.model : '').trim();
  }

  var SESSION_SKIP_VEHICLE_CLICK = 'mango_vehicle_click_done_for_nav';

  /** 与 /api/vehicle-click、vehicle-click.js 对齐：品牌/型号/价格/车名键 */
  function apiVehicleClickFields(c) {
    var brand = normBrand(c.brand);
    var model = modelFromCatalog(c);
    var cn = String(c.car_name || '').trim();
    if (!brand) {
      brand = inferBrandFromCarName(cn);
    }
    if (!brand && cn) {
      var parts = cn.split(/\s+/);
      brand = parts[0] || '';
    }
    if (!model && cn) {
      if (brand && cn.indexOf(brand) === 0) {
        model = cn.slice(brand.length).replace(/^\s+/, '').trim();
      }
    }
    if (!model) {
      model = cn;
    }
    var price = parseInt(String(c.rent_price), 10);
    if (isNaN(price)) price = 0;
    return {
      brand: brand,
      model: model,
      price: price,
      key: carNameMatchKey(cn),
    };
  }

  function postVehicleClickFromOtherModels(baseUrl, member, fields, href) {
    var url = baseUrl + '/api/vehicle-click';
    var payload = JSON.stringify({
      member: String(member).trim(),
      brand: fields.brand,
      model: fields.model,
      price: fields.price,
    });
    var go = function () {
      window.location.href = href;
    };
    if (typeof fetch === 'undefined') {
      go();
      return;
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      credentials: 'omit',
      keepalive: true,
    })
      .then(function (r) {
        if (r && r.ok) {
          try {
            sessionStorage.setItem(SESSION_SKIP_VEHICLE_CLICK, fields.key);
          } catch (e1) {}
        }
      })
      .catch(function () {})
      .then(go);
  }

  function bindOtherModelLinkClickTracking(grid, baseUrl) {
    grid.addEventListener(
      'click',
      function (e) {
        var a = e.target.closest && e.target.closest('a.car-card-link');
        if (!a || !grid.contains(a)) return;
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        var member = sessionStorage.getItem('mango_driver_name');
        if (!member || !String(member).trim()) return;
        var brand = a.getAttribute('data-mango-vc-brand');
        var model = a.getAttribute('data-mango-vc-model');
        var priceStr = a.getAttribute('data-mango-vc-price') || '0';
        var key = a.getAttribute('data-mango-vc-key');
        if (!brand || !model || !key) return;
        var href = a.getAttribute('href') || '';
        if (!href) return;
        e.preventDefault();
        var priceNum = parseInt(priceStr, 10);
        if (isNaN(priceNum)) priceNum = 0;
        postVehicleClickFromOtherModels(baseUrl, member, { brand: brand, model: model, price: priceNum, key: key }, href);
      },
      false
    );
  }

  function findSelfCar(cars, displayName, folder) {
    var dk = carNameMatchKey(displayName);
    var fk = folder ? carNameMatchKey(folder) : '';
    var i;
    for (i = 0; i < cars.length; i++) {
      if (carNameMatchKey(cars[i].car_name) === dk) return cars[i];
    }
    if (fk) {
      for (i = 0; i < cars.length; i++) {
        if (carNameMatchKey(cars[i].car_name) === fk) return cars[i];
      }
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.querySelector('.header-center-nav .dropdown-grid');
    if (!grid) return;

    var body = document.body;
    var displayName = (body.getAttribute('data-car-display-name') || '').trim();
    var folder = folderNameFromUrl();
    var base = apiCatalogBase();
    if (!base || typeof fetch === 'undefined') return;

    fetch(base + '/api/cars-catalog', { credentials: 'omit' })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok || !Array.isArray(j.cars) || !j.cars.length) return;

        var self = findSelfCar(j.cars, displayName, folder);
        var selfBrandKey = self ? canonicalBrand(self.brand, self.car_name) : '';
        if (!self || !selfBrandKey) {
          grid.classList.remove('dropdown-grid--few');
          grid.innerHTML = '';
          return;
        }

        var selfKey = normName(self.car_name);
        var others = j.cars.filter(function (c) {
          return canonicalBrand(c.brand, c.car_name) === selfBrandKey && normName(c.car_name) !== selfKey;
        });

        others.sort(function (a, b2) {
          return (parseInt(String(b2.rent_price), 10) || 0) - (parseInt(String(a.rent_price), 10) || 0);
        });

        function finishOtherModelPlaceholder(img) {
          if (img.getAttribute('data-ph-done') === '1') return;
          img.setAttribute('data-ph-done', '1');
          img.classList.add('car-image--placeholder');
          img.src = PLACEHOLDER_IMG;
          img.alt = '暂无封面';
        }

        /** jpg 加载失败则占位 */
        function bindImgFallback(img) {
          img.addEventListener(
            'error',
            function onErr() {
              img.removeEventListener('error', onErr);
              finishOtherModelPlaceholder(img);
            },
            false
          );
        }

        var html = others
          .map(function (c) {
            var name = String(c.car_name || '').trim();
            var href = siblingBase(name) + 'car.html';
            var folderEnc = encodeURIComponent(name);
            var photoDir = '../../media-webp/photos/carpark/' + folderEnc + '/';
            var modelText = escHtml(modelFromCatalog(c));
            var alt = escHtml(name);
            var vc = apiVehicleClickFields(c);
            return (
              '<a href="' +
              escHtml(href) +
              '" class="car-card-link"' +
              ' data-mango-vc-brand="' +
              escHtml(vc.brand) +
              '" data-mango-vc-model="' +
              escHtml(vc.model) +
              '" data-mango-vc-price="' +
              escHtml(String(vc.price)) +
              '" data-mango-vc-key="' +
              escHtml(vc.key) +
              '">' +
              '<div class="car-card">' +
              '<picture>' +
              '<source srcset="' +
              escHtml(photoDir + '详情页-banner.webp') +
              '" type="image/webp">' +
              '<img class="car-image car-image-photo" src="' +
              escHtml(photoDir + '详情页-banner.webp') +
              '" alt="' +
              alt +
              '" loading="lazy">' +
              '</picture>' +
              '<div class="other-model-name">' +
              modelText +
              '</div>' +
              '</div></a>'
            );
          })
          .join('');

        grid.classList.toggle('dropdown-grid--few', others.length > 0 && others.length < 5);
        grid.innerHTML = html || '<p class="detail-other-models-empty">暂无同品牌其他车型</p>';

        grid.querySelectorAll('.car-image-photo').forEach(bindImgFallback);
        bindOtherModelLinkClickTracking(grid, base);
      })
      .catch(function () {});
  });
})();

/** 顶栏「其他车型」：点击展开 / 再点收起；点击页面其他区域关闭 */
(function () {
  function initOtherModelsDropdownToggle() {
    var container = document.querySelector('.header-center-nav .dropdown-container');
    var trigger = document.querySelector('.header-center-nav .dropdown-trigger');
    if (!container || !trigger) return;

    function setOpen(open) {
      container.classList.toggle('is-open', !!open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    if (!trigger.hasAttribute('aria-expanded')) {
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!container.classList.contains('is-open'));
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(!container.classList.contains('is-open'));
      }
    });

    document.addEventListener(
      'click',
      function (e) {
        if (!container.classList.contains('is-open')) return;
        if (container.contains(e.target)) return;
        setOpen(false);
      },
      false
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOtherModelsDropdownToggle);
  } else {
    initOtherModelsDropdownToggle();
  }
})();

/**
 * 桌面：在下拉展开且指针位于下拉上时，不让背后页面跟着滚。
 * 1) wheel + preventDefault（配合 elementsFromPoint，不依赖 e.target）
 * 2) 鼠标在 .dropdown-container 内且菜单已显示时，html/body overflow:hidden（双保险）
 */
(function () {
  var mq = window.matchMedia('(min-width: 769px)');
  var LOCK = 'mango-dropdown-scroll-lock';

  function menuIsShown(menu) {
    if (!menu) return false;
    return window.getComputedStyle(menu).visibility !== 'hidden';
  }

  function pointerOverDropdown(nav, menu, e) {
    if (nav.contains(e.target)) return true;
    if (typeof document.elementsFromPoint !== 'function') return false;
    var stack = document.elementsFromPoint(e.clientX, e.clientY);
    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      if (el && (el === menu || menu.contains(el) || el === nav || nav.contains(el))) return true;
    }
    return false;
  }

  function lock() {
    document.documentElement.classList.add(LOCK);
    document.body.classList.add(LOCK);
  }

  function unlock() {
    document.documentElement.classList.remove(LOCK);
    document.body.classList.remove(LOCK);
  }

  function onWheel(e) {
    if (!mq.matches) return;
    var nav = document.querySelector('.header-center-nav');
    if (!nav) return;
    var menu = nav.querySelector('.dropdown-menu');
    if (!menu || !menuIsShown(menu)) return;
    if (!pointerOverDropdown(nav, menu, e)) return;
    if (menu.scrollHeight > menu.clientHeight + 1) {
      var dy = e.deltaY;
      var top = menu.scrollTop;
      var maxTop = menu.scrollHeight - menu.clientHeight;
      if ((dy < 0 && top > 0.5) || (dy > 0 && top < maxTop - 0.5)) {
        return;
      }
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function init() {
    var nav = document.querySelector('.header-center-nav');
    if (!nav) return;
    var container = nav.querySelector('.dropdown-container');
    var menu = nav.querySelector('.dropdown-menu');
    if (!container || !menu) return;

    function syncBodyLock() {
      if (!mq.matches) {
        unlock();
        return;
      }
      if (
        container.classList.contains('is-open') &&
        container.matches(':hover') &&
        menuIsShown(menu)
      ) {
        lock();
      } else {
        unlock();
      }
    }

    container.addEventListener(
      'mouseenter',
      function () {
        if (!mq.matches) return;
        requestAnimationFrame(function () {
          requestAnimationFrame(syncBodyLock);
        });
      },
      false
    );
    container.addEventListener('mouseleave', unlock, false);

    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function () {
        syncBodyLock();
      });
      mo.observe(container, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', function () {
        if (!mq.matches) unlock();
      });
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(function () {
        if (!mq.matches) unlock();
      });
    }

    document.addEventListener(
      'visibilitychange',
      function () {
        if (document.hidden) unlock();
      },
      false
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
