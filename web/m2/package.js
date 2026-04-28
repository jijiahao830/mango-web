(function () {
  var SCENARIO_BY_TRACK = {
    business: '商务',
    wedding: '婚庆',
    event: '摆展',
    drive: '自驾',
  };

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
    var priceStr = priceEl ? String(priceEl.textContent || '').trim() : ('¥' + Math.round(price).toLocaleString('zh-CN'));
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

    function setActiveByIndex(idx) {
      var dots = dotsWrap.querySelectorAll('.m2p-plan__dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === idx);
      });
    }

    function maxScrollLeft() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function scrollToCardIndex(idx) {
      var card = cards[idx];
      if (!card) return;
      var centerLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
      var maxLeft = maxScrollLeft();
      var left = centerLeft;
      if (left < 0) left = 0;
      else if (left > maxLeft) left = maxLeft;
      track.scrollTo({ left: left, behavior: 'auto' });
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
      scrollToCardIndex(idx);
      setActiveByIndex(idx);
      publishPackageChecklistItem(track, cards);
    });

    var timer = null;
    track.addEventListener('scroll', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        var idx = nearestCardIndex();
        setActiveByIndex(idx);
        publishPackageChecklistItem(track, cards);
      }, 70);
    }, { passive: true });

    scrollToCardIndex(0);
    setActiveByIndex(0);
    publishPackageChecklistItem(track, cards);
  });

  requestAnimationFrame(function () {
    republishAllTracks();
  });
})();
