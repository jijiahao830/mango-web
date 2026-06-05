/* file:// 预览时地址栏常丢 query，从详情页写入的 session 拼回（仅当是「回选车区」场景） */
(function () {
  try {
    if (String(location.protocol || '').replace(':', '') !== 'file') return;
    var qs = sessionStorage.getItem('m2HomeReturnQs');
    if (!qs) return;
    var rawHash = String(location.hash || '').replace(/^#/, '');
    try {
      rawHash = decodeURIComponent(rawHash).trim();
    } catch (e) {}
    var amp0 = rawHash.indexOf('&');
    if (amp0 !== -1) rawHash = rawHash.slice(0, amp0).trim();
    rawHash = rawHash.replace(/--m2ns$/i, '').trim();
    var hashChooser = /^m2chooser$/i.test(rawHash);
    var st = String(sessionStorage.getItem('m2HomeScrollTarget') || '').trim();
    if (!hashChooser && st !== 'm2Chooser') return;
    var hasSearch = !!(location.search && location.search.length > 1);
    if (hasSearch) return;
    var base = String(location.href || '').split('#')[0].split('?')[0];
    var hash = location.hash || '';
    history.replaceState(null, '', base + '?' + qs + hash);
    sessionStorage.removeItem('m2HomeReturnQs');
  } catch (e) {}
})();

(function () {
  var categoryRoot = document.getElementById('m2CategoryTabs');
  var brandRoot = document.getElementById('m2BrandTabs');
  var titleEl = document.getElementById('m2ChooserCarTitle');
  var bgImageEl = document.getElementById('m2ChooserBannerImage');
  var prevBtn = document.getElementById('m2BannerPrev');
  var nextBtn = document.getElementById('m2BannerNext');
  var detailBtn = document.getElementById('m2DetailBtn');

  if (!categoryRoot || !brandRoot || !titleEl || !bgImageEl) return;

  var catalogCars = [];
  var activeCategory = '';
  var activeBrand = '';
  var activeCarIndex = 0;
  var activeSearch = '';
  var incomingState = (function () {
    var q = new URLSearchParams(location.search || '');
    var has = q.has('cat') || q.has('brand') || q.has('search') || q.has('carIndex');
    var idxRaw = q.get('carIndex');
    var idx = idxRaw == null ? null : parseInt(String(idxRaw), 10);
    return {
      hasAny: has,
      cat: String(q.get('cat') || '').trim(),
      brand: String(q.get('brand') || '').trim(),
      search: String(q.get('search') || '').trim(),
      carIndex: isFinite(idx) && idx >= 0 ? idx : null,
    };
  })();

  /* 套餐返回、车辆详情返回带选车参数、或 hash 为选车区时：勿对标签 scrollIntoView(smooth)，否则会抢走 .m2-home 的纵向滚动 */
  function shouldDeferChooserTabScroll() {
    if (incomingState.hasAny) return true;
    try {
      if (window.m2HomeHashIsChooser && window.m2HomeHashIsChooser()) return true;
    } catch (e) {}
    try {
      if (String(sessionStorage.getItem('m2HomeScrollTarget') || '').trim() === 'm2Chooser') return true;
    } catch (e) {}
    try {
      var q = new URLSearchParams(location.search || '');
      if (String(q.get('pkg') || '').trim()) return true;
    } catch (e) {}
    try {
      return !!String(sessionStorage.getItem('m2PkgKey') || '').trim();
    } catch (e) {
      return false;
    }
  }

  /**
   * 仅横向居中当前标签；勿用 scrollIntoView（smooth + block），否则 WebKit 常连带滚动外层 .m2-home，造成首屏/刷新时先下移再弹回。
   */
  function scrollChooserTabRowToActive(scrollRow, activeEl) {
    if (!scrollRow || !activeEl) return;
    try {
      var rr = scrollRow.getBoundingClientRect();
      var er = activeEl.getBoundingClientRect();
      var centerRow = rr.left + rr.width / 2;
      var centerEl = er.left + er.width / 2;
      scrollRow.scrollLeft = Math.round(scrollRow.scrollLeft + (centerEl - centerRow));
    } catch (e) {}
  }

  /** 分类栏总宽度不超过容器时单行居中；超出则左对齐可横向滑动 */
  function syncCategoryTabsFitCenter() {
    if (!categoryRoot) return;
    try {
      var slack = 2;
      var fits = categoryRoot.scrollWidth <= categoryRoot.clientWidth + slack;
      categoryRoot.classList.toggle('m2-chooser__tabs--fits-row', fits);
      if (fits) categoryRoot.scrollLeft = 0;
    } catch (e) {}
  }

  function syncCategoryTabsScrollActive() {
    if (!categoryRoot) return;
    try {
      if (categoryRoot.classList.contains('m2-chooser__tabs--fits-row')) return;
      var activeBtn = categoryRoot.querySelector('.is-active');
      if (activeBtn && !shouldDeferChooserTabScroll()) {
        scrollChooserTabRowToActive(categoryRoot, activeBtn);
      }
    } catch (e) {}
  }

  function scheduleCategoryTabsLayoutSync() {
    syncCategoryTabsFitCenter();
    syncCategoryTabsScrollActive();
    try {
      requestAnimationFrame(function () {
        syncCategoryTabsFitCenter();
        syncCategoryTabsScrollActive();
      });
    } catch (e) {}
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          syncCategoryTabsFitCenter();
          syncCategoryTabsScrollActive();
        });
      }
    } catch (e2) {}
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

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

  function uniqueSorted(values) {
    var m = Object.create(null);
    values.forEach(function (v) {
      var s = String(v || '').trim();
      if (s) m[s] = true;
    });
    return Object.keys(m).sort(function (a, b) {
      return a.localeCompare(b, 'zh-Hans-CN');
    });
  }

  function categoryDisplayText(cat) {
    return String(cat || '').trim();
  }

  function carTitleText(car) {
    var model = String((car && car.model) || '').trim();
    var name = String((car && car.car_name) || '').trim();
    return model || name || '暂无车型';
  }

  function bannerCandidatesForCar(carName) {
    var folder = encodeURIComponent(normalizeCarFolderNameForAssets(carName));
    return [
      '../media-webp/photos/carpark/' + folder + '/详情页-banner.webp',
      '../media-webp/photos/carpark/' + folder + '/封面.webp',
      '../media-webp/photos/index/m2/选车.webp',
    ];
  }

  function setChooserBgByCar(carName) {
    if (!carName) {
      bgImageEl.src = '';
      bgImageEl.style.visibility = 'hidden';
      return;
    }
    var list = bannerCandidatesForCar(carName);
    bgImageEl.dataset.fallbackList = list.join('|');
    bgImageEl.dataset.fallbackIndex = '0';
    bgImageEl.style.visibility = 'hidden';
    bgImageEl.src = list[0];
    tryRevealChooserBannerAfterSrc();
  }

  /** 自缓存 / bfcache 恢复时 WebKit 常不再触发 load，须同步判断 complete 或 decode() */
  function tryRevealChooserBannerAfterSrc() {
    try {
      if (!bgImageEl.src || bgImageEl.src.endsWith('/')) return;
      if (bgImageEl.complete && bgImageEl.naturalWidth > 0) {
        bgImageEl.style.visibility = 'visible';
        return;
      }
    } catch (e) {}
    try {
      if (typeof bgImageEl.decode === 'function') {
        bgImageEl.decode().then(
          function () {
            if (bgImageEl.src && !bgImageEl.src.endsWith('/')) {
              bgImageEl.style.visibility = 'visible';
            }
          },
          function () {}
        );
      }
    } catch (e2) {}
    requestAnimationFrame(function () {
      try {
        if (bgImageEl.complete && bgImageEl.naturalWidth > 0 && bgImageEl.src && !bgImageEl.src.endsWith('/')) {
          bgImageEl.style.visibility = 'visible';
        }
      } catch (e3) {}
    });
  }

  bgImageEl.addEventListener('load', function () {
    if (bgImageEl.src && !bgImageEl.src.endsWith('/')) {
      bgImageEl.style.visibility = 'visible';
    }
  });

  bgImageEl.addEventListener('error', function () {
    var list = String(bgImageEl.dataset.fallbackList || '').split('|').filter(Boolean);
    var idx = parseInt(String(bgImageEl.dataset.fallbackIndex || '0'), 10);
    if (!list.length || !isFinite(idx)) return;
    var next = idx + 1;
    if (next >= list.length) return;
    bgImageEl.dataset.fallbackIndex = String(next);
    bgImageEl.style.visibility = 'hidden';
    bgImageEl.src = list[next];
    tryRevealChooserBannerAfterSrc();
  });

  function filteredCars() {
    if (!activeSearch) return catalogCars;
    var q = activeSearch.toLowerCase();
    return catalogCars.filter(function (c) {
      return (String(c.car_name || '').toLowerCase().indexOf(q) !== -1) ||
             (String(c.brand || '').toLowerCase().indexOf(q) !== -1) ||
             (String(c.category || '').toLowerCase().indexOf(q) !== -1) ||
             (String(c.model || '').toLowerCase().indexOf(q) !== -1);
    });
  }

  function carsInActiveCategory() {
    return filteredCars().filter(function (c) {
      return String(c.category || '').trim() === activeCategory;
    });
  }

  function carsInActiveBrand() {
    var inCat = carsInActiveCategory();
    var cars = inCat.filter(function (c) {
      return String(c.brand || '').trim() === activeBrand;
    });
    if (String(activeCategory || '').trim() === '超跑' && String(activeBrand || '').trim() === '兰博基尼') {
      cars.sort(function (a, b) {
        var aLp750 = String(a.car_name || a.model || '').indexOf('LP750') !== -1;
        var bLp750 = String(b.car_name || b.model || '').indexOf('LP750') !== -1;
        return (bLp750 ? 1 : 0) - (aLp750 ? 1 : 0);
      });
    }
    return cars;
  }

  function renderCategories() {
    var rawCats = uniqueSorted(
      filteredCars().map(function (c) {
        return c.category;
      })
    );
    var cats = rawCats.filter(function (cat) {
      return !!categoryDisplayText(cat);
    });
    if (!cats.length) {
      categoryRoot.innerHTML = '<button type="button" class="is-active">暂无分类</button>';
      scheduleCategoryTabsLayoutSync();
      return;
    }
    if (!activeCategory || cats.indexOf(activeCategory) === -1) {
      activeCategory = cats[0];
    }
    categoryRoot.innerHTML = cats
      .map(function (cat) {
        return (
          '<button type="button" class="' +
          (cat === activeCategory ? 'is-active' : '') +
          '" data-category="' +
          escHtml(cat) +
          '">' +
          escHtml(categoryDisplayText(cat)) +
          '</button>'
        );
      })
      .join('');

    scheduleCategoryTabsLayoutSync();
  }

  function renderBrands() {
    var brands = uniqueSorted(
      carsInActiveCategory().map(function (c) {
        return c.brand;
      })
    );
    if (String(activeCategory || '').trim() === '超跑') {
      var idxLambo = brands.indexOf('兰博基尼');
      var idxAudi = brands.indexOf('奥迪');
      if (idxLambo !== -1 && idxAudi !== -1) {
        brands[idxLambo] = '奥迪';
        brands[idxAudi] = '兰博基尼';
      }
      idxLambo = brands.indexOf('兰博基尼');
      var idxAston = brands.indexOf('阿斯顿马丁');
      if (idxLambo !== -1 && idxAston !== -1) {
        brands[idxLambo] = '阿斯顿马丁';
        brands[idxAston] = '兰博基尼';
      }
    }
    if (!brands.length) {
      activeBrand = '';
      brandRoot.innerHTML = '<button type="button" class="is-active">暂无品牌</button>';
      titleEl.textContent = '暂无车型';
      setChooserBgByCar('');
      return;
    }
    if (!activeBrand || brands.indexOf(activeBrand) === -1) {
      activeBrand = brands[0];
    }
    brandRoot.innerHTML = brands
      .map(function (brand) {
        return (
          '<button type="button" class="' +
          (brand === activeBrand ? 'is-active' : '') +
          '" data-brand="' +
          escHtml(brand) +
          '">' +
          escHtml(brand) +
          '</button>'
        );
      })
      .join('');

    var activeBrandBtn = brandRoot.querySelector('.is-active');
    if (activeBrandBtn && !shouldDeferChooserTabScroll()) {
      scrollChooserTabRowToActive(brandRoot, activeBrandBtn);
    }

    activeCarIndex = 0;
    applyActiveCar();
  }

  function updateBannerArrows(idx, total) {
    if (!prevBtn || !nextBtn) return;
    if (total <= 1) {
      prevBtn.classList.add('is-hidden');
      nextBtn.classList.add('is-hidden');
      return;
    }
    prevBtn.classList.toggle('is-hidden', idx <= 0);
    nextBtn.classList.toggle('is-hidden', idx >= total - 1);
  }

  var SLIDE_MS = 360;
  var IMG_SLIDE_CLASSES = [
    'is-slide-out-left',
    'is-slide-out-right',
    'is-slide-in-from-right',
    'is-slide-in-from-left',
  ];
  var bannerSlideTimer = null;

  /**
   * 车型名必须同步写入 DOM。原先用 setTimeout + opacity 淡出再改文案，快速切车时定时器与 rAF 竞态，
   * WebKit 易出现上一名称与当前名称叠画。
   */
  function updateChooserTitle(car) {
    titleEl.classList.remove('is-fading');
    titleEl.textContent = car ? carTitleText(car) : '暂无车型';
    try {
      void titleEl.offsetHeight;
    } catch (e) {}
  }

  function clearBannerSlideClasses() {
    for (var i = 0; i < IMG_SLIDE_CLASSES.length; i++) {
      bgImageEl.classList.remove(IMG_SLIDE_CLASSES[i]);
    }
  }

  function cancelBannerSlide() {
    if (bannerSlideTimer) {
      clearTimeout(bannerSlideTimer);
      bannerSlideTimer = null;
    }
    clearBannerSlideClasses();
  }

  function slideBanner(carName, direction) {
    cancelBannerSlide();
    var outClass = direction === 'next' ? 'is-slide-out-left' : 'is-slide-out-right';
    var inClass = direction === 'next' ? 'is-slide-in-from-right' : 'is-slide-in-from-left';
    bgImageEl.classList.add(outClass);
    bannerSlideTimer = setTimeout(function () {
      bannerSlideTimer = null;
      bgImageEl.classList.remove(outClass);
      bgImageEl.classList.add(inClass);
      setChooserBgByCar(carName);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bgImageEl.classList.remove(inClass);
        });
      });
    }, SLIDE_MS);
  }

  /** 与详情页链接、浏览器返回恢复共用（须写入当前 history 条目，否则返回时 query 丢失） */
  function buildChooserQueryParams() {
    var ret = new URLSearchParams();
    if (activeCategory) ret.set('cat', activeCategory);
    if (activeBrand) ret.set('brand', activeBrand);
    if (activeSearch) ret.set('search', activeSearch);
    ret.set('carIndex', String(activeCarIndex));
    return ret;
  }

  function replaceIndexUrlWithChooserState() {
    try {
      var qs = buildChooserQueryParams().toString();
      var hash = location.hash;
      if (!hash || hash === '#') hash = '#m2Chooser';
      history.replaceState(history.state, '', location.pathname + '?' + qs + hash);
    } catch (e) {}
  }

  function applyActiveCar(direction) {
    var cars = carsInActiveBrand();
    if (!cars.length) {
      updateBannerArrows(0, 0);
      cancelBannerSlide();
      setChooserBgByCar('');
      updateChooserTitle(null);
      window.m2CurrentCar = null;
      return;
    }
    if (activeCarIndex < 0) activeCarIndex = 0;
    if (activeCarIndex >= cars.length) activeCarIndex = cars.length - 1;
    var car = cars[activeCarIndex];
    updateBannerArrows(activeCarIndex, cars.length);
    if (direction === 'next' || direction === 'prev') {
      slideBanner(car.car_name, direction);
    } else {
      cancelBannerSlide();
      setChooserBgByCar(car.car_name);
    }
    updateChooserTitle(car);
    var carName = String(car.car_name || '').trim();
    window.m2CurrentCar = {
      car_id: carName,
      car_name: carName,
      model_name: carTitleText(car),
      rent_price: parseInt(String(car.rent_price || 0), 10) || 0,
    };
    if (detailBtn) {
      var ret = buildChooserQueryParams();
      ret.set('m2from', 'm2Chooser');
      var q = ret.toString();
      var folderName = normalizeCarFolderNameForAssets(carName);
      var av = (typeof window !== 'undefined' && window.__MANGO_ASSET_VERSION__) || '';
      var pq = '';
      if (av) pq += 'v=' + av;
      if (q) pq += (pq ? '&' : '') + q;
      detailBtn.href =
        './carpark/' + encodeURIComponent(folderName) + '/car.html' + (pq ? '?' + pq : '');
    }
  }

  var pendingScrollY = null;

  function captureScrollY() {
    pendingScrollY = window.scrollY || window.pageYOffset || 0;
  }

  function lockScrollAfterRender() {
    if (pendingScrollY == null) return;
    var y = pendingScrollY;
    pendingScrollY = null;
    window.scrollTo(0, y);
    requestAnimationFrame(function () {
      window.scrollTo(0, y);
      requestAnimationFrame(function () {
        window.scrollTo(0, y);
      });
    });
  }

  function preventFocusScroll(root) {
    if (!root) return;
    root.addEventListener(
      'mousedown',
      function (e) {
        var btn = e.target.closest && e.target.closest('button');
        if (btn) {
          captureScrollY();
          e.preventDefault();
        }
      },
      true
    );
    root.addEventListener(
      'pointerdown',
      function (e) {
        var btn = e.target.closest && e.target.closest('button');
        if (btn) {
          captureScrollY();
        }
      },
      true
    );
    root.addEventListener(
      'touchstart',
      function (e) {
        var btn = e.target.closest && e.target.closest('button');
        if (btn) captureScrollY();
      },
      { capture: true, passive: true }
    );
  }

  function bindEvents() {
    preventFocusScroll(categoryRoot);
    preventFocusScroll(brandRoot);

    categoryRoot.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-category]');
      if (!btn) return;
      var next = String(btn.getAttribute('data-category') || '').trim();
      if (!next || next === activeCategory) return;
      if (pendingScrollY == null) captureScrollY();
      activeCategory = next;
      activeBrand = '';
      renderCategories();
      renderBrands();
      lockScrollAfterRender();
      replaceIndexUrlWithChooserState();
    });

    brandRoot.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-brand]');
      if (!btn) return;
      var next = String(btn.getAttribute('data-brand') || '').trim();
      if (!next || next === activeBrand) return;
      if (pendingScrollY == null) captureScrollY();
      activeBrand = next;
      renderBrands();
      lockScrollAfterRender();
      replaceIndexUrlWithChooserState();
    });

    if (prevBtn) {
      prevBtn.addEventListener('mousedown', function (e) {
        captureScrollY();
        e.preventDefault();
      });
      prevBtn.addEventListener('click', function () {
        if (activeCarIndex > 0) {
          activeCarIndex--;
          applyActiveCar('prev');
          lockScrollAfterRender();
          replaceIndexUrlWithChooserState();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('mousedown', function (e) {
        captureScrollY();
        e.preventDefault();
      });
      nextBtn.addEventListener('click', function () {
        var cars = carsInActiveBrand();
        if (activeCarIndex < cars.length - 1) {
          activeCarIndex++;
          applyActiveCar('next');
          lockScrollAfterRender();
          replaceIndexUrlWithChooserState();
        }
      });
    }

    if (detailBtn) {
      detailBtn.addEventListener('click', function () {
        try {
          sessionStorage.setItem('m2HomeScrollTarget', 'm2Chooser');
        } catch (e) {}
        replaceIndexUrlWithChooserState();
      });
    }

  }

  function apiBaseCandidates() {
    var list = [];
    function add(u) {
      u = String(u || '').replace(/\/$/, '');
      if (!u || list.indexOf(u) !== -1) return;
      list.push(u);
    }
    try {
      var sp = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
      var q = String(sp.get('m2api') || '').trim();
      if (q) add(q);
    } catch (eQ) {}
    try {
      if (typeof window !== 'undefined' && window.MANGO_API_ORIGIN) {
        add(String(window.MANGO_API_ORIGIN));
      }
    } catch (e0) {}
    var origin = String(location.origin || '').replace(/\/$/, '');
    if (origin && origin !== 'null' && origin.indexOf('file:') !== 0) {
      add(origin);
      try {
        var h = String(location.hostname || '').toLowerCase();
        if (h === 'localhost' || h === '127.0.0.1') {
          add('http://127.0.0.1:8765');
          add('http://127.0.0.1:8787');
        } else if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
          add('http://' + h + ':8765');
          add('http://' + h + ':8787');
        }
      } catch (e1) {}
    } else {
      add('https://www.mangov8.com');
      add('http://127.0.0.1:8765');
      add('http://localhost:8765');
      add('http://127.0.0.1:8787');
      add('http://localhost:8787');
    }
    add('https://www.mangov8.com');
    return list.length ? list : ['https://www.mangov8.com'];
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
    var pref = typeof window !== 'undefined' ? window.__m2PrefetchedCatalog : null;
    if (pref && Array.isArray(pref)) {
      var copy = pref.slice();
      try {
        delete window.__m2PrefetchedCatalog;
      } catch (e1) {
        try {
          window.__m2PrefetchedCatalog = null;
        } catch (e2) {}
      }
      return Promise.resolve(copy);
    }
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('all failed'));
      var base = candidates[i++];
      return fetchCatalogFrom(base).catch(next);
    }
    return next();
  }

  bindEvents();

  try {
    if (typeof ResizeObserver !== 'undefined') {
      var categoryTabsRo = new ResizeObserver(function () {
        syncCategoryTabsFitCenter();
        syncCategoryTabsScrollActive();
      });
      categoryTabsRo.observe(categoryRoot);
    }
    window.addEventListener(
      'resize',
      function () {
        syncCategoryTabsFitCenter();
        syncCategoryTabsScrollActive();
      },
      { passive: true }
    );
  } catch (e) {}

  loadCatalog()
    .then(function (cars) {
      catalogCars = cars.slice();
      if (incomingState.hasAny) {
        activeSearch = incomingState.search;
        activeCategory = incomingState.cat;
        activeBrand = incomingState.brand;
      }
      renderCategories();
      renderBrands();
      if (incomingState.hasAny && incomingState.carIndex != null) {
        activeCarIndex = incomingState.carIndex;
        applyActiveCar();
      }
      try {
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('m2-catalog-loaded'));
        }
      } catch (e) {}
    })
    .catch(function () {
      categoryRoot.innerHTML = '<button type="button" class="is-active">分类加载失败</button>';
      scheduleCategoryTabsLayoutSync();
      brandRoot.innerHTML = '<button type="button" class="is-active">品牌加载失败</button>';
      titleEl.textContent = '请先启动接口后再预览';
      setChooserBgByCar('');
      try {
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('m2-catalog-loaded'));
        }
      } catch (e) {}
    });

  /* 暴露给筛选模块 */
  window.m2Chooser = {
    getCars: function () { return catalogCars.slice(); },
    getActiveCategory: function () { return activeCategory; },
    getActiveBrand: function () { return activeBrand; },
    applyFilter: function (cat, brand, search) {
      if (pendingScrollY == null) captureScrollY();
      activeSearch = (search || '').trim();
      activeCategory = cat || '';
      activeBrand = brand || '';
      activeCarIndex = 0;
      renderCategories();
      renderBrands();
      lockScrollAfterRender();
      replaceIndexUrlWithChooserState();
    },
  };
})();

