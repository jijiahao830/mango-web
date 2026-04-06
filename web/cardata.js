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
    document.body.classList.add('cardata-data-visible');
    var loginWrap = document.querySelector('.login-container');
    if (loginWrap) loginWrap.classList.add('cardata-data-visible');
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

  /**
   * 仪表盘弧：圆心 (100,100)、r=70、270° 大弧在「上方」（开口朝下 90°）。
   * 端点 225°→315°（弦在下方），指针沿弧从 225° 顺时针扫向 315°（数学角递减）。
   */
  var GAUGE_CX = 100;
  var GAUGE_CY = 100;
  var GAUGE_ARC_R = 70;
  /** 内圆（数字区）半径，略小于刻度弧以留出环带 */
  var GAUGE_INNER_R = 36;
  var GAUGE_ARC_START_DEG = 225;
  var GAUGE_SWEEP_DEG = 270;

  function needleRotateDegForFrac(frac) {
    frac = Math.max(0, Math.min(1, frac));
    var t = GAUGE_ARC_START_DEG - frac * GAUGE_SWEEP_DEG;
    var rad = (t * Math.PI) / 180;
    var px = GAUGE_CX + GAUGE_ARC_R * Math.cos(rad);
    var py = GAUGE_CY - GAUGE_ARC_R * Math.sin(rad);
    return (Math.atan2(py - GAUGE_CY, px - GAUGE_CX) * 180) / Math.PI;
  }

  /**
   * 用折线沿圆描 270° 大弧（与刻度/指针同参），避免 SVG 椭圆弧 A 在部分环境下误选底部 90° 短弧。
   * 返回 path 的 d 与真实折线长度（供 stroke-dasharray 与进度一致）。
   */
  function cyberGaugeArcPathDAndLen(cx, cy, r, startDeg, sweepDeg, steps) {
    var d = '';
    var len = 0;
    var i;
    var st = steps || 72;
    var prevX;
    var prevY;
    for (i = 0; i <= st; i++) {
      var t = i / st;
      var angDeg = startDeg - t * sweepDeg;
      var ang = (angDeg * Math.PI) / 180;
      var x = cx + r * Math.cos(ang);
      var y = cy - r * Math.sin(ang);
      d += (i === 0 ? 'M ' : ' L ') + x.toFixed(3) + ' ' + y.toFixed(3);
      if (i > 0) {
        len += Math.hypot(x - prevX, y - prevY);
      }
      prevX = x;
      prevY = y;
    }
    return { d: d, len: len };
  }

  /** 橙色：frac=0 亮度 60%，frac=1 亮度 100%（基准 #ff7a1a） */
  function gaugeOrangeHex(frac) {
    frac = Math.max(0, Math.min(1, frac));
    var br = 0.6 + 0.4 * frac;
    function h(n) {
      var s = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + h(255 * br) + h(122 * br) + h(26 * br);
  }

  function gaugeOrangeRgba(frac, alpha) {
    frac = Math.max(0, Math.min(1, frac));
    var br = 0.6 + 0.4 * frac;
    var R = Math.round(255 * br);
    var G = Math.round(122 * br);
    var B = Math.round(26 * br);
    return 'rgba(' + R + ',' + G + ',' + B + ',' + alpha + ')';
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
          var deg = needleRotateDegForFrac(frac);
          g.setAttribute('transform', 'rotate(' + deg + ' 100 100)');
          var blade = g.querySelector('.gauge-needle-bar');
          if (blade) blade.setAttribute('fill', gaugeOrangeHex(frac));
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
    
    // 获取目标数值
    var readoutEl = wrap.querySelector('.gauge-readout .val');
    var targetValue = 0;
    if (readoutEl) {
      targetValue = parseInt(String(readoutEl.textContent).replace(/,/g, ''), 10);
      if (isNaN(targetValue)) targetValue = 0;
      // 初始设置为0
      readoutEl.textContent = '0';
    }
    
    groups.forEach(function (group, idx) {
      var targetFrac = parseFloat(group.getAttribute('data-target-frac'), 10);
      if (isNaN(targetFrac)) targetFrac = 0;
      targetFrac = Math.max(0, Math.min(1, targetFrac));
      var delay = idx * STAGGER;
      group.setAttribute('transform', 'rotate(' + needleRotateDegForFrac(0) + ' 100 100)');
      var bladeInit = group.querySelector('.gauge-needle-bar');
      if (bladeInit) bladeInit.setAttribute('fill', gaugeOrangeHex(0));
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
        var deg = needleRotateDegForFrac(frac);
        group.setAttribute('transform', 'rotate(' + deg + ' 100 100)');
        var blade = group.querySelector('.gauge-needle-bar');
        if (blade) blade.setAttribute('fill', gaugeOrangeHex(frac));
        
        // 同步更新数字
        if (readoutEl && targetValue > 0) {
          var currentValue = Math.round(targetValue * eased);
          readoutEl.textContent = String(currentValue);
        }
        
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
   * 科技感圆环仪表盘：>180° 弧（270°）、内圈；无刻度线；指针与弧同色一体造型（旋转中心 100,100）。
   * 仅中间显示当前数值；无刻度端点数字、无「满刻度」、无单位（人/次）。
   */
  function buildCyberGaugeBlock(gid, frac, _maxScale, valStr, _unit) {
    var cx = GAUGE_CX;
    var cy = GAUGE_CY;
    var arcR = GAUGE_ARC_R;
    var arcGeom = cyberGaugeArcPathDAndLen(cx, cy, arcR, GAUGE_ARC_START_DEG, GAUGE_SWEEP_DEG, 72);
    var arcD = arcGeom.d;
    var arcLen = arcGeom.len;
    var dashProg = frac * arcLen + ' ' + arcLen;
    var gradA0 = (GAUGE_ARC_START_DEG * Math.PI) / 180;
    var gradA1 = ((GAUGE_ARC_START_DEG - GAUGE_SWEEP_DEG) * Math.PI) / 180;
    var gArcX0 = cx + arcR * Math.cos(gradA0);
    var gArcY0 = cy - arcR * Math.sin(gradA0);
    var gArcX1 = cx + arcR * Math.cos(gradA1);
    var gArcY1 = cy - arcR * Math.sin(gradA1);
    var cArc0 = gaugeOrangeHex(0);
    var cArc1 = gaugeOrangeHex(1);
    var needleRot = needleRotateDegForFrac(frac);
    return (
      '<div class="gauge-svg-wrap gauge-svg-wrap--cyber">' +
      '<div class="gauge-cyber-face">' +
      '<svg class="gauge-svg gauge-svg--cyber" viewBox="0 0 200 200" overflow="visible" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<radialGradient id="' +
      gid +
      '-inner" cx="50%" cy="42%" r="68%">' +
      '<stop offset="0%" stop-color="#152032"/>' +
      '<stop offset="55%" stop-color="#0a0d14"/>' +
      '<stop offset="100%" stop-color="#040508"/>' +
      '</radialGradient>' +
      '<radialGradient id="' +
      gid +
      '-ambient" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="rgba(255,95,40,0.14)"/>' +
      '<stop offset="45%" stop-color="rgba(255,60,20,0.04)"/>' +
      '<stop offset="100%" stop-color="rgba(0,0,0,0)"/>' +
      '</radialGradient>' +
      '<linearGradient id="' +
      gid +
      '-arcTone" gradientUnits="userSpaceOnUse" ' +
      'x1="' +
      gArcX0.toFixed(2) +
      '" y1="' +
      gArcY0.toFixed(2) +
      '" x2="' +
      gArcX1.toFixed(2) +
      '" y2="' +
      gArcY1.toFixed(2) +
      '">' +
      '<stop offset="0%" stop-color="' +
      cArc0 +
      '"/>' +
      '<stop offset="100%" stop-color="' +
      cArc1 +
      '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' +
      gid +
      '-arcToneDim" gradientUnits="userSpaceOnUse" ' +
      'x1="' +
      gArcX0.toFixed(2) +
      '" y1="' +
      gArcY0.toFixed(2) +
      '" x2="' +
      gArcX1.toFixed(2) +
      '" y2="' +
      gArcY1.toFixed(2) +
      '">' +
      '<stop offset="0%" stop-color="' +
      gaugeOrangeRgba(0, 0.4) +
      '"/>' +
      '<stop offset="100%" stop-color="' +
      gaugeOrangeRgba(1, 0.26) +
      '"/>' +
      '</linearGradient>' +
      '<filter id="' +
      gid +
      '-glow" x="-50%" y="-50%" width="200%" height="200%">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="1.9" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      '<filter id="' +
      gid +
      '-bloom" x="-80%" y="-80%" width="260%" height="260%">' +
      '<feGaussianBlur stdDeviation="3.5" result="bl"/>' +
      '<feMerge><feMergeNode in="bl"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      '</defs>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="99" fill="url(#' +
      gid +
      '-ambient)"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="96" fill="none" stroke="rgba(255,130,70,0.2)" stroke-width="1" stroke-dasharray="5 11" stroke-linecap="round"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="91" fill="none" stroke="rgba(255,160,100,0.12)" stroke-width="0.8" stroke-dasharray="2 8"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="93" fill="none" stroke="rgba(255,110,55,0.18)" stroke-width="1"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="88" fill="none" stroke="rgba(255,90,40,0.08)" stroke-width="1"/>' +
      '<path d="' +
      arcD +
      '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" stroke-linecap="round"/>' +
      '<path class="gauge-cyber-arc-bloom" d="' +
      arcD +
      '" fill="none" stroke="url(#' +
      gid +
      '-arcToneDim)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
      dashProg +
      '" opacity="0.45"/>' +
      '<path d="' +
      arcD +
      '" fill="none" stroke="url(#' +
      gid +
      '-arcTone)" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="' +
      dashProg +
      '" filter="url(#' +
      gid +
      '-glow)">' +
      '</path>' +
      '<path d="' +
      arcD +
      '" fill="none" stroke="url(#' +
      gid +
      '-arcTone)" stroke-width="2" stroke-linecap="round" stroke-dasharray="' +
      dashProg +
      '" opacity="0.55" filter="url(#' +
      gid +
      '-bloom)"/>' +
      '<g class="gauge-needle-group" data-target-frac="' +
      frac +
      '" transform="rotate(' +
      needleRot +
      ' ' +
      cx +
      ' ' +
      cy +
      ')">' +
      '<path class="gauge-needle gauge-needle-bar" d="M ' +
      cx +
      ' 99.1 L 169 99.1 L 169 100.9 L ' +
      cx +
      ' 100.9 Z" fill="' +
      gaugeOrangeHex(0) +
      '" opacity="0.98"/>' +
      '</g>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      GAUGE_INNER_R +
      '" fill="url(#' +
      gid +
      '-inner)" stroke="rgba(255,140,80,0.42)" stroke-width="1"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      GAUGE_INNER_R +
      '" fill="none" stroke="rgba(255,180,120,0.15)" stroke-width="0.5" class="gauge-cyber-inner-ring"/>' +
      '</svg>' +
      '<div class="gauge-readout gauge-readout--cyber" aria-live="polite">' +
      '<div class="gauge-readout-value-row"><span class="val">' +
      escapeHtml(valStr) +
      '</span></div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * 车辆点击无数据时：仍显示仪表盘，指针 0，不展示车名（无标题/副标题）。
   */
  function renderVehicleEmptyGauge(container, opts) {
    opts = opts || {};
    var kind = opts.kind || 'today';
    var badge = kind === 'week' ? '本周' : kind === 'month' ? '本月' : kind === 'custom' ? '自定义' : '今日';
    var idPx = idPrefixFor(kind, 'vehicle');
    var maxScale = gaugeMaxFromValue(0, kind);
    var frac = 0;
    var unit = '次';
    var gid = idPx + '-0';
    var html = '<div class="dashboard-grid dashboard-grid--single">';
    html += '<div class="gauge-card gauge-card--vehicle-empty">';
    html += '<span class="gauge-rank-badge">' + escapeHtml(badge) + '</span>';
    /* 占位：与有数据时的 .gauge-title + .gauge-date 同高，避免空列矮于有数据列 */
    html += '<div class="gauge-title" aria-hidden="true"></div>';
    html += '<div class="gauge-date" aria-hidden="true">&nbsp;</div>';
    html += buildCyberGaugeBlock(gid, frac, maxScale, '0', unit);
    html += '</div></div>';
    container.innerHTML = html;
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
      if (metric === 'vehicle') {
        renderVehicleEmptyGauge(container, { kind: kind });
        return;
      }
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
      } else {
        title = kind === 'week' ? '本周访问人数' : '本月访问人数';
      }
    } else {
      var titleKey = metric === 'store' ? (storeSk || vehicleSk) : vehicleSk;
      title = titleKey ? (row[titleKey] != null ? String(row[titleKey]) : '') : '';
      if (!title) title = '—';
    }

    var subLine = '';
    if (kind === 'custom') {
      if (metric === 'store') {
        var sEl = document.getElementById('storeRangeStart');
        var eEl = document.getElementById('storeRangeEnd');
        if (sEl && eEl && sEl.value && eEl.value) {
          subLine = sEl.value + ' ~ ' + eEl.value;
        }
      } else {
        var vs = document.getElementById('customRangeStart');
        var ve = document.getElementById('customRangeEnd');
        if (vs && ve && vs.value && ve.value) {
          subLine = vs.value + ' ~ ' + ve.value;
        }
      }
      if (!subLine) {
        var dkC = findDateKey(keys) || findStatDateKey(keys) || findPeriodKey(keys);
        if (dkC && row[dkC] != null) subLine = String(row[dkC]);
      }
    } else if (isStoreAggregateNoDim) {
      if (kind === 'today') {
        var sdkAgg = findStatDateKey(keys) || findDateKey(keys);
        if (sdkAgg && row[sdkAgg] != null) subLine = String(row[sdkAgg]);
      } else {
        var pkAgg = findStatPeriodKey(keys) || findPeriodKey(keys);
        if (pkAgg && row[pkAgg] != null) subLine = String(row[pkAgg]);
      }
    } else {
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
    html += buildCyberGaugeBlock(gid, frac, maxScale, String(Math.round(val)), unit);
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

  var btnCustomRangeReset = document.getElementById('btnCustomRangeReset');
  if (btnCustomRangeReset) {
    btnCustomRangeReset.addEventListener('click', function () {
      initRangeDefaults('customRangeStart', 'customRangeEnd');
      syncAllRangeSummaries();
      loadCustomRangeVehicle();
    });
  }

  var btnStoreRangeReset = document.getElementById('btnStoreRangeReset');
  if (btnStoreRangeReset) {
    btnStoreRangeReset.addEventListener('click', function () {
      initRangeDefaults('storeRangeStart', 'storeRangeEnd');
      syncAllRangeSummaries();
      loadCustomRangeStore();
    });
  }

  bindCustomRangeMenus();

  if (!tryUnlockFromStorage()) {
    /* 需输入口令 */
  }
})();
