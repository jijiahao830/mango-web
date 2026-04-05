document.addEventListener('DOMContentLoaded', function() {
  const CAR_FILTER_STORAGE_KEY = 'mangoCarFilterState';
  const CAR_FILTER_OWNER_KEY = 'mango_filter_saved_for_driver';

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
    if (!carGridEl) return;
    carGridEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  if (expandBrandBtn && brandFilterButtons) {
    expandBrandBtn.addEventListener('click', () => {
      brandFilterButtons.classList.add('brand-expanded');
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
    if (brandFilterButtons) brandFilterButtons.classList.remove('brand-expanded');
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

  /** 选车卡片封面：与详情页一致，使用该车型 carpark 目录下素材；有 webp 时浏览器优先用 source，缺失则仅用 jpg */
  function coverUrlsForCar(carName) {
    var base = './carpark/' + encodeURIComponent(String(carName || '').trim()) + '/';
    return { webp: base + '封面.webp', jpg: base + '封面.jpg' };
  }

  function categoryBadgeClass(cat) {
    var c = String(cat || '');
    var m = {
      行政级轿车: 'exec-badge',
      豪华SUV: 'luxsuv-badge',
      豪华suv: 'luxsuv-badge',
      超跑: 'perf-badge',
      性能车: 'perf-badge',
      新能源: 'ev-badge',
      商务车: 'biz-badge',
      轿车: 'sedan-badge',
      越野车: 'off-badge',
      皮卡: 'suv-badge',
      即将上新: 'biz-badge',
    };
    return m[c] || 'car-badge-inline';
  }

  function formatPriceYuan(n) {
    var x = parseInt(String(n), 10);
    if (isNaN(x)) return '¥0';
    return '¥' + x.toLocaleString('zh-CN');
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
    var href = './carpark/' + encodeURIComponent(car.car_name) + '/car.html';
    var cov = coverUrlsForCar(car.car_name);
    var cat = escHtml(car.category);
    var name = escHtml(car.car_name);
    var badge = categoryBadgeClass(car.category);
    var priceHtml = opts.comingSoon
      ? '¥???<span class="car-price-unit">/天</span>'
      : formatPriceYuan(car.rent_price) + '<span class="car-price-unit">/天</span>';
    var meta = escHtml(cardMetaLine(car));
    return (
      '<a class="car-card-link" href="' +
      escHtml(href) +
      '">' +
      '<div class="car-card" data-category="' +
      cat +
      '">' +
      '<picture><source srcset="' +
      escHtml(cov.webp) +
      '" type="image/webp">' +
      '<img class="car-image car-image-photo" src="' +
      escHtml(cov.jpg) +
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
  }

  function loadCatalogThenInit() {
    var url = apiCatalogBase() + '/api/cars-catalog';
    Promise.all([
      fetchCardTaglines(),
      fetch(url, { credentials: 'omit' }).then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      }),
    ])
      .then(function (arr) {
        var o = arr[1];
        if (!o.ok || !o.j || !o.j.ok || !Array.isArray(o.j.cars)) {
          throw new Error('cars-catalog failed');
        }
        applyCarsCatalog(o.j.cars);
        initPrices();
        refreshCars();
        refreshTodayRecommend();
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
    
    refreshCars();
    scrollToCarSectionTop();
  });


  function getCardCategory(cardLink) {
    const inner = cardLink.querySelector('.car-card');
    return inner ? inner.dataset.category : undefined;
  }
  
  function getCardPrice(cardLink) {
    const priceText = cardLink.querySelector('.car-price').textContent;
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
      } else {
        container.classList.remove('brand-expanded');
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
    } else {
      container.classList.remove('brand-expanded');
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

    
    // 今日推荐 / 即将上新：场景、分类、品牌均为「全部」，且价格区间为全站最小～最大（未做价格筛选）时显示；搜索仍只过滤下方品牌区卡片
    const recommendSection = document.getElementById('recommendSection');
    const comingSoonSection = document.getElementById('comingSoonSection');
    const priceIsFullRange =
      Number(state.priceMin) === Number(globalMinPrice) &&
      Number(state.priceMax) === Number(globalMaxPrice);
    const showSpotlightBlocks =
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

  // 选车区（#carSection）：滚入时 body.car-section-active 侧栏 sticky；上滑离开则移除
  var carSectionEl = document.getElementById('carSection');
  function syncCarSectionSticky() {
    if (!carSectionEl) return;
    var header = document.querySelector('.site-header');
    var headerH = header ? header.getBoundingClientRect().height : 72;
    var top = carSectionEl.getBoundingClientRect().top;
    var active = top <= headerH + 4;
    document.body.classList.toggle('car-section-active', active);
  }
  syncCarSectionSticky();
  window.addEventListener('scroll', syncCarSectionSticky, { passive: true, capture: true });
  document.addEventListener('scroll', syncCarSectionSticky, { passive: true, capture: true });
  window.addEventListener('resize', syncCarSectionSticky, { passive: true });
  if (typeof IntersectionObserver !== 'undefined' && carSectionEl) {
    var carSectionIo = new IntersectionObserver(
      function() {
        syncCarSectionSticky();
      },
      { root: null, threshold: [0, 0.01, 0.05, 0.1, 0.5, 1], rootMargin: '0px' }
    );
    carSectionIo.observe(carSectionEl);
  }
  requestAnimationFrame(function() {
    requestAnimationFrame(syncCarSectionSticky);
  });
});
