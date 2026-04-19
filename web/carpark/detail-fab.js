/**
 * 详情页右侧「立即预约 / 咨询客服」悬浮条：Hero（.hero-detail）在视口内时隐藏，滚出后显示。
 * 与兰博基尼各车型 car.js 中逻辑一致。
 */
(function () {
  function isMobileClient() {
    var byMedia = !!(
      window.matchMedia &&
      (window.matchMedia('(max-width: 900px)').matches ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    );
    var nav = window.navigator || {};
    var ua = String(nav.userAgent || '');
    var byUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua);
    var byTouch = (nav.maxTouchPoints || 0) > 0;
    return !!(byMedia || (byTouch && byUA));
  }

  var heroSection = document.querySelector('.hero-detail');
  var fab = document.getElementById('detailFabActions');
  if (!heroSection || !fab) return;

  function heroIntersectsViewport() {
    var rect = heroSection.getBoundingClientRect();
    var vh = window.innerHeight;
    return rect.bottom > 0 && rect.top < vh;
  }

  function syncFab() {
    var isMobile = isMobileClient();
    if (isMobile) {
      fab.classList.add('is-visible');
      fab.setAttribute('aria-hidden', 'false');
      return;
    }
    if (heroIntersectsViewport()) {
      fab.classList.remove('is-visible');
      fab.setAttribute('aria-hidden', 'true');
    } else {
      fab.classList.add('is-visible');
      fab.setAttribute('aria-hidden', 'false');
    }
  }

  window.addEventListener('scroll', syncFab, { passive: true });
  window.addEventListener('resize', syncFab);
  syncFab();
})();

/**
 * 从选车页进入详情页时，默认落到 Hero + 参数卡片这一屏（图2效果）。
 */
(function () {
  function fromCarList() {
    var ref = String(document.referrer || '');
    return ref.indexOf('/car.html') !== -1 || ref.indexOf('\\car.html') !== -1;
  }

  function shouldAutoScroll() {
    var hash = String(window.location.hash || '').toLowerCase();
    if (hash === '#detail-overview' || hash === '#overview') return true;
    return fromCarList();
  }

  function jumpToOverviewBand() {
    if (!shouldAutoScroll()) return;
    var stats = document.querySelector('.stats-section');
    if (!stats) return;
    var header = document.querySelector('.detail-header');
    var headerH = header ? header.offsetHeight : 0;
    var rect = stats.getBoundingClientRect();
    var pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var targetY = pageY + rect.bottom - window.innerHeight - headerH;
    if (targetY < 0) targetY = 0;
    window.scrollTo(0, Math.round(targetY));
  }

  window.addEventListener('load', function () {
    window.setTimeout(jumpToOverviewBand, 0);
    window.setTimeout(jumpToOverviewBand, 120);
    window.setTimeout(jumpToOverviewBand, 420);
  });
})();

/**
 * 详情页用车清单：
 * - 右下角固定「用车清单」按钮（与选车页位置一致）
 * - 点击展开已选车辆列表
 * - 可在详情页把当前车辆加入/移出清单
 */
