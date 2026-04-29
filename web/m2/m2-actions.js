(function () {
  var STORAGE_KEY = 'mangoCarChecklist';
  var m2FallbackAssetV = '202604291742';
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

  /* ── Storage ── */
  function readChecklistMap() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY) || '{}';
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }
  function writeChecklistMap(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {})); } catch (e) {}
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
  function calcItemTotal(item) {
    var it = item || {};
    return getDailyUnitPrice(it.rent_price, it.days) * getDaysMultiplier(it.days);
  }
  function calcItemOriginal(item) {
    var it = item || {};
    var p = parseInt(String(it.rent_price), 10);
    return (isNaN(p) || p <= 0) ? 0 : p * getDaysMultiplier(it.days);
  }

  /* ── HTML escape ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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
      /* ── overlay backdrop ── */
      '.m2a-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%);z-index:8799}',
      '.m2a-backdrop[hidden]{display:none}',
      /* ── base card ── */
      '.m2a-card{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9001;width:min(94vw,420px);border-radius:16px;padding:20px 16px 16px;background:rgba(17,20,30,.98);border:1px solid rgba(255,255,255,.18);box-shadow:0 16px 40px rgba(0,0,0,.5);color:#f4f6fb}',
      /* ── days select modal ── */
      '.m2a-days-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;padding:0 0 calc(80px + env(safe-area-inset-bottom));background:rgba(0,0,0,.14);backdrop-filter:blur(10px) saturate(108%);-webkit-backdrop-filter:blur(10px) saturate(108%)}',
      'body[data-car-display-name] .m2a-days-modal{align-items:center;justify-content:center;padding:max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))}',
      'body.m2-package .m2a-days-modal{align-items:center;justify-content:center;padding:max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))}',
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
      '.m2a-panel__item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 2px;border-radius:0;background:transparent;border-top:1px solid rgba(255,255,255,.2)}',
      '.m2a-panel__item-name{font-size:13px;font-weight:500;letter-spacing:.02em;color:#fff;flex:1}',
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
      '.m2a-consult__input-wrap{margin-top:10px;display:flex;gap:8px;flex-shrink:0}',
      '.m2a-consult__input{flex:1;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font-size:16px;padding:0 10px;outline:none}',
      '.m2a-consult__send{height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff;font-size:13px;padding:0 14px;cursor:pointer;flex-shrink:0;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}',
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

    document.body.appendChild(daysModal);
    document.body.appendChild(phoneModal);
    document.body.appendChild(successModal);
    document.body.appendChild(failModal);
    document.body.appendChild(messageModal);
    document.body.appendChild(checklistBackdrop);
    document.body.appendChild(panel);
    document.body.appendChild(consultModal);
    document.body.appendChild(pkgPickModal);
    fillValueAddSection();
  }

  function openChecklistPanel() {
    var panel = document.getElementById('m2aChecklistPanel');
    var backdrop = document.getElementById('m2aChecklistBackdrop');
    if (!panel) return;
    renderPanel();
    panel.removeAttribute('hidden');
    if (backdrop) backdrop.removeAttribute('hidden');
  }

  function closeChecklistPanel() {
    var panel = document.getElementById('m2aChecklistPanel');
    var backdrop = document.getElementById('m2aChecklistBackdrop');
    if (panel) panel.setAttribute('hidden', '');
    if (backdrop) backdrop.setAttribute('hidden', '');
  }

  function showMessageModal(text) {
    var modal = document.getElementById('m2aMessageModal');
    var el = document.getElementById('m2aMessageText');
    if (el) el.textContent = String(text == null ? '' : text);
    if (modal) modal.removeAttribute('hidden');
  }

  function closeMessageModal() {
    var modal = document.getElementById('m2aMessageModal');
    if (modal) modal.setAttribute('hidden', '');
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

  function addServiceToChecklist(name) {
    var n = String(name || '').trim();
    if (!n) return;
    var id = 'service:' + n;
    var map = readChecklistMap();
    if (map[id]) {
      showMessageModal('该服务已添加到用车清单');
      return;
    }
    map[id] = {
      car_id: id,
      car_name: n,
      model_name: n + '（服务）',
      rent_price: 0,
      days: '单日 (24小时)',
    };
    writeChecklistMap(map);
    renderPanel();
  }

  /* ── Render checklist panel ── */
  function renderPanel() {
    var map = readChecklistMap();
    var ids = Object.keys(map);
    var listEl = document.getElementById('m2aPanelList');
    var emptyEl = document.getElementById('m2aPanelEmpty');
    var originalEl = document.getElementById('m2aPanelOriginal');
    var totalEl = document.getElementById('m2aPanelTotal');
    if (!listEl) return;
    var origTotal = 0, total = 0;
    var carCount = 0;
    listEl.innerHTML = ids.map(function (id) {
      var item = map[id] || {};
      if (id.indexOf('service:') !== 0 && id.indexOf('pkg:') !== 0) carCount++;
      var name = esc(String(item.model_name || item.car_name || id));
      var isFreeService = (parseInt(String(item.rent_price), 10) || 0) <= 0;
      var daysText = isFreeService ? ' - 免费' : (item.days ? ' - ' + esc(item.days) : '');
      origTotal += calcItemOriginal(item);
      total += calcItemTotal(item);
      return '<li class="m2a-panel__item">' +
        '<span class="m2a-panel__item-name">' + name + daysText + '</span>' +
        '<button type="button" class="m2a-panel__item-remove" data-remove-id="' + esc(id) + '">移除</button>' +
        '</li>';
    }).join('');
    if (emptyEl) emptyEl.style.display = carCount ? 'none' : '';
    if (originalEl) originalEl.textContent = '原价：¥' + Math.round(origTotal).toLocaleString('zh-CN');
    if (totalEl) totalEl.textContent = '总价：¥' + Math.round(total).toLocaleString('zh-CN');
    syncValueAddButtons(map);
  }

  /* ── Days select modal ── */
  var pendingCarItem = null;
  function openDaysModal(item, rentPrice) {
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
          '<button class="m2a-days-confirm" data-days="' + esc(r[0]) + '">确认</button>' +
          '</div>';
      }).join('');
    }
    var modal = document.getElementById('m2aDaysModal');
    if (modal) modal.removeAttribute('hidden');
  }
  function closeDaysModal() {
    var modal = document.getElementById('m2aDaysModal');
    if (modal) modal.setAttribute('hidden', '');
    pendingCarItem = null;
  }

  function closeM2PackagePickModal() {
    var m = document.getElementById('m2aPackagePickModal');
    if (m) m.setAttribute('hidden', '');
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
    modal.removeAttribute('hidden');
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
    var mapP = readChecklistMap();
    if (mapP[pkg.car_id]) {
      closeM2PackagePickModal();
      showMessageModal('该套餐已在用车清单中');
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
    mapP[pkg.car_id] = pkgEntry;
    writeChecklistMap(mapP);
    renderPanel();
    closeM2PackagePickModal();
  }

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
    var map = readChecklistMap();
    if (map[car.car_id]) {
      delete map[car.car_id];
      writeChecklistMap(map);
      renderPanel();
      return;
    }
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
    ids.forEach(function (id) {
      var item = map[id] || {};
      var pl = item.pkg_lines;
      if (id.indexOf('service:') === 0) {
        var sn = String(item.model_name || item.car_name || id).trim();
        var st = Math.round(calcItemTotal(item));
        pushTrim(valueAdd, sn + ' ¥' + st.toLocaleString('zh-CN'));
      } else if (pl && pl.length) {
        for (var j = 0; j < pl.length; j++) pushTrim(packages, pl[j]);
      } else if (id.indexOf('pkg:') === 0) {
        var pn = String(item.model_name || item.car_name || id).trim();
        var pd = String(item.days || '套餐').trim();
        var pt = Math.round(calcItemTotal(item));
        pushTrim(packages, pn + '（' + pd + '） ¥' + pt.toLocaleString('zh-CN'));
      } else {
        var vn = String(item.model_name || item.car_name || id).trim();
        var vd = String(item.days || '单日 (24小时)').trim();
        var vt = Math.round(calcItemTotal(item));
        vehicleSubtotal += vt;
        pushTrim(vehicles, vn + '（' + vd + '） ¥' + vt.toLocaleString('zh-CN'));
      }
    });
    if (vehicles.length) {
      pushTrim(vehicles, '合计 ¥' + Math.round(vehicleSubtotal).toLocaleString('zh-CN'));
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
          if (suc) suc.removeAttribute('hidden');
        } else {
          closeChecklistPanel();
          var fail = document.getElementById('m2aFailModal');
          if (fail) fail.removeAttribute('hidden');
        }
      })
      .catch(function () {
        closeChecklistPanel();
        var fail = document.getElementById('m2aFailModal');
        if (fail) fail.removeAttribute('hidden');
      });
  }

  /* ── Consult ── */
  var consultBusy = false;
  function appendConsultMsg(role, text) {
    var chat = document.getElementById('m2aConsultChat');
    if (!chat) return;
    var el = document.createElement('div');
    el.className = 'm2a-consult__msg m2a-consult__msg--' + (role === 'user' ? 'user' : 'assistant');
    el.textContent = String(text || '');
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }
  function ensureConsultWelcome() {
    var chat = document.getElementById('m2aConsultChat');
    if (!chat || chat.childElementCount > 0) return;
    appendConsultMsg('assistant', '您好，我是芒果超跑 AI 客服。请问您想咨询车型、价格、用车天数还是下单流程？');
  }
  function openConsultModal() {
    var modal = document.getElementById('m2aConsultModal');
    if (!modal) return;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    ensureConsultWelcome();
    var input = document.getElementById('m2aConsultInput');
    if (input) input.focus();
  }
  function closeConsultModal() {
    var modal = document.getElementById('m2aConsultModal');
    if (modal) modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
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
  function bindEvents() {
    if (window.__m2aBindEventsDone) return;
    window.__m2aBindEventsDone = true;
    /* 加入清单 */
    var addBtn = document.getElementById('m2BtnAddChecklist');
    if (addBtn) addBtn.addEventListener('click', handleAddChecklist);

    /* 咨询客服 */
    var consultBtn = document.getElementById('m2BtnConsult');
    if (consultBtn) consultBtn.addEventListener('click', openConsultModal);

    /* 用车清单 */
    var checklistBtn = document.getElementById('m2BtnChecklist');
    if (checklistBtn) checklistBtn.addEventListener('click', function () {
      var panel = document.getElementById('m2aChecklistPanel');
      if (!panel) return;
      if (panel.hasAttribute('hidden')) openChecklistPanel();
      else closeChecklistPanel();
    });

    /* days modal: confirm */
    var daysModal = document.getElementById('m2aDaysModal');
    if (daysModal) {
      daysModal.addEventListener('click', function (e) {
        if (e.target === daysModal) {
          closeDaysModal();
          return;
        }
        var btn = e.target.closest && e.target.closest('.m2a-days-confirm');
        if (btn && pendingCarItem) {
          pendingCarItem.days = btn.getAttribute('data-days') || '单日 (24小时)';
          var map = readChecklistMap();
          map[pendingCarItem.car_id] = pendingCarItem;
          writeChecklistMap(map);
          renderPanel();
          closeDaysModal();
        }
      });
    }
    var daysCloseBtn = document.getElementById('m2aDaysCloseBtn');
    if (daysCloseBtn) daysCloseBtn.addEventListener('click', closeDaysModal);

    var pkgPickModal = document.getElementById('m2aPackagePickModal');
    if (pkgPickModal) {
      pkgPickModal.addEventListener('click', function (e) {
        if (e.target === pkgPickModal) closeM2PackagePickModal();
      });
    }
    var pkgPickOpts = document.getElementById('m2aPackagePickOptions');
    if (pkgPickOpts) {
      pkgPickOpts.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-m2a-pkg-idx]');
        if (!btn) return;
        var idx = parseInt(String(btn.getAttribute('data-m2a-pkg-idx') || ''), 10);
        if (!isFinite(idx)) return;
        confirmM2PackagePick(idx);
      });
    }
    var pkgPickClose = document.getElementById('m2aPackagePickClose');
    if (pkgPickClose) pkgPickClose.addEventListener('click', closeM2PackagePickModal);

    /* checklist panel: remove */
    var panel = document.getElementById('m2aChecklistPanel');
    if (panel) {
      panel.addEventListener('click', function (e) {
        var addSvc = e.target.closest && e.target.closest('[data-m2a-add-service]');
        if (addSvc && !addSvc.disabled) {
          var svcName = String(addSvc.getAttribute('data-m2a-add-service') || '').trim();
          if (svcName) addServiceToChecklist(svcName);
          return;
        }
        var removeBtn = e.target.closest && e.target.closest('[data-remove-id]');
        if (removeBtn) {
          var id = String(removeBtn.getAttribute('data-remove-id') || '').trim();
          var map = readChecklistMap();
          if (id && map[id]) { delete map[id]; writeChecklistMap(map); renderPanel(); }
          return;
        }
      });
    }
    var panelCloseBtn = document.getElementById('m2aPanelCloseBtn');
    if (panelCloseBtn) panelCloseBtn.addEventListener('click', closeChecklistPanel);
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
      var m = document.getElementById('m2aPhoneModal'); if (m) m.setAttribute('hidden', '');
    });
    var phoneBackdrop = document.getElementById('m2aPhoneBackdrop');
    if (phoneBackdrop) phoneBackdrop.addEventListener('click', function () {
      var m = document.getElementById('m2aPhoneModal'); if (m) m.setAttribute('hidden', '');
    });
    var phoneSubmitBtn = document.getElementById('m2aPhoneSubmitBtn');
    if (phoneSubmitBtn) phoneSubmitBtn.addEventListener('click', function () {
      var phoneInput = document.getElementById('m2aPhoneInput');
      var phoneError = document.getElementById('m2aPhoneError');
      var phoneModal = document.getElementById('m2aPhoneModal');
      var phone = phoneInput ? String(phoneInput.value || '').replace(/\s+/g, '') : '';
      if (!/^1\d{10}$/.test(phone)) { if (phoneError) phoneError.removeAttribute('hidden'); return; }
      if (phoneError) phoneError.setAttribute('hidden', '');
      if (phoneModal) phoneModal.setAttribute('hidden', '');
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
      var m = document.getElementById('m2aSuccessModal'); if (m) m.setAttribute('hidden', '');
    });
    var failOkBtn = document.getElementById('m2aFailOkBtn');
    if (failOkBtn) failOkBtn.addEventListener('click', function () {
      var m = document.getElementById('m2aFailModal'); if (m) m.setAttribute('hidden', '');
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
})();
