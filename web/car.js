document.addEventListener('DOMContentLoaded', function() {
  const CAR_FILTER_STORAGE_KEY = 'mangoCarFilterState';
  const CAR_FILTER_OWNER_KEY = 'mango_filter_saved_for_driver';
  const CAR_CHECKLIST_STORAGE_KEY = 'mangoCarChecklist';
  /** 从详情返回选车页时恢复列表滚动位置（与 sessionStorage 配合） */
  const CAR_LIST_SCROLL_KEY = 'mango_car_list_scroll_y';

  function saveCarListScrollBeforeDetailNav() {
    document.addEventListener(
      'click',
      function (e) {
        var a = e.target.closest && e.target.closest('a.car-card-link');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('carpark') === -1 || href.indexOf('car.html') === -1) return;
        try {
          var root = document.getElementById('carSection');
          var y = 0;
          var useInnerListScroll =
            root &&
            window.matchMedia &&
            window.matchMedia('(min-width: 769px)').matches;
          if (useInnerListScroll) {
            y = root.scrollTop;
          } else {
            y =
              window.scrollY ||
              window.pageYOffset ||
              (document.documentElement && document.documentElement.scrollTop) ||
              (document.body && document.body.scrollTop) ||
              0;
          }
          sessionStorage.setItem(CAR_LIST_SCROLL_KEY, String(y));
        } catch (err) {}
      },
      true
    );
  }

  function shouldRestoreCarListScroll() {
    try {
      if (sessionStorage.getItem(CAR_LIST_SCROLL_KEY) == null) return false;
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'back_forward') return true;
      var ref = document.referrer || '';
      if (ref.indexOf('/carpark/') !== -1 && ref.indexOf('car.html') !== -1) return true;
      var h = location.hash || '';
      if (h === '#carGrid' || h === '#carSection') return true;
    } catch (e) {}
    return false;
  }

  function clearCarListScrollKeyIfStale() {
    if (!shouldRestoreCarListScroll()) {
      try {
        sessionStorage.removeItem(CAR_LIST_SCROLL_KEY);
      } catch (e) {}
    }
  }

  function scheduleRestoreCarListScrollAfterLayout() {
    if (!shouldRestoreCarListScroll()) {
      clearCarListScrollKeyIfStale();
      return;
    }
    var raw = sessionStorage.getItem(CAR_LIST_SCROLL_KEY);
    var y = parseInt(raw, 10);
    if (isNaN(y) || y < 0) {
      try {
        sessionStorage.removeItem(CAR_LIST_SCROLL_KEY);
      } catch (e) {}
      return;
    }
    function applyScroll() {
      try {
        var root = document.getElementById('carSection');
        var useInnerListScroll =
          root &&
          window.matchMedia &&
          window.matchMedia('(min-width: 769px)').matches;
        if (useInnerListScroll) {
          root.scrollTop = y;
          return;
        }
        window.scrollTo(0, y);
      } catch (e1) {
        try {
          document.documentElement.scrollTop = y;
          document.body.scrollTop = y;
        } catch (e2) {}
      }
    }
    function finishRestore() {
      try {
        sessionStorage.removeItem(CAR_LIST_SCROLL_KEY);
      } catch (e3) {}
    }
    /* 列表与「今日推荐」异步渲染会改变文档高度，多次对齐滚动位置 */
    function onWindowLoadOnce() {
      window.removeEventListener('load', onWindowLoadOnce);
      applyScroll();
    }
    if (document.readyState === 'complete') {
      setTimeout(applyScroll, 0);
    } else {
      window.addEventListener('load', onWindowLoadOnce);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyScroll();
        setTimeout(applyScroll, 0);
        setTimeout(applyScroll, 80);
        setTimeout(applyScroll, 200);
        setTimeout(applyScroll, 450);
        setTimeout(function () {
          applyScroll();
          finishRestore();
        }, 700);
      });
    });
  }

  saveCarListScrollBeforeDetailNav();
  clearCarListScrollKeyIfStale();

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      try {
        sessionStorage.removeItem(CAR_LIST_SCROLL_KEY);
      } catch (err) {}
    }
  });

  /** sessionStorage 在部分环境/双开页面下不可靠，localStorage 作镜像，刷新后仍能恢复价格等筛选 */
  function readPersistedFilterJson() {
    var s = sessionStorage.getItem(CAR_FILTER_STORAGE_KEY);
    if (s) return s;
    try {
      return localStorage.getItem(CAR_FILTER_STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function clearPersistedFilterAll() {
    sessionStorage.removeItem(CAR_FILTER_STORAGE_KEY);
    sessionStorage.removeItem(CAR_FILTER_OWNER_KEY);
    try {
      localStorage.removeItem(CAR_FILTER_STORAGE_KEY);
      localStorage.removeItem(CAR_FILTER_OWNER_KEY);
    } catch (e) {}
  }

  function writePersistedFilterJson(json) {
    sessionStorage.setItem(CAR_FILTER_STORAGE_KEY, json);
    try {
      localStorage.setItem(CAR_FILTER_STORAGE_KEY, json);
    } catch (e) {}
  }

  function writeFilterOwner(driverName) {
    if (!driverName) return;
    sessionStorage.setItem(CAR_FILTER_OWNER_KEY, driverName);
    try {
      localStorage.setItem(CAR_FILTER_OWNER_KEY, driverName);
    } catch (e) {}
  }

  const scenarioBtns = document.querySelectorAll('.filter-btn[data-scenario]');
  let categoryBtns = document.querySelectorAll('#categoryFilterButtons .filter-btn[data-category]');
  let brandBtns = document.querySelectorAll('#brandFilterButtons .filter-btn[data-brand]');
  const priceMinSlider = document.getElementById('priceMin');
  const priceMaxSlider = document.getElementById('priceMax');
  const priceMinLabel = document.getElementById('priceMinLabel');
  const priceMaxLabel = document.getElementById('priceMaxLabel');
  const resetBtn = document.getElementById('resetFilterBtn');
  const resultCount = document.querySelector('.filter-result-count');
  
  function getBrandSections() {
    return document.querySelectorAll('#carparkBrandSectionsRoot .brand-section');
  }
  function getCarLinks() {
    return document.querySelectorAll('#carparkBrandSectionsRoot .brand-section .car-card-link');
  }
  const sidebar = document.querySelector('.sidebar-filter');
  const carGridEl = document.getElementById('carGrid');

  /** 鼠标在筛选侧栏上时，滚轮只滚动侧栏：在 #carSection 捕获阶段拦截，阻止主区域默认滚动（避免轻微联动） */
  function bindFilterSidebarWheelOnly(sidebarEl, sectionEl) {
    if (!sidebarEl || !sectionEl) return;
    sectionEl.addEventListener(
      'wheel',
      function (e) {
        var t = e.target;
        if (!t || (t !== sidebarEl && !sidebarEl.contains(t))) return;
        var el = sidebarEl;
        var max = Math.max(0, el.scrollHeight - el.clientHeight);
        var dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= el.clientHeight || 1;
        var next = Math.max(0, Math.min(max, el.scrollTop + dy));
        el.scrollTop = Math.round(next);
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { passive: false, capture: true }
    );
  }
  bindFilterSidebarWheelOnly(sidebar, document.getElementById('carSection'));

  const expandBrandBtn = document.getElementById('expandBrandBtn');
  const brandFilterButtons = document.getElementById('brandFilterButtons');
  let initialBrandOrderChildren = brandFilterButtons
    ? Array.from(brandFilterButtons.children)
    : [];
  let INITIAL_BRAND_ORDER = [];

  const categoryFilterButtons = document.getElementById('categoryFilterButtons');
  let initialCategoryOrderChildren = categoryFilterButtons
    ? Array.from(categoryFilterButtons.children)
    : [];
  let INITIAL_CATEGORY_ORDER = [];

  // 移动端筛选面板控制
  const mobileFilterBtn = document.getElementById('mobileFilterBtn');
  const closeFilterBtn = document.getElementById('closeFilterBtn');
  
  if (mobileFilterBtn && sidebar) {
    mobileFilterBtn.addEventListener('click', () => {
      sidebar.classList.add('active');
      document.body.style.overflow = 'hidden'; // 防止背景滚动
    });
  }
  
  if (closeFilterBtn && sidebar) {
    closeFilterBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  function scrollToCarSectionTop() {
    var root = document.getElementById('carSection');
    var useInnerListScroll =
      root &&
      window.matchMedia &&
      window.matchMedia('(min-width: 769px)').matches;
    if (useInnerListScroll) {
      if (typeof root.scrollTo === 'function') {
        try {
          root.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } catch (e) {
          root.scrollTop = 0;
          return;
        }
      }
      root.scrollTop = 0;
      return;
    }
    if (carGridEl) {
      try {
        carGridEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      } catch (e2) {}
    }
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e3) {
      window.scrollTo(0, 0);
    }
  }

  if (expandBrandBtn && brandFilterButtons) {
    expandBrandBtn.addEventListener('click', () => {
      brandFilterButtons.classList.add('brand-expanded');
      // 给侧边栏添加class，允许滚动
      if (sidebar) {
        sidebar.classList.add('brand-expanded-scroll');
      }
      scrollToCarSectionTop();
    });
  }
  
  let state = {
    scenario: 'all',
    category: 'all',
    brand: 'all',
    priceMin: 500,
    priceMax: 5000
  };

  // 尝试从 sessionStorage / localStorage 恢复状态（login 成功时会清除两端，保证换用户后进车库默认「全部」）
  let savedStateRaw = readPersistedFilterJson();
  const currentDriver = sessionStorage.getItem('mango_driver_name') || '';
  var filterOwner = '';
  try {
    filterOwner =
      sessionStorage.getItem(CAR_FILTER_OWNER_KEY) ||
      localStorage.getItem(CAR_FILTER_OWNER_KEY) ||
      '';
  } catch (e) {
    filterOwner = sessionStorage.getItem(CAR_FILTER_OWNER_KEY) || '';
  }
  if (savedStateRaw && currentDriver && filterOwner !== '' && filterOwner !== currentDriver) {
    clearPersistedFilterAll();
    savedStateRaw = null;
  }
  if (savedStateRaw) {
    try {
      const parsed = JSON.parse(savedStateRaw);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("恢复筛选状态失败", e);
    }
  }
  if (!savedStateRaw) {
    scenarioBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.scenario === 'all');
    });
    categoryBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.category === 'all');
    });
    brandBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.brand === 'all');
    });
    const searchEl = document.getElementById('carSearchInput');
    if (searchEl) searchEl.value = '';
    if (brandFilterButtons) {
      brandFilterButtons.classList.remove('brand-expanded');
      if (sidebar) sidebar.classList.remove('brand-expanded-scroll');
    }
  }

  function saveState() {
    writePersistedFilterJson(JSON.stringify(state));
    var d = sessionStorage.getItem('mango_driver_name');
    if (d) {
      writeFilterOwner(d);
    }
  }

  let globalMinPrice = 0;
  let globalMaxPrice = 0;

  // Initialize prices by scanning all cars
  function initPrices() {
    if (!priceMinSlider || !priceMaxSlider) return;

    let min = Infinity;
    let max = -Infinity;
    
    getCarLinks().forEach(link => {
      const price = getCardPrice(link);
      if (price < min) min = price;
      if (price > max) max = price;
    });

    if (min === Infinity || max === -Infinity) {
      min = 500;
      max = 5000;
    }

    globalMinPrice = min;
    globalMaxPrice = max;

    priceMinSlider.min = min;
    priceMinSlider.max = max;
    priceMaxSlider.min = min;
    priceMaxSlider.max = max;

    const hadStoredFilters = !!readPersistedFilterJson();

    if (!hadStoredFilters) {
      state.priceMin = min;
      state.priceMax = max;
      priceMinSlider.value = min;
      priceMaxSlider.value = max;
    } else {
      let pMin = parseInt(String(state.priceMin), 10);
      let pMax = parseInt(String(state.priceMax), 10);
      if (isNaN(pMin)) pMin = min;
      if (isNaN(pMax)) pMax = max;
      pMin = Math.max(min, Math.min(pMin, max));
      pMax = Math.max(min, Math.min(pMax, max));
      if (pMin > pMax) {
        const swap = pMin;
        pMin = pMax;
        pMax = swap;
      }
      state.priceMin = pMin;
      state.priceMax = pMax;
      priceMinSlider.value = pMin;
      priceMaxSlider.value = pMax;

      const updateBtns = (btns, key, datasetAttr) => {
        btns.forEach((b) => {
          if (b.dataset[datasetAttr] === state[key]) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      };

      updateBtns(scenarioBtns, 'scenario', 'scenario');
      updateBtns(categoryBtns, 'category', 'category');
      updateBtns(brandBtns, 'brand', 'brand');
    }

    priceMinLabel.textContent = state.priceMin;
    priceMaxLabel.textContent = state.priceMax;
    
    const limits = document.querySelectorAll('.price-range-limits span');
    if (limits.length >= 2) {
      limits[0].textContent = min;
      limits[1].textContent = max;
    }

    updatePriceSliders();
    /* 与滑块实际值、钳位结果写回 sessionStorage，避免刷新后仍用旧的 500/5000 或未保存的拖动 */
    saveState();
  }

  // Price slider logic
  const sliderTrack = document.querySelector('.slider-track');
  
  function updatePriceSliders() {
    let minVal = parseInt(priceMinSlider.value);
    let maxVal = parseInt(priceMaxSlider.value);
    
    if (minVal > maxVal) {
      // Swap values if min crosses max
      let tmp = minVal;
      minVal = maxVal;
      maxVal = tmp;
      
      // Update DOM values
      priceMinSlider.value = minVal;
      priceMaxSlider.value = maxVal;
    }
    
    state.priceMin = minVal;
    state.priceMax = maxVal;
    
    priceMinLabel.textContent = minVal;
    priceMaxLabel.textContent = maxVal;
    
    // Update highlight track
    const range = globalMaxPrice - globalMinPrice;
    if (range > 0) {
      const minPercent = ((minVal - globalMinPrice) / range) * 100;
      const maxPercent = ((maxVal - globalMinPrice) / range) * 100;
      if (sliderTrack) {
        sliderTrack.style.setProperty('--left', `${minPercent}%`);
        sliderTrack.style.setProperty('--right', `${100 - maxPercent}%`);
      }
    }
    
    refreshCars();
  }

  priceMinSlider.addEventListener('input', () => {
    updatePriceSliders();
    saveState();
    refreshCars();
  });
  priceMaxSlider.addEventListener('input', () => {
    updatePriceSliders();
    saveState();
    refreshCars();
  });
  priceMinSlider.addEventListener('change', () => {
    updatePriceSliders();
    saveState();
    scrollToCarSectionTop();
  });
  priceMaxSlider.addEventListener('change', () => {
    updatePriceSliders();
    saveState();
    scrollToCarSectionTop();
  });

  // Button logic
  function setupGroupButtons(btns, stateKey) {
    const dataKey =
      stateKey === 'scenario' ? 'scenario' : stateKey === 'category' ? 'category' : 'brand';
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset[dataKey];
        if (btn.classList.contains('active')) {
          if (val === 'all') {
            return;
          }
          btns.forEach((b) => b.classList.remove('active'));
          const allBtn = Array.from(btns).find((b) => b.dataset[dataKey] === 'all');
          if (allBtn) allBtn.classList.add('active');
          state[stateKey] = 'all';
        } else {
          btns.forEach((b) => b.classList.remove('active'));
          state[stateKey] = val;
          btn.classList.add('active');
        }
        saveState();
        refreshCars();
        scrollToCarSectionTop();

        // 移动端点击筛选后自动关闭面板
        if (window.innerWidth <= 1024 && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  function apiCatalogBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || (typeof location !== 'undefined' ? String(location.origin).replace(/\/$/, '') : '');
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function modelOnlyNameFromCar(car) {
    var brand = String((car && car.brand) || '').trim();
    var model = String((car && car.model) || '').trim();
    var fallback = String((car && car.car_name) || '').trim();
    var text = model || fallback;
    if (!text) return '';
    if (brand && text.indexOf(brand) === 0) {
      var rest = text.slice(brand.length).replace(/^[\s\u3000\-_/·]+/, '').trim();
      return rest || text;
    }
    return text;
  }

  function readChecklistMap() {
    try {
      var raw = localStorage.getItem(CAR_CHECKLIST_STORAGE_KEY) || '{}';
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function writeChecklistMap(map) {
    try {
      localStorage.setItem(CAR_CHECKLIST_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function getChecklistCount(map) {
    return Object.keys(map || {}).length;
  }

  function syncChecklistButtonCount(map) {
    var countEl = document.getElementById('carChecklistCount');
    var btnEl = document.getElementById('carChecklistBtn');
    var count = getChecklistCount(map);
    if (!countEl) return;
    countEl.textContent = String(count);
    if (btnEl) {
      btnEl.classList.toggle('has-items', count > 0);
    }
  }

  function syncCardChecklistToggleStates(map) {
    var picked = map || readChecklistMap();
    document.querySelectorAll('.car-checklist-toggle').forEach(function (el) {
      var id = String(el.getAttribute('data-car-id') || '').trim();
      var isPicked = !!(id && picked[id]);
      el.classList.toggle('is-picked', isPicked);
      el.textContent = isPicked ? '已加入' : '加入清单';
      el.setAttribute('aria-pressed', isPicked ? 'true' : 'false');
    });
  }

  function renderChecklistPanel(map) {
    var picked = map || readChecklistMap();
    var listEl = document.getElementById('carChecklistList');
    var emptyEl = document.getElementById('carChecklistEmpty');
    var originalEl = document.getElementById('carChecklistOriginal');
    var totalEl = document.getElementById('carChecklistTotal');
    if (!listEl || !emptyEl || !originalEl || !totalEl) return;
    var ids = Object.keys(picked);
    var originalTotal = 0;
    var total = 0;
    listEl.innerHTML = ids
      .map(function (id) {
        var item = picked[id] || {};
        var name = escHtml(String(item.model_name || item.car_name || id));
        var daysText = item.days ? (' - ' + escHtml(item.days)) : '';
        originalTotal += calcChecklistItemOriginal(item);
        total += calcChecklistItemTotal(item);
        return (
          '<li class="car-checklist-item" data-car-id="' +
          escHtml(id) +
          '">' +
          '<div class="car-checklist-item__name">' +
          name + daysText +
          '</div>' +
          '<button type="button" class="car-checklist-item__remove" data-remove-car-id="' +
          escHtml(id) +
          '">移除</button>' +
          '</li>'
        );
      })
      .join('');
    emptyEl.style.display = ids.length ? 'none' : '';
    originalEl.textContent = '原价：¥' + Math.round(originalTotal).toLocaleString('zh-CN');
    totalEl.textContent = '总价：¥' + Math.round(total).toLocaleString('zh-CN');
  }

  function getDaysMultiplier(daysText) {
    var s = String(daysText || '');
    if (s.indexOf('一周') !== -1) return 7;
    if (s.indexOf('半月') !== -1) return 15;
    if (s.indexOf('整月') !== -1) return 30;
    return 1;
  }

  function getDailyUnitPrice(basePrice, daysText) {
    var p = parseInt(String(basePrice), 10);
    if (isNaN(p) || p <= 0) return 0;
    var cfg = window.mangoPricingConfig || {
      day7: { multiplier: 6.5, divisor: 7 },
      day15: { multiplier: 13, divisor: 15 },
      day30: { multiplier: 23, divisor: 30 },
    };
    if (String(daysText || '').indexOf('一周') !== -1) return Math.floor((p * cfg.day7.multiplier) / cfg.day7.divisor);
    if (String(daysText || '').indexOf('半月') !== -1) return Math.floor((p * cfg.day15.multiplier) / cfg.day15.divisor);
    if (String(daysText || '').indexOf('整月') !== -1) return Math.floor((p * cfg.day30.multiplier) / cfg.day30.divisor);
    return p;
  }

  function calcChecklistItemTotal(item) {
    var it = item || {};
    var unit = getDailyUnitPrice(it.rent_price, it.days);
    var days = getDaysMultiplier(it.days);
    return unit * days;
  }

  function calcChecklistItemOriginal(item) {
    var it = item || {};
    var p = parseInt(String(it.rent_price), 10);
    if (isNaN(p) || p <= 0) return 0;
    return p * getDaysMultiplier(it.days);
  }

  function buildChecklistPayload(map, phone) {
    var picked = map || {};
    var ids = Object.keys(picked);
    var lines = ids.map(function (id) {
      var item = picked[id] || {};
      var name = String(item.model_name || item.car_name || id || '').trim();
      var days = String(item.days || '单日 (24小时)').trim();
      var total = Math.round(calcChecklistItemTotal(item));
      return name + '（' + days + '） ¥' + total.toLocaleString('zh-CN');
    });
    return {
      user: String(sessionStorage.getItem('mango_driver_name') || '未登录用户'),
      phone: String(phone || '').trim(),
      lines: lines,
    };
  }

  function sendChecklistToWecom(phone) {
    var map = readChecklistMap();
    var ids = Object.keys(map);
    if (!ids.length) {
      alert('用车清单为空，无法发送');
      return;
    }
    var b = apiOriginRecommend();
    if (!b) {
      alert('当前环境无法连接接口，请先启动 member_api');
      return;
    }
    var payload = buildChecklistPayload(map, phone);
    fetch(b + '/api/wecom/checklist-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j || {} }; });
      })
      .then(function (o) {
        if (o.ok && o.j && o.j.ok) {
          writeChecklistMap({});
          syncChecklistButtonCount({});
          syncCardChecklistToggleStates({});
          renderChecklistPanel({});
          if (checklistPanel) checklistPanel.setAttribute('hidden', '');
          if (typeof window.showWecomSuccessModal === 'function') window.showWecomSuccessModal();
        } else {
          if (typeof window.showWecomFailModal === 'function') window.showWecomFailModal();
        }
      })
      .catch(function () {
        if (typeof window.showWecomFailModal === 'function') window.showWecomFailModal();
      });
  }

  // ==== 选车天数弹窗逻辑 ====
  var daysSelectModal = document.getElementById('daysSelectModal');
  var daysSelectOptions = document.getElementById('daysSelectOptions');
  var daysSelectCloseBtn = document.getElementById('daysSelectCloseBtn');
  var currentPendingCarItem = null;

  function closeDaysSelectModal() {
    if (daysSelectModal) daysSelectModal.hidden = true;
    currentPendingCarItem = null;
  }

  if (daysSelectCloseBtn) {
    daysSelectCloseBtn.addEventListener('click', closeDaysSelectModal);
  }

  function openDaysSelectModal(item, rentPrice) {
    if (!daysSelectModal || !daysSelectOptions) return;
    currentPendingCarItem = item;
    
    var price = parseInt(rentPrice, 10);
    if (isNaN(price) || price <= 0) price = 0;

    // 从全局配置获取计费规则，如果不存在则使用默认值
    var cfg = window.mangoPricingConfig || {
      "day7": { "multiplier": 6.5, "divisor": 7 },
      "day15": { "multiplier": 13, "divisor": 15 },
      "day30": { "multiplier": 23, "divisor": 30 }
    };

    var p1 = price; 
    var p7 = Math.floor((price * cfg.day7.multiplier) / cfg.day7.divisor);
    var p15 = Math.floor((price * cfg.day15.multiplier) / cfg.day15.divisor);
    var p30 = Math.floor((price * cfg.day30.multiplier) / cfg.day30.divisor);

    var html = `
      <div class="days-option-row">
        <span class="days-label">单日 (24小时)</span>
        <span class="days-price">¥${p1}/天</span>
        <button class="days-confirm-btn" data-days="单日 (24小时)">确认</button>
      </div>
      <div class="days-option-row">
        <span class="days-label">一周 (7天)</span>
        <span class="days-price">¥${p7}/天</span>
        <button class="days-confirm-btn" data-days="一周 (7天)">确认</button>
      </div>
      <div class="days-option-row">
        <span class="days-label">半月 (15天)</span>
        <span class="days-price">¥${p15}/天</span>
        <button class="days-confirm-btn" data-days="半月 (15天)">确认</button>
      </div>
      <div class="days-option-row">
        <span class="days-label">整月 (30天)</span>
        <span class="days-price">¥${p30}/天</span>
        <button class="days-confirm-btn" data-days="整月 (30天)">确认</button>
      </div>
    `;
    daysSelectOptions.innerHTML = html;
    daysSelectModal.hidden = false;
  }

  if (daysSelectOptions) {
    daysSelectOptions.addEventListener('click', function (e) {
      if (e.target && e.target.classList.contains('days-confirm-btn')) {
        var days = e.target.getAttribute('data-days');
        if (currentPendingCarItem) {
          currentPendingCarItem.days = days;
          
          var map = readChecklistMap();
          map[currentPendingCarItem.car_id] = currentPendingCarItem;
          writeChecklistMap(map);
          syncChecklistButtonCount(map);
          syncCardChecklistToggleStates(map);
          renderChecklistPanel(map);
        }
        closeDaysSelectModal();
      }
    });
  }

  function toggleChecklistCar(item, rentPrice) {
    if (!item || !item.car_id) return;
    item.rent_price = parseInt(String(rentPrice || item.rent_price || 0), 10) || 0;
    var map = readChecklistMap();
    
    // 如果已经在清单中，则移除
    if (map[item.car_id]) {
      delete map[item.car_id];
      writeChecklistMap(map);
      syncChecklistButtonCount(map);
      syncCardChecklistToggleStates(map);
      renderChecklistPanel(map);
    } else {
      // 否则不直接加入，而是弹出天数选择框
      openDaysSelectModal(item, rentPrice);
    }
  }

  /** 车型目录名归一化：数据库/历史文案变更时，静态资源目录仍可命中 */
  function normalizeCarFolderNameForAssets(carName) {
    var raw = String(carName || '').trim();
    if (!raw) return raw;
    var compact = raw.replace(/[\s\u00a0\u3000]+/g, ' ').trim();
    var aliasMap = {
      '兰博基尼 V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
      '兰博基尼V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
    };
    return aliasMap[compact] || compact;
  }

  /** 选车卡片封面：优先封面.webp，缺失时再回退到 thumb；兼容两种目录层级 */
  function coverUrlsForCar(carName) {
    var normalizedName = normalizeCarFolderNameForAssets(carName);
    var folder = encodeURIComponent(normalizedName);
    var baseCarpark = 'media-webp/photos/carpark/' + folder + '/';
    var basePhotos = 'media-webp/photos/' + folder + '/';
    return {
      primary: baseCarpark + '封面.webp',
      fallbacks: [
        basePhotos + '封面.webp',
        baseCarpark + '封面-thumb.webp',
        basePhotos + '封面-thumb.webp',
      ],
    };
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

  function calcLowestDailyPrice(rentPrice) {
    var p = parseInt(String(rentPrice), 10);
    if (isNaN(p) || p <= 0) return 0;
    return Math.floor((p * 23) / 30);
  }

  /** 选车卡片副标题：优先 API card_tagline，其次 car_card_taglines.json，否则 brand + model */
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

  function fetchCardTaglines() {
    if (window.__mangoCardTaglinesPromise) return window.__mangoCardTaglinesPromise;
    window.__mangoCardTaglinesPromise = fetch('./car_card_taglines.json', { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('taglines http');
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

  function buildCarCardHtml(car, opts) {
    opts = opts || {};
    var href = './carpark/' + encodeURIComponent(car.car_name) + '/car.html#detail-overview';
    var cov = coverUrlsForCar(car.car_name);
    var cat = escHtml(car.category);
    var rawCarId = String(car.car_name || '').trim();
    var carId = escHtml(rawCarId);
    var name = escHtml(modelOnlyNameFromCar(car));
    var badge = categoryBadgeClass(car.category);
    var dailyRent = parseInt(String(car.rent_price || 0), 10) || 0;
    var monthlyDaily = calcLowestDailyPrice(car.rent_price);
    var priceHtml = opts.comingSoon
      ? '<span class="car-price-daily">¥???<span class="car-price-unit">/天</span></span>' +
        '<span class="car-price-monthline">月租 —/天</span>'
      : '<span class="car-price-daily">' +
        formatPriceYuan(dailyRent) +
        '<span class="car-price-unit">/天</span></span>' +
        '<span class="car-price-monthline">月租' +
        formatPriceYuan(monthlyDaily) +
        '/天</span>';
    var meta = escHtml(cardMetaLine(car));
    
    // 把 rent_price 放在 data 属性里，方便后面弹窗计算价格
    return (
      '<a class="car-card-link" href="' +
      escHtml(href) +
      '">' +
      '<div class="car-card" data-category="' +
      cat +
      '" data-car-id="' +
      carId +
      '">' +
      '<span class="car-checklist-toggle" role="button" tabindex="0" data-car-id="' +
      carId +
      '" data-car-name="' +
      carId +
      '" data-model-name="' +
      name +
      '" data-rent-price="' +
      (car.rent_price || 0) +
      '" aria-pressed="false">加入清单</span>' +
      '<picture><source srcset="' +
      escHtml(cov.primary) +
      '" type="image/webp">' +
      '<img class="car-image car-image-photo" loading="lazy" src="' +
      escHtml(cov.primary) +
      '" data-fallbacks="' +
      escHtml(cov.fallbacks.join('|')) +
      '" alt="' +
      name +
      '">' +
      '</picture>' +
      '<div class="car-info">' +
      '<div class="car-name">' +
      name +
      '</div>' +
      '<div class="car-price">' +
      priceHtml +
      '</div>' +
      '<div class="car-badge car-badge-inline ' +
      badge +
      '">' +
      cat +
      '</div>' +
      '<div class="car-meta">' +
      meta +
      '</div>' +
      '</div></div></a>'
    );
  }

  /** 车卡封面失败回退：按 data-fallbacks 顺序尝试备用路径 */
  document.addEventListener(
    'error',
    function (e) {
      var img = e.target;
      if (!img || !img.classList || !img.classList.contains('car-image-photo')) return;
      var raw = img.getAttribute('data-fallbacks') || '';
      if (!raw) return;
      var list = raw.split('|').filter(Boolean);
      if (!list.length) return;
      var idx = parseInt(img.getAttribute('data-fallback-index') || '0', 10);
      if (isNaN(idx) || idx < 0) idx = 0;
      if (idx >= list.length) return;
      var next = list[idx];
      img.setAttribute('data-fallback-index', String(idx + 1));
      var pic = img.parentElement;
      var source = pic ? pic.querySelector('source') : null;
      if (source) source.setAttribute('srcset', next);
      img.src = next;
    },
    true
  );

  function applyCarsCatalog(cars) {
    if (!Array.isArray(cars) || !cars.length) {
      var errEmpty = document.getElementById('carparkCatalogError');
      if (errEmpty) {
        errEmpty.textContent = '未从数据库加载到车辆，请检查 cars 表与 member_api 配置。';
        errEmpty.style.display = '';
      }
      return;
    }
    var errOk = document.getElementById('carparkCatalogError');
    if (errOk) errOk.style.display = 'none';

    var coming = cars.filter(function (c) {
      return String(c.category || '').trim() === '即将上新';
    });
    var main = cars;

    var catSet = {};
    var brandSet = {};
    main.forEach(function (c) {
      if (c.category) catSet[String(c.category).trim()] = true;
      if (c.brand) brandSet[String(c.brand).trim()] = true;
    });
    var categories = Object.keys(catSet).sort();
    var brands = Object.keys(brandSet).sort();

    var catContainer = document.getElementById('categoryFilterButtons');
    if (catContainer) {
      catContainer.innerHTML = '';
      var allCat = document.createElement('button');
      allCat.className = 'filter-btn active';
      allCat.dataset.category = 'all';
      allCat.textContent = '全部';
      catContainer.appendChild(allCat);
      categories.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'filter-btn';
        b.dataset.category = c;
        b.textContent = c;
        catContainer.appendChild(b);
      });
    }

    var brandContainer = document.getElementById('brandFilterButtons');
    var expandBtn = document.getElementById('expandBrandBtn');
    if (brandContainer && expandBtn) {
      brandContainer.innerHTML = '';
      var allBr = document.createElement('button');
      allBr.className = 'filter-btn active';
      allBr.dataset.brand = 'all';
      allBr.textContent = '全部';
      brandContainer.appendChild(allBr);
      brands.forEach(function (br, idx) {
        var b = document.createElement('button');
        b.className = 'filter-btn';
        if (idx >= 10) b.classList.add('hidden-brand');
        b.dataset.brand = br;
        b.textContent = br;
        brandContainer.appendChild(b);
      });
      brandContainer.appendChild(expandBtn);
    }

    categoryBtns = document.querySelectorAll('#categoryFilterButtons .filter-btn[data-category]');
    brandBtns = document.querySelectorAll('#brandFilterButtons .filter-btn[data-brand]');
    INITIAL_CATEGORY_ORDER = categories.slice();
    INITIAL_BRAND_ORDER = brands.slice();
    initialCategoryOrderChildren = categoryFilterButtons
      ? Array.from(categoryFilterButtons.children)
      : [];
    initialBrandOrderChildren = brandFilterButtons ? Array.from(brandFilterButtons.children) : [];

    setupGroupButtons(categoryBtns, 'category');
    setupGroupButtons(brandBtns, 'brand');

    if (!savedStateRaw) {
      categoryBtns.forEach(function (b) {
        b.classList.toggle('active', b.dataset.category === 'all');
      });
      brandBtns.forEach(function (b) {
        b.classList.toggle('active', b.dataset.brand === 'all');
      });
    } else {
      var syncBtns = function (btns, key, datasetAttr) {
        btns.forEach(function (b) {
          if (b.dataset[datasetAttr] === state[key]) b.classList.add('active');
          else b.classList.remove('active');
        });
      };
      syncBtns(categoryBtns, 'category', 'category');
      syncBtns(brandBtns, 'brand', 'brand');
    }

    var comingGrid =
      document.getElementById('comingSoonGrid') ||
      (document.getElementById('comingSoonSection') &&
        document.getElementById('comingSoonSection').querySelector('.car-grid'));
    if (comingGrid) {
      comingGrid.innerHTML = coming
        .map(function (c) {
          return buildCarCardHtml(c, { comingSoon: true });
        })
        .join('');
    }

    var root = document.getElementById('carparkBrandSectionsRoot');
    if (!root) return;
    root.innerHTML = '';
    var byBrand = {};
    main.forEach(function (c) {
      var b = String(c.brand || '其他').trim() || '其他';
      if (!byBrand[b]) byBrand[b] = [];
      byBrand[b].push(c);
    });
    var brandKeys = Object.keys(byBrand).sort();
    brandKeys.forEach(function (b) {
      var sec = document.createElement('div');
      sec.className = 'brand-section';
      sec.dataset.brand = b;
      sec.innerHTML =
        '<h2 class="brand-title">' +
        escHtml(b) +
        '</h2><div class="car-grid">' +
        byBrand[b]
          .map(function (c) {
            return buildCarCardHtml(c);
          })
          .join('') +
        '</div>';
      root.appendChild(sec);
    });
    syncCardChecklistToggleStates(readChecklistMap());
  }

  function loadCatalogThenInit() {
    var url = apiCatalogBase() + '/api/cars-catalog';
    var siteUiUrl = apiCatalogBase() + '/api/site-ui';

    Promise.all([
      fetchCardTaglines(),
      fetch(url, { credentials: 'omit' }).then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      }),
      fetch(siteUiUrl, { credentials: 'omit' }).then(function (r) {
        return r.json().catch(function () { return {}; });
      }).catch(function () { return {}; })
    ])
      .then(function (arr) {
        var o = arr[1];
        var siteUi = arr[2] || {};
        
        if (siteUi.pricing) {
          window.mangoPricingConfig = siteUi.pricing;
        } else {
          window.mangoPricingConfig = {
            "day7": { "multiplier": 6.5, "divisor": 7 },
            "day15": { "multiplier": 13, "divisor": 15 },
            "day30": { "multiplier": 23, "divisor": 30 }
          };
        }

        if (!o.ok || !o.j || !o.j.ok || !Array.isArray(o.j.cars)) {
          throw new Error('cars-catalog failed');
        }
        applyCarsCatalog(o.j.cars);
        initPrices();
        refreshCars();
        refreshTodayRecommend();
        scheduleRestoreCarListScrollAfterLayout();
      })
      .catch(function (e) {
        console.warn('[cars-catalog]', e);
        var errEl = document.getElementById('carparkCatalogError');
        if (errEl) {
          errEl.textContent =
            '无法加载车辆列表：请启动 member_api 并配置 database.mysql（含 cars 表），或将 window.MANGO_API_ORIGIN 指向 API 根地址。';
          errEl.style.display = '';
        }
        initPrices();
        refreshCars();
        scheduleRestoreCarListScrollAfterLayout();
      });
  }

  setupGroupButtons(scenarioBtns, 'scenario');
  /* category / brand 在 applyCarsCatalog 填充 DOM 后再 setupGroupButtons */

  // Reset logic
  resetBtn.addEventListener('click', () => {
    state.scenario = 'all';
    state.category = 'all';
    state.brand = 'all';
    state.priceMin = globalMinPrice;
    state.priceMax = globalMaxPrice;
    
    saveState();

    scenarioBtns.forEach(b => {
      if (b.dataset.scenario === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });
    
    categoryBtns.forEach(b => {
      if (b.dataset.category === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });
    
    brandBtns.forEach(b => {
      if (b.dataset.brand === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });

    priceMinSlider.value = globalMinPrice;
    priceMaxSlider.value = globalMaxPrice;
    priceMinLabel.textContent = globalMinPrice;
    priceMaxLabel.textContent = globalMaxPrice;
    
    // reset highlight track
    if (sliderTrack) {
      sliderTrack.style.setProperty('--left', '0%');
      sliderTrack.style.setProperty('--right', '0%');
    }
    
    if (brandFilterButtons) {
      brandFilterButtons.classList.remove('brand-expanded');
      if (sidebar) sidebar.classList.remove('brand-expanded-scroll');
    }

    scenarioBtns.forEach(b => {
      b.classList.remove('active');
      if (b.dataset.scenario === 'all') b.classList.add('active');
    });
    categoryBtns.forEach(b => {
      b.classList.remove('active');
      if (b.dataset.category === 'all') b.classList.add('active');
    });
    brandBtns.forEach(b => {
      b.classList.remove('active');
      if (b.dataset.brand === 'all') b.classList.add('active');
    });

    const resetSearchEl = document.getElementById('carSearchInput');
    if (resetSearchEl) resetSearchEl.value = '';

    refreshCars();
    scrollToCarSectionTop();
  });


  function getCardCategory(cardLink) {
    const inner = cardLink.querySelector('.car-card');
    return inner ? inner.dataset.category : undefined;
  }
  
  function getCardPrice(cardLink) {
    var dailyEl = cardLink.querySelector('.car-price-daily');
    var priceText = dailyEl ? dailyEl.textContent : (cardLink.querySelector('.car-price') || {}).textContent || '';
    const match = priceText.match(/¥([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
    return 0;
  }

  function getCardBrand(cardLink) {
    const section = cardLink.closest('.brand-section');
    return section ? section.dataset.brand : undefined;
  }

    function matchesFilter(cardLink) {
    const category = getCardCategory(cardLink) || '无';
    const price = getCardPrice(cardLink);
    const brand = getCardBrand(cardLink);
    
    // Check Search Text
    const searchInput = document.getElementById('carSearchInput');
    if (searchInput && searchInput.value.trim() !== '') {
      const searchText = searchInput.value.trim().toLowerCase();
      const carNameElem = cardLink.querySelector('.car-name');
      if (carNameElem) {
        const carName = carNameElem.textContent.toLowerCase();
        if (!carName.includes(searchText)) {
          return false;
        }
      }
    }

    // Check Price（¥0 视为未定价，不参与区间过滤，避免默认滑块下限高于 0 时整批消失）
    if (price > 0 && (price < state.priceMin || price > state.priceMax)) {
      return false;
    }

    // Check Category
    if (state.category !== 'all' && category !== state.category) {
      return false;
    }

    // Check Brand
    if (state.brand !== 'all' && brand !== state.brand) {
      return false;
    }

    // Check Scenario
    if (state.scenario !== 'all') {
      switch (state.scenario) {
        case 'business':
          if (!['商务车', '行政级轿车', '豪华SUV', '轿车'].includes(category)) return false;
          break;
        case 'wedding':
          if (!['超跑', '豪华SUV', '行政级轿车'].includes(category)) return false;
          break;
        case 'event':
          if (!['超跑', '性能车'].includes(category)) return false;
          break;
        case 'self-drive':
          if (!['越野车', '新能源', '豪华SUV', '行政级轿车', '轿车', '皮卡'].includes(category)) return false;
          break;
      }
    }

    return true;
  }

  /** 与 vehicle-click.js 一致，用于从列表页车名解析品牌/车型 */
  const KNOWN_BRANDS_FOR_RECOMMEND = [
    '阿斯顿马丁', '劳斯莱斯', '兰博基尼', '玛莎拉蒂', '雷克萨斯', '保时捷',
    '法拉利', '迈巴赫', '奔驰', '宝马', '奥迪', '路虎', '特斯拉', '理想',
    '小米', '路特斯', '岚图', '雪佛兰', '丰田', '房车', '五菱宏光', '五菱',
    '其他'
  ].sort(function (a, b) { return b.length - a.length; });

  function parseBrandModelFromCardName(displayName, sectionBrand) {
    var s = (displayName || '').trim();
    if (!s) return { brand: sectionBrand || '', model: '' };
    for (var i = 0; i < KNOWN_BRANDS_FOR_RECOMMEND.length; i++) {
      var br = KNOWN_BRANDS_FOR_RECOMMEND[i];
      if (s.indexOf(br) === 0) {
        var rest = s.slice(br.length).replace(/^\s+/, '');
        return { brand: br, model: rest || s };
      }
    }
    var parts = s.split(/\s+/);
    return { brand: parts[0] || sectionBrand || '', model: parts.slice(1).join(' ') || s };
  }

  function recommendCarKey(entry) {
    return (entry.brand || '') + '\t' + (entry.model || '');
  }

  /** 与库里 brand/model 或列表 displayName 对齐：全角空格、折叠空白 */
  function normalizeRecommendToken(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/\u3000/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 视图里 concat(brand,model) 可能与列表「带空格车名」不一致，压缩后比较 */
  function compactCarNameForMatch(s) {
    return normalizeRecommendToken(s).replace(/\s+/g, '');
  }

  /** 在列表目录中查找视图「点击最多车」对应条目；失败则返回 null */
  function matchCatalogEntryForViewCar(fullCatalog, viewCarName) {
    var vn = normalizeRecommendToken(viewCarName);
    if (!vn) return null;
    var vCompact = compactCarNameForMatch(vn);
    var vbm = parseBrandModelFromCardName(vn, '');
    var vKey = vbm.brand && vbm.model ? recommendNormKey(vbm.brand, vbm.model) : '';
    for (var i = 0; i < fullCatalog.length; i++) {
      var c = fullCatalog[i];
      var dn = normalizeRecommendToken(c.displayName);
      if (dn === vn) return c;
      if (compactCarNameForMatch(dn) === vCompact) return c;
      if (vKey && recommendNormKey(c.brand, c.model) === vKey) return c;
      if (vbm.brand && vbm.model && c.brand === vbm.brand && c.model === vbm.model) return c;
    }
    return null;
  }

  function recommendNormKey(brand, model) {
    var b = normalizeRecommendToken(brand);
    var m = normalizeRecommendToken(model);
    return (b + '|' + m).toLowerCase();
  }

  /** 将 /api/member-vehicle-clicks-summary 的 rows 合并到 fullCatalog[].clicks（精确 key + 与 displayName 对齐的兜底） */
  function mergeRowsIntoCatalogClicks(fullCatalog, rows) {
    var clickMap = {};
    if (rows && rows.length) {
      rows.forEach(function (r) {
        var k = recommendNormKey(r.brand, r.model);
        var n = parseInt(String(r.total_clicks), 10);
        var v = isNaN(n) ? 0 : n;
        clickMap[k] = (clickMap[k] || 0) + v;
      });
    }
    fullCatalog.forEach(function (c) {
      c.clicks = clickMap[recommendNormKey(c.brand, c.model)] || 0;
    });
    if (!rows || !rows.length) return;
    fullCatalog.forEach(function (c) {
      if (c.clicks > 0) return;
      var dn = normalizeRecommendToken(c.displayName);
      var add = 0;
      rows.forEach(function (r) {
        var n = parseInt(String(r.total_clicks), 10) || 0;
        if (!n) return;
        var rb = normalizeRecommendToken(r.brand);
        var rm = normalizeRecommendToken(r.model);
        var comb = normalizeRecommendToken(rb + ' ' + rm);
        var restAfterBrand = rb && dn.indexOf(rb) === 0 ? normalizeRecommendToken(dn.slice(rb.length)) : '';
        var match =
          (comb && comb === dn) ||
          (rb && rm && restAfterBrand === rm) ||
          (rb && !rm && dn === rb);
        if (match) add += n;
      });
      if (add > 0) c.clicks = add;
    });
  }

  /**
   * 视图 v_member_max_click_car 给出的车名（brand + 空格 + model）优先作为推荐第 1 辆：
   * 在已有 summary 合并结果上再抬升该车 clicks，避免与其它车打分并列。
   */
  function applyViewTopCarBoost(fullCatalog, viewCarName) {
    var vn = normalizeRecommendToken(viewCarName);
    if (!vn) return;
    var maxClick = 0;
    fullCatalog.forEach(function (c) {
      if (c.clicks > maxClick) maxClick = c.clicks;
    });
    var boost = maxClick + 1000000;
    var vCompact = compactCarNameForMatch(vn);
    var vbm = parseBrandModelFromCardName(vn, '');
    var vKey = vbm.brand && vbm.model ? recommendNormKey(vbm.brand, vbm.model) : '';
    fullCatalog.forEach(function (c) {
      var dn = normalizeRecommendToken(c.displayName);
      var hit =
        dn === vn ||
        compactCarNameForMatch(dn) === vCompact ||
        (vKey && recommendNormKey(c.brand, c.model) === vKey) ||
        (vbm.brand && vbm.model && c.brand === vbm.brand && c.model === vbm.model);
      if (hit) c.clicks = Math.max(c.clicks || 0, boost);
    });
  }

  function scoreLexGreater(a, b) {
    for (var k = 0; k < Math.max(a.length, b.length); k++) {
      var av = a[k] != null ? a[k] : 0;
      var bv = b[k] != null ? b[k] : 0;
      if (av > bv) return true;
      if (av < bv) return false;
    }
    return false;
  }

  function pickSameBrandBestPair(pool) {
    var byBrand = {};
    pool.forEach(function (c) {
      if (!byBrand[c.brand]) byBrand[c.brand] = [];
      byBrand[c.brand].push(c);
    });
    var bestPair = null;
    var bestScore = null;
    Object.keys(byBrand).forEach(function (br) {
      var arr = byBrand[br];
      if (arr.length < 2) return;
      for (var i = 0; i < arr.length; i++) {
        for (var j = i + 1; j < arr.length; j++) {
          var a = arr[i];
          var b = arr[j];
          var minC = Math.min(a.clicks, b.clicks);
          var sumC = a.clicks + b.clicks;
          var diff = Math.abs(a.price - b.price);
          var score = [minC, sumC, -diff];
          if (!bestScore || scoreLexGreater(score, bestScore)) {
            bestScore = score;
            bestPair = [a, b];
          }
        }
      }
    });
    return bestPair;
  }

  function pickAnyBrandBestPair(pool) {
    var bestPair = null;
    var bestScore = null;
    for (var i = 0; i < pool.length; i++) {
      for (var j = i + 1; j < pool.length; j++) {
        var a = pool[i];
        var b = pool[j];
        var minC = Math.min(a.clicks, b.clicks);
        var sumC = a.clicks + b.clicks;
        var diff = Math.abs(a.price - b.price);
        var score = [minC, sumC, -diff];
        if (!bestScore || scoreLexGreater(score, bestScore)) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }
    return bestPair;
  }

  /** 第 3、4 辆：仅接受「品牌不同」的组合；不做同品牌兜底 */
  function pickDifferentBrandClosestPair(pool, usedKeys) {
    var bestPair = null;
    var bestScore = null;
    for (var i = 0; i < pool.length; i++) {
      for (var j = i + 1; j < pool.length; j++) {
        var a = pool[i];
        var b = pool[j];
        if (usedKeys.has(recommendCarKey(a)) || usedKeys.has(recommendCarKey(b))) continue;
        if (a.brand === b.brand) continue;
        var diff = Math.abs(a.price - b.price);
        var minC = Math.min(a.clicks, b.clicks);
        var sumC = a.clicks + b.clicks;
        var score = [minC, sumC, -diff];
        if (!bestScore || scoreLexGreater(score, bestScore)) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }
    return bestPair;
  }

  /**
   * 第 3、4 辆：与 refCar（通常为点击最多的第 1 辆）价差最小，且品牌异于 refCar；
   * 两辆之间尽量异牌；不足则次优（仅保证不同车）。
   */
  function pickTwoOtherBrandsClosestToRefPrice(fullCatalog, usedKeys, refCar) {
    if (!refCar || !(refCar.price > 0)) return null;
    var refPrice = refCar.price;
    var refBrand = refCar.brand;
    var pool = fullCatalog.filter(function (c) {
      return !usedKeys.has(recommendCarKey(c)) && c.brand !== refBrand;
    });
    if (pool.length < 2) return null;
    pool.sort(function (a, b) {
      return Math.abs(a.price - refPrice) - Math.abs(b.price - refPrice);
    });
    var third = pool[0];
    var poolOtherBrand = pool.filter(function (c) {
      return recommendCarKey(c) !== recommendCarKey(third) && c.brand !== third.brand;
    });
    var fourth = null;
    if (poolOtherBrand.length) {
      poolOtherBrand.sort(function (a, b) {
        return Math.abs(a.price - refPrice) - Math.abs(b.price - refPrice);
      });
      fourth = poolOtherBrand[0];
    } else {
      var poolRest = pool.filter(function (c) {
        return recommendCarKey(c) !== recommendCarKey(third);
      });
      if (!poolRest.length) return null;
      poolRest.sort(function (a, b) {
        return Math.abs(a.price - refPrice) - Math.abs(b.price - refPrice);
      });
      fourth = poolRest[0];
    }
    return fourth ? [third, fourth] : null;
  }

  function singleUserCarPairFirstTwo(c0, fullCatalog) {
    var same = fullCatalog.filter(function (c) {
      return c.brand === c0.brand && recommendCarKey(c) !== recommendCarKey(c0);
    });
    var pickClosest = function (arr, ref) {
      if (!arr.length) return null;
      var sorted = arr.slice().sort(function (a, b) {
        return Math.abs(a.price - ref.price) - Math.abs(b.price - ref.price);
      });
      return sorted[0];
    };
    var c1 = pickClosest(same, c0);
    if (!c1) {
      var rest = fullCatalog.filter(function (c) { return recommendCarKey(c) !== recommendCarKey(c0); });
      c1 = pickClosest(rest, c0);
    }
    return c1 ? [c0, c1] : null;
  }

  function collectRecommendCatalog() {
    var links = document.querySelectorAll('#carparkBrandSectionsRoot .brand-section .car-card-link');
    var list = [];
    var seen = new Set();
    links.forEach(function (link) {
      var nameEl = link.querySelector('.car-name');
      if (!nameEl) return;
      var price = getCardPrice(link);
      if (!(price > 0)) return;
      var sectionBrand = getCardBrand(link) || '';
      var bm = parseBrandModelFromCardName(nameEl.textContent.trim(), sectionBrand);
      if (!bm.brand) bm.brand = sectionBrand;
      if (!bm.model) bm.model = nameEl.textContent.trim();
      var nk = recommendNormKey(bm.brand, bm.model);
      if (seen.has(nk)) return;
      seen.add(nk);
      list.push({
        brand: bm.brand,
        model: bm.model,
        displayName: nameEl.textContent.trim(),
        price: price,
        link: link,
        clicks: 0
      });
    });
    return list;
  }

  function apiOriginRecommend() {
    if (typeof window.MANGO_API_ORIGIN !== 'undefined' && window.MANGO_API_ORIGIN) {
      return String(window.MANGO_API_ORIGIN).replace(/\/$/, '');
    }
    /* 未配置时：与 member_api 同机同端口打开 car.html 时可直接请求当前站点 */
    if (typeof window.location !== 'undefined' && window.location.protocol !== 'file:') {
      return String(window.location.origin).replace(/\/$/, '');
    }
    return '';
  }

  /** 按昨日全站点击排行行（vehicle 车名）映射到列表页卡片，不满 4 则顺序补全 */
  function buildChosenFromYesterdayRows(fullCatalog, vehicleRows) {
    var chosen = [];
    var used = new Set();
    (vehicleRows || []).forEach(function (r) {
      var name = r.vehicle != null ? String(r.vehicle).trim() : '';
      if (!name || chosen.length >= 4) return;
      var ent = matchCatalogEntryForViewCar(fullCatalog, name);
      if (!ent || used.has(recommendCarKey(ent))) return;
      chosen.push(ent);
      used.add(recommendCarKey(ent));
    });
    while (chosen.length < 4) {
      var nxt = fullCatalog.find(function (c) { return !used.has(recommendCarKey(c)); });
      if (!nxt) break;
      chosen.push(nxt);
      used.add(recommendCarKey(nxt));
    }
    return chosen.slice(0, 4);
  }

  function renderRecommendChosen(gridEl, chosen) {
    chosen = chosen.slice(0, 4);
    gridEl.innerHTML = '';
    chosen.forEach(function (c) {
      gridEl.appendChild(c.link.cloneNode(true));
    });
    syncCardChecklistToggleStates(readChecklistMap());
  }

  function refreshTodayRecommend() {
    var recommendSection = document.getElementById('recommendSection');
    if (!recommendSection) return;
    var grid = recommendSection.querySelector('.car-grid');
    if (!grid) return;

    var fullCatalog = collectRecommendCatalog();
    if (fullCatalog.length < 4) return;

    var member = sessionStorage.getItem('mango_driver_name');
    /** 接口返回的视图车名；finish 内优先将其固定为推荐第 1 辆（不依赖 clicks 是否合并成功） */
    var viewTopCarRaw = '';

    var postRec = function (path, body) {
      var b = apiOriginRecommend();
      if (!b) {
        return Promise.resolve({ res: { ok: false }, j: {} });
      }
      return fetch(b + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        credentials: 'omit'
      })
        .then(function (res) {
          return res.json().then(function (j) {
            return { res: res, j: j || {} };
          }).catch(function () {
            return { res: res, j: {} };
          });
        })
        .catch(function () {
          return { res: { ok: false }, j: {} };
        });
    };

    function loadYesterdayTopThen(fallbackFinish) {
      postRec('/api/yesterday-vehicle-click-top', { limit: 12 }).then(function (o) {
        var vrows = o.res.ok && o.j && o.j.ok && Array.isArray(o.j.rows) ? o.j.rows : [];
        if (vrows.length) {
          renderRecommendChosen(grid, buildChosenFromYesterdayRows(fullCatalog, vrows));
        } else {
          fallbackFinish();
        }
      });
    }

    var finish = function () {
      var userRanked = fullCatalog.filter(function (c) { return c.clicks > 0; }).sort(function (a, b) {
        return b.clicks - a.clicks || Math.abs(a.price - b.price);
      });

      var chosen = [];
      var used = new Set();

      var viewMatched = viewTopCarRaw ? matchCatalogEntryForViewCar(fullCatalog, viewTopCarRaw) : null;

      /* 视图「点击最多车」能对应到列表时：强制第 1 辆（解决 API/汇总与视图不一致、 boost 未命中等问题） */
      if (viewMatched) {
        chosen.push(viewMatched);
        used.add(recommendCarKey(viewMatched));
        var viewPair = singleUserCarPairFirstTwo(viewMatched, fullCatalog);
        if (viewPair && viewPair[1] && !used.has(recommendCarKey(viewPair[1]))) {
          chosen.push(viewPair[1]);
          used.add(recommendCarKey(viewPair[1]));
        }
      } else if (userRanked.length > 0) {
        /* 有个人点击时：第 1 辆固定为点击最高（避免双车打分把宝马抬到劳斯莱斯前面） */
        var top = userRanked[0];
        chosen.push(top);
        used.add(recommendCarKey(top));
        var topPair = singleUserCarPairFirstTwo(top, fullCatalog);
        if (topPair && topPair[1] && !used.has(recommendCarKey(topPair[1]))) {
          chosen.push(topPair[1]);
          used.add(recommendCarKey(topPair[1]));
        }
      } else {
        var firstPair = pickSameBrandBestPair(userRanked);
        if (!firstPair && userRanked.length >= 2) {
          firstPair = pickAnyBrandBestPair(userRanked);
        } else if (!firstPair && userRanked.length === 1) {
          firstPair = singleUserCarPairFirstTwo(userRanked[0], fullCatalog);
        }
        if (!firstPair) {
          firstPair = pickAnyBrandBestPair(fullCatalog);
        }
        if (firstPair && firstPair[0] && firstPair[1]) {
          firstPair.forEach(function (c) {
            if (!used.has(recommendCarKey(c))) {
              chosen.push(c);
              used.add(recommendCarKey(c));
            }
          });
        }
      }

      while (chosen.length < 2) {
        var fillA = fullCatalog.find(function (c) { return !used.has(recommendCarKey(c)); });
        if (!fillA) break;
        chosen.push(fillA);
        used.add(recommendCarKey(fillA));
      }

      /* 第 3、4 辆：与第 1 辆（点击最多的车）价差最近的「其他品牌」，且两辆尽量异牌 */
      var refAnchor = chosen[0];
      var pairNearTop =
        refAnchor && pickTwoOtherBrandsClosestToRefPrice(fullCatalog, used, refAnchor);
      if (!pairNearTop) {
        pairNearTop = pickDifferentBrandClosestPair(fullCatalog, used);
      }
      if (pairNearTop) {
        pairNearTop.forEach(function (carEntry) {
          if (chosen.length >= 4) return;
          if (!used.has(recommendCarKey(carEntry))) {
            chosen.push(carEntry);
            used.add(recommendCarKey(carEntry));
          }
        });
      }

      while (chosen.length < 4) {
        var fillB = null;
        var refB = chosen[0];
        if (chosen.length === 3) {
          fillB = fullCatalog
            .filter(function (c) {
              return (
                !used.has(recommendCarKey(c)) &&
                c.brand !== chosen[2].brand &&
                (refB ? c.brand !== refB.brand : true)
              );
            })
            .sort(function (a, b) {
              var ar = refB ? Math.abs(a.price - refB.price) : 0;
              var br = refB ? Math.abs(b.price - refB.price) : 0;
              return ar - br;
            })[0];
        }
        if (!fillB) {
          fillB = fullCatalog.find(function (c) { return !used.has(recommendCarKey(c)); });
        }
        if (!fillB) break;
        chosen.push(fillB);
        used.add(recommendCarKey(fillB));
      }

      /* 若第 3、4 辆同品牌，优先换成与 refAnchor 仍异牌的另一候选 */
      if (chosen.length === 4 && chosen[2].brand === chosen[3].brand && refAnchor) {
        var drop2 = chosen.pop();
        used.delete(recommendCarKey(drop2));
        var repl2 = fullCatalog
          .filter(function (c) {
            return (
              !used.has(recommendCarKey(c)) &&
              c.brand !== chosen[2].brand &&
              c.brand !== refAnchor.brand
            );
          })
          .sort(function (a, b) {
            return (
              Math.abs(a.price - refAnchor.price) - Math.abs(b.price - refAnchor.price)
            );
          })[0];
        if (repl2) {
          chosen.push(repl2);
          used.add(recommendCarKey(repl2));
        } else {
          chosen.push(drop2);
          used.add(recommendCarKey(drop2));
        }
      }

      chosen = chosen.slice(0, 4);
      renderRecommendChosen(grid, chosen);
    };

    /* 新用户：未登录 → 昨日全站点击前 4（视图）；无 API 则回退原「价差」推荐 */
    if (!member || !String(member).trim()) {
      fullCatalog.forEach(function (c) { c.clicks = 0; });
      loadYesterdayTopThen(finish);
      return;
    }

    if (!apiOriginRecommend()) {
      fullCatalog.forEach(function (c) { c.clicks = 0; });
      finish();
      return;
    }

    var m = String(member).trim();

    Promise.all([
      postRec('/api/member-vehicle-clicks-summary', { member: m }),
      postRec('/api/member-max-click-car', { member: m })
    ]).then(function (pair) {
      var oSum = pair[0];
      var oView = pair[1];
      var rows =
        oSum.res.ok && oSum.j && oSum.j.ok && Array.isArray(oSum.j.rows) ? oSum.j.rows : [];
      var cn = '';
      if (oView.res.ok && oView.j && oView.j.ok && oView.j.car_name != null) {
        cn = String(oView.j.car_name).trim();
      }
      var hasPersonalData = (cn && cn.length > 0) || (rows && rows.length > 0);
      /* 已登录但库中无个人点击：与未登录相同，用昨日全站排行 */
      if (!hasPersonalData) {
        fullCatalog.forEach(function (c) { c.clicks = 0; });
        viewTopCarRaw = '';
        loadYesterdayTopThen(finish);
        return;
      }
      mergeRowsIntoCatalogClicks(fullCatalog, rows);
      viewTopCarRaw = cn;
      if (cn) applyViewTopCarBoost(fullCatalog, cn);
      finish();
    });
  }

  /** 分类为「全部」时：折叠区为「全部」+ 前 10 个品牌，第 11 个起算「...」之后 */
  function isBrandAfterEllipsisInDefaultMode(brandName) {
    if (!brandName || brandName === 'all') return false;
    const idx = INITIAL_BRAND_ORDER.indexOf(brandName);
    if (idx === -1) return false;
    return idx >= 10;
  }

  function refreshBrandLayout(availableBrands) {
    const container = brandFilterButtons;
    if (!container || !expandBrandBtn) return;

    const wasCategoryMode = container.classList.contains('brand-filter--category-mode');
    const allBtn = container.querySelector('[data-brand="all"]');
    if (!allBtn) return;

    if (state.category === 'all') {
      if (wasCategoryMode) {
        container.classList.remove('brand-filter--category-mode');
        container.querySelectorAll('.filter-btn[data-brand].is-overflow-hidden').forEach((el) => {
          el.classList.remove('is-overflow-hidden');
        });
        if (initialBrandOrderChildren.length) {
          initialBrandOrderChildren.forEach((child) => container.appendChild(child));
        }
      }
      expandBrandBtn.style.display = '';
      // 选了「...」之后的品牌则保持全部展开，直到改选「...」之前的品牌或「全部」
      if (isBrandAfterEllipsisInDefaultMode(state.brand)) {
        container.classList.add('brand-expanded');
        if (sidebar) sidebar.classList.add('brand-expanded-scroll');
      } else {
        container.classList.remove('brand-expanded');
        if (sidebar) sidebar.classList.remove('brand-expanded-scroll');
      }
      return;
    }

    container.classList.add('brand-filter--category-mode');

    container.querySelectorAll('.filter-btn[data-brand].is-overflow-hidden').forEach((el) => {
      el.classList.remove('is-overflow-hidden');
    });

    const visibleSorted = INITIAL_BRAND_ORDER.filter((b) => availableBrands.has(b))
      .map((name) => Array.from(brandBtns).find((btn) => btn.dataset.brand === name))
      .filter(Boolean);

    const maxBrandsBeforeEllipsis = 10;
    const visibleNames = visibleSorted.map((el) => el.dataset.brand);
    const hasOverflow = visibleSorted.length > maxBrandsBeforeEllipsis;
    let selectedIdx = -1;
    if (state.brand && state.brand !== 'all') {
      selectedIdx = visibleNames.indexOf(state.brand);
    }
    const keepExpanded =
      hasOverflow && selectedIdx >= maxBrandsBeforeEllipsis;

    if (keepExpanded) {
      container.classList.add('brand-expanded');
      if (sidebar) sidebar.classList.add('brand-expanded-scroll');
    } else {
      container.classList.remove('brand-expanded');
      if (sidebar) sidebar.classList.remove('brand-expanded-scroll');
    }

    container.appendChild(allBtn);
    const placed = new Set([allBtn]);

    if (hasOverflow && keepExpanded) {
      visibleSorted.forEach((el) => {
        container.appendChild(el);
        placed.add(el);
      });
      expandBrandBtn.style.display = '';
      container.appendChild(expandBrandBtn);
      placed.add(expandBrandBtn);
    } else if (hasOverflow) {
      const showBrands = visibleSorted.slice(0, maxBrandsBeforeEllipsis);
      const overflowBrands = visibleSorted.slice(maxBrandsBeforeEllipsis);
      showBrands.forEach((el) => {
        container.appendChild(el);
        placed.add(el);
      });
      expandBrandBtn.style.display = '';
      container.appendChild(expandBrandBtn);
      placed.add(expandBrandBtn);
      overflowBrands.forEach((el) => {
        el.classList.add('is-overflow-hidden');
        container.appendChild(el);
        placed.add(el);
      });
    } else {
      expandBrandBtn.style.display = 'none';
      visibleSorted.forEach((el) => {
        container.appendChild(el);
        placed.add(el);
      });
      container.appendChild(expandBrandBtn);
      placed.add(expandBrandBtn);
    }

    brandBtns.forEach((btn) => {
      const br = btn.dataset.brand;
      if (br === 'all' || placed.has(btn)) return;
      container.appendChild(btn);
    });
  }

  function refreshCategoryLayout(availableCategories) {
    const container = categoryFilterButtons;
    if (!container) return;

    const wasBrandMode = container.classList.contains('category-filter--brand-mode');
    const allBtn = container.querySelector('[data-category="all"]');
    if (!allBtn) return;

    if (state.brand === 'all') {
      if (wasBrandMode) {
        container.classList.remove('category-filter--brand-mode');
        if (initialCategoryOrderChildren.length) {
          initialCategoryOrderChildren.forEach((child) => container.appendChild(child));
        }
      }
      return;
    }

    container.classList.add('category-filter--brand-mode');

    const visibleSorted = INITIAL_CATEGORY_ORDER.filter((c) => availableCategories.has(c))
      .map((name) => Array.from(categoryBtns).find((btn) => btn.dataset.category === name))
      .filter(Boolean);

    container.appendChild(allBtn);
    const placed = new Set([allBtn]);

    visibleSorted.forEach((el) => {
      container.appendChild(el);
      placed.add(el);
    });

    categoryBtns.forEach((btn) => {
      const cat = btn.dataset.category;
      if (cat === 'all' || placed.has(btn)) return;
      container.appendChild(btn);
    });
  }

  function refreshCars() {
    let visibleCount = 0;
    
    // --- 品牌与分类联动逻辑 ---
    let availableBrands = new Set();
    let availableCategories = new Set();
    
    // 遍历所有车辆，统计在当前对方过滤条件下的可用品牌和分类
    // 注意：不再受价格、场景、搜索框限制，只受彼此限制，这样标签不会莫名消失
    getCarLinks().forEach(link => {
      const category = getCardCategory(link) || '无';
      const brand = getCardBrand(link);
      
      // 如果当前品牌符合（或未选品牌），则该分类可用
      if (state.brand === 'all' || brand === state.brand) {
        availableCategories.add(category);
      }
      // 如果当前分类符合（或未选分类），则该品牌可用
      if (state.category === 'all' || category === state.category) {
        if (brand) availableBrands.add(brand);
      }
    });

    // 更新分类按钮显示状态
    categoryBtns.forEach(btn => {
      const cat = btn.dataset.category;
      if (cat === 'all') return;
      if (state.brand === 'all' || availableCategories.has(cat)) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    refreshCategoryLayout(availableCategories);

    // 更新品牌按钮显示状态
    brandBtns.forEach((btn) => {
      const br = btn.dataset.brand;
      if (br === 'all') return;
      if (state.category === 'all' || availableBrands.has(br)) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    refreshBrandLayout(availableBrands);
    // --- 联动逻辑结束 ---

    
    // 今日推荐 / 即将上新：无搜索词，且场景/分类/品牌均为「全部」，且价格为全站区间时显示；一旦有搜索内容则整块隐藏（PC/平板/移动一致）
    const recommendSection = document.getElementById('recommendSection');
    const comingSoonSection = document.getElementById('comingSoonSection');
    const searchInputForSpotlight = document.getElementById('carSearchInput');
    const searchIsEmpty =
      !searchInputForSpotlight || String(searchInputForSpotlight.value || '').trim() === '';
    const priceIsFullRange =
      Number(state.priceMin) === Number(globalMinPrice) &&
      Number(state.priceMax) === Number(globalMaxPrice);
    const showSpotlightBlocks =
      searchIsEmpty &&
      state.scenario === 'all' &&
      state.category === 'all' &&
      state.brand === 'all' &&
      priceIsFullRange;
    if (recommendSection) {
      recommendSection.style.display = showSpotlightBlocks ? '' : 'none';
    }
    if (comingSoonSection) {
      comingSoonSection.style.display = showSpotlightBlocks ? '' : 'none';
    }

    getBrandSections().forEach(section => {
      const links = section.querySelectorAll('.car-card-link');
      let sectionVisibleCount = 0;
      
      links.forEach(link => {
        if (matchesFilter(link)) {
          link.style.display = '';
          sectionVisibleCount++;
          visibleCount++;
        } else {
          link.style.display = 'none';
        }
      });
      
      if (sectionVisibleCount === 0) {
        section.style.display = 'none';
      } else {
        section.style.display = '';
      }
    });
    
    if (resultCount) {
      // 兼容旧版和新版 HTML 结构
      const countSpan = document.getElementById('resultCount');
      if (countSpan) {
        countSpan.textContent = visibleCount;
      } else {
        resultCount.textContent = `已为您筛选出 ${visibleCount} 种车型`;
      }
    }
  }

  // 搜索框
  const carSearchInput = document.getElementById('carSearchInput');
  if (carSearchInput) {
    carSearchInput.addEventListener('input', () => {
      refreshCars();
    });
  }

  loadCatalogThenInit();

  var checklistBtn = document.getElementById('carChecklistBtn');
  var checklistPanel = document.getElementById('carChecklistPanel');
  var checklistCloseBtn = document.getElementById('carChecklistCloseBtn');
  var checklistClearBtn = document.getElementById('carChecklistClearBtn');
  var checklistSendBtn = document.getElementById('carChecklistSendBtn');
  var phoneModal = document.getElementById('wecomPhoneModal');
  var phoneInput = document.getElementById('wecomPhoneInput');
  var phoneError = document.getElementById('wecomPhoneError');
  var phoneCancelBtn = document.getElementById('wecomPhoneCancelBtn');
  var phoneSubmitBtn = document.getElementById('wecomPhoneSubmitBtn');
  var successModal = document.getElementById('wecomSuccessModal');
  var successOkBtn = document.getElementById('wecomSuccessOkBtn');
  var failModal = document.getElementById('wecomFailModal');
  var failOkBtn = document.getElementById('wecomFailOkBtn');
  syncChecklistButtonCount(readChecklistMap());
  renderChecklistPanel(readChecklistMap());
  syncCardChecklistToggleStates(readChecklistMap());

  if (checklistBtn && checklistPanel) {
    checklistBtn.addEventListener('click', function () {
      var hidden = checklistPanel.hasAttribute('hidden');
      if (hidden) checklistPanel.removeAttribute('hidden');
      else checklistPanel.setAttribute('hidden', '');
    });
  }
  if (checklistCloseBtn && checklistPanel) {
    checklistCloseBtn.addEventListener('click', function () {
      checklistPanel.setAttribute('hidden', '');
    });
  }
  if (checklistSendBtn) {
    checklistSendBtn.addEventListener('click', function () {
      if (phoneModal) {
        phoneModal.hidden = false;
        if (phoneInput) {
          phoneInput.value = '';
          phoneInput.focus();
        }
        if (phoneError) phoneError.hidden = true;
      } else {
        sendChecklistToWecom('');
      }
    });
  }
  if (checklistClearBtn) {
    checklistClearBtn.addEventListener('click', function () {
      writeChecklistMap({});
      syncChecklistButtonCount({});
      syncCardChecklistToggleStates({});
      renderChecklistPanel({});
    });
  }
  if (phoneCancelBtn && phoneModal) {
    phoneCancelBtn.addEventListener('click', function () {
      phoneModal.hidden = true;
    });
  }
  if (phoneSubmitBtn && phoneModal) {
    phoneSubmitBtn.addEventListener('click', function () {
      var phone = phoneInput ? String(phoneInput.value || '').replace(/\s+/g, '') : '';
      if (!/^1\d{10}$/.test(phone)) {
        if (phoneError) phoneError.hidden = false;
        return;
      }
      if (phoneError) phoneError.hidden = true;
      phoneModal.hidden = true;
      sendChecklistToWecom(phone);
    });
  }
  if (phoneInput && phoneError) {
    phoneInput.addEventListener('input', function () {
      var phone = String(phoneInput.value || '').replace(/\s+/g, '');
      phoneError.hidden = /^1\d{10}$/.test(phone);
    });
  }
  window.showWecomSuccessModal = function () {
    if (successModal) successModal.hidden = false;
  };
  window.showWecomFailModal = function () {
    if (failModal) failModal.hidden = false;
  };
  if (successOkBtn && successModal) {
    successOkBtn.addEventListener('click', function () {
      successModal.hidden = true;
    });
  }
  if (failOkBtn && failModal) {
    failOkBtn.addEventListener('click', function () {
      failModal.hidden = true;
    });
  }

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest && e.target.closest('.car-checklist-toggle');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      var carId = String(toggle.getAttribute('data-car-id') || '').trim();
      var carName = String(toggle.getAttribute('data-car-name') || '').trim();
      var modelName = String(toggle.getAttribute('data-model-name') || '').trim();
      var rentPrice = String(toggle.getAttribute('data-rent-price') || '0').trim();
      toggleChecklistCar({
        car_id: carId || carName,
        car_name: carName,
        model_name: modelName || carName,
      }, rentPrice);
      return;
    }
    var removeBtn = e.target.closest && e.target.closest('[data-remove-car-id]');
    if (removeBtn) {
      e.preventDefault();
      var id = String(removeBtn.getAttribute('data-remove-car-id') || '').trim();
      if (!id) return;
      var map = readChecklistMap();
      if (map[id]) {
        delete map[id];
        writeChecklistMap(map);
        syncChecklistButtonCount(map);
        syncCardChecklistToggleStates(map);
        renderChecklistPanel(map);
      }
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-phone-cancel') === '1' && phoneModal) {
      phoneModal.hidden = true;
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    var toggle = e.target.closest && e.target.closest('.car-checklist-toggle');
    if (!toggle) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle.click();
  });

  const backToCarsBtn = document.getElementById('backToCarsBtn');
  const heroEl = document.querySelector('.hero');

  function syncBackToCarsFromHero() {
    if (!backToCarsBtn || !heroEl) return;
    var r = heroEl.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // Hero 仍占住大半屏 = 还在首屏，隐藏按钮；滚过 Hero 后显示（不依赖 window.scrollY，避免 html/body 高度与滚动条样式问题）
    var atHero = r.bottom > vh * 0.35 && r.top < vh * 0.85;
    backToCarsBtn.classList.toggle('is-at-hero', atHero);
    if (atHero) {
      backToCarsBtn.setAttribute('aria-hidden', 'true');
    } else {
      backToCarsBtn.removeAttribute('aria-hidden');
    }
  }

  if (backToCarsBtn && carGridEl) {
    backToCarsBtn.addEventListener('click', function() {
      scrollToCarSectionTop();
    });
  }

  if (backToCarsBtn && heroEl) {
    syncBackToCarsFromHero();
    window.addEventListener('scroll', syncBackToCarsFromHero, { passive: true, capture: true });
    document.addEventListener('scroll', syncBackToCarsFromHero, { passive: true, capture: true });
    window.addEventListener('resize', syncBackToCarsFromHero, { passive: true });
    if (typeof IntersectionObserver !== 'undefined') {
      var heroIo = new IntersectionObserver(
        function() {
          syncBackToCarsFromHero();
        },
        { root: null, threshold: [0, 0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '0px' }
      );
      heroIo.observe(heroEl);
    }
    requestAnimationFrame(function() {
      requestAnimationFrame(syncBackToCarsFromHero);
    });
    setTimeout(syncBackToCarsFromHero, 0);
    setTimeout(syncBackToCarsFromHero, 300);
  }

  // 选车页：列表在 #carSection 内滚动，侧栏样式依赖 body.car-section-active（移动端抽屉等）
  var carSectionEl = document.getElementById('carSection');
  if (carSectionEl) {
    document.body.classList.add('car-section-active');
  }
});

// 开屏动画控制
(function() {
  var splashScreen = document.getElementById('splashScreen');
  if (!splashScreen) return;

  // 检查是否是从详情页返回的
  var referrer = document.referrer || '';
  var isFromCarDetail = referrer.indexOf('/carpark/') !== -1 && referrer.indexOf('car.html') !== -1;

  // 从服务页、关于页进入选车页不播放开屏（与站内导航一致）
  var refLower = referrer.toLowerCase();
  var isFromServicesOrAbout =
    refLower.indexOf('services.html') !== -1 || refLower.indexOf('about.html') !== -1;
  
  var navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var isReload = navigation && navigation.type === 'reload';
  var isBackForward = navigation && navigation.type === 'back_forward';

  // 检查是否已经显示过开屏动画（本次会话）
  var hasShownSplash = sessionStorage.getItem('mango_splash_shown');

  // 浏览器刷新：在选车页也要重新播放开屏（reload 时不走下方跳过逻辑）
  var shouldSkipSplash =
    !isReload &&
    (isFromCarDetail ||
      isFromServicesOrAbout ||
      (isBackForward && hasShownSplash === 'true'));

  if (shouldSkipSplash) {
    splashScreen.classList.add('splash-hidden');
    if (splashScreen.parentNode) {
      splashScreen.parentNode.removeChild(splashScreen);
    }
    return;
  }

  // 显示动画并标记为已显示
  sessionStorage.setItem('mango_splash_shown', 'true');

  // 首次冷缓存时，mask 高光层可能先以矩形渲染；资源就绪后再显示高光层，避免“logo边框感”。
  (function markSplashMaskReady() {
    if (!splashScreen) return;
    var src = 'media-webp/photos/index/logo/logo2.webp';
    var probe = new Image();
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      splashScreen.classList.add('splash-mask-ready');
    }
    probe.onload = finish;
    probe.onerror = finish;
    probe.src = src;
    if (probe.complete) finish();
    window.setTimeout(finish, 220);
  })();

  // 防止页面滚动
  document.body.style.overflow = 'hidden';

  // 4.5秒后移除开屏动画并恢复滚动
  setTimeout(function() {
    splashScreen.classList.add('splash-hidden');
    document.body.style.overflow = '';
    
    // 完全移除DOM元素
    setTimeout(function() {
      if (splashScreen && splashScreen.parentNode) {
        splashScreen.parentNode.removeChild(splashScreen);
      }
    }, 800);
  }, 4500);
})();