(function () {
  var STORAGE_KEY = 'mangoCarChecklist';
  function isMobileClient() {
    var byMedia = !!(
      window.matchMedia &&
      (window.matchMedia('(max-width: 900px)').matches ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    );
    var nav = window.navigator || {};
    var ua = String(nav.userAgent || '');
    var byUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua);
    var byTouch = (nav.maxTouchPoints || 0) > 0;
    return !!(byMedia || (byTouch && byUA));
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function getCount(map) {
    return Object.keys(map || {}).length;
  }

    function ensureStyle() {
    if (document.getElementById('detailChecklistInlineStyle')) return;
    var style = document.createElement('style');
    style.id = 'detailChecklistInlineStyle';
    style.textContent =
      '.detail-checklist-btn{position:fixed;z-index:520;right:max(16px, env(safe-area-inset-right));bottom:calc(124px + env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(23,26,33,.96);color:#e8ecf8;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.38)}' +
      '.detail-checklist-btn__icon{color:#fff}' +
      '.detail-checklist-btn.has-items .detail-checklist-btn__icon{color:#ff8c69}' +
      '.detail-checklist-btn__count{min-width:20px;height:20px;line-height:20px;border-radius:999px;text-align:center;font-size:12px;background:#ff6b35;color:#fff}' +
      '.detail-checklist-panel{position:fixed;z-index:720;right:clamp(16px,4vw,32px);bottom:calc(172px + env(safe-area-inset-bottom));width:min(420px,calc(100vw - 24px));max-height:min(70vh,680px);border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(18,20,28,.98);box-shadow:0 18px 40px rgba(0,0,0,.45);overflow:hidden}' +
      '.detail-checklist-panel__header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)}' +
      '.detail-checklist-panel__title{margin:0;font-size:17px;color:#f6f7fb}' +
      '.detail-checklist-panel__close{border:none;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}' +
      '.detail-checklist-panel__body{padding:12px 14px 14px;max-height:calc(min(70vh,680px) - 60px);overflow:auto}' +
      '.detail-checklist-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
      '.detail-checklist-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)}' +
      '.detail-checklist-item__name{font-size:15px;color:rgba(255,255,255,.9)}' +
      '.detail-checklist-item__remove,.detail-checklist-panel__toggle-current{border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:6px 10px;background:transparent;color:rgba(255,255,255,.9);font-size:13px;cursor:pointer}' +
      '.detail-checklist-panel__toolbar{display:flex;justify-content:flex-end;margin-bottom:8px}' +
      '.detail-checklist-empty{margin:10px 2px 0;color:rgba(255,255,255,.68);font-size:14px}' +
      '.detail-checklist-send-btn{margin-top:10px;width:100%;border:1px solid rgba(255,107,53,.55);border-radius:10px;padding:8px 12px;background:rgba(255,107,53,.14);color:#ffe2d5;font-size:13px;font-weight:600;cursor:pointer}' +
      '.detail-checklist-clear-btn{margin-top:10px;width:100%;border:1px solid rgba(255,255,255,.24);border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.9);font-size:13px;font-weight:600;cursor:pointer}' +
      '.detail-checklist-actions{margin-top:10px;display:flex;align-items:center;gap:16px}' +
      '.detail-checklist-actions .detail-checklist-send-btn,.detail-checklist-actions .detail-checklist-clear-btn{margin-top:0;flex:1;width:auto}' +
      '.detail-checklist-original{margin:8px 2px 0;color:rgba(255,255,255,.52);font-size:13px;text-align:right;text-decoration:line-through}' +
      '.detail-checklist-total{margin:6px 2px 0;color:#ffd8c7;font-size:16px;font-weight:700;text-align:right}' +
      '.detail-phone-modal{position:fixed;inset:0;z-index:10020}' +
      '.detail-phone-modal[hidden]{display:none}' +
      '.detail-phone-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.56)}' +
      '.detail-phone-modal__card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(92vw,420px);border-radius:14px;padding:18px 16px 14px;background:rgba(17,20,30,.96);border:1px solid rgba(255,255,255,.2);box-shadow:0 14px 30px rgba(0,0,0,.42)}' +
      '.detail-phone-modal__title{margin:0;color:#fff;font-size:16px;line-height:1.45}' +
      '.detail-phone-modal__input{margin-top:12px;width:100%;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.1);color:#fff;font-size:15px;padding:0 12px;outline:none}' +
      '.detail-phone-modal__error{margin:8px 2px 0;color:#ff8f8f;font-size:13px}' +
      '.detail-phone-modal__actions{margin-top:12px;display:flex;gap:10px;justify-content:flex-end}' +
      '.detail-phone-modal__actions--center{justify-content:center}' +
      '.detail-phone-modal__card--success{width:min(88vw,320px)}' +
      '.detail-phone-modal__card--success .detail-phone-modal__title{text-align:center}' +
      '.detail-phone-modal__btn{border-radius:9px;border:1px solid transparent;padding:7px 14px;font-size:14px;cursor:pointer}' +
      '.detail-phone-modal__btn--ghost{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#f3f5ff}' +
      '.detail-phone-modal__btn--primary{background:rgba(255,107,53,.24);border-color:rgba(255,107,53,.62);color:#ffe7dc}' +
      '.detail-consult-modal{position:fixed;inset:0;z-index:10030}' +
      '.detail-consult-modal[hidden]{display:none}' +
      '.detail-consult-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.56)}' +
      '.detail-consult-modal__card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(94vw,520px);height:520px;border-radius:14px;padding:14px 12px 12px;background:rgba(17,20,30,.98);border:1px solid rgba(255,255,255,.2);box-shadow:0 14px 30px rgba(0,0,0,.42);display:flex;flex-direction:column;overflow:hidden}' +
      '.detail-consult-modal__title{margin:0;color:#fff;font-size:17px;line-height:1.4;text-align:center;padding-right:24px}' +
      '.detail-consult-modal__close{position:absolute;top:10px;right:10px;width:28px;height:28px;border:none;background:transparent;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0}' +
      '.detail-consult-modal__chat{margin-top:10px;flex:1;min-height:220px;overflow-y:auto;overflow-x:hidden;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:8px;scrollbar-width:none;-ms-overflow-style:none}' +
      '.detail-consult-modal__chat::-webkit-scrollbar{display:none}' +
      '.detail-consult-modal__msg{max-width:88%;padding:8px 10px;border-radius:10px;font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word}' +
      '.detail-consult-modal__msg--assistant{align-self:flex-start;background:rgba(255,255,255,.1);color:rgba(255,255,255,.92)}' +
      '.detail-consult-modal__msg--user{align-self:flex-end;background:rgba(255,107,53,.22);color:#ffe7dc}' +
      '.detail-consult-modal__input-wrap{margin-top:10px;display:flex;gap:8px;align-items:center}' +
      '.detail-consult-modal__input{flex:1;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font-size:14px;padding:0 10px;outline:none}' +
      '.detail-consult-modal__send{height:38px;border-radius:9px;border:1px solid rgba(255,107,53,.62);background:rgba(255,107,53,.24);color:#ffe7dc;font-size:13px;padding:0 12px;cursor:pointer}' +
      '.detail-consult-modal__actions{margin-top:10px;display:flex;justify-content:center;gap:10px}' +
      '.detail-consult-modal__btn{border-radius:9px;border:1px solid transparent;padding:7px 14px;font-size:14px;cursor:pointer}' +
      '.detail-consult-modal__btn--ghost{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#f3f5ff}' +
      '.detail-consult-modal__btn--primary{background:rgba(255,107,53,.24);border-color:rgba(255,107,53,.62);color:#ffe7dc}' +
      '.days-select-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:1;transition:opacity .3s ease}' +
      '.days-select-modal[hidden]{display:none;opacity:0}' +
      '.days-select-content{position:relative;background:#fff;color:#333;width:90%;max-width:420px;border-radius:12px;padding:32px 24px 24px;box-shadow:0 10px 30px rgba(0,0,0,.5);animation:modal-pop .3s ease}' +
      '@keyframes modal-pop{0%{transform:scale(.95);opacity:0}100%{transform:scale(1);opacity:1}}' +
      '.days-select-header{font-size:22px;font-weight:700;text-align:center;margin:0 auto 32px;padding:0;border:none;width:auto;letter-spacing:1px}' +
      '.days-select-options{display:flex;flex-direction:column;gap:16px;margin-bottom:32px}' +
      '.days-option-row{display:flex;align-items:center;justify-content:space-between}' +
      '.days-label{font-size:15px;font-weight:500;width:120px;text-align:left}' +
      '.days-price{font-size:16px;color:#ff6b35;flex:1;text-align:center;font-weight:700}' +
      '.days-confirm-btn{padding:8px 24px;background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);color:#fff;border:none;border-radius:20px;font-size:14px;font-weight:500;cursor:pointer;transition:all .3s ease;box-shadow:0 4px 10px rgba(255,107,53,.3)}' +
      '.days-confirm-btn:hover{background:linear-gradient(135deg,#ff8c42 0%,#ffa56a 100%);transform:translateY(-2px);box-shadow:0 6px 15px rgba(255,107,53,.4)}' +
      '.days-select-footer{text-align:center;font-size:13px;color:#888;margin-top:10px}' +
      '.days-select-close{position:absolute;top:16px;right:16px;background:transparent;border:none;font-size:24px;color:#999;cursor:pointer;padding:0;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;transition:color .2s ease}' +
      '.days-select-close:hover{color:#333;background:transparent}' +
      '@media (max-width:768px){.detail-checklist-btn{display:none !important}}' +
      '@media (max-width:768px){#detailFabActions{width:auto !important;align-items:flex-end !important;gap:8px !important}}' +
      '.detail-fab-more{width:44px;height:44px;border-radius:10px;border:1px solid var(--brand,#ff6b35);background:rgba(20,22,28,.96);color:var(--brand,#ff6b35);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.35)}' +
      '.detail-fab-more__dots{font-size:18px;letter-spacing:3px;line-height:1;transform:translateY(-1px)}' +
      '.detail-fab-menu{display:flex;flex-direction:column;gap:8px;min-width:128px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(17,20,30,.96);box-shadow:0 10px 24px rgba(0,0,0,.42)}' +
      '.detail-fab-menu[hidden]{display:none}' +
      '.detail-fab-menu-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#f5f7ff;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;text-align:center}' +
      '.detail-fab-menu-btn:hover{border-color:var(--brand,#ff6b35);color:var(--brand,#ff6b35)}';
    document.head.appendChild(style);
  }

  function buildUi() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'detail-checklist-btn';
    btn.id = 'detailChecklistBtn';
    btn.innerHTML =
      '<span class="detail-checklist-btn__icon" aria-hidden="true">★</span>' +
      '<span class="detail-checklist-btn__text">用车清单</span>' +
      '<span class="detail-checklist-btn__count" id="detailChecklistCount">0</span>';

    var panel = document.createElement('section');
    panel.className = 'detail-checklist-panel';
    panel.id = 'detailChecklistPanel';
    panel.setAttribute('hidden', '');
    panel.innerHTML =
      '<div class="detail-checklist-panel__header">' +
      '<h3 class="detail-checklist-panel__title">已选车辆</h3>' +
      '<button type="button" class="detail-checklist-panel__close" id="detailChecklistCloseBtn" aria-label="关闭清单">×</button>' +
      '</div>' +
      '<div class="detail-checklist-panel__body">' +
      '<div class="detail-checklist-panel__toolbar">' +
      '<button type="button" class="detail-checklist-panel__toggle-current" id="detailChecklistToggleCurrentBtn">加入当前车辆</button>' +
      '</div>' +
      '<ul class="detail-checklist-list" id="detailChecklistList"></ul>' +
      '<p class="detail-checklist-empty" id="detailChecklistEmpty">还没有加入车辆，先在选车页或当前详情页加入。</p>' +
      '<p class="detail-checklist-original" id="detailChecklistOriginal">原价：¥0</p>' +
      '<p class="detail-checklist-total" id="detailChecklistTotal">总价：¥0</p>' +
      '<div class="detail-checklist-actions">' +
      '<button type="button" class="detail-checklist-clear-btn" id="detailChecklistClearBtn">清空清单</button>' +
      '<button type="button" class="detail-checklist-send-btn" id="detailChecklistSendBtn">选择完成</button>' +
      '</div>' +
      '</div>';

    var modal = document.createElement('div');
    modal.id = 'daysSelectModal';
    modal.className = 'days-select-modal';
    modal.setAttribute('hidden', '');
    modal.innerHTML =
      '<div class="days-select-content">' +
      '<div class="days-select-header">请选择用车天数</div>' +
      '<div class="days-select-options" id="daysSelectOptions"></div>' +
      '<div class="days-select-footer">右下角的选车清单中可以查看总价</div>' +
      '<button class="days-select-close" id="daysSelectCloseBtn">×</button>' +
      '</div>';

    var phoneModal = document.createElement('section');
    phoneModal.className = 'detail-phone-modal';
    phoneModal.id = 'detailWecomPhoneModal';
    phoneModal.setAttribute('hidden', '');
    phoneModal.innerHTML =
      '<div class="detail-phone-modal__backdrop" data-detail-phone-cancel="1"></div>' +
      '<div class="detail-phone-modal__card" role="dialog" aria-modal="true" aria-labelledby="detailWecomPhoneTitle">' +
      '<h3 class="detail-phone-modal__title" id="detailWecomPhoneTitle">请输入您的手机号，稍后客服会联系您</h3>' +
      '<input type="tel" inputmode="numeric" maxlength="11" class="detail-phone-modal__input" id="detailWecomPhoneInput" placeholder="请输入手机号" />' +
      '<p class="detail-phone-modal__error" id="detailWecomPhoneError" hidden>请输入正确的11位手机号</p>' +
      '<div class="detail-phone-modal__actions">' +
      '<button type="button" class="detail-phone-modal__btn detail-phone-modal__btn--ghost" id="detailWecomPhoneCancelBtn">取消</button>' +
      '<button type="button" class="detail-phone-modal__btn detail-phone-modal__btn--primary" id="detailWecomPhoneSubmitBtn">发送</button>' +
      '</div>' +
      '</div>';

    var successModal = document.createElement('section');
    successModal.className = 'detail-phone-modal';
    successModal.id = 'detailWecomSuccessModal';
    successModal.setAttribute('hidden', '');
    successModal.innerHTML =
      '<div class="detail-phone-modal__backdrop"></div>' +
      '<div class="detail-phone-modal__card detail-phone-modal__card--success" role="dialog" aria-modal="true" aria-labelledby="detailWecomSuccessTitle">' +
      '<h3 class="detail-phone-modal__title" id="detailWecomSuccessTitle">客服已收到您的信息，请稍等</h3>' +
      '<div class="detail-phone-modal__actions detail-phone-modal__actions--center">' +
      '<button type="button" class="detail-phone-modal__btn detail-phone-modal__btn--primary" id="detailWecomSuccessOkBtn">确定</button>' +
      '</div>' +
      '</div>';

    var failModal = document.createElement('section');
    failModal.className = 'detail-phone-modal';
    failModal.id = 'detailWecomFailModal';
    failModal.setAttribute('hidden', '');
    failModal.innerHTML =
      '<div class="detail-phone-modal__backdrop"></div>' +
      '<div class="detail-phone-modal__card detail-phone-modal__card--success" role="dialog" aria-modal="true" aria-labelledby="detailWecomFailTitle">' +
      '<h3 class="detail-phone-modal__title" id="detailWecomFailTitle">发送失败，请稍后重试</h3>' +
      '<div class="detail-phone-modal__actions detail-phone-modal__actions--center">' +
      '<button type="button" class="detail-phone-modal__btn detail-phone-modal__btn--primary" id="detailWecomFailOkBtn">确定</button>' +
      '</div>' +
      '</div>';

    var consultModal = document.createElement('section');
    consultModal.className = 'detail-consult-modal';
    consultModal.id = 'detailConsultModal';
    consultModal.setAttribute('hidden', '');
    consultModal.innerHTML =
      '<div class="detail-consult-modal__backdrop" data-detail-consult-cancel="1"></div>' +
      '<div class="detail-consult-modal__card" role="dialog" aria-modal="true" aria-labelledby="detailConsultTitle">' +
      '<button type="button" class="detail-consult-modal__close" id="detailConsultCloseBtn" aria-label="关闭">×</button>' +
      '<h3 class="detail-consult-modal__title" id="detailConsultTitle">咨询客服</h3>' +
      '<div class="detail-consult-modal__chat" id="detailConsultChat"></div>' +
      '<div class="detail-consult-modal__input-wrap">' +
      '<input type="text" class="detail-consult-modal__input" id="detailConsultInput" placeholder="请输入您的问题..." />' +
      '<button type="button" class="detail-consult-modal__send" id="detailConsultSendBtn">发送</button>' +
      '</div>' +
      '</div>';

    function mountDetailChecklistBtn() {
      var fabEl = document.getElementById('detailFabActions');
      if (fabEl && isMobileClient()) {
        fabEl.appendChild(btn);
      } else {
        document.body.appendChild(btn);
      }
    }
    mountDetailChecklistBtn();

    document.body.appendChild(panel);
    document.body.appendChild(modal);
    document.body.appendChild(phoneModal);
    document.body.appendChild(successModal);
    document.body.appendChild(failModal);
    document.body.appendChild(consultModal);
    return {
      btn: btn,
      panel: panel,
      modal: modal,
      phoneModal: phoneModal,
      successModal: successModal,
      failModal: failModal,
      consultModal: consultModal,
      mountDetailChecklistBtn: mountDetailChecklistBtn,
    };
  }

  function run() {
    ensureStyle();
    var ui = buildUi();
    var btn = ui.btn;
    var panel = ui.panel;
    var countEl = document.getElementById('detailChecklistCount');
    var listEl = document.getElementById('detailChecklistList');
    var emptyEl = document.getElementById('detailChecklistEmpty');
    var originalEl = document.getElementById('detailChecklistOriginal');
    var totalEl = document.getElementById('detailChecklistTotal');
    var closeBtn = document.getElementById('detailChecklistCloseBtn');
    var clearBtn = document.getElementById('detailChecklistClearBtn');
    var sendBtn = document.getElementById('detailChecklistSendBtn');
    var phoneModal = document.getElementById('detailWecomPhoneModal');
    var phoneInput = document.getElementById('detailWecomPhoneInput');
    var phoneError = document.getElementById('detailWecomPhoneError');
    var phoneCancelBtn = document.getElementById('detailWecomPhoneCancelBtn');
    var phoneSubmitBtn = document.getElementById('detailWecomPhoneSubmitBtn');
    var successModal = document.getElementById('detailWecomSuccessModal');
    var successOkBtn = document.getElementById('detailWecomSuccessOkBtn');
    var failModal = document.getElementById('detailWecomFailModal');
    var failOkBtn = document.getElementById('detailWecomFailOkBtn');
    var consultModal = document.getElementById('detailConsultModal');
    var consultChat = document.getElementById('detailConsultChat');
    var consultInput = document.getElementById('detailConsultInput');
    var consultSendBtn = document.getElementById('detailConsultSendBtn');
    var consultCloseBtn = document.getElementById('detailConsultCloseBtn');
    var toggleCurrentBtn = document.getElementById('detailChecklistToggleCurrentBtn');
    var detailFabRoot = document.getElementById('detailFabActions');
    var detailFabMoreBtn = null;
    var detailFabMenu = null;
    var detailFabAddBtn = null;
    var detailFabConsultBtn = null;
    var detailFabChecklistBtn = null;
    var detailFabPrimaryBtn = null;
    var isMobileFab = false;

    function isMobileViewport() {
      return isMobileClient();
    }

    if (detailFabRoot) {
      if (isMobileViewport()) {
        isMobileFab = true;
        detailFabRoot.innerHTML =
          '<button type="button" class="detail-fab-more" id="detailFabMoreBtn" aria-expanded="false" aria-label="展开更多操作">' +
            '<span class="detail-fab-more__dots" aria-hidden="true">•••</span>' +
          '</button>' +
          '<div class="detail-fab-menu" id="detailFabMenu" hidden>' +
            '<button type="button" class="detail-fab-menu-btn" id="detailFabAddBtn">加入清单</button>' +
            '<button type="button" class="detail-fab-menu-btn" id="detailFabConsultBtn">咨询客服</button>' +
            '<button type="button" class="detail-fab-menu-btn" id="detailFabChecklistBtn">用车清单</button>' +
          '</div>';
        detailFabMoreBtn = document.getElementById('detailFabMoreBtn');
        detailFabMenu = document.getElementById('detailFabMenu');
        detailFabAddBtn = document.getElementById('detailFabAddBtn');
        detailFabConsultBtn = document.getElementById('detailFabConsultBtn');
        detailFabChecklistBtn = document.getElementById('detailFabChecklistBtn');
      } else {
        isMobileFab = false;
        detailFabAddBtn = detailFabRoot.querySelector('.btn-primary, .btn-reserve, .detail-fab-btn.btn-primary');
        detailFabConsultBtn = detailFabRoot.querySelector('.btn-ghost, .detail-fab-btn.btn-ghost');
      }
    }

    var mq768 = window.matchMedia && window.matchMedia('(max-width: 768px)');
    if (ui.mountDetailChecklistBtn && mq768) {
      if (mq768.addEventListener) {
        mq768.addEventListener('change', ui.mountDetailChecklistBtn);
      } else if (mq768.addListener) {
        mq768.addListener(ui.mountDetailChecklistBtn);
      }
    }

    var body = document.body;
    var currentCarName = String(body.getAttribute('data-car-display-name') || '').trim();
    var currentCarId = currentCarName;

    function syncCount(map) {
      var count = getCount(map);
      if (countEl) countEl.textContent = String(count);
      if (btn) btn.classList.toggle('has-items', count > 0);
      syncPcFabWidth();
    }

    function syncCurrentBtn(map) {
      if (!currentCarId) return;
      var picked = !!(map && map[currentCarId]);
      if (toggleCurrentBtn) {
        toggleCurrentBtn.textContent = picked ? '移出当前车辆' : '加入当前车辆';
      }
      if (detailFabAddBtn) {
        detailFabAddBtn.textContent = picked ? '移出清单' : '加入清单';
      }
    }

    function setFabMenuOpen(open) {
      if (!detailFabMenu || !detailFabMoreBtn) return;
      if (open) {
        detailFabMenu.removeAttribute('hidden');
        detailFabMoreBtn.style.display = 'none';
      } else {
        detailFabMenu.setAttribute('hidden', '');
        detailFabMoreBtn.style.display = 'inline-flex';
      }
      detailFabMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function syncPcFabWidth() {
      if (!detailFabRoot || !btn) return;
      if (isMobileClient()) {
        detailFabRoot.style.width = '';
        return;
      }
      var checklistWidth = Math.ceil(btn.getBoundingClientRect().width || 0);
      if (checklistWidth > 0) {
        detailFabRoot.style.width = checklistWidth + 'px';
      }
    }

    function renderList(map) {
      var m = map || {};
      var ids = Object.keys(m);
      var originalTotal = 0;
      var total = 0;
      listEl.innerHTML = ids
        .map(function (id) {
          var item = m[id] || {};
          var name = escHtml(String(item.model_name || item.car_name || id));
          var daysText = item.days ? (' - ' + escHtml(item.days)) : '';
          originalTotal += calcItemOriginal(item);
          total += calcItemTotal(item);
          return (
            '<li class="detail-checklist-item">' +
            '<div class="detail-checklist-item__name">' + name + daysText + '</div>' +
            '<button type="button" class="detail-checklist-item__remove" data-remove-car-id="' + escHtml(id) + '">移除</button>' +
            '</li>'
          );
        })
        .join('');
      emptyEl.style.display = ids.length ? 'none' : '';
      if (originalEl) originalEl.textContent = '原价：¥' + Math.round(originalTotal).toLocaleString('zh-CN');
      if (totalEl) totalEl.textContent = '总价：¥' + Math.round(total).toLocaleString('zh-CN');
      syncCount(m);
      syncCurrentBtn(m);
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
        day30: { multiplier: 23, divisor: 30 }
      };
      if (String(daysText || '').indexOf('一周') !== -1) return Math.floor((p * cfg.day7.multiplier) / cfg.day7.divisor);
      if (String(daysText || '').indexOf('半月') !== -1) return Math.floor((p * cfg.day15.multiplier) / cfg.day15.divisor);
      if (String(daysText || '').indexOf('整月') !== -1) return Math.floor((p * cfg.day30.multiplier) / cfg.day30.divisor);
      return p;
    }

    function calcItemTotal(item) {
      var it = item || {};
      var unit = getDailyUnitPrice(it.rent_price, it.days);
      var days = getDaysMultiplier(it.days);
      return unit * days;
    }

    function calcItemOriginal(item) {
      var it = item || {};
      var p = parseInt(String(it.rent_price), 10);
      if (isNaN(p) || p <= 0) return 0;
      return p * getDaysMultiplier(it.days);
    }

    function apiOrigin() {
      if (typeof window.MANGO_API_ORIGIN !== 'undefined' && window.MANGO_API_ORIGIN) {
        return String(window.MANGO_API_ORIGIN).replace(/\/$/, '');
      }
      if (typeof window.location !== 'undefined' && window.location.protocol !== 'file:') {
        return String(window.location.origin).replace(/\/$/, '');
      }
      return '';
    }

    function buildPayload(map, phone) {
      var m = map || {};
      var ids = Object.keys(m);
      var lines = ids.map(function (id) {
        var item = m[id] || {};
        var name = String(item.model_name || item.car_name || id || '').trim();
        var days = String(item.days || '单日 (24小时)').trim();
        var total = Math.round(calcItemTotal(item));
        return name + '（' + days + '） ¥' + total.toLocaleString('zh-CN');
      });
      return {
        user: String(sessionStorage.getItem('mango_driver_name') || '未登录用户'),
        phone: String(phone || '').trim(),
        lines: lines
      };
    }

    function sendChecklist(phone) {
      var map = readChecklistMap();
      var ids = Object.keys(map || {});
      if (!ids.length) {
        alert('用车清单为空，无法发送');
        return;
      }
      var b = apiOrigin();
      if (!b) {
        alert('当前环境无法连接接口，请先启动 member_api');
        return;
      }
      fetch(b + '/api/wecom/checklist-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(map, phone)),
        credentials: 'omit'
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j || {} }; });
        })
        .then(function (o) {
          if (o.ok && o.j && o.j.ok) {
            writeChecklistMap({});
            renderList({});
            panel.setAttribute('hidden', '');
            if (successModal) successModal.hidden = false;
          }
          else if (failModal) failModal.hidden = false;
        })
        .catch(function () {
          if (failModal) failModal.hidden = false;
        });
    }

    var currentPendingCarItem = null;

    function closeDaysSelectModal() {
      ui.modal.setAttribute('hidden', '');
      currentPendingCarItem = null;
    }

    document.getElementById('daysSelectCloseBtn').addEventListener('click', closeDaysSelectModal);

    function openDaysSelectModal(item, rentPrice) {
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

      var html = 
        '<div class="days-option-row">' +
          '<span class="days-label">单日 (24小时)</span>' +
          '<span class="days-price">¥' + p1 + '/天</span>' +
          '<button class="days-confirm-btn" data-days="单日 (24小时)">确认</button>' +
        '</div>' +
        '<div class="days-option-row">' +
          '<span class="days-label">一周 (7天)</span>' +
          '<span class="days-price">¥' + p7 + '/天</span>' +
          '<button class="days-confirm-btn" data-days="一周 (7天)">确认</button>' +
        '</div>' +
        '<div class="days-option-row">' +
          '<span class="days-label">半月 (15天)</span>' +
          '<span class="days-price">¥' + p15 + '/天</span>' +
          '<button class="days-confirm-btn" data-days="半月 (15天)">确认</button>' +
        '</div>' +
        '<div class="days-option-row">' +
          '<span class="days-label">整月 (30天)</span>' +
          '<span class="days-price">¥' + p30 + '/天</span>' +
          '<button class="days-confirm-btn" data-days="整月 (30天)">确认</button>' +
        '</div>';
      document.getElementById('daysSelectOptions').innerHTML = html;
      ui.modal.removeAttribute('hidden');
    }

    document.getElementById('daysSelectOptions').addEventListener('click', function (e) {
      if (e.target && e.target.classList.contains('days-confirm-btn')) {
        var days = e.target.getAttribute('data-days');
        if (currentPendingCarItem) {
          currentPendingCarItem.days = days;
          var map = readChecklistMap();
          map[currentPendingCarItem.car_id] = currentPendingCarItem;
          writeChecklistMap(map);
          renderList(map);
        }
        closeDaysSelectModal();
      }
    });

    function toggleCurrentCar() {
      if (!currentCarId) return;
      var map = readChecklistMap();
      if (map[currentCarId]) {
        delete map[currentCarId];
        writeChecklistMap(map);
        renderList(map);
      } else {
        // 从页面上获取租金信息
        var priceEl = document.querySelector('.hero-detail__price-num');
        var rentPrice = 0;
        
        if (priceEl) {
          rentPrice = priceEl.textContent.replace(/[^0-9]/g, '') || 0;
        } else {
          // 如果页面没有价格元素，尝试从 body 的 data-daily-price 获取
          rentPrice = document.body.getAttribute('data-daily-price') || 0;
        }
        
        var item = {
          car_id: currentCarId,
          car_name: currentCarName,
          model_name: currentCarName,
          rent_price: parseInt(String(rentPrice || 0), 10) || 0,
        };
        openDaysSelectModal(item, rentPrice);
      }
    }

    btn.addEventListener('click', function () {
      if (panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
    if (detailFabMoreBtn) {
      detailFabMoreBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var willOpen = detailFabMenu && detailFabMenu.hasAttribute('hidden');
        setFabMenuOpen(!!willOpen);
      });
    }
    if (detailFabAddBtn) {
      detailFabAddBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentCar();
        if (isMobileFab) setFabMenuOpen(false);
      }, true);
    }
    if (detailFabChecklistBtn) {
      detailFabChecklistBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
        setFabMenuOpen(false);
      });
    }
    closeBtn.addEventListener('click', function () {
      panel.setAttribute('hidden', '');
    });
    if (toggleCurrentBtn) {
      toggleCurrentBtn.addEventListener('click', toggleCurrentCar);
    }
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        if (phoneModal) {
          phoneModal.hidden = false;
          if (phoneInput) {
            phoneInput.value = '';
            phoneInput.focus();
          }
          if (phoneError) phoneError.hidden = true;
        } else {
          sendChecklist('');
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        writeChecklistMap({});
        renderList({});
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
        sendChecklist(phone);
      });
    }
    if (phoneInput && phoneError) {
      phoneInput.addEventListener('input', function () {
        var phone = String(phoneInput.value || '').replace(/\s+/g, '');
        phoneError.hidden = /^1\d{10}$/.test(phone);
      });
    }
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
    var consultBusy = false;

    function appendConsultMsg(role, text) {
      if (!consultChat) return;
      var el = document.createElement('div');
      el.className = 'detail-consult-modal__msg detail-consult-modal__msg--' + (role === 'user' ? 'user' : 'assistant');
      el.textContent = String(text || '');
      consultChat.appendChild(el);
      consultChat.scrollTop = consultChat.scrollHeight;
    }

    function ensureConsultWelcome() {
      if (!consultChat) return;
      if (consultChat.childElementCount > 0) return;
      appendConsultMsg('assistant', '您好，我是芒果超跑 AI 客服。请问您想咨询车型、价格、用车天数还是下单流程？');
    }

    function sendConsultQuestion() {
      if (consultBusy) return;
      var q = consultInput ? String(consultInput.value || '').trim() : '';
      if (!q) return;
      appendConsultMsg('user', q);
      if (consultInput) consultInput.value = '';
      var b = apiOrigin();
      if (!b) {
        appendConsultMsg('assistant', '当前无法连接客服服务，请稍后再试。');
        return;
      }
      consultBusy = true;
      if (consultSendBtn) consultSendBtn.disabled = true;
      fetch(b + '/api/ai-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          car_name: currentCarName,
          user: String(sessionStorage.getItem('mango_driver_name') || '')
        }),
        credentials: 'omit'
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j || {} }; });
        })
        .then(function (o) {
          if (o.ok && o.j && o.j.ok && o.j.reply) appendConsultMsg('assistant', o.j.reply);
          else appendConsultMsg('assistant', '客服暂时繁忙，请稍后重试。');
        })
        .catch(function () {
          appendConsultMsg('assistant', '网络异常，请稍后重试。');
        })
        .finally(function () {
          consultBusy = false;
          if (consultSendBtn) consultSendBtn.disabled = false;
        });
    }

    function setConsultModalOpen(open) {
      if (!consultModal) return;
      consultModal.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    }

    function openConsultModal() {
      if (consultModal) {
        setConsultModalOpen(true);
        ensureConsultWelcome();
        if (consultInput) consultInput.focus();
      }
    }
    if (detailFabConsultBtn) {
      detailFabConsultBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openConsultModal();
        if (isMobileFab) setFabMenuOpen(false);
      }, true);
    }
    if (consultCloseBtn && consultModal) {
      consultCloseBtn.addEventListener('click', function () {
        setConsultModalOpen(false);
      });
    }
    if (consultSendBtn) {
      consultSendBtn.addEventListener('click', sendConsultQuestion);
    }
    if (consultInput) {
      consultInput.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        sendConsultQuestion();
      });
    }
    // ==== 修改点：替换所有的主按钮，并移除之前绑定的事件 ====
    // 为了防止在详情页其他的脚本里给这些按钮绑定了 alert，我们用延迟的方式进行克隆替换
    setTimeout(function() {
      var allReserveBtns = document.querySelectorAll('.btn-reserve, .btn-primary');
      allReserveBtns.forEach(function (oldBtn) {
        // 放宽条件：只找加入清单或包含"加入清单"、"预约"等字样的按钮
        if (oldBtn.textContent.includes('预约') || oldBtn.textContent.includes('加入清单') || oldBtn.classList.contains('btn-primary') || oldBtn.classList.contains('btn-reserve')) {
          var cloneBtn = oldBtn.cloneNode(true);
          oldBtn.parentNode.replaceChild(cloneBtn, oldBtn);
          cloneBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleCurrentCar();
          }, true); // 使用捕获阶段触发
          
          if (cloneBtn.closest('#detailFabActions')) {
            detailFabPrimaryBtn = cloneBtn;
          }
        }
      });
      var allConsultBtns = document.querySelectorAll('#detailFabActions .btn-ghost');
      allConsultBtns.forEach(function (oldBtn) {
        var cloneBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(cloneBtn, oldBtn);
        cloneBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openConsultModal();
        }, true);
      });
    }, 800); // 把延迟加长到 800ms，确保在其他脚本（比如某些直接绑定 onclick 的情况）之后执行
    panel.addEventListener('click', function (e) {
      var removeBtn = e.target.closest && e.target.closest('[data-remove-car-id]');
      if (!removeBtn) return;
      var id = String(removeBtn.getAttribute('data-remove-car-id') || '').trim();
      if (!id) return;
      var map = readChecklistMap();
      if (map[id]) delete map[id];
      writeChecklistMap(map);
      renderList(map);
    });
    document.addEventListener('click', function (e) {
      if (!detailFabRoot || !detailFabMenu || detailFabMenu.hasAttribute('hidden')) return;
      if (detailFabRoot.contains(e.target)) return;
      setFabMenuOpen(false);
    });
    window.addEventListener('resize', syncPcFabWidth);
    setFabMenuOpen(false);
    if (phoneModal) {
      phoneModal.addEventListener('click', function (e) {
        if (e.target && e.target.getAttribute && e.target.getAttribute('data-detail-phone-cancel') === '1') {
          phoneModal.hidden = true;
        }
      });
    }
    if (consultModal) {
      consultModal.addEventListener('click', function (e) {
        if (e.target && e.target.getAttribute && e.target.getAttribute('data-detail-consult-cancel') === '1') {
          setConsultModalOpen(false);
        }
      });
      consultModal.addEventListener(
        'wheel',
        function (e) {
          var card = e.target.closest && e.target.closest('.detail-consult-modal__card');
          if (!card) {
            e.preventDefault();
            return;
          }
          e.stopPropagation();
        },
        { passive: false }
      );
    }

    renderList(readChecklistMap());
    window.setTimeout(syncPcFabWidth, 0);
    window.setTimeout(syncPcFabWidth, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