/* 首页 hash / session 与地址栏同步；仅按 hash 做一次 scrollTop 对齐（避免详情返回先闪首屏） */
(function () {
  /** 保留 API 供旧脚本调用，不再改变 main.m2-home 的 scrollTop */
  function scrollM2HomeToSectionById(id) {
    try {
      window.__m2LastHomeSection = id;
    } catch (e) {}
    return !!id;
  }

  function homeHashRaw() {
    var raw = String(location.hash || '').replace(/^#/, '');
    try {
      raw = decodeURIComponent(raw).trim();
    } catch (e) {}
    /* 详情返回：#m2Chooser&m2ns=1 或 #m2Chooser--m2ns */
    var amp = raw.indexOf('&');
    if (amp !== -1) raw = raw.slice(0, amp).trim();
    raw = raw.replace(/--m2ns$/i, '').trim();
    return raw;
  }

  /* 地址栏是否带选车恢复参数（仅用于恢复列表状态，不表示当前一定要滚到选车区） */
  function urlHasChooserRestoreParams() {
    try {
      var q = new URLSearchParams(location.search || '');
      return q.has('cat') || q.has('brand') || q.has('search') || q.has('carIndex');
    } catch (e) {
      return false;
    }
  }

  /** F5 / 刷新：滑动时写入的 #m2* 仍会留在地址栏；否则 sync 会把 .m2-home 滚回原区块 */
  function isReloadNavigation() {
    try {
      var list = performance.getEntriesByType('navigation');
      if (list && list.length && list[0].type === 'reload') return true;
    } catch (e0) {}
    try {
      if (typeof performance.navigation !== 'undefined' && performance.navigation.type === 1) {
        return true;
      }
    } catch (e1) {}
    return false;
  }

  function hashIsChooser() {
    return /^m2chooser$/i.test(homeHashRaw());
  }

  function homeHashSectionId(raw) {
    if (!raw) return '';
    if (/^m2hero$/i.test(raw)) return 'm2Hero';
    if (/^m2chooser$/i.test(raw)) return 'm2Chooser';
    if (/^m2packages$/i.test(raw)) return 'm2Packages';
    if (/^m2service$/i.test(raw)) return 'm2Service';
    if (/^m2about$/i.test(raw)) return 'm2About';
    return '';
  }

  /** 封面 DOM 仍存在但可被 CSS（如 display:none）隐藏 — 此时 #m2Hero 应对齐到选车区 */
  function m2HomeHeroLayoutVisible() {
    var el = document.getElementById('m2Hero');
    if (!el) return false;
    try {
      var st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
    } catch (e) {
      return false;
    }
    return true;
  }

  function normalizeM2HomeSectionId(id) {
    if (!id || id !== 'm2Hero') return id;
    return m2HomeHeroLayoutVisible() ? 'm2Hero' : 'm2Chooser';
  }

  function urlAnchorsConcreteM2Section(hid) {
    return (
      hid === 'm2Hero' ||
      hid === 'm2Chooser' ||
      hid === 'm2Packages' ||
      hid === 'm2Service' ||
      hid === 'm2About'
    );
  }

  /* 从关于/服务等返回时带 hash，不得再按 session 里的套餐记忆滚到套餐区 */
  function hashSkipsPkgRestore() {
    /* 选车 query 常驻时：仅在当前应落在选车区时跳过套餐恢复；若在套餐/服务/关于则仍恢复套餐卡片（如从自驾页返回） */
    if (urlHasChooserRestoreParams()) {
      var sid = normalizeM2HomeSectionId(homeHashSectionId(homeHashRaw()));
      if (sid === 'm2Packages' || sid === 'm2Service' || sid === 'm2About' || sid === 'm2Hero') return false;
      return true;
    }
    var raw = homeHashRaw();
    if (/^m2hero$/i.test(raw) || /^m2chooser$/i.test(raw) || /^m2about$/i.test(raw) || /^m2service$/i.test(raw)) return true;
    try {
      var st = String(sessionStorage.getItem('m2HomeScrollTarget') || '').trim();
      if (st === 'm2Chooser' || st === 'm2Packages' || st === 'm2About' || st === 'm2Service') return true;
    } catch (e) {}
    return false;
  }

  function clearM2HomeScrollTargetStorage() {
    try {
      sessionStorage.removeItem('m2HomeScrollTarget');
    } catch (e) {}
  }

  function consumeStorageScrollTarget() {
    try {
      var st = String(sessionStorage.getItem('m2HomeScrollTarget') || '').trim();
      if (!st) return '';
      var allowed = { m2Chooser: 1, m2Packages: 1, m2Service: 1, m2About: 1 };
      if (!allowed[st]) return '';
      sessionStorage.removeItem('m2HomeScrollTarget');
      return st;
    } catch (e) {
      return '';
    }
  }

  /**
   * 滚动发生在 main.m2-home 内，地址栏 # 不会自动滚动；对齐一次避免从详情返回先闪首屏封面。
   * 无动画、无多次定时器，仅同步 scrollTop。
   */
  function syncM2HomeScrollToHashSection() {
    var home = document.querySelector('.m2-home');
    if (!home) return;
    var idRaw = homeHashSectionId(homeHashRaw());
    if (!idRaw) return;
    var id = normalizeM2HomeSectionId(idRaw);
    if (idRaw !== id) {
      try {
        history.replaceState(null, '', location.pathname + location.search + '#' + id);
      } catch (eHash) {}
    }
    var el = document.getElementById(id);
    if (!el) return;
    try {
      var y =
        el.getBoundingClientRect().top - home.getBoundingClientRect().top + home.scrollTop;
      y = Math.max(0, Math.round(y));
      home.scrollTop = y;
    } catch (e) {}
  }

  /* IntersectionObserver 会在首帧把视口内的选车区误判为当前段，赶在 sync 对齐 #m2Service 之前把 hash 写成 #m2Chooser */
  var m2ObserverHashWritesAllowed = false;

  function scrollM2HomeFromHash() {
    if (document.body && document.body.classList.contains('m2-splash-active')) {
      window.setTimeout(scrollM2HomeFromHashWithRetries, 120);
      return;
    }
    try {
      /* 刷新仅清详情返回残留的 m2HomeScrollTarget，勿改写 #m2Service 等与地址栏一致的 hash */
      if (isReloadNavigation() && !urlHasChooserRestoreParams()) {
        clearM2HomeScrollTargetStorage();
      }
      if (urlHasChooserRestoreParams()) {
        var hr = homeHashRaw();
        var sidFromHash = homeHashSectionId(hr);
        if (sidFromHash === 'm2Packages' || sidFromHash === 'm2Service' || sidFromHash === 'm2About') {
          clearM2HomeScrollTargetStorage();
          scrollM2HomeToSectionById(sidFromHash);
          return;
        }
        if (sidFromHash === 'm2Hero') {
          clearM2HomeScrollTargetStorage();
          scrollM2HomeToSectionById('m2Hero');
          return;
        }
        if (!/^m2chooser$/i.test(hr)) {
          try {
            history.replaceState(null, '', location.pathname + location.search + '#m2Chooser');
          } catch (e) {}
        }
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2Chooser');
        return;
      }
      var raw = homeHashRaw();
      var stNav = '';
      try {
        stNav = String(sessionStorage.getItem('m2HomeScrollTarget') || '').trim();
      } catch (e) {}
      var allowedNav = { m2Chooser: 1, m2Packages: 1, m2Service: 1, m2About: 1 };
      if (stNav && allowedNav[stNav]) {
        var hid = homeHashSectionId(raw);
        if (hid !== stNav) {
          try {
            sessionStorage.removeItem('m2HomeScrollTarget');
          } catch (e2) {}
          /* URL 已为明确区块(#m2Service 等)：尊重 hash，不可用旧 session 顶掉 */
          if (!urlAnchorsConcreteM2Section(hid)) {
            try {
              history.replaceState(null, '', location.pathname + location.search + '#' + stNav);
            } catch (e3) {}
            scrollM2HomeToSectionById(stNav);
            return;
          }
        }
      }
      if (/^m2hero$/i.test(raw)) {
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2Hero');
        return;
      }
      if (/^m2chooser$/i.test(raw)) {
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2Chooser');
        return;
      }
      if (/^m2packages$/i.test(raw)) {
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2Packages');
        return;
      }
      if (/^m2service$/i.test(raw)) {
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2Service');
        return;
      }
      if (/^m2about$/i.test(raw)) {
        clearM2HomeScrollTargetStorage();
        scrollM2HomeToSectionById('m2About');
        return;
      }
      var sid = consumeStorageScrollTarget();
      if (sid) {
        try {
          history.replaceState(null, '', location.pathname + location.search + '#' + sid);
        } catch (e) {}
        scrollM2HomeToSectionById(sid);
      }
    } finally {
      m2ObserverHashWritesAllowed = false;
      syncM2HomeScrollToHashSection();
      requestAnimationFrame(function () {
        syncM2HomeScrollToHashSection();
        requestAnimationFrame(function () {
          m2ObserverHashWritesAllowed = true;
        });
      });
    }
  }

  window.m2HomeHashIsChooser = hashIsChooser;
  window.m2HomeHashSkipsPkgRestore = hashSkipsPkgRestore;
  window.m2ScrollM2HomeToSectionById = scrollM2HomeToSectionById;

  function scrollM2HomeFromHashWithRetries() {
    scrollM2HomeFromHash();
  }

  window.addEventListener('hashchange', scrollM2HomeFromHash);
  window.addEventListener('m2-catalog-loaded', scrollM2HomeFromHashWithRetries);
  window.addEventListener('m2-splash-finished', scrollM2HomeFromHashWithRetries);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrollM2HomeFromHashWithRetries);
  } else {
    scrollM2HomeFromHashWithRetries();
  }

  /* 下滑时同步 hash（replaceState 不新增历史记录），返回/刷新与当前区块一致 */
  function setupM2HomeScrollHashSync() {
    var home = document.querySelector('.m2-home');
    if (!home || typeof IntersectionObserver === 'undefined') return;
    var orderBase = ['m2Hero', 'm2Chooser', 'm2Packages', 'm2Service', 'm2About'];
    var order = [];
    for (var oi = 0; oi < orderBase.length; oi++) {
      var oid = orderBase[oi];
      if (oid === 'm2Hero' && !m2HomeHeroLayoutVisible()) continue;
      order.push(oid);
    }
    if (!order.length) order = ['m2Chooser', 'm2Packages', 'm2Service', 'm2About'];
    var ratios = Object.create(null);
    var debounceTimer = null;

    function pickAndReplace() {
      if (
        document.body &&
        document.body.classList.contains('m2-splash-active')
      ) {
        return;
      }
      if (!m2ObserverHashWritesAllowed) return;

      var bestId = '';
      var bestR = -1;
      for (var i = 0; i < order.length; i++) {
        var sid = order[i];
        var r = ratios[sid];
        if (r == null) r = 0;
        if (r > bestR) {
          bestR = r;
          bestId = sid;
        }
      }
      if (!bestId || bestR < 0.12) return;
      var want = '#' + bestId;
      if (String(location.hash || '') === want) return;
      try {
        history.replaceState(null, '', location.pathname + location.search + want);
        window.__m2LastHomeSection = bestId;
      } catch (e) {}
    }

    function schedule() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(pickAndReplace, 64);
    }

    var obs = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          var id = e.target.id;
          if (!id) continue;
          ratios[id] = e.intersectionRatio;
        }
        schedule();
      },
      { root: home, rootMargin: '0px', threshold: [0, 0.08, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1] }
    );

    for (var j = 0; j < order.length; j++) {
      var el = document.getElementById(order[j]);
      if (el) obs.observe(el);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupM2HomeScrollHashSync);
  } else {
    setupM2HomeScrollHashSync();
  }

  /* 离开首页前把当前历史条目的 hash 改成真实去向，避免系统返回仍落在滚动误记的 # */
  var m2OutgoingSectionIds = { m2Chooser: 1, m2Packages: 1, m2Service: 1, m2About: 1 };

  function m2HomeOutgoingHashForUrl(u) {
    var fn = String(u.pathname || '')
      .split('/')
      .pop();
    if (/^package-.*\.html$/i.test(fn)) return 'm2Packages';
    if (fn === 'services.html') return 'm2Service';
    if (fn === 'about.html') return 'm2About';
    if (fn === 'car.html') {
      try {
        var q = new URLSearchParams(u.search || '');
        var from = String(q.get('m2from') || 'm2Chooser').trim();
        if (m2OutgoingSectionIds[from]) return from;
      } catch (e) {}
      return 'm2Chooser';
    }
    return '';
  }

  document.addEventListener(
    'click',
    function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
      if (!document.querySelector('.m2-home')) return;
      try {
        var u = new URL(href, location.href);
        var cur = new URL(location.href);
        if (u.href.split('#')[0] === cur.href.split('#')[0]) return;
        var want = m2HomeOutgoingHashForUrl(u);
        if (!want) return;
        var nextHash = '#' + want;
        if (String(location.hash || '') === nextHash) return;
        history.replaceState(null, '', location.pathname + location.search + nextHash);
        window.__m2LastHomeSection = want;
      } catch (err) {}
    },
    true
  );
})();

