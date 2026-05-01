/* 详情页右侧快捷栏（公共） */
(function () {
  function ensureCoverScrollHint() {
    var knockout = document.getElementById('m2Knockout');
    if (!knockout) return;
    if (knockout.querySelector('.m2-cover-scroll-hint')) return;

    var hint = document.createElement('div');
    hint.className = 'm2-cover-scroll-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<span class="m2-cover-scroll-hint__text">向下滑动</span><span class="m2-cover-scroll-hint__arrow">⌄</span>';
    knockout.appendChild(hint);

    function syncHint() {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y > 28) hint.classList.add('is-hidden');
      else hint.classList.remove('is-hidden');
    }
    syncHint();
    window.addEventListener('scroll', syncHint, { passive: true });
  }

  function setupCoverAutoReveal() {
    var cover = document.querySelector('.m2-cover-wrapper');
    var knockout = document.getElementById('m2Knockout');
    if (!cover || !knockout) return;

    var started = false;
    var threshold = 18;

    function getY() {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function revealTarget() {
      return Math.round(cover.offsetTop + window.innerHeight * 1.8);
    }

    function animateScrollTo(target) {
      var start = getY();
      var dist = target - start;
      var duration = 3000;
      var t0 = window.performance ? window.performance.now() : Date.now();

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function step(now) {
        var elapsed = now - t0;
        var p = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + dist * easeOutCubic(p));
        if (p < 1) window.requestAnimationFrame(step);
      }

      window.requestAnimationFrame(step);
    }

    function maybeReveal() {
      if (started) return;
      var y = getY();
      var target = revealTarget();
      if (y < threshold || y >= target - 4) return;
      started = true;
      animateScrollTo(target);
    }

    window.addEventListener('scroll', maybeReveal, { passive: true });
    window.addEventListener('resize', function () {
      if (started && getY() < revealTarget() - 4) started = false;
    }, { passive: true });
  }

  function applyM2CurrentCar(car) {
    var name = String(document.body.getAttribute('data-car-display-name') || '').trim();
    var dayEl = document.querySelector('#m2Pricing .m2-car__pricing-num');
    var rent = 0;
    if (dayEl) rent = parseInt(String(dayEl.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
    if (car) {
      window.m2CurrentCar = {
        car_id: String(car.car_name || name || '').trim(),
        car_name: String(car.car_name || name || '').trim(),
        model_name: String((car.model || car.car_name || name || '')).trim(),
        rent_price: parseInt(String(car.rent_price != null ? car.rent_price : rent), 10) || rent,
      };
    } else if (name) {
      window.m2CurrentCar = {
        car_id: name,
        car_name: name,
        model_name: name,
        rent_price: rent,
      };
    }
  }

  applyM2CurrentCar(null);
  ensureCoverScrollHint();
  setupCoverAutoReveal();
  window.addEventListener('m2-detail-catalog-ready', function (ev) {
    var c = ev.detail && ev.detail.car;
    applyM2CurrentCar(c || null);
  });

  var rail = document.getElementById('m2CarRail');
  var peek = document.getElementById('m2CarRailPeek');
  var closeBtn = document.getElementById('m2CarRailClose');
  var addBtn = document.getElementById('m2BtnAddChecklist') || document.getElementById('m2DetailRailAdd');
  var consultBtn = document.getElementById('m2BtnConsult') || document.getElementById('m2DetailRailConsult');
  var listBtn = document.getElementById('m2BtnChecklist') || document.getElementById('m2DetailRailList');

  if (!rail || !peek || !closeBtn || !addBtn || !consultBtn || !listBtn) return;

  function coverScrollEndPx() {
    var cover = document.querySelector('.m2-cover-wrapper');
    if (!cover) return Math.round(window.innerHeight * 2.8);
    return Math.round(cover.offsetTop + cover.offsetHeight);
  }

  function updateRailScrollGate() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (y >= coverScrollEndPx() - 0.5) rail.classList.add('is-past-cover');
    else rail.classList.remove('is-past-cover');
  }

  updateRailScrollGate();
  window.addEventListener('scroll', updateRailScrollGate, { passive: true });
  window.addEventListener('resize', updateRailScrollGate, { passive: true });

  function collapse() {
    rail.classList.add('is-collapsed');
  }
  function expand() {
    rail.classList.remove('is-collapsed');
  }

  closeBtn.addEventListener('click', collapse);
  peek.addEventListener('click', expand);

  function act(name) {
    var a = window.m2Actions;
    if (a && typeof a[name] === 'function') {
      a[name]();
      return;
    }
    if (window.__m2ActionsLoading) return;
    window.__m2ActionsLoading = true;
    var s = document.createElement('script');
    s.src = '../../m2-actions.js';
    s.onload = function () {
      window.__m2ActionsLoading = false;
      var a2 = window.m2Actions;
      if (a2 && typeof a2[name] === 'function') a2[name]();
    };
    s.onerror = function () {
      window.__m2ActionsLoading = false;
    };
    document.body.appendChild(s);
  }

  function forceOpenChecklistPanel() {
    var panel = document.getElementById('m2aChecklistPanel');
    var backdrop = document.getElementById('m2aChecklistBackdrop');
    if (panel) {
      if (panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
      if (backdrop && backdrop.hasAttribute('hidden')) backdrop.removeAttribute('hidden');
      return true;
    }
    return false;
  }

  addBtn.addEventListener('click', function () {
    if (String(document.body.getAttribute('data-car-display-name') || '').trim() === '奥迪 R8') {
      document.body.classList.add('m2-r8-days-center');
    }
    act('addChecklist');
  });

  consultBtn.addEventListener('click', function () {
    act('openConsult');
  });

  listBtn.addEventListener('click', function () {
    document.body.classList.add('m2-detail-checklist-center');
    if (forceOpenChecklistPanel()) return;
    act('toggleChecklistPanel');
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (forceOpenChecklistPanel() || tries >= 10) clearInterval(timer);
    }, 120);
  });
})();
