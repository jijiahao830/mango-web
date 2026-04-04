/**
 * cardata.html — 车辆点击 + 访问人数（今日/本周/本月/自定义）
 * 依赖 window.MANGO_API_ORIGIN
 */
(function () {
  var STORAGE = 'mango_cardata_ok';
  var STORAGE_PWD = 'mango_cardata_pwd';

  function apiOrigin() {
    if (typeof window.MANGO_API_ORIGIN !== 'undefined' && window.MANGO_API_ORIGIN) {
      return String(window.MANGO_API_ORIGIN).replace(/\/$/, '');
    }
    return '';
  }

  function localYmd(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length === 1) m = '0' + m;
    var da = String(d.getDate());
    if (da.length === 1) da = '0' + da;
    return y + '-' + m + '-' + da;
  }

  /** 最近 7 天（含今天）：与两处自定义日期默认值一致 */
  function defaultRangeYmdPair() {
    var end = new Date();
    var start = new Date();
    start.setDate(start.getDate() - 6);
    return { start: localYmd(start), end: localYmd(end) };
  }

  function initRangeDefaults(startId, endId) {
    var pair = defaultRangeYmdPair();
    var elS = document.getElementById(startId);
    var elE = document.getElementById(endId);
    if (elS && elE) {
      elS.value = pair.start;
      elE.value = pair.end;
    }
  }

  function syncVehicleRangeSummary() {
    var s = document.getElementById('customRangeStart');
    var e = document.getElementById('customRangeEnd');
    var sum = document.getElementById('customRangeSummary');
    if (!sum || !s || !e) return;
    sum.textContent = s.value && e.value ? s.value + ' ~ ' + e.value : '';
  }

  function syncStoreRangeSummary() {
    var s = document.getElementById('storeRangeStart');
    var e = document.getElementById('storeRangeEnd');
    var sum = document.getElementById('storeRangeSummary');
    if (!sum || !s || !e) return;
    sum.textContent = s.value && e.value ? s.value + ' ~ ' + e.value : '';
  }

  function syncAllRangeSummaries() {
    syncVehicleRangeSummary();
    syncStoreRangeSummary();
  }

  function setRangePanelOpen(panelId, btnId, isOpen) {
    var panel = document.getElementById(panelId);
    var btn = document.getElementById(btnId);
    if (!panel || !btn) return;
    panel.hidden = !isOpen;
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeAllRangePanels() {
    setRangePanelOpen('customRangePanel', 'btnCustomRangeMenu', false);
    setRangePanelOpen('storeRangePanel', 'btnStoreRangeMenu', false);
  }

  function bindCustomRangeMenus() {
    var vBtn = document.getElementById('btnCustomRangeMenu');
    var vPanel = document.getElementById('customRangePanel');
    var sBtn = document.getElementById('btnStoreRangeMenu');
    var sPanel = document.getElementById('storeRangePanel');
    if (vBtn && vPanel) {
      vBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var openNext = vPanel.hidden;
        if (openNext && sPanel && !sPanel.hidden) {
          setRangePanelOpen('storeRangePanel', 'btnStoreRangeMenu', false);
        }
        setRangePanelOpen('customRangePanel', 'btnCustomRangeMenu', openNext);
      });
    }
    if (sBtn && sPanel) {
      sBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var openNext = sPanel.hidden;
        if (openNext && vPanel && !vPanel.hidden) {
          setRangePanelOpen('customRangePanel', 'btnCustomRangeMenu', false);
        }
        setRangePanelOpen('storeRangePanel', 'btnStoreRangeMenu', openNext);
      });
    }
    document.addEventListener('click', function () {
      closeAllRangePanels();
    });
    if (vPanel) {
      vPanel.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
    if (sPanel) {
      sPanel.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
    ['customRangeStart', 'customRangeEnd', 'storeRangeStart', 'storeRangeEnd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', syncAllRangeSummaries);
        el.addEventListener('input', syncAllRangeSummaries);
      }
    });
  }

  function showPanel() {
    document.getElementById('gateCard').classList.add('hidden');
    var panel = document.getElementById('dataPanel');
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    initRangeDefaults('customRangeStart', 'customRangeEnd');
    initRangeDefaults('storeRangeStart', 'storeRangeEnd');
    syncAllRangeSummaries();
    var defRange = defaultRangeYmdPair();
    loadVehicleMetrics();
    loadStoreMetrics();
    loadCustomRangeVehicle(defRange.start, defRange.end);
    loadCustomRangeStore(defRange.start, defRange.end);
  }

  function findClickColumnKey(keys) {
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('总点击') >= 0) return keys[i];
    }
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('点击') >= 0) return keys[i];
    }
    return null;
  }

  function findVisitCountKey(keys) {
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] === 'visit_num') return keys[i];
    }
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('visit_num') >= 0) return keys[i];
    }
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('访问') >= 0) return keys[i];
    }
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('到店') >= 0) return keys[i];
    }
    for (i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('人数') >= 0 && keys[i].indexOf('点击') < 0) return keys[i];
    }
    return null;
  }

  function findStatDateKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === 'stat_date') return keys[i];
    }
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf('stat_date') >= 0) return keys[j];
    }
    return null;
  }

  function findStatPeriodKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === 'stat_period') return keys[i];
    }
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf('stat_period') >= 0) return keys[j];
    }
    return null;
  }

  function findVehicleTitleKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('车辆') >= 0) return keys[i];
    }
    return null;
  }

  function findStoreTitleKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('门店') >= 0) return keys[i];
    }
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf('统计项') >= 0) return keys[j];
    }
    return null;
  }

  function findDateKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('日期') >= 0) return keys[i];
    }
    return null;
  }

  function findPeriodKey(keys) {
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('统计') >= 0 || keys[i].indexOf('周期') >= 0) return keys[i];
    }
    return null;
  }

  function parseNumberCell(row, key) {
    if (!key) return 0;
    var v = row[key];
    if (typeof v === 'number' && !isNaN(v)) return v;
    var n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /** 满刻度 = ceil(当前值 × 倍率)，至少为 1 */
  function gaugeMaxMultiplier(kind) {
    if (kind === 'today') return 1.2;
    if (kind === 'week') return 1.15;
    if (kind === 'month') return 1.05;
    return 1.1;
  }

  function gaugeMaxFromValue(v, kind) {
    var mult = gaugeMaxMultiplier(kind || 'custom');
    var m = Math.ceil(Math.max(0, v) * mult);
    return m < 1 ? 1 : m;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function getGaugeReadoutVal(wrap) {
    var el = wrap.querySelector('.gauge-readout .val');
    if (!el) return 0;
    var n = parseInt(String(el.textContent).replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  function setGaugeReadoutVal(wrap, n) {
    var el = wrap.querySelector('.gauge-readout .val');
    if (el) el.textContent = String(Math.round(n));
  }

  /**
   * 指针动画到 targetFrac（0=刻度左端）；useEaseIn 为 true 时用于归零（先快后慢的反义：先慢后快可改用 linear）
   */
  function animateNeedleGroupsToFrac(wrap, targetFrac, durationMs, useEaseIn) {
    return new Promise(function (resolve) {
      if (!wrap || !wrap.querySelector) {
        resolve();
        return;
      }
      var groups = wrap.querySelectorAll('.gauge-needle-group');
      if (!groups.length) {
        resolve();
        return;
      }
      targetFrac = Math.max(0, Math.min(1, targetFrac));
      var fromFracs = [];
      groups.forEach(function (g, i) {
        var f = parseFloat(g.getAttribute('data-target-frac'), 10);
        fromFracs[i] = isNaN(f) ? 0 : Math.max(0, Math.min(1, f));
      });
      var v0 = getGaugeReadoutVal(wrap);
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var elapsed = ts - start;
        var p = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
        var eased = useEaseIn ? easeInCubic(p) : easeOutCubic(p);
        groups.forEach(function (g, i) {
          var frac = fromFracs[i] + (targetFrac - fromFracs[i]) * eased;
          var deg = (180 + frac * 180) % 360;
          g.setAttribute('transform', 'rotate(' + deg + ' 100 100)');
        });
        if (targetFrac === 0) {
          setGaugeReadoutVal(wrap, v0 * (1 - eased));
        }
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          groups.forEach(function (g) {
            g.setAttribute('data-target-frac', String(targetFrac));
          });
          if (targetFrac === 0) setGaugeReadoutVal(wrap, 0);
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  /** 多个格子并行归零后再执行 done（无仪表时直接 done） */
  function refreshGaugesThenZero(wraps, done) {
    var list = (wraps || []).filter(function (w) {
      return w;
    });
    var needAnim = list.some(function (w) {
      return w.querySelector && w.querySelector('.gauge-needle-group');
    });
    if (!needAnim) {
      done();
      return;
    }
    var ZERO_MS = 480;
    Promise.all(
      list.map(function (w) {
        return animateNeedleGroupsToFrac(w, 0, ZERO_MS, true);
      })
    ).then(function () {
      done();
    });
  }

  function runNeedleAnimations(wrap) {
    var groups = wrap.querySelectorAll('.gauge-needle-group');
    var DURATION = 1400;
    var STAGGER = 95;
    groups.forEach(function (group, idx) {
      var targetFrac = parseFloat(group.getAttribute('data-target-frac'), 10);
      if (isNaN(targetFrac)) targetFrac = 0;
      targetFrac = Math.max(0, Math.min(1, targetFrac));
      var delay = idx * STAGGER;
      group.setAttribute('transform', 'rotate(180 100 100)');
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var elapsed = ts - start - delay;
        if (elapsed < 0) {
          requestAnimationFrame(step);
          return;
        }
        var p = Math.min(1, elapsed / DURATION);
        var eased = easeOutCubic(p);
        var frac = targetFrac * eased;
        var deg = (180 + frac * 180) % 360;
        group.setAttribute('transform', 'rotate(' + deg + ' 100 100)');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function emptyMessage(kind, metric) {
    if (metric === 'store') {
      if (kind === 'week') return '本周暂无访问数据。';
      if (kind === 'month') return '本月暂无访问数据。';
      if (kind === 'custom') return '该时间段内暂无访问数据。';
      return '今日暂无访问数据。';
    }
    if (kind === 'week') return '本周暂无点击数据。';
    if (kind === 'month') return '本月暂无点击数据。';
    if (kind === 'custom') return '该时间段内暂无点击数据。';
    return '今日暂无点击数据。';
  }

  function idPrefixFor(kind, metric) {
    if (metric === 'store') {
      if (kind === 'today') return 'std';
      if (kind === 'week') return 'swk';
      if (kind === 'month') return 'smo';
      return 'scu';
    }
    if (kind === 'today') return 'td';
    if (kind === 'week') return 'wk';
    if (kind === 'month') return 'mo';
    return 'cu';
  }

  /**
   * opts.kind: today | week | month | custom
   * opts.metric: vehicle | store
   */
  function renderTopGauge(container, rows, opts) {
    opts = opts || {};
    var kind = opts.kind || 'today';
    var metric = opts.metric || 'vehicle';
    var badge = kind === 'week' ? '本周' : kind === 'month' ? '本月' : kind === 'custom' ? '自定义' : '今日';
    var idPx = idPrefixFor(kind, metric);

    if (!rows || !rows.length) {
      container.innerHTML = '<p class="rank-empty">' + emptyMessage(kind, metric) + '</p>';
      return;
    }

    var row = rows[0];
    var keys = Object.keys(row);
    var countKey = metric === 'store' ? findVisitCountKey(keys) : findClickColumnKey(keys);
    var val = parseNumberCell(row, countKey);
    var maxScale = gaugeMaxFromValue(val, kind);
    var frac = maxScale > 0 ? Math.min(1, val / maxScale) : 0;

    var title = '';
    var subLine = '';
    var storeSk = findStoreTitleKey(keys);
    var vehicleSk = findVehicleTitleKey(keys);
    var isStoreAggregateNoDim =
      metric === 'store' &&
      countKey &&
      !storeSk &&
      !vehicleSk &&
      (kind === 'today' || kind === 'week' || kind === 'month');

    if (isStoreAggregateNoDim) {
      if (kind === 'today') {
        title = '今日访问人数';
        var sdk = findStatDateKey(keys) || findDateKey(keys);
        if (sdk && row[sdk] != null) subLine = String(row[sdk]);
      } else {
        title = kind === 'week' ? '本周访问人数' : '本月访问人数';
        var pkAgg = findStatPeriodKey(keys) || findPeriodKey(keys);
        if (pkAgg && row[pkAgg] != null) subLine = String(row[pkAgg]);
      }
    } else {
      var titleKey = metric === 'store' ? (storeSk || vehicleSk) : vehicleSk;
      title = titleKey ? (row[titleKey] != null ? String(row[titleKey]) : '') : '';
      if (!title) title = '—';
      if (kind === 'today') {
        var dateKey =
          findDateKey(keys) || findStatDateKey(keys) || findPeriodKey(keys);
        if (dateKey && row[dateKey] != null) subLine = String(row[dateKey]);
      } else {
        var pk2 = findPeriodKey(keys);
        if (pk2 && row[pk2] != null) subLine = String(row[pk2]);
      }
    }

    var unit = metric === 'store' ? '人' : '次';
    var gid = idPx + '-0';
    var html = '<div class="dashboard-grid dashboard-grid--single">';
    html += '<div class="gauge-card">';
    html += '<span class="gauge-rank-badge">' + escapeHtml(badge) + '</span>';
    html += '<div class="gauge-title">' + escapeHtml(title) + '</div>';
    if (subLine) html += '<div class="gauge-date">' + escapeHtml(subLine) + '</div>';
    html += '<div class="gauge-svg-wrap">';
    html += '<svg class="gauge-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    html += '<defs>';
    html += '<linearGradient id="' + gid + '-arc" x1="0%" y1="0%" x2="100%" y2="0%">';
    html += '<stop offset="0%" stop-color="#1e6b3a"/>';
    html += '<stop offset="45%" stop-color="#c9a227"/>';
    html += '<stop offset="100%" stop-color="#c03018"/>';
    html += '</linearGradient>';
    html += '</defs>';
    html += '<path class="gauge-arc-bg" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>';
    html += '<path class="gauge-arc-glow" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="url(#' + gid + '-arc)" stroke-width="3" stroke-linecap="round" opacity="0.4"/>';
    html += '<text x="28" y="112" fill="rgba(139,147,167,0.9)" font-size="9" text-anchor="middle">0</text>';
    html += '<text x="172" y="112" fill="rgba(139,147,167,0.9)" font-size="9" text-anchor="middle">' + escapeHtml(String(maxScale)) + '</text>';
    html += '<g class="gauge-needle-group" data-target-frac="' + frac + '" transform="rotate(180 100 100)">';
    html += '<line class="gauge-needle" x1="100" y1="100" x2="168" y2="100" stroke="#ff6b35" stroke-width="4" stroke-linecap="round"/>';
    html += '</g>';
    html += '<circle class="gauge-hub" cx="100" cy="100" r="7"/>';
    html += '</svg>';
    html += '</div>';
    html += '<div class="gauge-readout"><span class="val">' + escapeHtml(String(Math.round(val))) + '</span><span class="unit">' + unit + '</span></div>';
    html += '</div></div>';
    container.innerHTML = html;
  }

  function fetchJson(url, bodyObj) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
      credentials: 'omit'
    }).then(function (res) {
      return res.json().then(function (j) { return { res: res, j: j }; });
    });
  }

  function loadCustomRangeVehicle(startOverride, endOverride, opts) {
    opts = opts || {};
    var wrap = document.getElementById('rankTableWrapCustom');
    var pwd = sessionStorage.getItem(STORAGE_PWD);
    if (!pwd) {
      wrap.innerHTML = '<p class="rank-error">无法查询：请重新登录。</p>';
      return;
    }
    var elS = document.getElementById('customRangeStart');
    var elE = document.getElementById('customRangeEnd');
    var start =
      startOverride != null && String(startOverride) !== ''
        ? String(startOverride)
        : elS
          ? elS.value
          : '';
    var end =
      endOverride != null && String(endOverride) !== ''
        ? String(endOverride)
        : elE
          ? elE.value
          : '';
    if (!start || !end) {
      wrap.innerHTML = '<p class="rank-error">请选择开始和结束日期。</p>';
      return;
    }
    if (start > end) {
      wrap.innerHTML = '<p class="rank-error">开始日期不能晚于结束日期。</p>';
      return;
    }

    function runFetch() {
      var base = apiOrigin() || '';
      fetchJson(base + '/api/cardata-custom-range', {
        password: pwd,
        start_date: start,
        end_date: end
      })
        .then(function (o) {
          if (o.res.ok && o.j && o.j.ok && Array.isArray(o.j.rows)) {
            renderTopGauge(wrap, o.j.rows.slice(0, 1), { kind: 'custom', metric: 'vehicle' });
            runNeedleAnimations(wrap);
            syncVehicleRangeSummary();
            setRangePanelOpen('customRangePanel', 'btnCustomRangeMenu', false);
            return;
          }
          var detail = o.j && (o.j.detail || o.j.error) ? String(o.j.detail || o.j.error) : '';
          wrap.innerHTML = '<p class="rank-error">查询失败' + (detail ? '：' + escapeHtml(detail) : '') + '</p>';
        })
        .catch(function () {
          wrap.innerHTML = '<p class="rank-error">无法连接接口，请确认已启动 member_api.py。</p>';
        });
    }

    if (opts.animateRefresh && wrap.querySelector('.gauge-needle-group')) {
      animateNeedleGroupsToFrac(wrap, 0, 480, true).then(runFetch);
      return;
    }
    wrap.innerHTML = '<p class="rank-loading">查询中…</p>';
    runFetch();
  }

  function loadCustomRangeStore(startOverride, endOverride, opts) {
    opts = opts || {};
    var wrap = document.getElementById('rankTableWrapStoreCustom');
    var pwd = sessionStorage.getItem(STORAGE_PWD);
    if (!pwd) {
      wrap.innerHTML = '<p class="rank-error">无法查询：请重新登录。</p>';
      return;
    }
    var elS = document.getElementById('storeRangeStart');
    var elE = document.getElementById('storeRangeEnd');
    var start =
      startOverride != null && String(startOverride) !== ''
        ? String(startOverride)
        : elS
          ? elS.value
          : '';
    var end =
      endOverride != null && String(endOverride) !== ''
        ? String(endOverride)
        : elE
          ? elE.value
          : '';
    if (!start || !end) {
      wrap.innerHTML = '<p class="rank-error">请选择开始和结束日期。</p>';
      return;
    }
    if (start > end) {
      wrap.innerHTML = '<p class="rank-error">开始日期不能晚于结束日期。</p>';
      return;
    }

    function runFetch() {
      var base = apiOrigin() || '';
      fetchJson(base + '/api/cardata-custom-range-store', {
        password: pwd,
        start_date: start,
        end_date: end
      })
        .then(function (o) {
          if (o.res.ok && o.j && o.j.ok && Array.isArray(o.j.rows)) {
            renderTopGauge(wrap, o.j.rows.slice(0, 1), { kind: 'custom', metric: 'store' });
            runNeedleAnimations(wrap);
            syncStoreRangeSummary();
            setRangePanelOpen('storeRangePanel', 'btnStoreRangeMenu', false);
            return;
          }
          var detail = o.j && (o.j.detail || o.j.error) ? String(o.j.detail || o.j.error) : '';
          wrap.innerHTML = '<p class="rank-error">查询失败' + (detail ? '：' + escapeHtml(detail) : '') + '</p>';
        })
        .catch(function () {
          wrap.innerHTML = '<p class="rank-error">无法连接接口，请确认已启动 member_api.py。</p>';
        });
    }

    if (opts.animateRefresh && wrap.querySelector('.gauge-needle-group')) {
      animateNeedleGroupsToFrac(wrap, 0, 480, true).then(runFetch);
      return;
    }
    wrap.innerHTML = '<p class="rank-loading">查询中…</p>';
    runFetch();
  }

  var errNoPwdHtml =
    '<p class="rank-error">无法加载排行：请退出后重新输入口令登录（本页升级后需重新验证一次）。</p>';

  function loadVehicleMetrics(opts) {
    opts = opts || {};
    var wrapT = document.getElementById('rankTableWrapToday');
    var wrapW = document.getElementById('rankTableWrapWeek');
    var wrapM = document.getElementById('rankTableWrapMonth');
    var wrapC = document.getElementById('rankTableWrapCustom');

    var pwd = null;
    try {
      pwd = sessionStorage.getItem(STORAGE_PWD);
    } catch (e) {}
    if (!pwd) {
      [wrapT, wrapW, wrapM, wrapC].forEach(function (el) {
        if (el) el.innerHTML = errNoPwdHtml;
      });
      return;
    }

    function fetchAndApply() {
      var base = apiOrigin() || '';
      var req = { password: pwd };
      Promise.all([
        fetchJson(base + '/api/cardata-today-vehicle-clicks', req),
        fetchJson(base + '/api/cardata-week-vehicle-total', req),
        fetchJson(base + '/api/cardata-month-vehicle-total', req)
      ])
        .then(function (arr) {
          function handleVehicle(o, wrap, kind) {
            if (o.res.ok && o.j && o.j.ok && Array.isArray(o.j.rows)) {
              renderTopGauge(wrap, o.j.rows.slice(0, 1), { kind: kind, metric: 'vehicle' });
              runNeedleAnimations(wrap);
            } else {
              var d = o.j && o.j.detail ? String(o.j.detail) : '';
              wrap.innerHTML = '<p class="rank-error">加载失败' + (d ? '：' + escapeHtml(d) : '') + '</p>';
            }
          }
          handleVehicle(arr[0], wrapT, 'today');
          handleVehicle(arr[1], wrapW, 'week');
          handleVehicle(arr[2], wrapM, 'month');
        })
        .catch(function () {
          var err = '<p class="rank-error">无法连接接口，请确认已启动 member_api.py。</p>';
          [wrapT, wrapW, wrapM].forEach(function (el) {
            if (el) el.innerHTML = err;
          });
        });
    }

    if (opts.animateRefresh) {
      refreshGaugesThenZero([wrapT, wrapW, wrapM], fetchAndApply);
      return;
    }

    [wrapT, wrapW, wrapM].forEach(function (el) {
      if (el) el.innerHTML = '<p class="rank-loading">加载中…</p>';
    });
    fetchAndApply();
  }

  function loadStoreMetrics(opts) {
    opts = opts || {};
    var wrapST = document.getElementById('rankTableWrapStoreToday');
    var wrapSW = document.getElementById('rankTableWrapStoreWeek');
    var wrapSM = document.getElementById('rankTableWrapStoreMonth');
    var wrapSC = document.getElementById('rankTableWrapStoreCustom');

    var pwd = null;
    try {
      pwd = sessionStorage.getItem(STORAGE_PWD);
    } catch (e) {}
    if (!pwd) {
      [wrapST, wrapSW, wrapSM, wrapSC].forEach(function (el) {
        if (el) el.innerHTML = errNoPwdHtml;
      });
      return;
    }

    function fetchAndApply() {
      var base = apiOrigin() || '';
      var req = { password: pwd };
      Promise.all([
        fetchJson(base + '/api/cardata-today-store-visit', req),
        fetchJson(base + '/api/cardata-week-store-visit', req),
        fetchJson(base + '/api/cardata-month-store-visit', req)
      ])
        .then(function (arr) {
          function handleStore(o, wrap, kind) {
            if (o.res.ok && o.j && o.j.ok && Array.isArray(o.j.rows)) {
              renderTopGauge(wrap, o.j.rows.slice(0, 1), { kind: kind, metric: 'store' });
              runNeedleAnimations(wrap);
            } else {
              var d = o.j && o.j.detail ? String(o.j.detail) : '';
              wrap.innerHTML =
                '<p class="rank-error">访问数据加载失败' + (d ? '：' + escapeHtml(d) : '') + '</p>';
            }
          }
          handleStore(arr[0], wrapST, 'today');
          handleStore(arr[1], wrapSW, 'week');
          handleStore(arr[2], wrapSM, 'month');
        })
        .catch(function () {
          var err = '<p class="rank-error">无法连接接口，请确认已启动 member_api.py。</p>';
          [wrapST, wrapSW, wrapSM].forEach(function (el) {
            if (el) el.innerHTML = err;
          });
        });
    }

    if (opts.animateRefresh) {
      refreshGaugesThenZero([wrapST, wrapSW, wrapSM], fetchAndApply);
      return;
    }

    [wrapST, wrapSW, wrapSM].forEach(function (el) {
      if (el) el.innerHTML = '<p class="rank-loading">加载中…</p>';
    });
    fetchAndApply();
  }

  /** 刷新「车辆点击」板块 4 格：今日/本周/本月/自定义 */
  function loadVehicleSection() {
    loadVehicleMetrics({ animateRefresh: true });
    loadCustomRangeVehicle(undefined, undefined, { animateRefresh: true });
  }

  /** 刷新「访问人数」板块 4 格：今日/本周/本月/自定义 */
  function loadStoreSection() {
    loadStoreMetrics({ animateRefresh: true });
    loadCustomRangeStore(undefined, undefined, { animateRefresh: true });
  }

  function tryUnlockFromStorage() {
    try {
      if (sessionStorage.getItem(STORAGE) === '1') {
        showPanel();
        return true;
      }
    } catch (e) {}
    return false;
  }

  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('gateError');
    var btn = document.getElementById('gateSubmit');
    var pwd = document.getElementById('gatePassword').value;
    err.textContent = '';
    btn.disabled = true;
    var url = (apiOrigin() || '') + '/api/cardata-auth';
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
      credentials: 'omit'
    })
      .then(function (res) { return res.json().then(function (j) { return { res: res, j: j }; }); })
      .then(function (_ref) {
        var res = _ref.res;
        var j = _ref.j;
        if (res.ok && j && j.ok) {
          try {
            sessionStorage.setItem(STORAGE, '1');
            sessionStorage.setItem(STORAGE_PWD, pwd);
          } catch (e2) {}
          showPanel();
          return;
        }
        if (j && j.error === 'not_configured') {
          err.textContent = '服务端未配置口令：请在 app_config.json 中设置 cardata_password（非空）。';
        } else {
          err.textContent = '口令错误或服务不可用，请重试。';
        }
      })
      .catch(function () {
        err.textContent = '无法连接接口，请确认已启动 member_api.py 且 MANGO_API_ORIGIN 正确。';
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  function spinRefreshIcon(btn) {
    if (!btn || btn.classList.contains('is-spinning')) return;
    btn.classList.add('is-spinning');
    window.setTimeout(function () {
      btn.classList.remove('is-spinning');
    }, 560);
  }

  var btnRefreshVehicle = document.getElementById('btnRefreshVehicle');
  if (btnRefreshVehicle) {
    btnRefreshVehicle.addEventListener('click', function () {
      spinRefreshIcon(btnRefreshVehicle);
      loadVehicleSection();
    });
  }
  var btnRefreshStore = document.getElementById('btnRefreshStore');
  if (btnRefreshStore) {
    btnRefreshStore.addEventListener('click', function () {
      spinRefreshIcon(btnRefreshStore);
      loadStoreSection();
    });
  }

  document.getElementById('btnCustomRangeQuery').addEventListener('click', function () {
    loadCustomRangeVehicle();
  });

  document.getElementById('btnStoreRangeQuery').addEventListener('click', function () {
    loadCustomRangeStore();
  });

  bindCustomRangeMenus();

  if (!tryUnlockFromStorage()) {
    /* 需输入口令 */
  }
})();
