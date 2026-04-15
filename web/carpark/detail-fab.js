/**
 * 详情页右侧「立即预约 / 咨询客服」悬浮条：Hero（.hero-detail）在视口内时隐藏，滚出后显示。
 * 与兰博基尼各车型 car.js 中逻辑一致。
 */
(function () {
  var heroSection = document.querySelector('.hero-detail');
  var fab = document.getElementById('detailFabActions');
  if (!heroSection || !fab) return;

  function heroIntersectsViewport() {
    var rect = heroSection.getBoundingClientRect();
    var vh = window.innerHeight;
    return rect.bottom > 0 && rect.top < vh;
  }

  function syncFab() {
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
 * 详情页用车清单：
 * - 右下角固定「用车清单」按钮（与选车页位置一致）
 * - 点击展开已选车辆列表
 * - 可在详情页把当前车辆加入/移出清单
 */
(function () {
  var STORAGE_KEY = 'mangoCarChecklist';

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
      '.detail-checklist-btn{position:fixed;z-index:520;right:clamp(16px,4vw,32px);bottom:calc(124px + env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(23,26,33,.96);color:#e8ecf8;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.38)}' +
      '.detail-checklist-btn__icon{color:#fff}' +
      '.detail-checklist-btn.has-items .detail-checklist-btn__icon{color:#ff8c69}' +
      '.detail-checklist-btn__count{min-width:20px;height:20px;line-height:20px;border-radius:999px;text-align:center;font-size:12px;background:#ff6b35;color:#fff}' +
      '.detail-checklist-panel{position:fixed;z-index:720;right:clamp(16px,4vw,32px);bottom:calc(172px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 24px));max-height:min(62vh,560px);border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(18,20,28,.98);box-shadow:0 18px 40px rgba(0,0,0,.45);overflow:hidden}' +
      '.detail-checklist-panel__header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)}' +
      '.detail-checklist-panel__title{margin:0;font-size:15px;color:#f6f7fb}' +
      '.detail-checklist-panel__close{border:none;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}' +
      '.detail-checklist-panel__body{padding:10px 12px 12px;max-height:calc(min(62vh,560px) - 56px);overflow:auto}' +
      '.detail-checklist-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
      '.detail-checklist-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)}' +
      '.detail-checklist-item__name{font-size:13px;color:rgba(255,255,255,.9)}' +
      '.detail-checklist-item__remove,.detail-checklist-panel__toggle-current{border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:4px 8px;background:transparent;color:rgba(255,255,255,.9);font-size:12px;cursor:pointer}' +
      '.detail-checklist-panel__toolbar{display:flex;justify-content:flex-end;margin-bottom:8px}' +
      '.detail-checklist-empty{margin:10px 2px 0;color:rgba(255,255,255,.68);font-size:13px}';
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
      '</div>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    return { btn: btn, panel: panel };
  }

  function run() {
    ensureStyle();
    var ui = buildUi();
    var btn = ui.btn;
    var panel = ui.panel;
    var countEl = document.getElementById('detailChecklistCount');
    var listEl = document.getElementById('detailChecklistList');
    var emptyEl = document.getElementById('detailChecklistEmpty');
    var closeBtn = document.getElementById('detailChecklistCloseBtn');
    var toggleCurrentBtn = document.getElementById('detailChecklistToggleCurrentBtn');
    var detailFabPrimaryBtn = document.querySelector('#detailFabActions .btn-primary');

    var body = document.body;
    var currentCarName = String(body.getAttribute('data-car-display-name') || '').trim();
    var currentCarId = currentCarName;

    function syncCount(map) {
      var count = getCount(map);
      if (countEl) countEl.textContent = String(count);
      if (btn) btn.classList.toggle('has-items', count > 0);
    }

    function syncCurrentBtn(map) {
      if (!currentCarId) return;
      var picked = !!(map && map[currentCarId]);
      if (toggleCurrentBtn) {
        toggleCurrentBtn.textContent = picked ? '移出当前车辆' : '加入当前车辆';
      }
      if (detailFabPrimaryBtn) {
        detailFabPrimaryBtn.textContent = picked ? '移除' : '加入清单';
      }
    }

    function renderList(map) {
      var m = map || {};
      var ids = Object.keys(m);
      listEl.innerHTML = ids
        .map(function (id) {
          var item = m[id] || {};
          var name = escHtml(String(item.model_name || item.car_name || id));
          return (
            '<li class="detail-checklist-item">' +
            '<div class="detail-checklist-item__name">' + name + '</div>' +
            '<button type="button" class="detail-checklist-item__remove" data-remove-car-id="' + escHtml(id) + '">移除</button>' +
            '</li>'
          );
        })
        .join('');
      emptyEl.style.display = ids.length ? 'none' : '';
      syncCount(m);
      syncCurrentBtn(m);
    }

    function toggleCurrentCar() {
      if (!currentCarId) return;
      var map = readChecklistMap();
      if (map[currentCarId]) delete map[currentCarId];
      else {
        map[currentCarId] = {
          car_id: currentCarId,
          car_name: currentCarName,
          model_name: currentCarName,
        };
      }
      writeChecklistMap(map);
      renderList(map);
    }

    btn.addEventListener('click', function () {
      if (panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });
    closeBtn.addEventListener('click', function () {
      panel.setAttribute('hidden', '');
    });
    if (toggleCurrentBtn) {
      toggleCurrentBtn.addEventListener('click', toggleCurrentCar);
    }
    if (detailFabPrimaryBtn) {
      detailFabPrimaryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        toggleCurrentCar();
      }, true);
    }
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

    renderList(readChecklistMap());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
