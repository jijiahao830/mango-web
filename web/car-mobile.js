document.addEventListener('DOMContentLoaded', function () {
  var CAR_CHECKLIST_STORAGE_KEY = 'mangoCarChecklist';
  var MOBILE_PAGE_STATE_KEY = 'mangoMobileCarPageStateV1';
  var catalogCars = [];
  var carCardTaglines = {};
  var activeCategory = 'all';
  var sortMode = 'recommend';
  var priceMinValue = null;
  var priceMaxValue = null;
  var showVipMonthly = false;
  var pendingRestoreScrollState = null;
  var saveStateTimer = 0;

  function isPageReloadNavigation() {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'reload') return true;
    } catch (e) {}
    return false;
  }

  var isReload = isPageReloadNavigation();

  function fileNameFromPath(pathname) {
    var p = String(pathname || '');
    var arr = p.split('/');
    return String(arr.pop() || '').toLowerCase();
  }

  function isFromIndexEntry() {
    try {
      var ref = String(document.referrer || '').trim();
      if (!ref) return false;
      var u = new URL(ref, location.href);
      var f = fileNameFromPath(u.pathname);
      if (f === 'index.html') return true;
    } catch (e) {}
    return false;
  }

  var categoryColumn = document.getElementById('mobileCategoryColumn');
  var listRoot = document.getElementById('mobileListRoot');
  var searchInput = document.getElementById('carSearchInput');
  var sortTrigger = document.getElementById('mobileSortTrigger');
  var priceTrigger = document.getElementById('mobilePriceTrigger');
  var vipSwitch = document.getElementById('mobileVipSwitch');
  var sortPop = document.getElementById('mobileSortPop');
  var pricePop = document.getElementById('mobilePricePop');
  var priceMinInput = document.getElementById('mobilePriceMinInput');
  var priceMaxInput = document.getElementById('mobilePriceMaxInput');
  var priceApplyBtn = document.getElementById('mobilePriceApplyBtn');
  var priceResetBtn = document.getElementById('mobilePriceResetBtn');
  var sortMask = document.getElementById('mobileSortMask');
  var errorEl = document.getElementById('carparkCatalogError');

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

  var daysSelectModal = document.getElementById('daysSelectModal');
  var daysSelectOptions = document.getElementById('daysSelectOptions');
  var daysSelectCloseBtn = document.getElementById('daysSelectCloseBtn');
  var currentPendingCarItem = null;
  var detailNavNavigating = false;
  var detailNavLoadingMask = null;

  function isPrimaryClickEvent(e) {
    return !!e && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }

  function isDetailHref(href) {
    if (!href) return false;
    try {
      var u = new URL(href, location.href);
      var p = decodeURIComponent(String(u.pathname || '')).toLowerCase();
      return p.indexOf('/carpark/') !== -1 && /\/car\.html$/.test(p);
    } catch (e) {
      return false;
    }
  }

  function ensureDetailNavLoadingMask() {
    if (detailNavLoadingMask) return detailNavLoadingMask;
    var mask = document.createElement('div');
    mask.className = 'detail-nav-loading-mask';
    mask.innerHTML =
      '<div class="detail-nav-loading-mask__inner">' +
      '<span class="detail-nav-loading-mask__spinner" aria-hidden="true"></span>' +
      '<span class="detail-nav-loading-mask__text">页面加载中...</span>' +
      '</div>';
    document.body.appendChild(mask);
    detailNavLoadingMask = mask;
    return detailNavLoadingMask;
  }

  function openDetailNavLoadingMask() {
    var mask = ensureDetailNavLoadingMask();
    requestAnimationFrame(function () {
      mask.classList.add('is-visible');
    });
  }

  function preloadDetailDocument(url) {
    return new Promise(function (resolve) {
      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        resolve();
      }
      /* 仅给遮罩一个短暂渲染窗口，不再等待完整预加载 */
      setTimeout(done, 140);
      if (typeof fetch !== 'function') {
        return;
      }
      fetch(url, { method: 'GET', credentials: 'omit', cache: 'force-cache' })
        .then(done)
        .catch(done);
    });
  }

  function apiBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || String(location.origin || '').replace(/\/$/, '');
  }

  function readMobilePageState() {
    try {
      var raw = localStorage.getItem(MOBILE_PAGE_STATE_KEY) || '';
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : null;
    } catch (e) {
      return null;
    }
  }

  function writeMobilePageState(state) {
    try {
      localStorage.setItem(MOBILE_PAGE_STATE_KEY, JSON.stringify(state || {}));
    } catch (e) {}
  }

  function clearMobilePageStateStorage() {
    try {
      localStorage.removeItem(MOBILE_PAGE_STATE_KEY);
    } catch (e) {}
  }

  function normalizeStateMoney(v) {
    var n = parseInt(String(v), 10);
    if (!isFinite(n) || n < 0) return null;
    return n;
  }

  function normalizeStateScroll(v) {
    var n = parseInt(String(v), 10);
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function restoreMobilePageState() {
    var saved = readMobilePageState();
    if (!saved) return;
    var nextCat = String(saved.activeCategory || '').trim();
    if (nextCat) activeCategory = nextCat;

    var nextSort = String(saved.sortMode || '').trim();
    if (nextSort === 'recommend' || nextSort === 'price-asc' || nextSort === 'price-desc') {
      sortMode = nextSort;
    }

    priceMinValue = normalizeStateMoney(saved.priceMinValue);
    priceMaxValue = normalizeStateMoney(saved.priceMaxValue);
    if (priceMinValue != null && priceMaxValue != null && priceMinValue > priceMaxValue) {
      var t = priceMinValue;
      priceMinValue = priceMaxValue;
      priceMaxValue = t;
    }

    // 移动端“月租开关”已替换为“超值套餐”入口，不再恢复该开关状态
    showVipMonthly = false;
    if (searchInput) {
      searchInput.value = isReload ? '' : String(saved.searchKeyword || '');
    }
    if (vipSwitch) {
      vipSwitch.classList.toggle('is-on', showVipMonthly);
      vipSwitch.setAttribute('aria-checked', showVipMonthly ? 'true' : 'false');
    }
    pendingRestoreScrollState = {
      categoryScrollTop: normalizeStateScroll(saved.categoryScrollTop),
      listScrollTop: normalizeStateScroll(saved.listScrollTop),
    };
  }

  function resetMobilePageUiState() {
    activeCategory = 'all';
    sortMode = 'recommend';
    priceMinValue = null;
    priceMaxValue = null;
    showVipMonthly = false;
    pendingRestoreScrollState = {
      categoryScrollTop: 0,
      listScrollTop: 0,
    };
    if (searchInput) searchInput.value = '';
    if (categoryColumn) categoryColumn.scrollTop = 0;
    if (listRoot) listRoot.scrollTop = 0;
  }

  function saveMobilePageState() {
    writeMobilePageState({
      activeCategory: activeCategory,
      sortMode: sortMode,
      priceMinValue: priceMinValue,
      priceMaxValue: priceMaxValue,
      showVipMonthly: showVipMonthly,
      searchKeyword: searchInput ? String(searchInput.value || '') : '',
      categoryScrollTop: categoryColumn ? categoryColumn.scrollTop : 0,
      listScrollTop: listRoot ? listRoot.scrollTop : 0,
      updatedAt: Date.now(),
    });
  }

  function queueSaveMobilePageState() {
    if (saveStateTimer) window.clearTimeout(saveStateTimer);
    saveStateTimer = window.setTimeout(function () {
      saveStateTimer = 0;
      saveMobilePageState();
    }, 60);
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
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

  function syncChecklistButtonCount(map) {
    var countEl = document.getElementById('carChecklistCount');
    if (!countEl) return;
    countEl.textContent = String(Object.keys(map || {}).length);
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
        var daysText = item.days ? ' - ' + escHtml(item.days) : '';
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
          '">移除</button></li>'
        );
      })
      .join('');
    emptyEl.style.display = ids.length ? 'none' : '';
    originalEl.textContent = '原价：¥' + Math.round(originalTotal).toLocaleString('zh-CN');
    totalEl.textContent = '总价：¥' + Math.round(total).toLocaleString('zh-CN');
  }

  function syncCardChecklistToggleStates(map) {
    var picked = map || readChecklistMap();
    document.querySelectorAll('.car-checklist-toggle').forEach(function (el) {
      var id = String(el.getAttribute('data-car-id') || '').trim();
      var isPicked = !!(id && picked[id]);
      el.classList.toggle('is-picked', isPicked);
      el.textContent = '+';
      el.setAttribute('aria-pressed', isPicked ? 'true' : 'false');
    });
  }

  function buildChecklistPayload(map, phone) {
    var picked = map || {};
    var ids = Object.keys(picked);
    return {
      user: String(sessionStorage.getItem('mango_driver_name') || '未登录用户'),
      phone: String(phone || '').trim(),
      lines: ids.map(function (id) {
        var item = picked[id] || {};
        var name = String(item.model_name || item.car_name || id || '').trim();
        var days = String(item.days || '单日 (24小时)').trim();
        var total = Math.round(calcChecklistItemTotal(item));
        return name + '（' + days + '） ¥' + total.toLocaleString('zh-CN');
      }),
    };
  }

  function sendChecklistToWecom(phone) {
    var map = readChecklistMap();
    if (!Object.keys(map).length) {
      alert('用车清单为空，无法发送');
      return;
    }
    fetch(apiBase() + '/api/wecom/checklist-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildChecklistPayload(map, phone)),
      credentials: 'omit',
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j || {} }; });
      })
      .then(function (o) {
        if (o.ok && o.j && o.j.ok) {
          writeChecklistMap({});
          syncChecklistButtonCount({});
          renderChecklistPanel({});
          syncCardChecklistToggleStates({});
          if (checklistPanel) checklistPanel.hidden = true;
          if (successModal) successModal.hidden = false;
        } else {
          if (failModal) failModal.hidden = false;
        }
      })
      .catch(function () {
        if (failModal) failModal.hidden = false;
      });
  }

  function closeDaysSelectModal() {
    if (daysSelectModal) daysSelectModal.hidden = true;
    currentPendingCarItem = null;
  }

  function openDaysSelectModal(item, rentPrice) {
    if (!daysSelectModal || !daysSelectOptions) return;
    currentPendingCarItem = item;
    var price = parseInt(rentPrice, 10);
    if (isNaN(price) || price <= 0) price = 0;
    var cfg = window.mangoPricingConfig || {
      day7: { multiplier: 6.5, divisor: 7 },
      day15: { multiplier: 13, divisor: 15 },
      day30: { multiplier: 23, divisor: 30 },
    };
    var p7 = Math.floor((price * cfg.day7.multiplier) / cfg.day7.divisor);
    var p15 = Math.floor((price * cfg.day15.multiplier) / cfg.day15.divisor);
    var p30 = Math.floor((price * cfg.day30.multiplier) / cfg.day30.divisor);
    daysSelectOptions.innerHTML =
      '<div class="days-option-row"><span class="days-label">单日 (24小时)</span><span class="days-price">¥' + price + '/天</span><button class="days-confirm-btn" data-days="单日 (24小时)">确认</button></div>' +
      '<div class="days-option-row"><span class="days-label">一周 (7天)</span><span class="days-price">¥' + p7 + '/天</span><button class="days-confirm-btn" data-days="一周 (7天)">确认</button></div>' +
      '<div class="days-option-row"><span class="days-label">半月 (15天)</span><span class="days-price">¥' + p15 + '/天</span><button class="days-confirm-btn" data-days="半月 (15天)">确认</button></div>' +
      '<div class="days-option-row"><span class="days-label">整月 (30天)</span><span class="days-price">¥' + p30 + '/天</span><button class="days-confirm-btn" data-days="整月 (30天)">确认</button></div>';
    daysSelectModal.hidden = false;
  }

  function toggleChecklistCar(item, rentPrice) {
    if (!item || !item.car_id) return;
    item.rent_price = parseInt(String(rentPrice || item.rent_price || 0), 10) || 0;
    var map = readChecklistMap();
    if (map[item.car_id]) {
      delete map[item.car_id];
      writeChecklistMap(map);
      syncChecklistButtonCount(map);
      renderChecklistPanel(map);
      syncCardChecklistToggleStates(map);
      return;
    }
    openDaysSelectModal(item, rentPrice);
  }

  /** 车卡标题：品牌 + 型号（与数据库字段一致），可自然换行两行 */
  function brandModelTitleText(car) {
    var brand = String((car && car.brand) || '').trim();
    var model = String((car && car.model) || '').trim();
    var combined = (brand + (brand && model ? ' ' : '') + model).trim();
    if (combined) return combined;
    return String((car && car.car_name) || '').trim();
  }

  function taglineForCar(car) {
    var cn = String((car && car.car_name) || '').trim();
    if (!cn || !carCardTaglines || typeof carCardTaglines !== 'object') return '';
    var direct = carCardTaglines[cn];
    if (direct) return String(direct);
    var norm = normalizeCarFolderNameForAssets(cn);
    var via = norm && carCardTaglines[norm];
    return via ? String(via) : '';
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

  function coverUrlForCar(carName) {
    var normalizedName = normalizeCarFolderNameForAssets(carName);
    return 'media-webp/photos/carpark/' + encodeURIComponent(normalizedName) + '/封面.webp';
  }

  function pricingConfig() {
    return window.mangoPricingConfig || {
      day7: { multiplier: 6.5, divisor: 7 },
      day15: { multiplier: 13, divisor: 15 },
      day30: { multiplier: 23, divisor: 30 },
    };
  }

  function monthlyVipDaily(basePrice) {
    var p = parseInt(String(basePrice || 0), 10);
    if (!(p > 0)) return 0;
    var cfg = pricingConfig();
    return Math.floor((p * cfg.day30.multiplier) / cfg.day30.divisor);
  }

  /** 分类标签下：该分类内日租标价 rent_price 的最低～最高 */
  function priceRangeDailyLabel(carsSubset) {
    var minP = Infinity;
    var maxP = -Infinity;
    carsSubset.forEach(function (c) {
      var p = parseInt(String(c.rent_price || 0), 10);
      if (isNaN(p) || p <= 0) return;
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    });
    if (minP === Infinity) return '—';
    if (minP === maxP) return String(minP);
    return String(minP) + '～' + String(maxP);
  }

  function normalizeMoneyInput(raw) {
    var n = parseInt(String(raw || '').trim(), 10);
    if (!isFinite(n) || n < 0) return null;
    return n;
  }

  function isPriceMatchedByRange(price) {
    var p = parseInt(String(price || 0), 10);
    var hasMin = priceMinValue != null;
    var hasMax = priceMaxValue != null;
    if (!hasMin && !hasMax) return true;
    if (!(p > 0)) return false;
    if (hasMin && p < priceMinValue) return false;
    if (hasMax && p > priceMaxValue) return false;
    return true;
  }

  function syncFilterTriggerActiveState() {
    if (sortTrigger) {
      sortTrigger.classList.toggle('is-active', sortMode !== 'recommend');
    }
    if (priceTrigger) {
      var priceUsed = priceMinValue != null || priceMaxValue != null;
      priceTrigger.classList.toggle('is-active', priceUsed);
    }
  }

  function syncSortPopActiveState() {
    if (!sortPop) return;
    sortPop.querySelectorAll('[data-sort]').forEach(function (el) {
      var val = String(el.getAttribute('data-sort') || '');
      el.classList.toggle('is-active', val === sortMode);
    });
  }

  function syncPriceInputsFromState() {
    if (priceMinInput) priceMinInput.value = priceMinValue == null ? '' : String(priceMinValue);
    if (priceMaxInput) priceMaxInput.value = priceMaxValue == null ? '' : String(priceMaxValue);
  }

  function applyPriceRangeFromInputs() {
    var nextMin = normalizeMoneyInput(priceMinInput ? priceMinInput.value : '');
    var nextMax = normalizeMoneyInput(priceMaxInput ? priceMaxInput.value : '');
    if (nextMin != null && nextMax != null && nextMin > nextMax) {
      var t = nextMin;
      nextMin = nextMax;
      nextMax = t;
    }
    priceMinValue = nextMin;
    priceMaxValue = nextMax;
    syncPriceInputsFromState();
    syncFilterTriggerActiveState();
  }

  function getFilteredCars() {
    var kw = String((searchInput && searchInput.value) || '').trim().toLowerCase();
    var list = catalogCars.filter(function (c) {
      var catOk = activeCategory === 'all' || String(c.category || '') === activeCategory;
      if (!catOk) return false;
      if (!isPriceMatchedByRange(c.rent_price)) return false;
      if (!kw) return true;
      var full = (String(c.brand || '') + ' ' + String(c.model || '') + ' ' + String(c.car_name || '')).toLowerCase();
      return full.indexOf(kw) !== -1;
    });
    if (sortMode === 'price-asc') {
      list.sort(function (a, b) { return (a.rent_price || 0) - (b.rent_price || 0); });
    } else if (sortMode === 'price-desc') {
      list.sort(function (a, b) { return (b.rent_price || 0) - (a.rent_price || 0); });
    }
    return list;
  }

  function renderCategories(cars) {
    var cats = {};
    cars.forEach(function (c) {
      var cat = String(c.category || '').trim();
      if (cat) cats[cat] = true;
    });
    var arr = Object.keys(cats).sort();
    var forAllMin = cars.filter(function (c) {
      return String(c.category || '').trim() !== '即将上新';
    });
    if (!forAllMin.length) forAllMin = cars.slice();
    var allHint = priceRangeDailyLabel(forAllMin);
    var html =
      '<button type="button" class="m-category-btn ' +
      (activeCategory === 'all' ? 'is-active' : '') +
      '" data-category="all">' +
      '<span class="m-category-btn__label">全部</span>' +
      '<span class="m-category-btn__hint">' +
      escHtml(allHint) +
      '</span></button>';
    arr.forEach(function (cat) {
      var subset = cars.filter(function (c) {
        return String(c.category || '').trim() === cat;
      });
      var hint = priceRangeDailyLabel(subset);
      html +=
        '<button type="button" class="m-category-btn ' +
        (activeCategory === cat ? 'is-active' : '') +
        '" data-category="' +
        escHtml(cat) +
        '">' +
        '<span class="m-category-btn__label">' +
        escHtml(cat) +
        '</span>' +
        '<span class="m-category-btn__hint">' +
        escHtml(hint) +
        '</span></button>';
    });
    categoryColumn.innerHTML = html;
  }

  function scrollCarListToTop() {
    if (listRoot) listRoot.scrollTop = 0;
  }

  function clampCategoryColumnScroll() {
    if (!categoryColumn) return;
    var max = categoryColumn.scrollHeight - categoryColumn.clientHeight;
    if (max < 0) max = 0;
    if (categoryColumn.scrollTop > max) categoryColumn.scrollTop = max;
  }

  function renderCars() {
    var cars = getFilteredCars();
    listRoot.innerHTML = cars.map(function (c) {
      var titlePlain = brandModelTitleText(c);
      var title = escHtml(titlePlain);
      var tagline = escHtml(taglineForCar(c));
      var daily = parseInt(String(c.rent_price || 0), 10) || 0;
      var vipDaily = monthlyVipDaily(c.rent_price);
      var monthDaily = vipDaily > 0 ? vipDaily : daily;
      var shownDaily = (showVipMonthly && vipDaily > 0) ? vipDaily : daily;
      var carId = escHtml(String(c.car_name || '').trim());
      var href = './carpark/' + encodeURIComponent(c.car_name) + '/car.html?from=car-mobile&view=mobile';
      var titleAttr = escHtml(titlePlain);
      var modelForList = escHtml(titlePlain);
      return (
        '<article class="m-car-item">' +
        '<a class="m-car-item__card-hit" href="' +
        escHtml(href) +
        '" aria-label="' +
        titleAttr +
        ' 详情"></a>' +
        '<div class="m-car-item__img-wrap">' +
        '<img class="m-car-item__image" src="' + escHtml(coverUrlForCar(c.car_name)) + '" alt="" role="presentation">' +
        '</div>' +
        '<div class="m-car-item__right">' +
        '<div class="m-car-item__link m-car-item__link--text">' +
        '<h3 class="m-car-item__name">' +
        title +
        '</h3>' +
        '<p class="m-car-item__tagline">' +
        tagline +
        '</p>' +
        '</div>' +
        '<div class="m-car-item__price-row">' +
        '<div class="m-car-item__price-stack">' +
        '<div class="m-car-item__month-hint">月租 ¥' +
        monthDaily.toLocaleString('zh-CN') +
        '/天</div>' +
        '<div class="m-car-item__link m-car-item__link--month">' +
        '<strong class="m-car-item__month-num">¥' +
        shownDaily.toLocaleString('zh-CN') +
        '</strong>' +
        '<span class="m-car-item__rent-unit">/天</span>' +
        '</div>' +
        '</div>' +
        '<span class="car-checklist-toggle" role="button" tabindex="0" data-car-id="' +
        carId +
        '" data-car-name="' +
        carId +
        '" data-model-name="' +
        modelForList +
        '" data-rent-price="' +
        shownDaily +
        '" aria-pressed="false">+</span>' +
        '</div>' +
        '</div>' +
        '</article>'
      );
    }).join('');
    syncCardChecklistToggleStates(readChecklistMap());
  }

  function closeFilterPops() {
    if (sortPop) sortPop.hidden = true;
    if (pricePop) pricePop.hidden = true;
    if (sortMask) sortMask.hidden = true;
  }

  function placePopNearTrigger(popEl, triggerEl) {
    if (!popEl || !triggerEl) return;
    var rect = triggerEl.getBoundingClientRect();
    var margin = 12;
    var top = Math.round(rect.bottom + 6);
    var left = Math.round(rect.left);
    var width = popEl.offsetWidth || parseInt(String(getComputedStyle(popEl).width || '0'), 10) || 180;
    var maxLeft = Math.max(margin, window.innerWidth - width - margin);
    if (left > maxLeft) left = maxLeft;
    if (left < margin) left = margin;
    popEl.style.top = String(top) + 'px';
    popEl.style.left = String(left) + 'px';
  }

  function openSortPop() {
    closeFilterPops();
    if (sortPop) {
      sortPop.hidden = false;
      placePopNearTrigger(sortPop, sortTrigger);
    }
    if (sortMask) sortMask.hidden = false;
  }

  function openPricePop() {
    closeFilterPops();
    syncPriceInputsFromState();
    if (pricePop) {
      pricePop.hidden = false;
      placePopNearTrigger(pricePop, priceTrigger);
    }
    if (sortMask) sortMask.hidden = false;
  }

  if (sortTrigger) {
    sortTrigger.addEventListener('click', function () {
      if (sortPop && !sortPop.hidden) closeFilterPops();
      else openSortPop();
    });
  }
  if (priceTrigger) {
    priceTrigger.addEventListener('click', function () {
      if (pricePop && !pricePop.hidden) closeFilterPops();
      else openPricePop();
    });
  }
  if (sortMask) sortMask.addEventListener('click', closeFilterPops);
  if (sortPop) {
    sortPop.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-sort]');
      if (!btn) return;
      sortMode = String(btn.getAttribute('data-sort') || 'recommend');
      sortPop.querySelectorAll('[data-sort]').forEach(function (el) {
        el.classList.toggle('is-active', el === btn);
      });
      syncFilterTriggerActiveState();
      syncSortPopActiveState();
      closeFilterPops();
      renderCars();
      saveMobilePageState();
    });
  }
  if (priceApplyBtn) {
    priceApplyBtn.addEventListener('click', function () {
      applyPriceRangeFromInputs();
      closeFilterPops();
      renderCars();
      saveMobilePageState();
    });
  }
  if (priceResetBtn) {
    priceResetBtn.addEventListener('click', function () {
      priceMinValue = null;
      priceMaxValue = null;
      syncPriceInputsFromState();
      syncFilterTriggerActiveState();
      closeFilterPops();
      renderCars();
      saveMobilePageState();
    });
  }

  categoryColumn.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-category]');
    if (!btn) return;
    var next = String(btn.getAttribute('data-category') || 'all');
    if (next === activeCategory) return;
    var savedCategoryScroll = categoryColumn ? categoryColumn.scrollTop : 0;
    activeCategory = next;
    renderCategories(catalogCars);
    if (categoryColumn) {
      categoryColumn.scrollTop = savedCategoryScroll;
      clampCategoryColumnScroll();
    }
    renderCars();
    scrollCarListToTop();
    saveMobilePageState();
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      renderCars();
      saveMobilePageState();
    });
  }
  if (vipSwitch) {
    vipSwitch.addEventListener('click', function () {
      showVipMonthly = !showVipMonthly;
      vipSwitch.classList.toggle('is-on', showVipMonthly);
      vipSwitch.setAttribute('aria-checked', showVipMonthly ? 'true' : 'false');
      renderCars();
      saveMobilePageState();
    });
  }

  if (categoryColumn) {
    categoryColumn.addEventListener('scroll', queueSaveMobilePageState, { passive: true });
  }
  if (listRoot) {
    listRoot.addEventListener('scroll', queueSaveMobilePageState, { passive: true });
  }
  document.addEventListener('click', function (e) {
    var hit = e.target && e.target.closest ? e.target.closest('.m-car-item__card-hit') : null;
    if (hit) saveMobilePageState();
  });
  document.addEventListener(
    'click',
    function (e) {
      var hit = e.target && e.target.closest ? e.target.closest('.m-car-item__card-hit') : null;
      if (!hit) return;
      if (!isPrimaryClickEvent(e)) return;
      if (hit.target && String(hit.target).toLowerCase() === '_blank') return;
      var href = hit.getAttribute('href') || '';
      if (!isDetailHref(href)) return;
      if (detailNavNavigating) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      detailNavNavigating = true;
      saveMobilePageState();
      var to = hit.href;
      openDetailNavLoadingMask();
      preloadDetailDocument(to).then(function () {
        window.location.assign(to);
      });
    },
    true
  );
  window.addEventListener('pagehide', saveMobilePageState);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveMobilePageState();
  });

  if (daysSelectCloseBtn) daysSelectCloseBtn.addEventListener('click', closeDaysSelectModal);
  if (daysSelectOptions) {
    daysSelectOptions.addEventListener('click', function (e) {
      if (!e.target.classList.contains('days-confirm-btn')) return;
      var days = e.target.getAttribute('data-days');
      if (currentPendingCarItem) {
        currentPendingCarItem.days = days;
        var map = readChecklistMap();
        map[currentPendingCarItem.car_id] = currentPendingCarItem;
        writeChecklistMap(map);
        syncChecklistButtonCount(map);
        renderChecklistPanel(map);
        syncCardChecklistToggleStates(map);
      }
      closeDaysSelectModal();
    });
  }

  if (checklistBtn && checklistPanel) {
    checklistBtn.addEventListener('click', function () {
      checklistPanel.hidden = !checklistPanel.hidden;
    });
  }
  if (checklistCloseBtn && checklistPanel) {
    checklistCloseBtn.addEventListener('click', function () {
      checklistPanel.hidden = true;
    });
  }
  if (checklistClearBtn) {
    checklistClearBtn.addEventListener('click', function () {
      writeChecklistMap({});
      syncChecklistButtonCount({});
      renderChecklistPanel({});
      syncCardChecklistToggleStates({});
    });
  }
  if (checklistSendBtn) {
    checklistSendBtn.addEventListener('click', function () {
      if (phoneModal) {
        phoneModal.hidden = false;
        if (phoneInput) phoneInput.value = '';
        if (phoneError) phoneError.hidden = true;
      } else {
        sendChecklistToWecom('');
      }
    });
  }
  if (phoneCancelBtn && phoneModal) phoneCancelBtn.addEventListener('click', function () { phoneModal.hidden = true; });
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
      phoneError.hidden = /^1\d{10}$/.test(String(phoneInput.value || '').replace(/\s+/g, ''));
    });
  }
  if (successOkBtn && successModal) successOkBtn.addEventListener('click', function () { successModal.hidden = true; });
  if (failOkBtn && failModal) failOkBtn.addEventListener('click', function () { failModal.hidden = true; });

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
        renderChecklistPanel(map);
        syncCardChecklistToggleStates(map);
      }
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-phone-cancel') === '1' && phoneModal) {
      phoneModal.hidden = true;
    }
  });

  function loadCatalog() {
    Promise.all([
      fetch(apiBase() + '/api/cars-catalog', { credentials: 'omit' }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, j: j || {} }; });
      }),
      fetch(apiBase() + '/api/site-ui', { credentials: 'omit' })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .catch(function () { return {}; }),
      fetch('./car_card_taglines.json', { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; }),
    ])
      .then(function (arr) {
        var carsResp = arr[0];
        var siteUi = arr[1] || {};
        var tagObj = arr[2];
        if (tagObj && typeof tagObj === 'object' && !Array.isArray(tagObj)) {
          carCardTaglines = tagObj;
        } else {
          carCardTaglines = {};
        }
        window.mangoPricingConfig = siteUi.pricing || {
          day7: { multiplier: 6.5, divisor: 7 },
          day15: { multiplier: 13, divisor: 15 },
          day30: { multiplier: 23, divisor: 30 },
        };
        if (!carsResp.ok || !carsResp.j.ok || !Array.isArray(carsResp.j.cars)) {
          throw new Error('cars-catalog failed');
        }
        catalogCars = carsResp.j.cars.slice();
        if (
          activeCategory !== 'all' &&
          !catalogCars.some(function (c) { return String(c.category || '').trim() === activeCategory; })
        ) {
          activeCategory = 'all';
        }
        renderCategories(catalogCars);
        renderCars();
        if (pendingRestoreScrollState) {
          if (categoryColumn) categoryColumn.scrollTop = pendingRestoreScrollState.categoryScrollTop;
          if (listRoot) listRoot.scrollTop = pendingRestoreScrollState.listScrollTop;
          pendingRestoreScrollState = null;
        }
        saveMobilePageState();
      })
      .catch(function () {
        if (errorEl) {
          errorEl.hidden = false;
          errorEl.textContent = '无法加载车辆列表，请确认 member_api 已启动。';
        }
      });
  }

  var shouldResetMobilePageState = isReload || isFromIndexEntry();

  if (isReload) {
    try {
      localStorage.removeItem(CAR_CHECKLIST_STORAGE_KEY);
    } catch (e) {}
    if (searchInput) searchInput.value = '';
  }

  if (shouldResetMobilePageState) {
    clearMobilePageStateStorage();
    resetMobilePageUiState();
  } else {
    restoreMobilePageState();
  }

  syncChecklistButtonCount(readChecklistMap());
  renderChecklistPanel(readChecklistMap());
  syncPriceInputsFromState();
  syncFilterTriggerActiveState();
  syncSortPopActiveState();
  loadCatalog();
});
