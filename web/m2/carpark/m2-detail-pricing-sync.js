/* m2 详情页：日租及周/半月/月折算价从 cars-catalog（数据库）同步，算法与 detail-rent-sync / m2-actions 一致 */
(function () {
  function pricingConfig() {
    return window.mangoPricingConfig || {
      day7: { multiplier: 6.5, divisor: 7 },
      day15: { multiplier: 13, divisor: 15 },
      day30: { multiplier: 23, divisor: 30 },
    };
  }

  function formatWithComma(n) {
    var x = parseInt(String(n), 10) || 0;
    return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function derivedFromDay(day) {
    var p = parseInt(String(day), 10);
    if (!isFinite(p) || p <= 0) return null;
    var cfg = pricingConfig();
    return {
      day: p,
      w: Math.floor((p * cfg.day7.multiplier) / cfg.day7.divisor),
      h: Math.floor((p * cfg.day15.multiplier) / cfg.day15.divisor),
      m: Math.floor((p * cfg.day30.multiplier) / cfg.day30.divisor),
    };
  }

  function normalizeNameKey(s) {
    return String(s || '')
      .replace(/[\s\u00a0\u3000\u200b-\u200d\ufeff]+/g, '')
      .replace(/：/g, ':')
      .trim();
  }

  function currentCarNameFromPath() {
    var p = String(location.pathname || '');
    var m = p.match(/\/carpark\/([^/]+)\/car\.html$/);
    if (!m) return '';
    try {
      return decodeURIComponent(m[1]);
    } catch (_) {
      return m[1];
    }
  }

  function currentCarNameCandidates() {
    var out = [];
    var byBody = String(document.body && document.body.getAttribute('data-car-display-name') || '').trim();
    var byPath = currentCarNameFromPath();
    if (byBody) out.push(byBody);
    if (byPath && out.indexOf(byPath) === -1) out.push(byPath);
    return out;
  }

  function apiBaseCandidates() {
    var origin = String(location.origin || '').replace(/\/$/, '');
    if (origin && origin !== 'null' && origin.indexOf('file:') !== 0) {
      return [origin];
    }
    return ['https://www.mangov8.com', 'http://127.0.0.1:8787', 'http://localhost:8787'];
  }

  function fetchCatalogFrom(base) {
    return fetch(base + '/api/cars-catalog', { credentials: 'omit' }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j || !j.ok || !Array.isArray(j.cars)) throw new Error('invalid cars-catalog');
        return j.cars;
      });
    });
  }

  function loadCatalog() {
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('all failed'));
      var base = candidates[i++];
      return fetchCatalogFrom(base).catch(next);
    }
    return next();
  }

  function applyPricing(prices) {
    var card = document.querySelector('#m2Pricing .m2-car__pricing-card');
    if (!card) return;
    var nums = card.querySelectorAll('.m2-car__pricing-num');
    if (nums.length < 4) return;
    nums[0].textContent = formatWithComma(prices.day);
    nums[1].textContent = formatWithComma(prices.w);
    nums[2].textContent = formatWithComma(prices.h);
    nums[3].textContent = formatWithComma(prices.m);
  }

  /* 仅用于在目录名/接口 car_name 不一致时命中同一条车数据（与 m2/index.js 别名一致） */
  function canonicalCarFolderLabel(carName) {
    var compact = String(carName || '')
      .trim()
      .replace(/[\s\u00a0\u3000]+/g, ' ')
      .trim();
    var aliasMap = {
      '兰博基尼 V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
      '兰博基尼V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
    };
    return aliasMap[compact] || compact;
  }

  /* 镂空大字：与数据库一致——优先 model，无则 car_name（不用静态 HTML / 目录名覆盖） */
  function knockoutLabelFromCar(car) {
    var model = String((car && car.model) != null ? car.model : '').trim();
    var name = String((car && car.car_name) != null ? car.car_name : '').trim();
    return model || name || '';
  }

  function applyKnockoutFromCatalog(car) {
    var label = knockoutLabelFromCar(car);
    if (!label) return;
    window.__m2KnockoutModelFromDb = label;
    try {
      window.dispatchEvent(
        new CustomEvent('m2-detail-catalog-ready', { detail: { model: label, car: car } })
      );
    } catch (_) {}
  }

  loadCatalog()
    .then(function (cars) {
      var names = currentCarNameCandidates();
      var keys = names.map(normalizeNameKey).filter(Boolean);
      var current = null;
      for (var i = 0; i < cars.length; i++) {
        var cn = String((cars[i] && cars[i].car_name) || '').trim();
        var key = normalizeNameKey(cn);
        var keyCanon = normalizeNameKey(canonicalCarFolderLabel(cn));
        if (keys.indexOf(key) !== -1 || keys.indexOf(keyCanon) !== -1) {
          current = cars[i];
          break;
        }
      }
      if (!current) return;
      applyKnockoutFromCatalog(current);
      var prices = derivedFromDay(current.rent_price);
      if (!prices) return;
      applyPricing(prices);
    })
    .catch(function () {});
})();
