document.addEventListener('DOMContentLoaded', function() {
  const scenarioBtns = document.querySelectorAll('.filter-btn[data-scenario]');
  const categoryBtns = document.querySelectorAll('.filter-btn[data-category]');
  const brandBtns = document.querySelectorAll('.filter-btn[data-brand]');
  const priceMinSlider = document.getElementById('priceMin');
  const priceMaxSlider = document.getElementById('priceMax');
  const priceMinLabel = document.getElementById('priceMinLabel');
  const priceMaxLabel = document.getElementById('priceMaxLabel');
  const resetBtn = document.getElementById('resetFilterBtn');
  const resultCount = document.querySelector('.filter-result-count');
  
  const brandSections = document.querySelectorAll('.brand-section');
  const carLinks = document.querySelectorAll('.brand-section .car-card-link');
  const sidebar = document.querySelector('.sidebar-filter');
  const carGridEl = document.getElementById('carGrid');

  const expandBrandBtn = document.getElementById('expandBrandBtn');
  const brandFilterButtons = document.getElementById('brandFilterButtons');
  const initialBrandOrderChildren = brandFilterButtons
    ? Array.from(brandFilterButtons.children)
    : [];
  const INITIAL_BRAND_ORDER = brandFilterButtons
    ? Array.from(brandFilterButtons.querySelectorAll('.filter-btn[data-brand]'))
        .filter((b) => b.dataset.brand !== 'all')
        .map((b) => b.dataset.brand)
    : [];

  const categoryFilterButtons = document.getElementById('categoryFilterButtons');
  const initialCategoryOrderChildren = categoryFilterButtons
    ? Array.from(categoryFilterButtons.children)
    : [];
  const INITIAL_CATEGORY_ORDER = categoryFilterButtons
    ? Array.from(categoryFilterButtons.querySelectorAll('.filter-btn[data-category]'))
        .filter((b) => b.dataset.category !== 'all')
        .map((b) => b.dataset.category)
    : [];

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

  // 尝试从 sessionStorage 恢复状态（login.html 登录成功时会清除，保证每位用户进车库默认「全部」）
  let savedStateRaw = sessionStorage.getItem('mangoCarFilterState');
  const currentDriver = sessionStorage.getItem('mango_driver_name') || '';
  const filterOwner = sessionStorage.getItem('mango_filter_saved_for_driver');
  if (savedStateRaw && currentDriver && filterOwner != null && filterOwner !== '' && filterOwner !== currentDriver) {
    sessionStorage.removeItem('mangoCarFilterState');
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

  // 保存状态到 sessionStorage 的辅助函数（记录当前登录用户，便于与上一用户区分）
  function saveState() {
    sessionStorage.setItem('mangoCarFilterState', JSON.stringify(state));
    var d = sessionStorage.getItem('mango_driver_name');
    if (d) {
      sessionStorage.setItem('mango_filter_saved_for_driver', d);
    }
  }

  let globalMinPrice = 0;
  let globalMaxPrice = 0;

  // Initialize prices by scanning all cars
  function initPrices() {
    let min = Infinity;
    let max = -Infinity;
    
    carLinks.forEach(link => {
      const price = getCardPrice(link);
      if (price > 0) {
        if (price < min) min = price;
        if (price > max) max = price;
      }
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

    // 如果没有保存的状态或者保存的状态不在合理范围内，才使用默认值
    if (!sessionStorage.getItem('mangoCarFilterState')) {
      state.priceMin = min;
      state.priceMax = max;
      priceMinSlider.value = min;
      priceMaxSlider.value = max;
    } else {
      // 恢复状态到 UI 上
      priceMinSlider.value = state.priceMin;
      priceMaxSlider.value = state.priceMax;
      
      // 恢复按钮状态
      const updateBtns = (btns, key, datasetAttr) => {
        btns.forEach(b => {
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
  priceMinSlider.addEventListener('change', scrollToCarSectionTop);
  priceMaxSlider.addEventListener('change', scrollToCarSectionTop);

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

  setupGroupButtons(scenarioBtns, 'scenario');
  setupGroupButtons(categoryBtns, 'category');
  setupGroupButtons(brandBtns, 'brand');

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

    // Check Price
    if (price < state.priceMin || price > state.priceMax) {
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
          if (!['商务车', '豪华轿车', '豪华suv', 'MPV'].includes(category)) return false;
          break;
        case 'wedding':
          if (!['超跑', '豪华suv', '豪华轿车'].includes(category)) return false;
          break;
        case 'event':
          if (!['超跑', '性能车'].includes(category)) return false;
          break;
        case 'self-drive':
          if (!['越野车', '新能源', '豪华suv', '豪华轿车', 'SUV'].includes(category)) return false;
          break;
      }
    }

    return true;
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
    carLinks.forEach(link => {
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

    
    // 今日推荐 / 即将上新：仅当「使用场景」「分类」「品牌」三个标签均为「全部」时显示；任一改选非「全部」则隐藏（价格、搜索仍只过滤卡片，不隐藏这两块）
    const recommendSection = document.getElementById('recommendSection');
    const comingSoonSection = document.getElementById('comingSoonSection');
    const showSpotlightBlocks =
      state.scenario === 'all' && state.category === 'all' && state.brand === 'all';
    if (recommendSection) {
      recommendSection.style.display = showSpotlightBlocks ? '' : 'none';
    }
    if (comingSoonSection) {
      comingSoonSection.style.display = showSpotlightBlocks ? '' : 'none';
    }

    brandSections.forEach(section => {
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

  // Initialize prices by scanning all cars
  initPrices();
  
  
  // 搜索框事件监听
  const carSearchInput = document.getElementById('carSearchInput');
  if (carSearchInput) {
    carSearchInput.addEventListener('input', () => {
      refreshCars();
    });
  }
  
  // Apply saved filters after initialization

  refreshCars();

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

  // Initialize slider highlight
  updatePriceSliders();
});
