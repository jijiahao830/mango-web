/**
 * 详情页顶栏「其他车型」：拉取 /api/cars-catalog，筛选与当前车同品牌（brand 规范化 + 车名前缀推断）、排除当前车，
 * 按 rent_price 降序，填入 .dropdown-grid。车型名仅展示接口字段 model；图片优先 详情页-banner.webp / 详情页-banner.jpg，失败用占位图。
 * 点击同品牌链接时向 /api/vehicle-click 上报（需已登录 sessionStorage.mango_driver_name）；成功则目标详情页 vehicle-click.js 跳过重复上报。
 */
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

        /** jpg 缺失时尝试 png，再失败则占位（与各车「详情页-banner」素材一致） */
        function bindImgFallback(img) {
          img.addEventListener(
            'error',
            function onErr() {
              img.removeEventListener('error', onErr);
              var u = String(img.src || '');
              if (u.indexOf('详情页-banner.jpg') !== -1) {
                img.addEventListener('error', onErr, false);
                img.src = u.split('详情页-banner.jpg').join('详情页-banner.png');
                return;
              }
              finishOtherModelPlaceholder(img);
            },
            false
          );
        }

        var html = others
          .map(function (c) {
            var name = String(c.car_name || '').trim();
            var href = siblingBase(name) + 'car.html';
            var baseU = siblingBase(name);
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
              escHtml(baseU + '详情页-banner.webp') +
              '" type="image/webp">' +
              '<img class="car-image car-image-photo" src="' +
              escHtml(baseU + '详情页-banner.jpg') +
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

        grid.classList.toggle('dropdown-grid--few', others.length > 0 && others.length < 4);
        grid.innerHTML = html || '<p class="detail-other-models-empty">暂无同品牌其他车型</p>';

        grid.querySelectorAll('.car-image-photo').forEach(bindImgFallback);
        bindOtherModelLinkClickTracking(grid, base);
      })
      .catch(function () {});
  });
})();
