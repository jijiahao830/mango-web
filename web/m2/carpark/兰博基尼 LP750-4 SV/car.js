(function () {
  var backLink = document.querySelector('.m2-car__back');
  if (backLink) {
    var qIn = new URLSearchParams(location.search || '');
    var qOut = new URLSearchParams();
    ['cat', 'brand', 'search', 'carIndex'].forEach(function (k) {
      var v = qIn.get(k);
      if (v != null && v !== '') qOut.set(k, v);
    });
    var fromSection = String(qIn.get('from') || '').trim();
    var allow = { m2Chooser: true, m2Packages: true, m2Service: true, m2About: true };
    var hash = allow[fromSection] ? fromSection : 'm2Chooser';
    var qs = qOut.toString();
    var qstr = qs ? ('?' + qs) : '';
    backLink.href = '../../index.html' + qstr + '#' + hash + '--m2ns';
  }

  function resetToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resetToTop, { once: true });
  } else {
    resetToTop();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) resetToTop();
  });
})();

(function () {
  var knockout = document.getElementById('m2Knockout');
  var textEl = document.getElementById('m2KnockoutText');
  var pricingLines = document.querySelectorAll('[data-pricing-line]');

  if (!knockout || !textEl) return;

  var rawKnockout = (textEl.textContent || '').trim();
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  var vh = window.innerHeight;

  /* ── 滚动分界（像素）
     封面容器 = 280vh，镂空动画区间 = 180vh
     价格文字动画仅放在「价格区与封面切换」这一屏位移里，
     保证上滑时“文字淡出”和“页面上移”同步进行 */
  var phase1Max = vh * 1.8;
  var pricingStart = vh * 1.8;
  var phase2Range = vh * 1;

  var basePx = window.innerWidth * 0.28;

  /* 文字节奏：p2 从 0 开始即同步出现/消失（上下滑同样同步） */
  var N = pricingLines.length;
  var LINE_DUR = 0.15;
  var FADE_START = 0;
  var STAGGER = (1.0 - LINE_DUR - FADE_START) / (N - 1);

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function buildFontWithSize(px) {
    var st = window.getComputedStyle(textEl);
    var style = st.fontStyle || 'italic';
    var weight = st.fontWeight || '900';
    var family = st.fontFamily || 'sans-serif';
    return style + ' ' + weight + ' ' + px + 'px ' + family;
  }

  function measureTextWidth(str, fontCss) {
    ctx.font = fontCss;
    return ctx.measureText(str).width;
  }

  /* 将 raw 切成 lineCount 行，使「最宽一行」尽量窄（与 25 款库里南相同 DP 思路） */
  function bestSplitLines(raw, lineCount, fontCss) {
    var chars = Array.from(raw);
    var n = chars.length;
    if (!n) return [''];
    if (lineCount <= 1) return [raw];

    function segWidth(i, j) {
      if (j <= i) return 0;
      return measureTextWidth(chars.slice(i, j).join(''), fontCss);
    }

    var INF = 1e15;
    var dp = [];
    var prev = [];
    var line;
    var end;
    var start;
    for (line = 0; line <= lineCount; line++) {
      dp[line] = [];
      prev[line] = [];
      for (end = 0; end <= n; end++) {
        dp[line][end] = INF;
        prev[line][end] = -1;
      }
    }
    dp[0][0] = 0;

    for (line = 1; line <= lineCount; line++) {
      for (end = line; end <= n; end++) {
        for (start = line - 1; start < end; start++) {
          if (dp[line - 1][start] >= INF) continue;
          var w = segWidth(start, end);
          var cost = Math.max(dp[line - 1][start], w);
          if (cost < dp[line][end]) {
            dp[line][end] = cost;
            prev[line][end] = start;
          }
        }
      }
    }

    var out = [];
    var cur = n;
    for (var l2 = lineCount; l2 >= 1; l2--) {
      var st2 = prev[l2][cur];
      if (st2 < 0) break;
      out.unshift(chars.slice(st2, cur).join(''));
      cur = st2;
    }
    return out.length ? out : [raw];
  }

  function maxLineWidth(lines, fontCss) {
    var m = 0;
    for (var i = 0; i < lines.length; i++) {
      m = Math.max(m, measureTextWidth(lines[i], fontCss));
    }
    return m;
  }

  function applyKnockoutLines() {
    var maxW = window.innerWidth * 0.86;
    var fontCss = buildFontWithSize(basePx);
    var lines;

    if (!rawKnockout) {
      lines = [''];
    } else if (measureTextWidth(rawKnockout, fontCss) <= maxW) {
      lines = [rawKnockout];
    } else {
      var two = bestSplitLines(rawKnockout, 2, fontCss);
      if (maxLineWidth(two, fontCss) <= maxW) {
        lines = two;
      } else {
        lines = bestSplitLines(rawKnockout, 3, fontCss);
      }
    }

    textEl.innerHTML = '';
    for (var i = 0; i < lines.length; i++) {
      var span = document.createElement('span');
      span.className = 'm2-car__knockout-line';
      span.textContent = lines[i];
      textEl.appendChild(span);
    }
  }

  function getScrollY() {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }

  function update() {
    var sy = getScrollY();

    var p1 = clamp(sy / phase1Max, 0, 1);
    textEl.style.fontSize = basePx * (1 + p1 * 21) + 'px';
    var bgAlpha = p1 < 0.6 ? 1 : 1 - (p1 - 0.6) / 0.4;
    knockout.style.background = 'rgba(255,255,255,' + bgAlpha + ')';

    var p2 = sy < pricingStart ? 0 : clamp((sy - pricingStart) / phase2Range, 0, 1);

    pricingLines.forEach(function (el, i) {
      var ls = FADE_START + i * STAGGER;
      var lp = clamp((p2 - ls) / LINE_DUR, 0, 1);
      el.style.opacity = lp;
      el.style.transform = 'translateX(' + (-28 * (1 - lp)) + 'px)';
    });
  }

  function onResize() {
    vh = window.innerHeight;
    phase1Max = vh * 1.8;
    pricingStart = vh * 1.8;
    phase2Range = vh * 1;
    basePx = window.innerWidth * 0.28;
    applyKnockoutLines();
    update();
  }

  function knockoutNorm(s) {
    return String(s || '')
      .replace(/[\s\u00a0\u3000]+/g, '')
      .trim();
  }

  window.addEventListener('m2-detail-catalog-ready', function (ev) {
    var next =
      (ev && ev.detail && String(ev.detail.model || '').trim()) ||
      String(window.__m2KnockoutModelFromDb || '').trim();
    if (!next) return;
    if (knockoutNorm(next) === knockoutNorm(rawKnockout)) return;
    rawKnockout = next;
    applyKnockoutLines();
    update();
  });

  applyKnockoutLines();
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ══════════════════════════════════════════
   特征轮播
   ══════════════════════════════════════════ */
(function () {
  var track    = document.getElementById('m2FeatTrack');
  var prevBtn  = document.getElementById('m2FeatPrev');
  var nextBtn  = document.getElementById('m2FeatNext');
  var slides   = track ? track.querySelectorAll('.m2-features__slide') : [];

  if (!track || !prevBtn || !nextBtn) return;

  var current = 0;
  var SLIDE_W = 80;   // vw
  var GAP_PX  = 14;   // px（与 CSS gap 对应）

  function getOffset(index) {
    var vw = window.innerWidth / 100;
    return 10 * vw - index * (SLIDE_W * vw + GAP_PX);
  }

  function go(index) {
    current = index;
    track.style.transform = 'translateX(' + getOffset(current) + 'px)';
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
  }

  prevBtn.addEventListener('click', function () { if (current > 0) go(current - 1); });
  nextBtn.addEventListener('click', function () { if (current < slides.length - 1) go(current + 1); });
  window.addEventListener('resize', function () { track.style.transition = 'none'; go(current); });

  /* 初始化 */
  track.style.transition = 'none';
  go(0);
  requestAnimationFrame(function () {
    track.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
  });
})();

/* ══════════════════════════════════════════
   图赏轮播
   ══════════════════════════════════════════ */
(function () {
  var track    = document.getElementById('m2GalleryTrack');
  var prevBtn  = document.getElementById('m2GalleryPrev');
  var nextBtn  = document.getElementById('m2GalleryNext');
  var slides   = track ? track.querySelectorAll('.m2-gallery__slide') : [];

  if (!track || !prevBtn || !nextBtn) return;

  var current = 0;
  var SLIDE_W = 82;   // vw
  var GAP_PX  = 24;   // px（与 CSS gap 对应）

  function getOffset(index) {
    var vw = window.innerWidth / 100;
    return ((100 - SLIDE_W) / 2) * vw - index * (SLIDE_W * vw + GAP_PX);
  }

  function go(index) {
    current = index;
    track.style.transform = 'translateX(' + getOffset(current) + 'px)';
    slides.forEach(function (slide, i) {
      if (i === current) slide.classList.add('is-active');
      else slide.classList.remove('is-active');
    });
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
  }

  prevBtn.addEventListener('click', function () { if (current > 0) go(current - 1); });
  nextBtn.addEventListener('click', function () { if (current < slides.length - 1) go(current + 1); });
  window.addEventListener('resize', function () { track.style.transition = 'none'; go(current); });

  track.style.transition = 'none';
  go(0);
  requestAnimationFrame(function () {
    track.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
  });
})();

/* ══════════════════════════════════════════
   同价位其他车（90vh）+ 备案（10vh）
   ══════════════════════════════════════════ */
(function () {
  var hasWrap = document.getElementById('m2SamePriceHas');
  var emptyWrap = document.getElementById('m2SamePriceEmpty');
  var linkEl = document.getElementById('m2SamePriceCarLink');
  var nameEl = document.getElementById('m2SamePriceCarName');
  var imgEl = document.getElementById('m2SamePriceCarImage');
  var dotsEl = document.getElementById('m2SamePriceDots');
  var prevEl = document.getElementById('m2SamePricePrev');
  var nextEl = document.getElementById('m2SamePriceNext');

  if (!hasWrap || !emptyWrap || !linkEl || !nameEl || !imgEl || !dotsEl) return;

  function normalizeNameKey(s) {
    return String(s || '')
      .replace(/[\s\u00a0\u3000\u200b-\u200d\ufeff]+/g, '')
      .replace(/：/g, ':')
      .trim();
  }

  function currentCarNameFromPath() {
    var p = String(location.pathname || '');
    var m = p.match(/\/carpark\/([^/]+)\/car\.html$/);
    if (!m) return '';
    try {
      return decodeURIComponent(m[1]);
    } catch (_) {
      return m[1];
    }
  }

  function currentCarNameCandidates() {
    var out = [];
    var byBody = String(document.body && document.body.getAttribute('data-car-display-name') || '').trim();
    var byPath = currentCarNameFromPath();
    if (byBody) out.push(byBody);
    if (byPath && out.indexOf(byPath) === -1) out.push(byPath);
    return out;
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

  function bannerCandidatesForCar(carName) {
    var folder = encodeURIComponent(normalizeCarFolderNameForAssets(carName));
    return [
      '../../../media-webp/photos/carpark/' + folder + '/详情页-banner.webp',
      '../../../media-webp/photos/carpark/' + folder + '/封面.webp',
    ];
  }

  function detailHrefForCar(carName) {
    var base = '../' + encodeURIComponent(normalizeCarFolderNameForAssets(carName)) + '/car.html';
    var q = String(location.search || '');
    return q ? base + q : base;
  }

  function apiBaseCandidates() {
    var origin = String(location.origin || '').replace(/\/$/, '');
    if (origin && origin !== 'null' && origin.indexOf('file:') !== 0) {
      return [origin];
    }
    return ['https://www.mangov8.com', 'http://127.0.0.1:8787', 'http://localhost:8787'];
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
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('all failed'));
      var base = candidates[i++];
      return fetchCatalogFrom(base).catch(next);
    }
    return next();
  }

  function showEmpty() {
    hasWrap.hidden = true;
    hasWrap.style.display = 'none';
    emptyWrap.hidden = false;
    emptyWrap.style.display = 'flex';
  }

  function showHas() {
    emptyWrap.hidden = true;
    emptyWrap.style.display = 'none';
    hasWrap.hidden = false;
    hasWrap.style.display = 'flex';
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function renderCarNameForBlock(car) {
    var brand = String((car && car.brand) || '').trim();
    var model = String((car && car.model) || '').trim();
    var fullName = String((car && car.car_name) || '').trim();
    if (!brand && fullName) {
      var sp = fullName.indexOf(' ');
      if (sp > 0) {
        brand = fullName.slice(0, sp).trim();
        model = fullName.slice(sp + 1).trim();
      } else {
        model = fullName;
      }
    }
    if (!model) model = fullName;
    return (
      '<span class="m2-same-price__car-brand">' + escHtml(brand) + '</span>' +
      '<span class="m2-same-price__car-model">' + escHtml(model) + '</span>'
    );
  }

  function renderDots(count, active, onPick) {
    dotsEl.innerHTML = '';
    dotsEl.classList.toggle('is-overflow', count > 5);
    for (var i = 0; i < count; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'm2-same-price__dot' + (i === active ? ' is-active' : '');
      b.setAttribute('aria-label', '切换到第 ' + (i + 1) + ' 辆');
      (function (index) {
        b.addEventListener('click', function () { onPick(index); });
      })(i);
      dotsEl.appendChild(b);
    }
    var activeDot = dotsEl.querySelector('.m2-same-price__dot.is-active');
    if (activeDot && count > 5) {
      var left = activeDot.offsetLeft - (dotsEl.clientWidth - activeDot.clientWidth) / 2;
      var target = left < 0 ? 0 : left;
      dotsEl.scrollTo({ left: target, behavior: 'smooth' });
    } else {
      dotsEl.scrollLeft = 0;
    }
  }

  loadCatalog()
    .then(function (cars) {
      var names = currentCarNameCandidates();
      var keys = names.map(normalizeNameKey).filter(Boolean);
      var currentKey = keys[0] || '';

      var current = null;
      for (var i = 0; i < cars.length; i++) {
        var cn = String((cars[i] && cars[i].car_name) || '').trim();
        var key = normalizeNameKey(cn);
        var keyCanon = normalizeNameKey(normalizeCarFolderNameForAssets(cn));
        if (keys.indexOf(key) !== -1 || keys.indexOf(keyCanon) !== -1) {
          current = cars[i];
          currentKey = key;
          break;
        }
      }

      var currentPrice = current ? (parseInt(String(current.rent_price), 10) || 0) : 0;
      if (!currentPrice) {
        showEmpty();
        return;
      }

      var list = [];
      var seen = Object.create(null);
      for (var j = 0; j < cars.length; j++) {
        var car = cars[j];
        var price = parseInt(String(car.rent_price), 10);
        if (!price || price !== currentPrice) continue;
        if (normalizeNameKey(car.car_name) === currentKey) continue;
        var k = normalizeNameKey(car.car_name);
        if (!k || seen[k]) continue;
        seen[k] = true;
        list.push(car);
      }

      if (!list.length) {
        showEmpty();
        return;
      }

      showHas();
      var active = 0;

      function paint(index) {
        active = index;
        var car = list[active];
        var cands = bannerCandidatesForCar(car.car_name);
        var fb = 0;

        nameEl.innerHTML = renderCarNameForBlock(car);
        linkEl.href = detailHrefForCar(car.car_name);
        imgEl.alt = car.car_name;
        imgEl.src = cands[0];
        imgEl.onerror = function () {
          fb += 1;
          if (fb < cands.length) imgEl.src = cands[fb];
        };

        renderDots(list.length, active, paint);
        if (prevEl) prevEl.disabled = active <= 0;
        if (nextEl) nextEl.disabled = active >= list.length - 1;
      }

      if (prevEl) {
        prevEl.addEventListener('click', function () {
          if (active <= 0) return;
          paint(active - 1);
        });
      }
      if (nextEl) {
        nextEl.addEventListener('click', function () {
          if (active >= list.length - 1) return;
          paint(active + 1);
        });
      }

      paint(0);
    })
    .catch(function () {
      showEmpty();
    });
})();