/* 开屏动画（与 1.0 car.js 对齐；session 键独立，避免与 1.0 互相干扰） */
(function () {
  var splashScreen = document.getElementById('splashScreen');
  if (!splashScreen) return;

  var referrer = document.referrer || '';
  var isFromM2Detail = /\/m2\/carpark\/.+\/car\.html/i.test(referrer);
  var isFromV1Detail =
    /\/carpark\/.+\/car\.html/i.test(referrer) && referrer.indexOf('/m2/') === -1;
  var isFromCarDetail = isFromM2Detail || isFromV1Detail;

  var refLower = referrer.toLowerCase();
  var isFromPackage =
    /\/m2\/package-(business|wedding|event|drive)\.html/i.test(referrer);
  var isFromActivity = /\/m2\/activity\.html/i.test(referrer);
  var isFromServicesOrAbout =
    refLower.indexOf('services.html') !== -1 || refLower.indexOf('about.html') !== -1;

  var navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var isReload = navigation && navigation.type === 'reload';

  var hasShownSplash = sessionStorage.getItem('mango_m2_splash_shown');

  var skipSplashOnce = '';
  try {
    skipSplashOnce = String(sessionStorage.getItem('mango_m2_skip_splash_once') || '');
  } catch (e) {}

  var skipSplashEarly = false;
  try {
    skipSplashEarly = window.__m2SkipSplashEarly === true;
  } catch (eE) {}

  var skipFromDetailQuery = false;
  try {
    try {
      if (String(sessionStorage.getItem('m2_skip_next_index_splash') || '') === '1') {
        skipFromDetailQuery = true;
        sessionStorage.removeItem('m2_skip_next_index_splash');
      }
    } catch (eSs) {}
    var spSplash = new URLSearchParams(
      String(location.search || '').replace(/^\?/, '') || ''
    );
    var m2ns = String(spSplash.get('m2ns') || '').toLowerCase();
    if (m2ns === '1' || m2ns === 'true' || m2ns === 'yes') {
      skipFromDetailQuery = true;
      spSplash.delete('m2ns');
      var tail = spSplash.toString();
      var nextSearch = tail ? '?' + tail : '';
      history.replaceState(
        null,
        '',
        location.pathname + nextSearch + (location.hash || '')
      );
    }
    /* file:// 下 search 常为空；返回链接优先 #m2Chooser--m2ns，兼容旧 #m2Chooser&m2ns=1 */
    if (!skipFromDetailQuery) {
      var fh0 = String(location.hash || '').replace(/^#/, '');
      if (fh0 && /--m2ns$/i.test(fh0)) {
        skipFromDetailQuery = true;
        var cl0 = fh0.replace(/--m2ns$/i, '').trim();
        history.replaceState(
          null,
          '',
          location.pathname + (location.search || '') + '#' + cl0
        );
      }
    }
    if (!skipFromDetailQuery) {
      if (fh0 && fh0.indexOf('&') !== -1) {
        var segs = fh0.split('&');
        var hMain0 = segs[0] || '';
        var foundNs = false;
        var kept = [];
        for (var si = 1; si < segs.length; si++) {
          var seg = segs[si];
          var eq = seg.indexOf('=');
          var k = String(eq === -1 ? seg : seg.slice(0, eq))
            .trim()
            .toLowerCase();
          var v = String(eq === -1 ? '' : seg.slice(eq + 1))
            .trim()
            .toLowerCase();
          if (k === 'm2ns' && (v === '1' || v === 'true' || v === 'yes' || v === '')) {
            foundNs = true;
            continue;
          }
          kept.push(seg);
        }
        if (foundNs) {
          skipFromDetailQuery = true;
          var newH = hMain0 + (kept.length ? '&' + kept.join('&') : '');
          history.replaceState(
            null,
            '',
            location.pathname + (location.search || '') + '#' + newH
          );
        }
      }
    }
  } catch (eQ) {}

  /* 详情返回标记（hash / head / session）须跳过开屏；部分浏览器链回首页会误报 type=reload */
  var skipFromDetailNav =
    skipFromDetailQuery || skipSplashEarly || skipSplashOnce === '1';
  /* 首页进入 m2 时始终播放开屏；仅在详情返回等明确场景跳过。 */
  var isReturningWithinSession = false;
  var shouldSkipSplash =
    skipFromDetailNav ||
    (!isReload &&
      (isFromCarDetail || isFromServicesOrAbout || isFromPackage || isFromActivity || isReturningWithinSession));

  if (shouldSkipSplash) {
    try {
      var fhc = String(location.hash || '').replace(/^#/, '');
      if (/--m2ns$/i.test(fhc)) {
        history.replaceState(
          null,
          '',
          location.pathname +
            (location.search || '') +
            '#' +
            fhc.replace(/--m2ns$/i, '').trim()
        );
      }
    } catch (eC) {}
    if (skipSplashOnce === '1') {
      try {
        sessionStorage.removeItem('mango_m2_skip_splash_once');
      } catch (e2) {}
    }
    try {
      delete window.__m2SkipSplashEarly;
      if (document.documentElement) {
        document.documentElement.classList.remove('m2-splash-suppressed');
      }
    } catch (eEarlyCl) {}
    splashScreen.classList.add('splash-hidden');
    if (splashScreen.parentNode) {
      splashScreen.parentNode.removeChild(splashScreen);
    }
    try {
      window.dispatchEvent(new CustomEvent('m2-splash-finished'));
    } catch (e3) {}
    return;
  }

  sessionStorage.setItem('mango_m2_splash_shown', 'true');

  (function markSplashMaskReady() {
    if (!splashScreen) return;
    var src = '../media-webp/photos/index/logo/logo2.webp';
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

  if (document.body) document.body.classList.add('m2-splash-active');
  var homeScroll = document.querySelector('.m2-home');
  if (homeScroll) homeScroll.style.overflow = 'hidden';

  window.setTimeout(function () {
    splashScreen.classList.add('splash-hidden');
    if (document.body) document.body.classList.remove('m2-splash-active');
    if (homeScroll) homeScroll.style.overflow = '';
    try {
      window.dispatchEvent(new CustomEvent('m2-splash-finished'));
    } catch (e) {}
    window.setTimeout(function () {
      if (splashScreen && splashScreen.parentNode) {
        splashScreen.parentNode.removeChild(splashScreen);
      }
    }, 800);
  }, 2000);
})();
