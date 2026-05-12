/* 详情页右侧快捷栏（公共） */
(function () {
  function remapGalleryAndFeatures() {
    var features = document.getElementById('m2Features');
    var gallery = document.getElementById('m2Gallery');
    if (!features || !gallery) return;

    var featTrack = features.querySelector('#m2FeatTrack');
    var galleryTrack = gallery.querySelector('#m2GalleryTrack');
    if (featTrack && galleryTrack) {
      var featureSlides = Array.prototype.slice.call(
        featTrack.querySelectorAll('.m2-features__slide')
      );
      featureSlides.forEach(function (slide, idx) {
        var img = slide.querySelector('.m2-features__img');
        if (!img || !img.getAttribute('src')) return;
        var gSlide = document.createElement('div');
        gSlide.className = 'm2-gallery__slide';
        var gImg = document.createElement('img');
        gImg.className = 'm2-gallery__img';
        gImg.src = img.getAttribute('src');
        gImg.alt = img.getAttribute('alt') || ('图赏补充 ' + (idx + 1));
        gSlide.appendChild(gImg);
        galleryTrack.appendChild(gSlide);
      });
    }

    if (features.parentNode) {
      features.parentNode.insertBefore(gallery, features);
      features.parentNode.removeChild(features);
    }
  }

  remapGalleryAndFeatures();

  function ensureDetailScrollHint() {
    if (document.querySelector('.m2-detail-scroll-hint')) return;
    var hint = document.createElement('div');
    hint.className = 'm2-detail-scroll-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML =
      '<span class="m2-detail-scroll-hint__text">向下滑动</span>' +
      '<span class="m2-detail-scroll-hint__arrow">⌄</span>';
    document.body.appendChild(hint);

    function sync() {
      var y = window.scrollY || window.pageYOffset || 0;
      var cover = document.querySelector('.m2-cover-wrapper');
      var inCover = true;
      if (document.body.classList.contains('m2d-page--fade')) {
        inCover = !!(cover && cover.classList.contains('is-active'));
      } else if (cover) {
        var coverBottom = cover.offsetTop + cover.offsetHeight;
        inCover = y < Math.max(28, coverBottom - 2);
      } else {
        inCover = y <= 28;
      }
      if (!inCover) hint.classList.add('is-hidden');
      else hint.classList.remove('is-hidden');
    }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('wheel', sync, { passive: true });
    window.addEventListener('touchend', sync, { passive: true });
    window.addEventListener('keydown', sync);

    var watchNodes = document.querySelectorAll('.m2d-page-section, .m2-cover-wrapper');
    watchNodes.forEach(function (node) {
      var mo = new MutationObserver(sync);
      mo.observe(node, { attributes: true, attributeFilter: ['class'] });
    });
  }

  ensureDetailScrollHint();

  function bindSwipeNav(areaEl, prevBtn, nextBtn) {
    if (!areaEl || !prevBtn || !nextBtn) return;
    if (areaEl.__m2SwipeBound) return;
    areaEl.__m2SwipeBound = true;
    areaEl.style.touchAction = 'pan-y';
    var startX = 0;
    var startY = 0;
    var didSwipe = false;
    var threshold = 18;

    areaEl.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      didSwipe = false;
    }, { passive: true });

    areaEl.addEventListener('touchend', function (e) {
      var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if (!t) return;
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < threshold) return;
      didSwipe = true;
      if (dx < 0) nextBtn.click();
      else prevBtn.click();
    }, { passive: true });

    areaEl.addEventListener('click', function (e) {
      if (!didSwipe) return;
      e.preventDefault();
      e.stopPropagation();
      didSwipe = false;
    }, true);
  }

  function bindSamePriceCarouselSwipe() {
    var zone = document.querySelector('#m2SamePriceSection .m2-same-price__vehicle-zone');
    var prev = document.getElementById('m2SamePricePrev');
    var next = document.getElementById('m2SamePriceNext');
    if (!zone || !prev || !next || zone.__m2SamePriceSwipeBound) return;
    zone.__m2SamePriceSwipeBound = true;

    /*
     * pan-y + 触点落在子元素时常导致横向手势被误判为纵向；整块车辆区接管触摸意图。
     */
    zone.style.touchAction = 'pan-x pan-y';

    var startX = 0;
    var startY = 0;
    var threshold = 24;
    var suppressLinkTapUntil = 0;

    zone.addEventListener(
      'touchstart',
      function (e) {
        if (!e.touches || !e.touches[0]) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );

    zone.addEventListener(
      'touchend',
      function (e) {
        var t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;

        /*
         * 明显横向时才切车：避免与同屏纵向翻页争抢；阈值略大减少误触。
         */
        if (Math.abs(dx) < threshold) return;
        if (Math.abs(dx) <= Math.abs(dy)) return;

        /*
         * 禁用按钮上不触发 click — 已由 paint 设为 disabled。
         */
        var acted = false;
        if (dx < 0 && !next.disabled) {
          next.click();
          acted = true;
        } else if (dx > 0 && !prev.disabled) {
          prev.click();
          acted = true;
        }
        if (acted) suppressLinkTapUntil = Date.now() + 480;

        try {
          if (acted) e.stopPropagation();
        } catch (stopE) {}
      },
      { passive: true }
    );

    zone.addEventListener(
      'click',
      function (e) {
        if (Date.now() > suppressLinkTapUntil) return;
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a || !zone.contains(a)) return;
        e.preventDefault();
        e.stopPropagation();
      },
      true
    );
  }

  function initImageSwipe() {
    bindSwipeNav(
      document.querySelector('.m2-car__features.m2d-page-section'),
      document.getElementById('m2FeatPrev'),
      document.getElementById('m2FeatNext')
    );
    bindSwipeNav(
      document.querySelector('.m2-features__viewport'),
      document.getElementById('m2FeatPrev'),
      document.getElementById('m2FeatNext')
    );
    bindSwipeNav(
      document.querySelector('.m2-gallery__viewport'),
      document.getElementById('m2GalleryPrev'),
      document.getElementById('m2GalleryNext')
    );

    /*
     * 同价位车辆在更大的 .vehicle-zone 上识别横向滑动，避免仅绑在内部块上不灵。
     * 已不再对 #m2SamePriceHas 走 bindSwipeNav（见下）。
     */
    bindSamePriceCarouselSwipe();
  }

  initImageSwipe();

  function initDetailFadePager() {
    var selectors = [
      '.m2-cover-wrapper',
      '#m2Gallery',
      '#m2Scenario',
      '#m2SamePriceSection'
    ];
    var sections = selectors
      .map(function (s) { return document.querySelector(s); })
      .filter(Boolean);
    if (sections.length < 2) return;

    document.body.classList.add('m2d-page--fade');
    sections.forEach(function (sec) { sec.classList.add('m2d-page-section'); });

    var gallerySection = document.querySelector('.m2-car__gallery.m2d-page-section');
    if (gallerySection && !gallerySection.querySelector('.m2-gallery__heading')) {
      var galleryHeading = document.createElement('div');
      galleryHeading.className = 'm2-gallery__heading';
      galleryHeading.textContent = '实车图赏';
      var galleryViewport = gallerySection.querySelector('.m2-gallery__viewport');
      if (galleryViewport) gallerySection.insertBefore(galleryHeading, galleryViewport);
      else gallerySection.appendChild(galleryHeading);
    }

    var scenarioSection = document.querySelector('.m2-car__scenario-section.m2d-page-section');
    if (scenarioSection) {
      var oldScenarioIntro = scenarioSection.querySelector('.m2-scenario__section-intro');
      if (oldScenarioIntro && oldScenarioIntro.parentNode) {
        oldScenarioIntro.parentNode.removeChild(oldScenarioIntro);
      }
      var scenarioCard = scenarioSection.querySelector('.m2-scenario-card');
      if (scenarioCard && !scenarioCard.querySelector('.m2-scenario__section-intro')) {
        var scenarioIntro = document.createElement('span');
        scenarioIntro.className = 'm2-scenario__section-intro';
        scenarioIntro.textContent = '使用场景';
        scenarioCard.appendChild(scenarioIntro);
      }
    }

    var samePriceSection = document.querySelector('.m2-car__same-price.m2d-page-section');
    if (samePriceSection) {
      var oldHeading = samePriceSection.querySelector('.m2-same-price__heading');
      if (oldHeading && oldHeading.parentNode) oldHeading.parentNode.removeChild(oldHeading);
    }
    if (samePriceSection) {
      var samePriceTitle = samePriceSection.querySelector('.m2-same-price__title');
      if (samePriceTitle && samePriceTitle.parentNode) {
        samePriceTitle.parentNode.removeChild(samePriceTitle);
      }
    }
    if (samePriceSection) {
      var vehicleZone = samePriceSection.querySelector('.m2-same-price__vehicle-zone');
      if (vehicleZone && !vehicleZone.querySelector('.m2-same-price__section-intro')) {
        var sectionIntro = document.createElement('span');
        sectionIntro.className = 'm2-same-price__section-intro';
        sectionIntro.textContent = '同价位其他车型';
        vehicleZone.insertBefore(sectionIntro, vehicleZone.firstChild);
      }
      var oldInlineTitle = samePriceSection.querySelector('.m2-same-price__inline-title');
      if (oldInlineTitle && oldInlineTitle.parentNode) {
        oldInlineTitle.parentNode.removeChild(oldInlineTitle);
      }
    }

    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'm2d-page-dots';
    dotsWrap.setAttribute('aria-label', '页面导航');

    var currentIndex = 0;
    var isAnimating = false;
    var touchStartY = 0;
    var touchEndY = 0;
    var touchStartX = 0;
    var touchEndX = 0;
    var touchMoved = false;
    var stateKey = 'm2_detail_active_section:' + String(location.pathname || '');

    function isReloadNavigation() {
      try {
        if (window.performance && typeof window.performance.getEntriesByType === 'function') {
          var navs = window.performance.getEntriesByType('navigation');
          if (navs && navs[0] && navs[0].type) return navs[0].type === 'reload';
        }
      } catch (e) {}
      try {
        if (window.performance && window.performance.navigation) {
          return window.performance.navigation.type === 1;
        }
      } catch (e2) {}
      return false;
    }

    sections.forEach(function (_, idx) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'm2d-page-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('data-page-index', String(idx));
      dot.setAttribute('aria-label', '第' + (idx + 1) + '屏');
      dotsWrap.appendChild(dot);
    });

    function setActive(idx) {
      var dots = dotsWrap.querySelectorAll('.m2d-page-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
      sections.forEach(function (sec, i) {
        sec.classList.toggle('is-active', i === idx);
      });
      currentIndex = idx;
      try {
        sessionStorage.setItem(stateKey, String(idx));
      } catch (e) {}
      window.scrollTo(0, 0);
      try {
        if (typeof window.__m2SyncDetailRail === 'function') window.__m2SyncDetailRail();
      } catch (eR) {}
    }

    function goToSection(idx) {
      if (isAnimating || idx === currentIndex) return;
      if (idx < 0 || idx >= sections.length) return;
      isAnimating = true;
      setActive(idx);
      setTimeout(function () {
        isAnimating = false;
      }, 820);
    }

    function nextSection() {
      goToSection((currentIndex + 1) % sections.length);
    }

    function prevSection() {
      goToSection((currentIndex - 1 + sections.length) % sections.length);
    }

    function onWheel(e) {
      e.preventDefault();
      if (e.deltaY > 0) nextSection();
      else if (e.deltaY < 0) prevSection();
    }

    function onTouchStart(e) {
      touchStartX = e.touches[0].clientX;
      touchEndX = touchStartX;
      touchStartY = e.touches[0].clientY;
      touchEndY = touchStartY;
      touchMoved = false;
    }

    function onTouchMove(e) {
      touchEndX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
      touchMoved = true;
    }

    function onTouchEnd() {
      if (!touchMoved) return;
      var deltaX = touchStartX - touchEndX;
      var deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) nextSection();
        else prevSection();
      }
    }

    function onKeydown(e) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          nextSection();
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevSection();
          break;
        case 'Home':
          e.preventDefault();
          goToSection(0);
          break;
        case 'End':
          e.preventDefault();
          goToSection(sections.length - 1);
          break;
      }
    }

    dotsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.m2d-page-dot');
      if (!btn) return;
      var idx = parseInt(String(btn.getAttribute('data-page-index') || ''), 10);
      if (!isFinite(idx) || !sections[idx]) return;
      goToSection(idx);
    });

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeydown);

    var initialIndex = 0;
    var canRestore = isReloadNavigation();
    try {
      if (canRestore) {
        var saved = parseInt(String(sessionStorage.getItem(stateKey) || ''), 10);
        if (isFinite(saved) && saved >= 0 && saved < sections.length) initialIndex = saved;
      } else {
        sessionStorage.removeItem(stateKey);
      }
    } catch (e) {}

    setActive(initialIndex);
    document.body.appendChild(dotsWrap);
  }

  initDetailFadePager();

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
    if (dayEl) {
      var txt = String(dayEl.textContent || '');
      var m = txt.match(/(\d[\d,]*)/);
      rent = m ? (parseInt(String(m[1]).replace(/,/g, ''), 10) || 0) : 0;
    }
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

  /**
   * 需求：封面部分也显示侧边栏。
   */
  function updateRailScrollGate() {
    rail.classList.add('is-past-cover');
  }

  window.__m2SyncDetailRail = updateRailScrollGate;

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
