(function () {
  var STORAGE_KEY = 'mangoCarChecklist';
  var m2FallbackAssetV = '1779612928937';
  function m2AssetV() {
    try {
      return (typeof window !== 'undefined' && window.__MANGO_ASSET_VERSION__) || m2FallbackAssetV;
    } catch (e) {
      return m2FallbackAssetV;
    }
  }

  /** 与服务页 carousel 顺序、文案一致；图标为 media-webp/photos/index/m2 下 webp */
  var M2A_VALUEADD_SERVICES = [
    { name: '司机配备', icon: '司机配备.webp' },
    { name: '商务接送', icon: '商务接送.webp' },
    { name: '攻略定制', icon: '攻略定制.webp' },
    { name: '婚庆装饰', icon: '婚庆装饰.webp' },
    { name: '顾问陪同', icon: '顾问陪同.webp' },
  ];

  /* ── Storage：磁盘尽力同步；__MANGO_CHECKLIST_MEM__ 为当前标签页真相源（UC 常假成功或不可用 localStorage） ── */
  function readChecklistRaw() {
    try {
      var a = localStorage.getItem(STORAGE_KEY);
      if (a != null) return a;
    } catch (e) {}
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (e2) {}
    return null;
  }
  function writeChecklistRaw(json) {
    var ok = false;
    try {
      localStorage.setItem(STORAGE_KEY, json);
      ok = true;
    } catch (eLs) {}
    try {
      sessionStorage.setItem(STORAGE_KEY, json);
      ok = true;
    } catch (eSs) {}
    return ok;
  }
  function cloneChecklistMap(map) {
    try {
      return JSON.parse(JSON.stringify(map && typeof map === 'object' ? map : {}));
    } catch (eCl) {
      return {};
    }
  }
  function readChecklistMap() {
    try {
      if (window.__MANGO_CHECKLIST_MEM__ == null) {
        var raw = readChecklistRaw();
        if (raw == null || raw === '') raw = '{}';
        var obj = JSON.parse(raw);
        window.__MANGO_CHECKLIST_MEM__ = obj && typeof obj === 'object' ? obj : {};
      }
      if (m2aMigrateLegacyChecklistKeys(window.__MANGO_CHECKLIST_MEM__)) {
        try {
          writeChecklistRaw(JSON.stringify(window.__MANGO_CHECKLIST_MEM__));
        } catch (ePersist) {}
      }
      return window.__MANGO_CHECKLIST_MEM__;
    } catch (e) {
      if (window.__MANGO_CHECKLIST_MEM__ == null) window.__MANGO_CHECKLIST_MEM__ = {};
      return window.__MANGO_CHECKLIST_MEM__;
    }
  }
  function writeChecklistMap(map) {
    try {
      var o = cloneChecklistMap(map);
      window.__MANGO_CHECKLIST_MEM__ = o;
      writeChecklistRaw(JSON.stringify(o));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 用车清单存储键：同款车可多档租期并存，每条占用独立 row / pkg / service 键 */
  function m2aVehicleRowStorageKey(carId, daysText) {
    return (
      'row:' +
      encodeURIComponent(String(carId || '')) +
      ':' +
      encodeURIComponent(String(daysText || '单日 (24小时)'))
    );
  }
  function m2aPackageRowStorageKey(carId) {
    return 'pkg:' + encodeURIComponent(String(carId || ''));
  }
  function m2aChecklistNeedsKeyMigration(map) {
    if (!map || typeof map !== 'object') return false;
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      if (k.indexOf('row:') === 0 || k.indexOf('pkg:') === 0 || k.indexOf('service:') === 0) continue;
      return true;
    }
    return false;
  }
  /** 将旧版「以 car_id 为唯一键」迁为 row:/pkg:；原地改写 map，返回是否发生了改写 */
  function m2aMigrateLegacyChecklistKeys(map) {
    if (!m2aChecklistNeedsKeyMigration(map)) return false;
    var snap = cloneChecklistMap(map);
    var next = {};
    Object.keys(snap).forEach(function (k) {
      var item = snap[k];
      if (!item || typeof item !== 'object') return;
      if (k.indexOf('service:') === 0) {
        next[k] = item;
        return;
      }
      if (k.indexOf('row:') === 0 || k.indexOf('pkg:') === 0) {
        next[k] = item;
        return;
      }
      var nk =
        item.pkg_lines && item.pkg_lines.length
          ? m2aPackageRowStorageKey(item.car_id || k)
          : m2aVehicleRowStorageKey(item.car_id || k, item.days || '单日 (24小时)');
      if (next[nk] && nk.indexOf('row:') === 0) {
        var q1 = parseInt(String(next[nk].qty != null ? next[nk].qty : 1), 10) || 1;
        var q2 = parseInt(String(item.qty != null ? item.qty : 1), 10) || 1;
        if (q1 < 1) q1 = 1;
        if (q2 < 1) q2 = 1;
        next[nk].qty = Math.min(99, q1 + q2);
      } else {
        next[nk] = item;
      }
    });
    Object.keys(map).forEach(function (kd) {
      delete map[kd];
    });
    Object.keys(next).forEach(function (kn) {
      map[kn] = next[kn];
    });
    return true;
  }
  function m2aCarHasChecklistRows(map, carId) {
    var enc = encodeURIComponent(String(carId || ''));
    var pfx = 'row:' + enc + ':';
    var pk = m2aPackageRowStorageKey(carId);
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      if (k.indexOf(pfx) === 0 || k === pk) return true;
    }
    return false;
  }
  function m2aRemoveAllChecklistRowsForCar(map, carId) {
    var enc = encodeURIComponent(String(carId || ''));
    var pfx = 'row:' + enc + ':';
    var pk = m2aPackageRowStorageKey(carId);
    var dels = [];
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      if (k.indexOf(pfx) === 0 || k === pk) dels.push(k);
    }
    for (var i = 0; i < dels.length; i++) delete map[dels[i]];
  }
  function m2aVehicleGroupsFromMap(map) {
    var rowIds = [];
    Object.keys(map || {}).forEach(function (id) {
      if (id.indexOf('row:') === 0 && map[id]) rowIds.push(id);
    });
    var groupIdx = {};
    var groups = [];
    for (var ri = 0; ri < rowIds.length; ri++) {
      var rid = rowIds[ri];
      var item = map[rid];
      var cid = String(item.car_id || '');
      var gi = groupIdx[cid];
      if (gi == null) {
        groupIdx[cid] = groups.length;
        groups.push({ carId: cid, rows: [{ id: rid, item: item }] });
      } else {
        groups[gi].rows.push({ id: rid, item: item });
      }
    }
    return groups;
  }
  function m2aOtherChecklistIdsInKeyOrder(map) {
    var out = [];
    Object.keys(map || {}).forEach(function (id) {
      if (id.indexOf('row:') !== 0) out.push(id);
    });
    return out;
  }

  /* ── API 根地址：与 detail-fab / login 一致；静态页与 member_api 不同端口时必须能落到 8765 ── */
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
    var origin = String(typeof location !== 'undefined' ? location.origin : '').replace(/\/$/, '');
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

  /* ── 弹窗层叠：锁住底层滚动（首页滚动容器为 .m2-home；其余页为 window/body） ── */
  var m2aOverlayScrollLocks = 0;
  var m2aOverlayScrollSavedY = 0;
  var m2aOverlayScrollHomeEl = null;

  function m2aLockOverlayScroll() {
    if (m2aOverlayScrollLocks === 0) {
      var home = document.querySelector('.m2-home');
      if (home) {
        m2aOverlayScrollHomeEl = home;
        m2aOverlayScrollSavedY = home.scrollTop;
        home.classList.add('m2-scroll-lock');
      } else {
        m2aOverlayScrollHomeEl = null;
        m2aOverlayScrollSavedY =
          window.scrollY ||
          (document.documentElement && document.documentElement.scrollTop) ||
          (document.body && document.body.scrollTop) ||
          0;
        document.documentElement.classList.add('m2a-overlay-scroll-lock');
        document.body.classList.add('m2a-overlay-scroll-lock');
        document.body.style.top = '-' + m2aOverlayScrollSavedY + 'px';
      }
    }
    m2aOverlayScrollLocks++;
  }

  function m2aUnlockOverlayScroll() {
    if (m2aOverlayScrollLocks <= 0) return;
    m2aOverlayScrollLocks--;
    if (m2aOverlayScrollLocks > 0) return;
    if (m2aOverlayScrollHomeEl) {
      var el = m2aOverlayScrollHomeEl;
      m2aOverlayScrollHomeEl = null;
      el.classList.remove('m2-scroll-lock');
      el.scrollTop = m2aOverlayScrollSavedY;
    } else {
      document.documentElement.classList.remove('m2a-overlay-scroll-lock');
      document.body.classList.remove('m2a-overlay-scroll-lock');
      document.body.style.top = '';
      window.scrollTo(0, m2aOverlayScrollSavedY);
    }
  }

  try {
    window.m2aLockOverlayScroll = m2aLockOverlayScroll;
    window.m2aUnlockOverlayScroll = m2aUnlockOverlayScroll;
  } catch (eLockExp) {}

  function fetchPost(path, body) {
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('all failed'));
      var base = candidates[i++];
      return fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          /* 静态站/错误端口常返回 404 HTML，不试下一候选会误判为「发送失败」 */
          if (!res.ok && (res.status === 404 || res.status === 405) && i < candidates.length) {
            return next();
          }
          return { ok: res.ok, j: j || {} };
        });
      }).catch(next);
    }
    return next();
  }

  /* ── Pricing ── */
  function getDaysMultiplier(t) {
    var s = String(t || '');
    if (s.indexOf('一周') !== -1) return 7;
    if (s.indexOf('半月') !== -1) return 15;
    if (s.indexOf('整月') !== -1) return 30;
    return 1;
  }
  function getDailyUnitPrice(basePrice, daysText) {
    var p = parseInt(String(basePrice), 10);
    if (isNaN(p) || p <= 0) return 0;
    var cfg = window.mangoPricingConfig || { day7: { multiplier: 6.5, divisor: 7 }, day15: { multiplier: 13, divisor: 15 }, day30: { multiplier: 23, divisor: 30 } };
    if (String(daysText || '').indexOf('一周') !== -1) return Math.floor((p * cfg.day7.multiplier) / cfg.day7.divisor);
    if (String(daysText || '').indexOf('半月') !== -1) return Math.floor((p * cfg.day15.multiplier) / cfg.day15.divisor);
    if (String(daysText || '').indexOf('整月') !== -1) return Math.floor((p * cfg.day30.multiplier) / cfg.day30.divisor);
    return p;
  }
  function getItemQty(item) {
    var q = parseInt(String(item && item.qty != null ? item.qty : 1), 10);
    if (!isFinite(q) || q < 1) q = 1;
    if (q > 99) q = 99;
    return q;
  }
  function calcItemTotal(item) {
    var it = item || {};
    return getDailyUnitPrice(it.rent_price, it.days) * getDaysMultiplier(it.days) * getItemQty(it);
  }
  function calcItemOriginal(item) {
    var it = item || {};
    var p = parseInt(String(it.rent_price), 10);
    var base = (isNaN(p) || p <= 0) ? 0 : p * getDaysMultiplier(it.days);
    return base * getItemQty(it);
  }

  /* ── HTML escape ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  /** 部分 WebView（含旧版 UC）无 Element.closest，事件委托会整块失效 */
  function m2Matches(el, selector) {
    if (!el || el.nodeType !== 1 || !selector) return false;
    var m = el.matches || el.webkitMatchesSelector || el.msMatchesSelector;
    if (!m) return false;
    try {
      return !!m.call(el, selector);
    } catch (err) {
      return false;
    }
  }
  function m2Closest(node, selector) {
    if (!node || !selector) return null;
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return null;
    try {
      if (typeof el.closest === 'function') return el.closest(selector);
    } catch (eC) {}
    var cur = el;
    while (cur && cur.nodeType === 1) {
      if (m2Matches(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  /** 国产内核：直接在按钮上绑定，避免委托/target 错乱；touchend 非 passive + 防抖 */
  function m2ArmTap(btn, handler) {
    if (!btn || typeof handler !== 'function') return;
    var locking = false;
    function invoke() {
      if (locking) return;
      locking = true;
      try {
        handler(btn);
      } catch (eh) {}
      setTimeout(function () {
        locking = false;
      }, 450);
    }
    btn.onclick = function (ev) {
      try {
        if (ev && ev.preventDefault) ev.preventDefault();
      } catch (e1) {}
      invoke();
    };
    btn.addEventListener(
      'touchend',
      function (ev) {
        try {
          if (ev.preventDefault) ev.preventDefault();
        } catch (e2) {}
        invoke();
      },
      { passive: false }
    );
  }

  function m2aScriptM2DirUrl() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('m2-actions.js') === -1) continue;
      return src.replace(/m2-actions\.js(\?.*)?$/i, '');
    }
    return '';
  }
  function m2aM2IconUrl(file) {
    var dir = m2aScriptM2DirUrl();
    var rel = '../media-webp/photos/index/m2/' + file;
    if (!dir) return rel;
    try {
      return new URL(rel, dir).href;
    } catch (e) {
      return dir + rel;
    }
  }
  function m2aServicesPageUrl() {
    var dir = m2aScriptM2DirUrl();
    var suf = '?v=' + m2AssetV();
    if (!dir) return './services.html' + suf;
    try {
      return new URL('services.html' + suf, dir).href;
    } catch (e) {
      return dir + 'services.html' + suf;
    }
  }

  /* ── Inject styles ── */
  function ensureStyle() {
    if (document.getElementById('m2ActionsStyle')) return;
    var s = document.createElement('style');
    s.id = 'm2ActionsStyle';
    s.textContent = [
      'html.m2a-overlay-scroll-lock,body.m2a-overlay-scroll-lock{overflow:hidden!important}',
      'body.m2a-overlay-scroll-lock{position:fixed;left:0;right:0;width:100%;}',
      /* ── overlay backdrop ── */
      '.m2a-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%);z-index:8799}',
      '.m2a-backdrop[hidden]{display:none}',
      /* ── base card ── */
      '.m2a-card{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9001;width:min(94vw,420px);border-radius:16px;padding:20px 16px 16px;background:rgba(17,20,30,.98);border:1px solid rgba(255,255,255,.18);box-shadow:0 16px 40px rgba(0,0,0,.5);color:#f4f6fb}',
      /* ── days select modal ── */
      '.m2a-days-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;padding:0 0 calc(80px + env(safe-area-inset-bottom));background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%)}',
      'body[data-car-display-name] .m2a-days-modal{align-items:center;justify-content:center;padding:max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))}',
      'body.m2-package .m2a-days-modal{align-items:center;justify-content:center;padding:max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))}',
      '#m2aQtyModal.m2a-days-modal{z-index:9015}',
      '.m2a-qty-step{display:flex;align-items:center;justify-content:center;gap:clamp(20px,8vw,36px);padding:18px 8px 8px}',
      '.m2a-qty-btn{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#fff;font-size:22px;font-weight:500;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.m2a-qty-btn:disabled{opacity:.35;cursor:default}',
      '.m2a-qty-value{font-size:28px;font-weight:600;color:#fff;min-width:52px;text-align:center;line-height:1;letter-spacing:.02em}',
      '.m2a-qty-total-days{margin:0;padding:6px 0 2px;text-align:center;font-size:13px;font-weight:500;letter-spacing:.02em;color:rgba(255,255,255,.85)}',
      '.m2a-qty-actions{margin-top:14px;display:flex;gap:10px}',
      '.m2a-days-modal[hidden]{display:none}',
      '.m2a-days-card{width:min(96vw,460px);max-height:min(72vh,620px);background:rgba(255,255,255,.06);color:#fff;border-radius:16px;padding:16px 14px 14px;border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px) saturate(112%);-webkit-backdrop-filter:blur(10px) saturate(112%);overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;justify-content:flex-start;box-shadow:none}',
      '.m2a-days-title{font-size:17px;font-weight:500;letter-spacing:.02em;text-align:center;margin:0 0 12px;color:#fff}',
      '#m2aDaysOptions,#m2aPackagePickOptions{width:100%;margin:0}',
      '.m2a-days-row{display:grid;grid-template-columns:minmax(96px,auto) 1fr auto;align-items:center;column-gap:10px;margin:0;padding:14px 0;border-radius:0;background:transparent;border-top:1px solid rgba(255,255,255,.18)}',
      '.m2a-days-label{font-size:13px;font-weight:500;letter-spacing:.02em;color:#fff;white-space:nowrap}',
      '.m2a-days-price{font-size:13px;color:#fff;text-align:center;font-weight:500;letter-spacing:.02em;white-space:nowrap;justify-self:center;width:100%}',
      '.m2a-days-price-num{font-size:18px;font-weight:600;color:#fff;line-height:1;letter-spacing:.02em}',
      '.m2a-days-price-unit{font-size:13px;color:#fff;margin-left:3px;font-weight:500;letter-spacing:.02em}',
      '.m2a-days-confirm{padding:0 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:500;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:none;height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center}',
      '.m2a-days-close{position:absolute;top:10px;right:10px;background:transparent;border:none;width:30px;height:30px;border-radius:0;font-size:20px;color:#fff;cursor:pointer;line-height:1;z-index:1}',
      /* ── 套餐选择：与用车天数同一套卡片/行/按钮，仅补充多行文案 ── */
      '.m2a-pkgpick-row .m2a-pkgpick-cell-label{display:flex;flex-direction:column;gap:4px;min-width:0;justify-content:center}',
      '.m2a-pkgpick-row .m2a-days-label{white-space:normal;line-height:1.35;align-self:flex-start}',
      '.m2a-pkgpick-desc{font-size:12px;font-weight:500;color:rgba(255,255,255,.72);letter-spacing:.02em;line-height:1.4;word-break:break-word}',
      /* ── phone / success / fail modal（视觉与用车清单 .m2a-panel 一致） ── */
      '.m2a-modal{position:fixed;inset:0;z-index:9010}',
      '.m2a-modal[hidden]{display:none}',
      '.m2a-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%)}',
      '.m2a-modal__card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(96vw,460px);border-radius:16px;padding:16px 14px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px) saturate(112%);-webkit-backdrop-filter:blur(10px) saturate(112%);box-shadow:none;color:#fff}',
      '.m2a-modal__title{margin:0 0 12px;font-size:14px;font-weight:500;letter-spacing:.02em;line-height:1.45;text-align:center;color:#fff}',
      '.m2a-modal__input{width:100%;height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:500;letter-spacing:.02em;padding:0 14px;outline:none;box-sizing:border-box;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}',
      '.m2a-modal__input::placeholder{color:rgba(255,255,255,.42)}',
      '.m2a-modal__error{margin:8px 0 0;color:#ff8f8f;font-size:13px;font-weight:500;letter-spacing:.02em}',
      '.m2a-modal__error[hidden]{display:none}',
      '.m2a-modal__actions{margin-top:14px;display:flex;gap:10px}',
      '.m2a-modal__actions--center{justify-content:center}',
      '.m2a-modal__actions--center .m2a-modal__btn{flex:0 1 auto;min-width:min(200px,70vw)}',
      '.m2a-modal__btn{flex:1;border-radius:999px;border:1px solid rgba(255,255,255,.22);padding:0 12px;height:40px;box-sizing:border-box;font-size:13px;font-weight:500;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center}',
      '.m2a-modal__btn--ghost{background:rgba(255,255,255,.08);color:#fff}',
      '.m2a-modal__btn--primary{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.28)}',
      /* ── checklist panel ── */
      '.m2a-panel{position:fixed;z-index:8800;left:50%;bottom:calc(80px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(96vw,460px);max-height:min(86vh,760px);border-radius:16px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);backdrop-filter:blur(10px) saturate(112%);-webkit-backdrop-filter:blur(10px) saturate(112%);box-shadow:none;overflow:hidden;display:flex;flex-direction:column}',
      'body[data-car-display-name] .m2a-panel{top:50%;bottom:auto;transform:translate(-50%,-50%);max-height:min(90vh,800px)}',
      '.m2a-panel[hidden]{display:none}',
      '.m2a-panel__header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.2);flex-shrink:0}',
      '.m2a-panel__title{margin:0;font-size:14px;font-weight:500;letter-spacing:.02em;color:#fff}',
      '.m2a-panel__close{border:none;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}',
      '.m2a-panel__body{padding:12px 14px 14px;overflow-y:auto;flex:1}',
      '.m2a-panel__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.m2a-panel__group{list-style:none;margin:0;padding:0;border-top:1px solid rgba(255,255,255,.2)}',
      '.m2a-panel__group-head{font-size:13px;font-weight:700;letter-spacing:.02em;color:#fff;padding:10px 2px 4px}',
      '.m2a-panel__sublist{list-style:none;margin:0;padding:0 0 6px;display:flex;flex-direction:column;gap:2px}',
      '.m2a-panel__subitem{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 2px 6px 10px;border-radius:0;background:transparent;flex-wrap:wrap}',
      '.m2a-panel__subitem-main{flex:1;min-width:min(200px,100%)}',
      '.m2a-panel__subitem-name{font-size:13px;font-weight:500;letter-spacing:.02em;color:rgba(255,255,255,.9);line-height:1.35}',
      '.m2a-panel__subitem-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}',
      '.m2a-panel__edit-qty{border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-weight:600;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.m2a-panel__subtotal{font-size:12px;font-weight:600;letter-spacing:.02em;color:rgba(255,255,255,.72);padding:8px 2px 10px 10px;margin-top:2px;border-top:1px dashed rgba(255,255,255,.14)}',
      '.m2a-panel__item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 2px;border-radius:0;background:transparent;border-top:1px solid rgba(255,255,255,.2);flex-wrap:wrap}',
      '.m2a-panel__item-name{font-size:13px;font-weight:500;letter-spacing:.02em;color:#fff;flex:1;min-width:min(220px,100%)}',
      '.m2a-panel__item-remove{border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 10px;background:transparent;color:#fff;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0}',
      '.m2a-panel__empty{margin:8px 0;color:rgba(255,255,255,.84);font-size:14px}',
      '.m2a-panel__original{margin:6px 0 2px;color:rgba(255,255,255,.72);font-size:12px;font-weight:500;letter-spacing:.05em;text-align:right;text-decoration:line-through}',
      '.m2a-panel__total{margin:0 0 10px;color:#fff;font-size:13px;font-weight:700;letter-spacing:.02em;text-align:right}',
      '.m2a-valueadd{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2)}',
      '.m2a-valueadd__head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}',
      '.m2a-valueadd__title{margin:0;font-size:13px;font-weight:500;letter-spacing:.02em;color:#fff}',
      '.m2a-valueadd__more{font-size:12px;font-weight:500;color:rgba(255,255,255,.72);text-decoration:underline;text-underline-offset:2px;white-space:nowrap}',
      '.m2a-valueadd__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:row;flex-wrap:nowrap;gap:5px;align-items:stretch}',
      '.m2a-valueadd__item{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;padding:8px 3px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}',
      '.m2a-valueadd__icon{width:28px;height:28px;object-fit:contain;border-radius:6px;flex-shrink:0}',
      '.m2a-valueadd__name{font-size:10px;font-weight:500;color:#fff;letter-spacing:.02em;line-height:1.25;text-align:center;word-break:keep-all}',
      '.m2a-valueadd__add{align-self:stretch;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:4px 2px;background:rgba(255,255,255,.08);color:#fff;font-size:10px;font-weight:500;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}',
      '.m2a-valueadd__add:disabled{opacity:.55;cursor:default}',
      '/* UC/旧 WebView：加快点击、弱化与横向溢出列表的触控冲突 */',
      '.m2a-days-confirm,.m2a-panel__item-remove,.m2a-panel__edit-qty,.m2a-modal__btn,.m2a-panel__clear,.m2a-panel__send,.m2a-qty-btn{touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.m2a-valueadd__add{touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none}',
      '.m2a-valueadd__list{-webkit-overflow-scrolling:touch;overflow-x:auto;overscroll-behavior-x:contain}',
      '.m2a-panel__body{touch-action:pan-y}',
      '.m2a-panel__actions{display:flex;gap:10px}',
      '.m2a-panel__clear{flex:1;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:0 12px;height:40px;box-sizing:border-box;background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:500;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center}',
      '.m2a-panel__send{flex:1;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:0 12px;height:40px;box-sizing:border-box;background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:500;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center}',
      /* ── consult modal ── */
      '.m2a-consult{position:fixed;inset:0;z-index:9020}',
      '.m2a-consult[hidden]{display:none}',
      '.m2a-consult__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%)}',
      '.m2a-consult__card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(96vw,520px);height:520px;border-radius:14px;padding:14px 12px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px) saturate(112%);-webkit-backdrop-filter:blur(10px) saturate(112%);box-shadow:none;display:flex;flex-direction:column;overflow:hidden}',
      '.m2a-consult__title{margin:0;color:#fff;font-size:17px;text-align:center;padding-right:24px}',
      '.m2a-consult__close{position:absolute;top:10px;right:10px;width:28px;height:28px;border:none;background:transparent;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0}',
      '.m2a-consult__chat{margin-top:10px;flex:1;min-height:0;overflow-y:auto;padding:10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.16);display:flex;flex-direction:column;gap:8px;scrollbar-width:none;-ms-overflow-style:none}',
      '.m2a-consult__chat::-webkit-scrollbar{display:none}',
      '.m2a-consult__msg{max-width:88%;padding:8px 10px;border-radius:10px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
      '.m2a-consult__msg--assistant{align-self:flex-start;background:rgba(255,255,255,.1);color:rgba(255,255,255,.92)}',
      '.m2a-consult__msg--user{align-self:flex-end;background:rgba(255,255,255,.14);color:#fff}',
      '.m2a-consult__msg-text{display:block}',
      '.m2a-consult__msg-qr{display:block;width:120px;height:120px;margin-top:8px;border-radius:10px;border:1px solid rgba(255,255,255,.2);object-fit:cover;background:#fff}',
      '.m2a-consult__input-wrap{margin-top:10px;display:flex;gap:8px;flex-shrink:0}',
      '.m2a-consult__input{flex:1;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font-size:16px;padding:0 10px;outline:none}',
      '.m2a-consult__send{height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff;font-size:13px;padding:0 14px;cursor:pointer;flex-shrink:0;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}',
      '.m2a-add-success-toast{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9100;max-width:min(92vw,380px);padding:14px 22px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#fff;font-size:15px;font-weight:500;letter-spacing:.02em;line-height:1.45;text-align:center;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease;box-shadow:none}',
      '.m2a-add-success-toast.is-visible{opacity:1;visibility:visible}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Build DOM ── */
  function buildUi() {
    /* days select */
    var daysModal = document.createElement('div');
    daysModal.id = 'm2aDaysModal';
    daysModal.className = 'm2a-days-modal';
    daysModal.setAttribute('hidden', '');
    daysModal.innerHTML =
      '<div style="position:relative">' +
      '<div class="m2a-days-card">' +
      '<h3 class="m2a-days-title">请选择用车天数</h3>' +
      '<div id="m2aDaysOptions"></div>' +
      '</div>' +
      '<button class="m2a-days-close" id="m2aDaysCloseBtn" aria-label="关闭">×</button>' +
      '</div>';

    var qtyModal = document.createElement('div');
    qtyModal.id = 'm2aQtyModal';
    qtyModal.className = 'm2a-days-modal';
    qtyModal.setAttribute('hidden', '');
    qtyModal.innerHTML =
      '<div style="position:relative">' +
      '<div class="m2a-days-card">' +
      '<h3 class="m2a-days-title">选择份数</h3>' +
      '<div class="m2a-qty-step">' +
      '<button type="button" class="m2a-qty-btn" id="m2aQtyMinus" aria-label="减少份数">−</button>' +
      '<span class="m2a-qty-value" id="m2aQtyValue">1</span>' +
      '<button type="button" class="m2a-qty-btn" id="m2aQtyPlus" aria-label="增加份数">+</button>' +
      '</div>' +
      '<p class="m2a-qty-total-days" id="m2aQtyTotalDays" aria-live="polite"></p>' +
      '<div class="m2a-qty-actions">' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--ghost" id="m2aQtyCancelBtn">取消</button>' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--primary" id="m2aQtyConfirmBtn">确认</button>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="m2a-days-close" id="m2aQtyCloseBtn" aria-label="关闭">×</button>' +
      '</div>';

    /* phone */
    var phoneModal = document.createElement('section');
    phoneModal.className = 'm2a-modal';
    phoneModal.id = 'm2aPhoneModal';
    phoneModal.setAttribute('hidden', '');
    phoneModal.innerHTML =
      '<div class="m2a-modal__backdrop" id="m2aPhoneBackdrop"></div>' +
      '<div class="m2a-modal__card">' +
      '<h3 class="m2a-modal__title">请输入您的手机号，稍后客服会联系您</h3>' +
      '<input type="tel" inputmode="numeric" maxlength="11" class="m2a-modal__input" id="m2aPhoneInput" placeholder="请输入手机号">' +
      '<p class="m2a-modal__error" id="m2aPhoneError" hidden>请输入正确的11位手机号</p>' +
      '<div class="m2a-modal__actions">' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--ghost" id="m2aPhoneCancelBtn">取消</button>' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--primary" id="m2aPhoneSubmitBtn">发送</button>' +
      '</div></div>';

    /* success */
    var successModal = document.createElement('section');
    successModal.className = 'm2a-modal';
    successModal.id = 'm2aSuccessModal';
    successModal.setAttribute('hidden', '');
    successModal.innerHTML =
      '<div class="m2a-modal__backdrop"></div>' +
      '<div class="m2a-modal__card">' +
      '<h3 class="m2a-modal__title">客服已收到您的信息，请稍等</h3>' +
      '<div class="m2a-modal__actions m2a-modal__actions--center">' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--primary" id="m2aSuccessOkBtn">确定</button>' +
      '</div></div>';

    /* fail */
    var failModal = document.createElement('section');
    failModal.className = 'm2a-modal';
    failModal.id = 'm2aFailModal';
    failModal.setAttribute('hidden', '');
    failModal.innerHTML =
      '<div class="m2a-modal__backdrop"></div>' +
      '<div class="m2a-modal__card">' +
      '<h3 class="m2a-modal__title">发送失败，请稍后重试</h3>' +
      '<div class="m2a-modal__actions m2a-modal__actions--center">' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--primary" id="m2aFailOkBtn">确定</button>' +
      '</div></div>';

    /* 提示（替代系统 alert，样式同用车清单弹层） */
    var messageModal = document.createElement('section');
    messageModal.className = 'm2a-modal';
    messageModal.id = 'm2aMessageModal';
    messageModal.setAttribute('hidden', '');
    messageModal.innerHTML =
      '<div class="m2a-modal__backdrop" id="m2aMessageBackdrop"></div>' +
      '<div class="m2a-modal__card">' +
      '<h3 class="m2a-modal__title" id="m2aMessageText"></h3>' +
      '<div class="m2a-modal__actions m2a-modal__actions--center">' +
      '<button type="button" class="m2a-modal__btn m2a-modal__btn--primary" id="m2aMessageOkBtn">确定</button>' +
      '</div></div>';

    /* checklist backdrop */
    var checklistBackdrop = document.createElement('div');
    checklistBackdrop.className = 'm2a-backdrop';
    checklistBackdrop.id = 'm2aChecklistBackdrop';
    checklistBackdrop.setAttribute('hidden', '');

    /* checklist panel */
    var panel = document.createElement('section');
    panel.className = 'm2a-panel';
    panel.id = 'm2aChecklistPanel';
    panel.setAttribute('hidden', '');
    panel.innerHTML =
      '<div class="m2a-panel__header">' +
      '<h3 class="m2a-panel__title">已选车辆</h3>' +
      '<button type="button" class="m2a-panel__close" id="m2aPanelCloseBtn" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="m2a-panel__body">' +
      '<ul class="m2a-panel__list" id="m2aPanelList"></ul>' +
      '<p class="m2a-panel__empty" id="m2aPanelEmpty">还没有加入车辆，点击「加入清单」开始选车。</p>' +
      '<div class="m2a-valueadd" id="m2aValueAdd">' +
      '<div class="m2a-valueadd__head">' +
      '<h4 class="m2a-valueadd__title">增值服务</h4>' +
      '<a class="m2a-valueadd__more" id="m2aValueAddMore" href="./services.html?v=' +
      m2AssetV() +
      '">了解更多</a>' +
      '</div>' +
      '<ul class="m2a-valueadd__list" id="m2aValueAddList"></ul>' +
      '</div>' +
      '<p class="m2a-panel__original" id="m2aPanelOriginal">原价：¥0</p>' +
      '<p class="m2a-panel__total" id="m2aPanelTotal">总价：¥0</p>' +
      '<div class="m2a-panel__actions">' +
      '<button type="button" class="m2a-panel__clear" id="m2aPanelClearBtn">清空清单</button>' +
      '<button type="button" class="m2a-panel__send" id="m2aPanelSendBtn">选择完成</button>' +
      '</div></div>';

    /* consult */
    var consultModal = document.createElement('section');
    consultModal.className = 'm2a-consult';
    consultModal.id = 'm2aConsultModal';
    consultModal.setAttribute('hidden', '');
    consultModal.innerHTML =
      '<div class="m2a-consult__backdrop" id="m2aConsultBackdrop"></div>' +
      '<div class="m2a-consult__card">' +
      '<button type="button" class="m2a-consult__close" id="m2aConsultCloseBtn" aria-label="关闭">×</button>' +
      '<h3 class="m2a-consult__title">咨询客服</h3>' +
      '<div class="m2a-consult__chat" id="m2aConsultChat"></div>' +
      '<div class="m2a-consult__input-wrap">' +
      '<input type="text" class="m2a-consult__input" id="m2aConsultInput" placeholder="请输入您的问题...">' +
      '<button type="button" class="m2a-consult__send" id="m2aConsultSendBtn">发送</button>' +
      '</div></div>';

    var pkgPickModal = document.createElement('div');
    pkgPickModal.id = 'm2aPackagePickModal';
    pkgPickModal.className = 'm2a-days-modal';
    pkgPickModal.setAttribute('hidden', '');
    pkgPickModal.innerHTML =
      '<div style="position:relative">' +
      '<div class="m2a-days-card">' +
      '<h3 class="m2a-days-title">请选择套餐</h3>' +
      '<div id="m2aPackagePickOptions"></div>' +
      '</div>' +
      '<button type="button" class="m2a-days-close" id="m2aPackagePickClose" aria-label="关闭">×</button>' +
      '</div>';

    var addSuccessToast = document.createElement('div');
    addSuccessToast.id = 'm2aAddSuccessToast';
    addSuccessToast.className = 'm2a-add-success-toast';
    addSuccessToast.setAttribute('role', 'status');
    addSuccessToast.setAttribute('aria-live', 'polite');
    addSuccessToast.setAttribute('aria-hidden', 'true');
    addSuccessToast.textContent = '添加成功，可在用车清单中查看';

    document.body.appendChild(daysModal);
    document.body.appendChild(qtyModal);
    document.body.appendChild(phoneModal);
    document.body.appendChild(successModal);
    document.body.appendChild(failModal);
    document.body.appendChild(messageModal);
    document.body.appendChild(checklistBackdrop);
    document.body.appendChild(panel);
    document.body.appendChild(consultModal);
    document.body.appendChild(pkgPickModal);
    document.body.appendChild(addSuccessToast);
    fillValueAddSection();
  }

  function openChecklistPanel() {
    var panel = document.getElementById('m2aChecklistPanel');
    var backdrop = document.getElementById('m2aChecklistBackdrop');
    if (!panel) return;
    var opening = panel.hasAttribute('hidden');
    renderPanel();
    if (opening) m2aLockOverlayScroll();
    panel.removeAttribute('hidden');
    if (backdrop) backdrop.removeAttribute('hidden');
  }

  function closeChecklistPanel() {
    var panel = document.getElementById('m2aChecklistPanel');
    var backdrop = document.getElementById('m2aChecklistBackdrop');
    if (!panel || panel.hasAttribute('hidden')) return;
    panel.setAttribute('hidden', '');
    if (backdrop) backdrop.setAttribute('hidden', '');
    m2aUnlockOverlayScroll();
  }

  function showMessageModal(text) {
    var modal = document.getElementById('m2aMessageModal');
    var el = document.getElementById('m2aMessageText');
    if (el) el.textContent = String(text == null ? '' : text);
    if (modal) {
      var opening = modal.hasAttribute('hidden');
      if (opening) m2aLockOverlayScroll();
      modal.removeAttribute('hidden');
    }
  }

  function closeMessageModal() {
    var modal = document.getElementById('m2aMessageModal');
    if (!modal || modal.hasAttribute('hidden')) return;
    modal.setAttribute('hidden', '');
    m2aUnlockOverlayScroll();
  }

  /** 是否至少有一辆已选车辆（不含仅增值服务）——「选择完成」校验用 */
  function hasChecklistCar() {
    var map = readChecklistMap() || {};
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('service:') !== 0) return true;
    }
    return false;
  }

  function fillValueAddSection() {
    var wrap = document.getElementById('m2aValueAddList');
    var more = document.getElementById('m2aValueAddMore');
    if (more) more.href = m2aServicesPageUrl();
    if (!wrap) return;
    wrap.innerHTML = M2A_VALUEADD_SERVICES.map(function (row) {
      return '<li class="m2a-valueadd__item">' +
        '<img class="m2a-valueadd__icon" src="' + esc(m2aM2IconUrl(row.icon)) + '" alt="" width="28" height="28">' +
        '<span class="m2a-valueadd__name">' + esc(row.name) + '</span>' +
        '<button type="button" class="m2a-valueadd__add" data-m2a-add-service="' + esc(row.name) + '">加入</button>' +
        '</li>';
    }).join('');
    var addBtns = wrap.querySelectorAll('[data-m2a-add-service]');
    for (var i = 0; i < addBtns.length; i++) {
      (function (b) {
        m2ArmTap(b, function () {
          if (b.disabled) return;
          var svcName = String(b.getAttribute('data-m2a-add-service') || '').trim();
          if (svcName) addServiceToChecklist(svcName);
        });
      })(addBtns[i]);
    }
  }

  function syncValueAddButtons(map) {
    var panel = document.getElementById('m2aChecklistPanel');
    if (!panel) return;
    var btns = panel.querySelectorAll('[data-m2a-add-service]');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var name = String(btn.getAttribute('data-m2a-add-service') || '').trim();
      var id = 'service:' + name;
      var on = map[id];
      btn.textContent = on ? '已添加' : '加入';
      btn.disabled = !!on;
    }
  }

  /** opts.quietDup：为 true 时重复添加仅返回 dup，不弹全屏 modal（服务页「立享服务」改用 Toast）。 */
  function addServiceToChecklist(name, opts) {
    opts = opts || {};
    var n = String(name || '').trim();
    if (!n) return 'noop';
    var id = 'service:' + n;
    var map = readChecklistMap();
    if (map[id]) {
      if (!opts.quietDup) showMessageModal('该服务已添加到用车清单');
      return 'dup';
    }
    map[id] = {
      car_id: id,
      car_name: n,
      model_name: n + '（服务）',
      rent_price: 0,
      days: '单日 (24小时)',
    };
    if (!writeChecklistMap(map)) {
      delete map[id];
      showMessageModal('写入清单失败，请关闭无痕/私密模式或减少占用后重试');
      return 'fail';
    }
    renderPanel();
    return 'added';
  }

  /* ── Render checklist panel ── */
  function renderPanel() {
    var map = readChecklistMap();
    var listEl = document.getElementById('m2aPanelList');
    var emptyEl = document.getElementById('m2aPanelEmpty');
    var originalEl = document.getElementById('m2aPanelOriginal');
    var totalEl = document.getElementById('m2aPanelTotal');
    if (!listEl) return;

    var origTotal = 0;
    var total = 0;
    var htmlParts = [];

    var groups = m2aVehicleGroupsFromMap(map);
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      var title = esc(String(g.rows[0].item.model_name || g.rows[0].item.car_name || g.carId));
      var subDays = 0;
      var subMoney = 0;
      var linesInner = '';
      for (var ri = 0; ri < g.rows.length; ri++) {
        var r = g.rows[ri];
        var item = r.item;
        var vd = String(item.days || '').trim();
        var qNow = getItemQty(item);
        var qtyPart = qNow > 1 ? ' ×' + qNow + '份' : '';
        var lt = calcItemTotal(item);
        var lo = calcItemOriginal(item);
        origTotal += lo;
        total += lt;
        subDays += getDaysMultiplier(item.days) * qNow;
        subMoney += lt;
        var lineLabel = esc(vd + qtyPart);
        var pricePart = lt <= 0 ? '' : '¥' + Math.round(lt);
        linesInner +=
          '<li class="m2a-panel__subitem">' +
          '<div class="m2a-panel__subitem-main">' +
          '<span class="m2a-panel__subitem-name">' +
          lineLabel +
          (pricePart ? ' · ' + pricePart : '') +
          '</span></div>' +
          '<div class="m2a-panel__subitem-actions">' +
          '<button type="button" class="m2a-panel__edit-qty" data-m2a-checklist-edit-row="' +
          esc(r.id) +
          '">修改</button>' +
          '<button type="button" class="m2a-panel__item-remove m2a-panel__subitem-remove" data-remove-id="' +
          esc(r.id) +
          '">移除</button>' +
          '</div></li>';
      }
      htmlParts.push(
        '<li class="m2a-panel__group">' +
          '<div class="m2a-panel__group-head">' +
          title +
          '</div>' +
          '<ul class="m2a-panel__sublist">' +
          linesInner +
          '<li class="m2a-panel__subtotal">本车合计 · ' +
          subDays +
          ' 天 · ¥' +
          Math.round(subMoney) +
          '</li></ul></li>'
      );
    }

    var otherIds = m2aOtherChecklistIdsInKeyOrder(map);
    for (var oi = 0; oi < otherIds.length; oi++) {
      var oid = otherIds[oi];
      var oitem = map[oid] || {};
      var oname = esc(String(oitem.model_name || oitem.car_name || oid));
      var isFreeService = (parseInt(String(oitem.rent_price), 10) || 0) <= 0;
      var odaysText = isFreeService ? ' - 免费' : oitem.days ? ' - ' + esc(oitem.days) : '';
      var showQtyRow = oid.indexOf('service:') !== 0;
      origTotal += calcItemOriginal(oitem);
      total += calcItemTotal(oitem);
      if (showQtyRow) {
        var qFlat = getItemQty(oitem);
        var qFlatPart = qFlat > 1 ? ' ×' + qFlat + '份' : '';
        htmlParts.push(
          '<li class="m2a-panel__item">' +
            '<span class="m2a-panel__item-name">' +
            oname +
            odaysText +
            esc(qFlatPart) +
            '</span>' +
            '<div class="m2a-panel__subitem-actions">' +
            '<button type="button" class="m2a-panel__edit-qty" data-m2a-checklist-edit-row="' +
            esc(oid) +
            '">修改</button>' +
            '<button type="button" class="m2a-panel__item-remove" data-remove-id="' +
            esc(oid) +
            '">移除</button>' +
            '</div>' +
            '</li>'
        );
      } else {
        htmlParts.push(
          '<li class="m2a-panel__item">' +
            '<span class="m2a-panel__item-name">' +
            oname +
            odaysText +
            '</span>' +
            '<button type="button" class="m2a-panel__item-remove" data-remove-id="' +
            esc(oid) +
            '">移除</button>' +
            '</li>'
        );
      }
    }

    listEl.innerHTML = htmlParts.join('');
    var ids = Object.keys(map || {});
    if (emptyEl) emptyEl.style.display = ids.length ? 'none' : '';
    if (originalEl) originalEl.textContent = '原价：¥' + Math.round(origTotal);
    if (totalEl) totalEl.textContent = '总价：¥' + Math.round(total);
    syncValueAddButtons(map);
    var m2RailAdd = document.getElementById('m2BtnAddChecklist');
    if (m2RailAdd && window.m2CurrentCar && window.m2CurrentCar.car_id) {
      var railPicked = m2aCarHasChecklistRows(map, window.m2CurrentCar.car_id);
      var railSpan =
        m2RailAdd.querySelector('.m2-car-rail__label') ||
        m2RailAdd.querySelector('span:not(.m2-chooser__bottom-icon)');
      if (railSpan) railSpan.textContent = railPicked ? '继续添加' : '加入清单';
      m2RailAdd.setAttribute('aria-label', railPicked ? '继续添加' : '加入清单');
    }
    var removes = listEl.querySelectorAll('.m2a-panel__item-remove');
    for (var rmx = 0; rmx < removes.length; rmx++) {
      (function (rb) {
        m2ArmTap(rb, function () {
          var rid = String(rb.getAttribute('data-remove-id') || '').trim();
          var mmap = readChecklistMap();
          if (!rid || !mmap[rid]) return;
          delete mmap[rid];
          writeChecklistMap(mmap);
          renderPanel();
        });
      })(removes[rmx]);
    }
    var editBtns = listEl.querySelectorAll('[data-m2a-checklist-edit-row]');
    for (var ei = 0; ei < editBtns.length; ei++) {
      (function (eb) {
        m2ArmTap(eb, function () {
          var ek = String(eb.getAttribute('data-m2a-checklist-edit-row') || '').trim();
          if (ek) openQtyStepModalForChecklistEdit(ek);
        });
      })(editBtns[ei]);
    }
  }

  /* ── Days select → 份数 ── */
  var pendingCarItem = null;
  var pendingQtyDraft = null;
  var m2aQtyCurrent = 1;
  /** 套餐档位确认后进入份数；取消份数时应回到套餐弹窗而非用车天数 */
  var m2aQtyFollowsPackagePick = false;
  /** 详情页价格区直达份数弹窗（未经过「请选择用车天数」层） */
  var m2aQtyStandaloneMode = false;
  /** 清单「修改」→ 份数弹窗：写入已有 storage key，不与新增合并 */
  var m2aChecklistEditRowKey = null;
  var m2aAddSuccessToastTimer = null;

  function showM2aAddSuccessToast() {
    var el = document.getElementById('m2aAddSuccessToast');
    if (!el) return;
    if (m2aAddSuccessToastTimer) {
      clearTimeout(m2aAddSuccessToastTimer);
      m2aAddSuccessToastTimer = null;
    }
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('is-visible');
    m2aAddSuccessToastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
      el.setAttribute('aria-hidden', 'true');
      m2aAddSuccessToastTimer = null;
    }, 1000);
  }

  function hideDaysModalOnly() {
    var modal = document.getElementById('m2aDaysModal');
    if (modal) modal.setAttribute('hidden', '');
  }
  function showDaysModalOnly() {
    var modal = document.getElementById('m2aDaysModal');
    if (modal) modal.removeAttribute('hidden');
  }

  function closeQtyStepModalUi() {
    var qm = document.getElementById('m2aQtyModal');
    if (qm) qm.setAttribute('hidden', '');
  }

  function setM2aQtyModalTitle(titleText) {
    var qm = document.getElementById('m2aQtyModal');
    if (!qm) return;
    var h = qm.querySelector('.m2a-days-title');
    if (h) h.textContent = String(titleText || '选择份数');
  }

  function openQtyStepModalForChecklistEdit(rowKey) {
    var map = readChecklistMap();
    var item = map[rowKey];
    if (!item || !item.car_id) return;
    m2aChecklistEditRowKey = rowKey;
    pendingQtyDraft = {
      car_id: item.car_id,
      car_name: item.car_name,
      model_name: item.model_name,
      rent_price: item.rent_price,
      days: item.days,
    };
    if (item.pkg_lines && item.pkg_lines.length) {
      pendingQtyDraft.pkg_lines = item.pkg_lines.slice();
    }
    m2aQtyCurrent = getItemQty(item);
    m2aQtyStandaloneMode = true;
    setM2aQtyModalTitle('修改份数');
    var qmEl = document.getElementById('m2aQtyModal');
    var qtyAlreadyVisible = qmEl && !qmEl.hasAttribute('hidden');
    if (!qtyAlreadyVisible) m2aLockOverlayScroll();
    syncQtyStepUi();
    if (qmEl) qmEl.removeAttribute('hidden');
  }

  function syncQtyStepUi() {
    var span = document.getElementById('m2aQtyValue');
    var minus = document.getElementById('m2aQtyMinus');
    var plus = document.getElementById('m2aQtyPlus');
    var totalDaysEl = document.getElementById('m2aQtyTotalDays');
    if (span) span.textContent = String(m2aQtyCurrent);
    if (minus) minus.disabled = m2aQtyCurrent <= 1;
    if (plus) plus.disabled = m2aQtyCurrent >= 99;
    if (totalDaysEl) {
      var draft = pendingQtyDraft;
      if (draft && draft.pkg_lines && draft.pkg_lines.length) {
        totalDaysEl.textContent = '合计 ' + Math.max(1, m2aQtyCurrent) + ' 套';
      } else {
        var dtext = draft && draft.days;
        var per = getDaysMultiplier(dtext);
        var total = Math.max(0, per) * Math.max(1, m2aQtyCurrent);
        totalDaysEl.textContent = '合计 ' + total + ' 天';
      }
    }
  }

  function openQtyStepModal(entryDraft, standalone) {
    m2aChecklistEditRowKey = null;
    pendingQtyDraft = entryDraft;
    m2aQtyCurrent = 1;
    m2aQtyStandaloneMode = !!standalone;
    setM2aQtyModalTitle('选择份数');
    if (!m2aQtyStandaloneMode) hideDaysModalOnly();
    if (m2aQtyStandaloneMode) {
      var qmEl = document.getElementById('m2aQtyModal');
      var qtyAlreadyVisible = qmEl && !qmEl.hasAttribute('hidden');
      if (!qtyAlreadyVisible) m2aLockOverlayScroll();
    }
    syncQtyStepUi();
    var qm = document.getElementById('m2aQtyModal');
    if (qm) qm.removeAttribute('hidden');
  }

  function cancelQtyStepModal() {
    var standalone = m2aQtyStandaloneMode;
    pendingQtyDraft = null;
    m2aQtyStandaloneMode = false;
    m2aChecklistEditRowKey = null;
    setM2aQtyModalTitle('选择份数');
    closeQtyStepModalUi();
    if (standalone) m2aUnlockOverlayScroll();
    else if (m2aQtyFollowsPackagePick) showM2PackagePickModalOnly();
    else showDaysModalOnly();
  }

  function confirmQtyStepModal() {
    var draft = pendingQtyDraft;
    if (!draft || !draft.car_id) {
      cancelQtyStepModal();
      return;
    }
    var entry = {
      car_id: draft.car_id,
      car_name: draft.car_name,
      model_name: draft.model_name,
      rent_price: draft.rent_price,
      days: draft.days,
      qty: m2aQtyCurrent,
    };
    if (draft.pkg_lines && draft.pkg_lines.length) {
      entry.pkg_lines = draft.pkg_lines.slice();
    }
    var map = readChecklistMap();
    var editKey = m2aChecklistEditRowKey;
    if (editKey) {
      var tgt = map[editKey];
      if (!tgt) {
        m2aChecklistEditRowKey = null;
        cancelQtyStepModal();
        return;
      }
      tgt.qty = Math.min(99, Math.max(1, m2aQtyCurrent));
      if (!writeChecklistMap(map)) {
        showMessageModal('保存清单失败，请在浏览器中允许网页存储数据');
        return;
      }
      renderPanel();
      m2aChecklistEditRowKey = null;
      pendingQtyDraft = null;
      m2aQtyStandaloneMode = false;
      m2aQtyFollowsPackagePick = false;
      closeQtyStepModalUi();
      setM2aQtyModalTitle('选择份数');
      m2aUnlockOverlayScroll();
      showM2aAddSuccessToast();
      return;
    }
    var isPkgEntry = entry.pkg_lines && entry.pkg_lines.length;
    if (isPkgEntry) {
      var pkgKey = m2aPackageRowStorageKey(entry.car_id);
      var prevPkg = map[pkgKey];
      if (prevPkg && prevPkg.pkg_lines && prevPkg.pkg_lines.length) {
        var sumP = getItemQty(prevPkg) + getItemQty(entry);
        prevPkg.qty = Math.min(99, sumP);
        prevPkg.rent_price = entry.rent_price;
        prevPkg.car_name = entry.car_name;
        prevPkg.model_name = entry.model_name;
        prevPkg.days = entry.days;
        prevPkg.pkg_lines = entry.pkg_lines.slice();
      } else {
        map[pkgKey] = entry;
      }
    } else {
      var rowKey = m2aVehicleRowStorageKey(entry.car_id, entry.days);
      var prev = map[rowKey];
      if (prev && !prev.pkg_lines) {
        var sum = getItemQty(prev) + getItemQty(entry);
        prev.qty = Math.min(99, sum);
        prev.rent_price = entry.rent_price;
        prev.car_name = entry.car_name;
        prev.model_name = entry.model_name;
      } else {
        map[rowKey] = entry;
      }
    }
    if (!writeChecklistMap(map)) {
      showMessageModal('保存清单失败，请在浏览器中允许网页存储数据');
      return;
    }
    renderPanel();
    var standalone = m2aQtyStandaloneMode;
    var pkgFollow = m2aQtyFollowsPackagePick;
    m2aQtyFollowsPackagePick = false;
    pendingQtyDraft = null;
    m2aQtyStandaloneMode = false;
    closeQtyStepModalUi();
    if (standalone) {
      m2aUnlockOverlayScroll();
      pendingCarItem = null;
    } else if (pkgFollow) {
      m2aUnlockOverlayScroll();
    } else {
      closeDaysModal();
    }
    showM2aAddSuccessToast();
  }

  /** 详情页 #m2Pricing 四档租用天数点击入口（与清单字段 days 文案一致） */
  function m2aOpenQtyFromDetailPricingLine(lineKey) {
    var map = {
      '1': '单日 (24小时)',
      '2': '一周 (7天)',
      '3': '半月 (15天)',
      '4': '整月 (30天)',
    };
    var daysText = map[String(lineKey)];
    if (!daysText) return;
    var dm = document.getElementById('m2aDaysModal');
    if (dm && !dm.hasAttribute('hidden')) closeDaysModal();
    var car = window.m2CurrentCar;
    if (!car || !car.car_id) {
      showMessageModal('页面未就绪，请稍后再试');
      return;
    }
    openQtyStepModal(
      {
        car_id: car.car_id,
        car_name: car.car_name,
        model_name: car.model_name,
        rent_price: car.rent_price,
        days: daysText,
      },
      true
    );
  }

  try {
    window.m2aOpenQtyFromDetailPricingLine = m2aOpenQtyFromDetailPricingLine;
    window.m2aOpenQtyStepModalForChecklistEdit = openQtyStepModalForChecklistEdit;
  } catch (eM2aQtyExp) {}

  function openDaysModal(item, rentPrice) {
    closeQtyStepModalUi();
    pendingQtyDraft = null;
    m2aQtyStandaloneMode = false;
    m2aQtyFollowsPackagePick = false;
    m2aChecklistEditRowKey = null;
    setM2aQtyModalTitle('选择份数');
    pendingCarItem = item;
    var price = parseInt(String(rentPrice || 0), 10) || 0;
    var cfg = window.mangoPricingConfig || { day7: { multiplier: 6.5, divisor: 7 }, day15: { multiplier: 13, divisor: 15 }, day30: { multiplier: 23, divisor: 30 } };
    var p1 = price;
    var p7 = Math.floor((price * cfg.day7.multiplier) / cfg.day7.divisor);
    var p15 = Math.floor((price * cfg.day15.multiplier) / cfg.day15.divisor);
    var p30 = Math.floor((price * cfg.day30.multiplier) / cfg.day30.divisor);
    var rows = [
      ['单日 (24小时)', p1],
      ['一周 (7天)', p7],
      ['半月 (15天)', p15],
      ['整月 (30天)', p30],
    ];
    var optEl = document.getElementById('m2aDaysOptions');
    if (optEl) {
      optEl.innerHTML = rows.map(function (r) {
        return '<div class="m2a-days-row">' +
          '<span class="m2a-days-label">' + esc(r[0]) + '</span>' +
          '<span class="m2a-days-price"><span class="m2a-days-price-num">¥' + r[1] + '</span><span class="m2a-days-price-unit">/天</span></span>' +
          '<button type="button" class="m2a-days-confirm" data-days="' + esc(r[0]) + '">确认</button>' +
          '</div>';
      }).join('');
      var rowBtns = optEl.querySelectorAll('.m2a-days-confirm');
      for (var bi = 0; bi < rowBtns.length; bi++) {
        (function (rowBtn) {
          m2ArmTap(rowBtn, function () {
            var src = pendingCarItem;
            if (!src || !src.car_id) return;
            var daysText = String(rowBtn.getAttribute('data-days') || '').trim() || '单日 (24小时)';
            openQtyStepModal({
              car_id: src.car_id,
              car_name: src.car_name,
              model_name: src.model_name,
              rent_price: src.rent_price,
              days: daysText,
            });
          });
        })(rowBtns[bi]);
      }
    }
    var modal = document.getElementById('m2aDaysModal');
    if (modal) {
      var opening = modal.hasAttribute('hidden');
      if (opening) m2aLockOverlayScroll();
      modal.removeAttribute('hidden');
    }
  }
  function closeDaysModal() {
    m2aQtyStandaloneMode = false;
    m2aQtyFollowsPackagePick = false;
    m2aChecklistEditRowKey = null;
    setM2aQtyModalTitle('选择份数');
    var flowActive = pendingCarItem != null || pendingQtyDraft != null;
    closeQtyStepModalUi();
    pendingQtyDraft = null;
    var modal = document.getElementById('m2aDaysModal');
    if (modal) modal.setAttribute('hidden', '');
    pendingCarItem = null;
    if (flowActive) m2aUnlockOverlayScroll();
  }

  function hideM2PackagePickModalOnly() {
    var m = document.getElementById('m2aPackagePickModal');
    if (m) m.setAttribute('hidden', '');
  }

  function showM2PackagePickModalOnly() {
    var m = document.getElementById('m2aPackagePickModal');
    if (m) m.removeAttribute('hidden');
  }

  function closeM2PackagePickModal() {
    var m = document.getElementById('m2aPackagePickModal');
    if (!m || m.hasAttribute('hidden')) return;
    m.setAttribute('hidden', '');
    m2aQtyFollowsPackagePick = false;
    m2aUnlockOverlayScroll();
  }

  function openM2PackagePickModal() {
    var track = document.querySelector('[data-plan-track]');
    var modal = document.getElementById('m2aPackagePickModal');
    var opts = document.getElementById('m2aPackagePickOptions');
    if (!modal || !opts) return;
    if (!track) {
      showMessageModal('未找到套餐内容');
      return;
    }
    var cards = track.querySelectorAll('.m2p-plan__card');
    if (!cards.length) {
      showMessageModal('暂无可选套餐');
      return;
    }
    opts.innerHTML = Array.prototype.map.call(cards, function (card, idx) {
      var nameEl = card.querySelector('.m2p-plan__name');
      var itemsEl = card.querySelector('.m2p-plan__items');
      var priceEl = card.querySelector('.m2p-plan__price');
      var name = nameEl ? String(nameEl.textContent || '').trim() : ('套餐 ' + (idx + 1));
      var items = itemsEl ? String(itemsEl.textContent || '').trim() : '';
      var price = priceEl ? String(priceEl.textContent || '').trim() : '';
      return '<div class="m2a-days-row m2a-pkgpick-row">' +
        '<div class="m2a-pkgpick-cell-label">' +
        '<span class="m2a-days-label">' + esc(name) + '</span>' +
        (items ? '<span class="m2a-pkgpick-desc">' + esc(items) + '</span>' : '') +
        '</div>' +
        '<span class="m2a-days-price"><span class="m2a-days-price-num">' + esc(price) + '</span></span>' +
        '<button type="button" class="m2a-days-confirm" data-m2a-pkg-idx="' + idx + '">确认</button>' +
        '</div>';
    }).join('');
    var pkgOpening = modal.hasAttribute('hidden');
    if (pkgOpening) m2aLockOverlayScroll();
    modal.removeAttribute('hidden');
    var pkgBtns = opts.querySelectorAll('[data-m2a-pkg-idx]');
    for (var pi = 0; pi < pkgBtns.length; pi++) {
      (function (pb) {
        m2ArmTap(pb, function () {
          var idx2 = parseInt(String(pb.getAttribute('data-m2a-pkg-idx') || ''), 10);
          if (!isFinite(idx2)) return;
          confirmM2PackagePick(idx2);
        });
      })(pkgBtns[pi]);
    }
  }

  function confirmM2PackagePick(idx) {
    var fn = window.m2BuildPackageChecklistItemAtIndex;
    if (typeof fn !== 'function') {
      showMessageModal('页面未就绪，请刷新重试');
      return;
    }
    var pkg = fn(idx);
    if (!pkg || !pkg.car_id) {
      showMessageModal('无法读取套餐信息');
      return;
    }
    var pkgEntry = {
      car_id: pkg.car_id,
      car_name: pkg.car_name,
      model_name: pkg.model_name,
      rent_price: Math.max(0, parseInt(String(pkg.rent_price), 10) || 0),
      days: String(pkg.days || '套餐'),
    };
    if (pkg.pkg_lines && pkg.pkg_lines.length) {
      pkgEntry.pkg_lines = pkg.pkg_lines.slice();
    }
    hideM2PackagePickModalOnly();
    m2aQtyFollowsPackagePick = true;
    openQtyStepModal(pkgEntry, false);
  }

  /** 套餐详情页：点击轨道上的套餐卡片直接进入「选择份数」（与档位弹窗内确认后逻辑一致，standalone 打开） */
  function m2aOpenPackageQtyForPlanIndex(idx) {
    if (!document.body.classList.contains('m2-package')) return;
    var n = parseInt(String(idx), 10);
    if (!isFinite(n) || n < 0) return;
    var fn = window.m2BuildPackageChecklistItemAtIndex;
    if (typeof fn !== 'function') {
      showMessageModal('页面未就绪，请刷新重试');
      return;
    }
    var pkg = fn(n);
    if (!pkg || !pkg.car_id) {
      showMessageModal('无法读取套餐信息');
      return;
    }
    var pkgEntry = {
      car_id: pkg.car_id,
      car_name: pkg.car_name,
      model_name: pkg.model_name,
      rent_price: Math.max(0, parseInt(String(pkg.rent_price), 10) || 0),
      days: String(pkg.days || '套餐'),
    };
    if (pkg.pkg_lines && pkg.pkg_lines.length) {
      pkgEntry.pkg_lines = pkg.pkg_lines.slice();
    }
    var pm = document.getElementById('m2aPackagePickModal');
    if (pm && !pm.hasAttribute('hidden')) {
      closeM2PackagePickModal();
    }
    m2aQtyFollowsPackagePick = false;
    m2aChecklistEditRowKey = null;
    openQtyStepModal(pkgEntry, true);
  }

  try {
    window.m2aOpenPackageQtyForPlanIndex = m2aOpenPackageQtyForPlanIndex;
  } catch (ePkgCardQty) {}

  /* ── Add to checklist ── */
  function handleAddChecklist() {
    if (document.body.classList.contains('m2-package')) {
      openM2PackagePickModal();
      return;
    }
    if (document.body.classList.contains('page-services')) {
      var activeTitle = document.querySelector('.carousel-slide.active .slide-title');
      var svcName = activeTitle ? String(activeTitle.textContent || '').trim() : '';
      if (!svcName) {
        showMessageModal('请先选择服务');
        return;
      }
      addServiceToChecklist(svcName);
      return;
    }
    var car = window.m2CurrentCar;
    if (!car || !car.car_id) { showMessageModal('请先选择车辆'); return; }
    /* 已有该车租期时再点「加入清单」也应进入选天数/份数流程，便于同档位合并份数 */
    openDaysModal({
      car_id: car.car_id,
      car_name: car.car_name,
      model_name: car.model_name,
      rent_price: car.rent_price,
    }, car.rent_price);
  }

  /* ── Send checklist（企业微信：车辆 / 套餐 / 增值服务 分段标题） ── */
  function sendChecklist(phone) {
    var map = readChecklistMap();
    var ids = Object.keys(map || {});
    if (!ids.length) return;
    function pushTrim(arr, s) {
      var t = String(s || '').trim();
      if (t) arr.push(t);
    }
    var vehicles = [];
    var packages = [];
    var valueAdd = [];
    var vehicleSubtotal = 0;
    var vehicleGroups = m2aVehicleGroupsFromMap(map);
    for (var vgi = 0; vgi < vehicleGroups.length; vgi++) {
      var vg = vehicleGroups[vgi];
      var subDays = 0;
      var subMoney = 0;
      for (var vr = 0; vr < vg.rows.length; vr++) {
        var vrRow = vg.rows[vr];
        var vit = vrRow.item;
        var vn = String(vit.model_name || vit.car_name || vg.carId).trim();
        var vd = String(vit.days || '单日 (24小时)').trim();
        var vt = Math.round(calcItemTotal(vit));
        vehicleSubtotal += vt;
        subDays += getDaysMultiplier(vit.days) * getItemQty(vit);
        subMoney += vt;
        var qPart = getItemQty(vit) > 1 ? ' ×' + getItemQty(vit) + '份' : '';
        pushTrim(vehicles, vn + '（' + vd + '）' + qPart + ' ¥' + vt);
      }
      pushTrim(
        vehicles,
        '　└ 本车合计：' + subDays + ' 天 · ¥' + Math.round(subMoney)
      );
    }
    ids.forEach(function (id) {
      if (id.indexOf('row:') === 0) return;
      var item = map[id] || {};
      var pl = item.pkg_lines;
      if (id.indexOf('service:') === 0) {
        var sn = String(item.model_name || item.car_name || id).trim();
        var st = Math.round(calcItemTotal(item));
        pushTrim(valueAdd, sn + ' ¥' + st);
      } else if (pl && pl.length) {
        for (var j = 0; j < pl.length; j++) pushTrim(packages, pl[j]);
      } else if (id.indexOf('pkg:') === 0) {
        var pn = String(item.model_name || item.car_name || id).trim();
        var pd = String(item.days || '套餐').trim();
        var pt = Math.round(calcItemTotal(item));
        pushTrim(packages, pn + '（' + pd + '） ¥' + pt);
      } else {
        var vn2 = String(item.model_name || item.car_name || id).trim();
        var vd2 = String(item.days || '单日 (24小时)').trim();
        var vt2 = Math.round(calcItemTotal(item));
        vehicleSubtotal += vt2;
        var qPart2 = getItemQty(item) > 1 ? ' ×' + getItemQty(item) + '份' : '';
        pushTrim(vehicles, vn2 + '（' + vd2 + '）' + qPart2 + ' ¥' + vt2);
      }
    });
    if (vehicles.length) {
      pushTrim(vehicles, '合计 ¥' + Math.round(vehicleSubtotal));
    }
    var flatLines = vehicles.concat(packages, valueAdd);
    fetchPost('/api/wecom/checklist-send', {
      user: String(sessionStorage.getItem('mango_driver_name') || '未登录用户'),
      phone: String(phone || '').trim(),
      sections: { vehicles: vehicles, packages: packages, value_add: valueAdd },
      /* 兼容未升级的后端，且 sections 解析异常时可回退为单一车辆清单格式 */
      lines: flatLines,
    })
      .then(function (o) {
        if (o.ok && o.j && o.j.ok) {
          writeChecklistMap({});
          renderPanel();
          /* 必须同时关掉清单全屏遮罩，否则点「确定」后只剩 blur、无面板 */
          closeChecklistPanel();
          var suc = document.getElementById('m2aSuccessModal');
          if (suc) {
            m2aLockOverlayScroll();
            suc.removeAttribute('hidden');
          }
        } else {
          closeChecklistPanel();
          var fail = document.getElementById('m2aFailModal');
          if (fail) {
            m2aLockOverlayScroll();
            fail.removeAttribute('hidden');
          }
        }
      })
      .catch(function () {
        closeChecklistPanel();
        var fail = document.getElementById('m2aFailModal');
        if (fail) {
          m2aLockOverlayScroll();
          fail.removeAttribute('hidden');
        }
      });
  }

  /* ── Consult ── */
  var consultBusy = false;
  function appendConsultMsg(role, text, opts) {
    var chat = document.getElementById('m2aConsultChat');
    if (!chat) return;
    var el = document.createElement('div');
    el.className = 'm2a-consult__msg m2a-consult__msg--' + (role === 'user' ? 'user' : 'assistant');
    var textEl = document.createElement('span');
    textEl.className = 'm2a-consult__msg-text';
    textEl.textContent = String(text || '');
    el.appendChild(textEl);
    if (opts && opts.qrSrc && role !== 'user') {
      var qr = document.createElement('img');
      qr.className = 'm2a-consult__msg-qr';
      qr.src = String(opts.qrSrc);
      qr.alt = String(opts.qrAlt || '客服微信二维码');
      el.appendChild(qr);
    }
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }
  function ensureConsultWelcome() {
    var chat = document.getElementById('m2aConsultChat');
    if (!chat || chat.childElementCount > 0) return;
    appendConsultMsg(
      'assistant',
      '您好，我是芒果超跑的AI客服，有什么问题您可以直接问我，或者联系我们的客服他们将给您最专业的回答，他们的联系方式是：13033333370，也可以扫描下方的二维码添加微信',
      { qrSrc: '/media-webp/photos/index/logo/二维码.webp?v=' + m2AssetV(), qrAlt: '客服微信二维码' }
    );
  }
  function openConsultModal() {
    var modal = document.getElementById('m2aConsultModal');
    if (!modal) return;
    var opening = modal.hasAttribute('hidden');
    if (opening) m2aLockOverlayScroll();
    modal.removeAttribute('hidden');
    ensureConsultWelcome();
    var input = document.getElementById('m2aConsultInput');
    if (input) input.focus();
  }
  function closeConsultModal() {
    var modal = document.getElementById('m2aConsultModal');
    if (!modal || modal.hasAttribute('hidden')) return;
    modal.setAttribute('hidden', '');
    m2aUnlockOverlayScroll();
  }
  function sendConsultQuestion() {
    if (consultBusy) return;
    var input = document.getElementById('m2aConsultInput');
    var sendBtn = document.getElementById('m2aConsultSendBtn');
    var q = input ? String(input.value || '').trim() : '';
    if (!q) return;
    appendConsultMsg('user', q);
    if (input) input.value = '';
    consultBusy = true;
    if (sendBtn) sendBtn.disabled = true;
    var car = window.m2CurrentCar;
    fetchPost('/api/ai-consult', {
      message: q,
      car_name: car ? (car.car_name || '') : '',
      user: String(sessionStorage.getItem('mango_driver_name') || ''),
    })
      .then(function (o) {
        var j = o && o.j ? o.j : {};
        if (o && o.ok && j.ok && j.reply) appendConsultMsg('assistant', j.reply);
        else if (j.error === 'missing_api_key')
          appendConsultMsg(
            'assistant',
            'AI 客服未配置（缺少 ZP_API_KEY），请直接联系：13033333370、13033333610。'
          );
        else appendConsultMsg('assistant', '客服暂时繁忙，请稍后重试。');
      })
      .catch(function () { appendConsultMsg('assistant', '网络异常，请稍后重试。'); })
      .then(function () {
        consultBusy = false;
        if (sendBtn) sendBtn.disabled = false;
      });
  }

  /* ── Bind events ── */
  /** 服务页「立享服务」底部 Toast（与侧边栏「加入清单」共用同一写入逻辑） */
  function bindServiceEnjoyToast() {
    var btn = document.getElementById('m2ServiceAddBtn');
    var toast = document.getElementById('m2ServiceToast');
    if (!btn || !toast) return;
    var toastTimer = null;
    function showToast(text) {
      toast.textContent = String(text || '');
      toast.classList.add('is-show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove('is-show');
      }, 1300);
    }
    m2ArmTap(btn, function () {
      if (!document.body.classList.contains('page-services')) return;
      var activeTitle = document.querySelector('.carousel-slide.active .slide-title');
      var svcName = activeTitle ? String(activeTitle.textContent || '').replace(/\u200b/g, '').trim() : '';
      if (!svcName) return;
      var r = addServiceToChecklist(svcName, { quietDup: true });
      if (r === 'added') showToast('已添加，可在用车清单中查看');
      else if (r === 'dup') showToast('该服务已添加到用车清单');
    });
  }

  function bindEvents() {
    if (window.__m2aBindEventsDone) return;
    window.__m2aBindEventsDone = true;
    bindServiceEnjoyToast();
    /* 加入清单（UC 上对 rail 也需可靠触控） */
    var addBtn = document.getElementById('m2BtnAddChecklist');
    if (addBtn)
      m2ArmTap(addBtn, function () {
        handleAddChecklist();
      });

    /* 咨询客服 */
    var consultBtn = document.getElementById('m2BtnConsult');
    if (consultBtn)
      m2ArmTap(consultBtn, function () {
        openConsultModal();
      });

    /* 用车清单 */
    var checklistBtn = document.getElementById('m2BtnChecklist');
    if (checklistBtn)
      m2ArmTap(checklistBtn, function () {
        var panel = document.getElementById('m2aChecklistPanel');
        if (!panel) return;
        if (panel.hasAttribute('hidden')) openChecklistPanel();
        else closeChecklistPanel();
      });

    /* days modal：仅用遮罩层点击关闭（确认走各「确认」按钮上的直接绑定） */
    var daysModal = document.getElementById('m2aDaysModal');
    if (daysModal) {
      daysModal.addEventListener('click', function (e) {
        if (e.target === daysModal) closeDaysModal();
      });
    }
    var daysCloseBtn = document.getElementById('m2aDaysCloseBtn');
    if (daysCloseBtn) m2ArmTap(daysCloseBtn, function () {
      closeDaysModal();
    });

    var qtyModal = document.getElementById('m2aQtyModal');
    if (qtyModal) {
      qtyModal.addEventListener('click', function (e) {
        if (e.target === qtyModal) cancelQtyStepModal();
      });
    }
    var qtyCloseBtn = document.getElementById('m2aQtyCloseBtn');
    if (qtyCloseBtn) m2ArmTap(qtyCloseBtn, cancelQtyStepModal);
    var qtyCancelBtn = document.getElementById('m2aQtyCancelBtn');
    if (qtyCancelBtn) m2ArmTap(qtyCancelBtn, cancelQtyStepModal);
    var qtyConfirmBtn = document.getElementById('m2aQtyConfirmBtn');
    if (qtyConfirmBtn) m2ArmTap(qtyConfirmBtn, confirmQtyStepModal);
    var qtyMinus = document.getElementById('m2aQtyMinus');
    if (qtyMinus)
      m2ArmTap(qtyMinus, function () {
        m2aQtyCurrent = Math.max(1, m2aQtyCurrent - 1);
        syncQtyStepUi();
      });
    var qtyPlus = document.getElementById('m2aQtyPlus');
    if (qtyPlus)
      m2ArmTap(qtyPlus, function () {
        m2aQtyCurrent = Math.min(99, m2aQtyCurrent + 1);
        syncQtyStepUi();
      });

    var pkgPickModal = document.getElementById('m2aPackagePickModal');
    if (pkgPickModal) {
      pkgPickModal.addEventListener('click', function (e) {
        if (e.target === pkgPickModal) closeM2PackagePickModal();
      });
    }
    var pkgPickClose = document.getElementById('m2aPackagePickClose');
    if (pkgPickClose) pkgPickClose.addEventListener('click', closeM2PackagePickModal);

    var panelCloseBtn = document.getElementById('m2aPanelCloseBtn');
    if (panelCloseBtn) m2ArmTap(panelCloseBtn, function () {
      closeChecklistPanel();
    });
    var checklistBackdrop = document.getElementById('m2aChecklistBackdrop');
    if (checklistBackdrop) checklistBackdrop.addEventListener('click', closeChecklistPanel);
    var clearBtn = document.getElementById('m2aPanelClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', function () { writeChecklistMap({}); renderPanel(); });
    var sendBtn = document.getElementById('m2aPanelSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', function () {
      if (!hasChecklistCar()) {
        showMessageModal('用车清单为空，请先添加车辆');
        return;
      }
      var phoneModal = document.getElementById('m2aPhoneModal');
      if (phoneModal) {
        var openingPhone = phoneModal.hasAttribute('hidden');
        if (openingPhone) m2aLockOverlayScroll();
        phoneModal.removeAttribute('hidden');
        var phoneInput = document.getElementById('m2aPhoneInput');
        if (phoneInput) { phoneInput.value = ''; phoneInput.focus(); }
        var phoneError = document.getElementById('m2aPhoneError');
        if (phoneError) phoneError.setAttribute('hidden', '');
      }
    });

    /* phone modal */
    var phoneCancelBtn = document.getElementById('m2aPhoneCancelBtn');
    if (phoneCancelBtn) phoneCancelBtn.addEventListener('click', function () {
      var m = document.getElementById('m2aPhoneModal');
      if (m && !m.hasAttribute('hidden')) {
        m.setAttribute('hidden', '');
        m2aUnlockOverlayScroll();
      }
    });
    var phoneBackdrop = document.getElementById('m2aPhoneBackdrop');
    if (phoneBackdrop) phoneBackdrop.addEventListener('click', function () {
      var m = document.getElementById('m2aPhoneModal');
      if (m && !m.hasAttribute('hidden')) {
        m.setAttribute('hidden', '');
        m2aUnlockOverlayScroll();
      }
    });
    var phoneSubmitBtn = document.getElementById('m2aPhoneSubmitBtn');
    if (phoneSubmitBtn) phoneSubmitBtn.addEventListener('click', function () {
      var phoneInput = document.getElementById('m2aPhoneInput');
      var phoneError = document.getElementById('m2aPhoneError');
      var phoneModal = document.getElementById('m2aPhoneModal');
      var phone = phoneInput ? String(phoneInput.value || '').replace(/\s+/g, '') : '';
      if (!/^1\d{10}$/.test(phone)) { if (phoneError) phoneError.removeAttribute('hidden'); return; }
      if (phoneError) phoneError.setAttribute('hidden', '');
      if (phoneModal && !phoneModal.hasAttribute('hidden')) {
        phoneModal.setAttribute('hidden', '');
        m2aUnlockOverlayScroll();
      }
      sendChecklist(phone);
    });
    var phoneInput = document.getElementById('m2aPhoneInput');
    var phoneError = document.getElementById('m2aPhoneError');
    if (phoneInput && phoneError) {
      phoneInput.addEventListener('input', function () {
        var v = String(phoneInput.value || '').replace(/\s+/g, '');
        if (/^1\d{10}$/.test(v)) phoneError.setAttribute('hidden', '');
        else phoneError.removeAttribute('hidden');
      });
    }

    /* success / fail modals */
    var successOkBtn = document.getElementById('m2aSuccessOkBtn');
    if (successOkBtn) successOkBtn.addEventListener('click', function () {
      var m = document.getElementById('m2aSuccessModal');
      if (m && !m.hasAttribute('hidden')) {
        m.setAttribute('hidden', '');
        m2aUnlockOverlayScroll();
      }
    });
    var failOkBtn = document.getElementById('m2aFailOkBtn');
    if (failOkBtn) failOkBtn.addEventListener('click', function () {
      var m = document.getElementById('m2aFailModal');
      if (m && !m.hasAttribute('hidden')) {
        m.setAttribute('hidden', '');
        m2aUnlockOverlayScroll();
      }
    });

    var messageOkBtn = document.getElementById('m2aMessageOkBtn');
    if (messageOkBtn) messageOkBtn.addEventListener('click', closeMessageModal);
    var messageBackdrop = document.getElementById('m2aMessageBackdrop');
    if (messageBackdrop) messageBackdrop.addEventListener('click', closeMessageModal);

    /* consult modal */
    var consultCloseBtn = document.getElementById('m2aConsultCloseBtn');
    if (consultCloseBtn) consultCloseBtn.addEventListener('click', closeConsultModal);
    var consultBackdrop = document.getElementById('m2aConsultBackdrop');
    if (consultBackdrop) consultBackdrop.addEventListener('click', closeConsultModal);
    var consultSendBtn = document.getElementById('m2aConsultSendBtn');
    if (consultSendBtn) consultSendBtn.addEventListener('click', sendConsultQuestion);
    var consultInputEl = document.getElementById('m2aConsultInput');
    if (consultInputEl) {
      consultInputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); sendConsultQuestion(); }
      });
    }
  }

  /* ── Init ── */
  function run() {
    ensureStyle();
    buildUi();
    bindEvents();
    renderPanel();
  }

  window.m2Actions = {
    addChecklist: handleAddChecklist,
    openConsult: openConsultModal,
    toggleChecklistPanel: function () {
      var panel = document.getElementById('m2aChecklistPanel');
      if (!panel) return;
      if (panel.hasAttribute('hidden')) {
        openChecklistPanel();
      } else closeChecklistPanel();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /** 后退/前台恢复（含部分安卓 WebView 的往返缓存）时再读一次清单，避免与 localStorage 不同步 */
  window.addEventListener('pageshow', function () {
    try {
      if (document.getElementById('m2aPanelList')) renderPanel();
    } catch (ePs) {}
  });
})();
