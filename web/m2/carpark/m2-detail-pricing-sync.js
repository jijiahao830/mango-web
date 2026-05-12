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
    return String(x);
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
    var floor = 1111;
    var card = document.querySelector('#m2Pricing .m2-car__pricing-card');
    if (!card) return;
    card.classList.add('m2-pricing-range-card');
    var titleEl = card.querySelector('.m2-car__pricing-title');
    if (titleEl) titleEl.textContent = '日租';
    var labels = card.querySelectorAll('.m2-car__pricing-label');
    if (labels.length >= 4) {
      labels[0].textContent = '日租';
      labels[1].textContent = '周租(7天)';
      labels[2].textContent = '半月(15天)';
      labels[3].textContent = '月(30天)';
    }
    var nums = card.querySelectorAll('.m2-car__pricing-num');
    if (nums.length < 4) return;
    nums[0].textContent = formatWithComma(floor) + '-' + formatWithComma(prices.day);
    nums[1].textContent = formatWithComma(floor) + '-' + formatWithComma(prices.w);
    nums[2].textContent = formatWithComma(floor) + '-' + formatWithComma(prices.h);
    nums[3].textContent = formatWithComma(floor) + '-' + formatWithComma(prices.m);
    applyCoverPricing({
      day: formatWithComma(floor) + '-' + formatWithComma(prices.day),
      week: formatWithComma(floor) + '-' + formatWithComma(prices.w),
      half: formatWithComma(floor) + '-' + formatWithComma(prices.h),
      month: formatWithComma(floor) + '-' + formatWithComma(prices.m),
    });
  }

  function ensureCoverPricingNode() {
    var cover = document.querySelector('.m2-cover-wrapper .m2-cover-sticky') || document.querySelector('.m2-cover-wrapper');
    if (!cover) return null;
    var node = cover.querySelector('.m2-cover-price');
    if (node) return node;
    node = document.createElement('div');
    node.className = 'm2-cover-price';
    node.innerHTML =
      '<div class="m2-cover-price__day">' +
      '<div class="m2-cover-price__day-title">日租</div>' +
      '<div class="m2-cover-price__day-value" data-cover-price=\"day\">-</div>' +
      '</div>' +
      '<div class="m2-cover-price__grid">' +
      '<div class="m2-cover-price__item"><div class="m2-cover-price__item-label">周租(7天)</div><div class="m2-cover-price__item-value" data-cover-price=\"week\">-</div></div>' +
      '<div class="m2-cover-price__item"><div class="m2-cover-price__item-label">半月(15天)</div><div class="m2-cover-price__item-value" data-cover-price=\"half\">-</div></div>' +
      '<div class="m2-cover-price__item"><div class="m2-cover-price__item-label">月(30天)</div><div class="m2-cover-price__item-value" data-cover-price=\"month\">-</div></div>' +
      '</div>';
    cover.appendChild(node);
    return node;
  }

  function applyCoverPricing(v) {
    var node = ensureCoverPricingNode();
    if (!node) return;
    var day = node.querySelector('[data-cover-price="day"]');
    var week = node.querySelector('[data-cover-price="week"]');
    var half = node.querySelector('[data-cover-price="half"]');
    var month = node.querySelector('[data-cover-price="month"]');
    if (day) day.textContent = String(v.day || '-');
    if (week) week.textContent = String(v.week || '-');
    if (half) half.textContent = String(v.half || '-');
    if (month) month.textContent = String(v.month || '-');
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
    .catch(function () {
      /* 兜底：接口失败时，仍把页面原有数值搬到封面展示 */
      var nums = document.querySelectorAll('#m2Pricing .m2-car__pricing-num');
      if (!nums || nums.length < 4) return;
      var floor = 1111;
      function pick(i) {
        return parseInt(String(nums[i].textContent || '').replace(/[^\d]/g, ''), 10) || 0;
      }
      applyCoverPricing({
        day: formatWithComma(floor) + '-' + formatWithComma(pick(0)),
        week: formatWithComma(floor) + '-' + formatWithComma(pick(1)),
        half: formatWithComma(floor) + '-' + formatWithComma(pick(2)),
        month: formatWithComma(floor) + '-' + formatWithComma(pick(3)),
      });
    });
})();
