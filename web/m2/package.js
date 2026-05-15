(function () {
  var SCENARIO_BY_TRACK = {
    business: '商务',
    wedding: '婚庆',
    event: '摆展',
    drive: '自驾',
  };

  /** m2-actions 弹窗打开时 html 会带此类；暂停套餐页全屏翻页与轨道滑动手势 */
  function m2PackageOverlayConsumesGestures() {
    try {
      var root = document.documentElement;
      return !!(root && root.classList.contains('m2a-overlay-scroll-lock'));
    } catch (e) {
      return false;
    }
  }

  function parseYuan(el) {
    if (!el) return 0;
    return parseInt(String(el.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
  }

  /** 与 1.0 package-order.js parseCarCount 一致 */
  function parseCarCount(text) {
    var s = String(text || '');
    var reg = /[×xX]\s*(\d+)/g;
    var m;
    var total = 0;
    while ((m = reg.exec(s))) {
      total += parseInt(m[1], 10) || 0;
    }
    return total;
  }

  /** 按卡片下标生成清单项（与 1.0 buildChecklistLines 字段一致） */
  function buildPackageChecklistItemAtIndex(track, idx) {
    var cards = track.querySelectorAll('.m2p-plan__card');
    var card = cards[idx];
    if (!card) return null;
    var key = track.getAttribute('data-plan-track') || 'pkg';
    var pageTitleEl = document.querySelector('.m2p-title');
    var pageTitle = pageTitleEl ? String(pageTitleEl.textContent || '').trim() : '套餐';
    var sub = card.querySelector('.m2p-plan__name');
    var subName = sub ? String(sub.textContent || '').trim() : '';
    var detail = card.querySelector('.m2p-plan__items');
    var detailText = detail ? String(detail.textContent || '').trim() : '';
    var priceEl = card.querySelector('.m2p-plan__price');
    var price = parseYuan(priceEl);
    var priceStr = priceEl ? String(priceEl.textContent || '').trim() : ('¥' + Math.round(price));
    var scenario = SCENARIO_BY_TRACK[key] || '套餐';
    var count = parseCarCount(detailText);
    var hasCustom = detailText.indexOf('自由组合') !== -1;
    var countText = hasCustom ? '按需配置' : (count > 0 ? (count + '台') : (detailText ? '1档' : '—'));
    var pkg_lines = [
      '使用场景：' + scenario,
      '已选套餐：' + subName,
      '套餐车辆：' + countText,
    ];
    if (detailText) pkg_lines.push(detailText + ' ' + priceStr);
    pkg_lines.push('合计：' + priceStr);

    var modelName = pageTitle + ' · ' + subName;
    var fullName = modelName + (detailText ? '（' + detailText + '）' : '');
    return {
      car_id: 'pkg:' + key + ':' + idx,
      car_name: modelName,
      model_name: fullName,
      rent_price: price,
      days: '套餐',
      pkg_lines: pkg_lines,
    };
  }

  window.m2BuildPackageChecklistItemAtIndex = function (idx) {
    var track = document.querySelector('[data-plan-track]');
    if (!track) return null;
    var n = parseInt(String(idx), 10);
    if (!isFinite(n) || n < 0) return null;
    return buildPackageChecklistItemAtIndex(track, n);
  };

  function publishPackageChecklistItem(track, cards) {
    var viewportCenter = track.scrollLeft + track.clientWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    cards.forEach(function (card, i) {
      var center = card.offsetLeft + card.offsetWidth / 2;
      var dist = Math.abs(center - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    var built = buildPackageChecklistItemAtIndex(track, best);
    if (built) window.m2PackageChecklistItem = built;
  }

  function republishAllTracks() {
    document.querySelectorAll('[data-plan-track]').forEach(function (track) {
      var cards = track.querySelectorAll('.m2p-plan__card');
      if (cards.length) publishPackageChecklistItem(track, cards);
    });
  }

  var tracks = document.querySelectorAll('[data-plan-track]');
  if (!tracks.length) return;

  function initPageDots() {
    var page = document.querySelector('.m2p-page');
    var sections = page ? Array.prototype.slice.call(page.querySelectorAll('.m2p-section')) : [];
    if (!page || !sections.length) return;
    page.classList.add('m2p-page--fade');

    (function ensureLastSectionFooter() {
      var lastSection = sections[sections.length - 1];
      if (!lastSection || lastSection.querySelector('.m2p-live__footer')) return;
      var footer = document.createElement('footer');
      footer.className = 'm2-about__footer m2p-live__footer';
      footer.innerHTML =
        '<div class="m2-legal-foot" role="contentinfo" aria-label="网站备案与联系方式">' +
        '<div class="m2-legal-foot__beian">' +
        '<a class="m2-legal-foot__link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">滇ICP备2025055273号-3</a>' +
        '<span class="m2-legal-foot__sep" aria-hidden="true">|</span>' +
        '<a class="m2-legal-foot__link m2-legal-foot__mps" href="https://beian.mps.gov.cn/#/query/webSearch?code=53010002000314" rel="noreferrer" target="_blank">' +
        '<img class="m2-legal-foot__mps-icon" src="../media-webp/photos/index/m2/备案图标.webp" alt="" width="18" height="20" decoding="async" loading="lazy">' +
        '<span>滇公网安备53010002000314号</span>' +
        '</a>' +
        '</div>' +
        '<p class="m2-legal-foot__copyright">© 2026 昆明芒果汽车服务有限公司 版权所有</p>' +
        '</div>';
      lastSection.appendChild(footer);
    })();

    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'm2p-page-dots';
    dotsWrap.setAttribute('aria-label', '页面导航');
    var currentIndex = 0;
    var isAnimating = false;
    var touchStartY = 0;
    var touchEndY = 0;
    var touchMoved = false;

    sections.forEach(function (_, idx) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'm2p-page-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('data-page-index', String(idx));
      dot.setAttribute('aria-label', '第' + (idx + 1) + '屏');
      dotsWrap.appendChild(dot);
    });

    function setActive(idx) {
      var dots = dotsWrap.querySelectorAll('.m2p-page-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
      sections.forEach(function (sec, i) {
        sec.classList.toggle('is-active', i === idx);
      });
      currentIndex = idx;
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
      if (m2PackageOverlayConsumesGestures()) return;
      e.preventDefault();
      if (e.deltaY > 0) nextSection();
      else if (e.deltaY < 0) prevSection();
    }

    function onTouchStart(e) {
      if (!e.touches || !e.touches[0]) return;
      touchStartY = e.touches[0].clientY;
      touchEndY = touchStartY;
      touchMoved = false;
      if (m2PackageOverlayConsumesGestures()) return;
    }

    function onTouchMove(e) {
      if (m2PackageOverlayConsumesGestures()) return;
      if (!e.touches || !e.touches[0]) return;
      touchEndY = e.touches[0].clientY;
      touchMoved = true;
    }

    function onTouchEnd() {
      if (m2PackageOverlayConsumesGestures()) return;
      if (!touchMoved) return;
      var deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) nextSection();
        else prevSection();
      }
    }

    function onKeydown(e) {
      if (m2PackageOverlayConsumesGestures()) return;
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
      var btn = e.target.closest && e.target.closest('.m2p-page-dot');
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

    setActive(0);
    document.body.appendChild(dotsWrap);
  }

  window.m2PublishPackageChecklistForActions = republishAllTracks;

  window.addEventListener('load', function () {
    republishAllTracks();
  });

  tracks.forEach(function (track) {
    var cards = track.querySelectorAll('.m2p-plan__card');
    if (!cards.length) return;
    publishPackageChecklistItem(track, cards);

    var dotsWrap = document.querySelector('[data-plan-dots="' + track.getAttribute('data-plan-track') + '"]');
    if (!dotsWrap) return;
    var activePlanIndex = 0;

    function setActiveByIndex(idx) {
      activePlanIndex = idx;
      var dots = dotsWrap.querySelectorAll('.m2p-plan__dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === idx);
      });
    }

    function maxScrollLeft() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function scrollToCardIndex(idx, behavior) {
      var card = cards[idx];
      if (!card) return;
      var centerLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
      var maxLeft = maxScrollLeft();
      var left = centerLeft;
      if (left < 0) left = 0;
      else if (left > maxLeft) left = maxLeft;
      track.scrollTo({ left: left, behavior: behavior || 'auto' });
    }

    function nearestCardIndex() {
      var viewportCenter = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      cards.forEach(function (card, i) {
        var center = card.offsetLeft + card.offsetWidth / 2;
        var dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    dotsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.m2p-plan__dot');
      if (!btn) return;
      var idx = parseInt(String(btn.getAttribute('data-index') || ''), 10);
      if (!isFinite(idx) || !cards[idx]) return;
      scrollToCardIndex(idx, 'smooth');
      setActiveByIndex(idx);
      publishPackageChecklistItem(track, cards);
    });

    var touchStartX = 0;
    var touchStartY = 0;
    track.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
      if (m2PackageOverlayConsumesGestures()) return;
      var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if (!t) return;
      var dx = t.clientX - touchStartX;
      var dy = t.clientY - touchStartY;
      if (Math.abs(dx) < 24 || Math.abs(dx) <= Math.abs(dy)) return;
      var cur = activePlanIndex;
      var next = dx < 0 ? Math.min(cards.length - 1, cur + 1) : Math.max(0, cur - 1);
      if (next === cur) {
        scrollToCardIndex(cur, 'smooth');
        return;
      }
      scrollToCardIndex(next, 'smooth');
      setActiveByIndex(next);
      publishPackageChecklistItem(track, cards);
    }, { passive: true });

    var timer = null;
    track.addEventListener('scroll', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        var idx = nearestCardIndex();
        setActiveByIndex(idx);
        publishPackageChecklistItem(track, cards);
      }, 70);
    }, { passive: true });

    Array.prototype.forEach.call(cards, function (card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        if (m2PackageOverlayConsumesGestures()) return;
        var idx = Array.prototype.indexOf.call(cards, card);
        if (!isFinite(idx) || idx < 0) return;
        scrollToCardIndex(idx, 'smooth');
        setActiveByIndex(idx);
        publishPackageChecklistItem(track, cards);
        if (typeof window.m2aOpenPackageQtyForPlanIndex === 'function') {
          window.m2aOpenPackageQtyForPlanIndex(idx);
        }
      });
    });

    scrollToCardIndex(0);
    setActiveByIndex(0);
    publishPackageChecklistItem(track, cards);
  });

  requestAnimationFrame(function () {
    republishAllTracks();
  });

  initPageDots();
})();
