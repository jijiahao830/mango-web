/* activity.html：原价 = /api/cars-catalog；折扣 = GET /api/activity?date=…；
 * 有折扣的日期列表 = GET /api/activity-dates?from=&to=（后端 activity 表，同日 id 最大一条 discount 有效）。
 * 顶部：昨天～后天（未选中只显示「日」；选中显示 MM-DD）；第五格日历，仅从日历选中日显示 MM-DD。
 */
(function () {
  function normalizeNameKey(s) {
    return String(s || '')
      .replace(/[\s\u00a0\u3000\u200b-\u200d\ufeff]+/g, '')
      .replace(/：/g, ':')
      .trim();
  }

  function canonicalCarFolderLabel(carName) {
    var compact = String(carName || '')
      .trim()
      .replace(/[\s\u00a0\u3000]+/g, ' ')
      .trim();
    var aliasMap = {
      '兰博基尼 V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
      '兰博基尼V12 大牛 LP750-4 SV': '兰博基尼 LP750-4 SV',
    };
    return aliasMap[compact] || compact;
  }

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
    var origin = String(location.origin || '').replace(/\/$/, '');
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
      if (i >= candidates.length) return Promise.reject(new Error('catalog failed'));
      var base = candidates[i++];
      return fetchCatalogFrom(base).catch(next);
    }
    return next();
  }

  function normalizeDiscountZhe(raw) {
    var x = Number(raw);
    if (!isFinite(x) || x <= 0) return null;
    if (x <= 1) return x * 10;
    if (x <= 10) return x;
    if (x <= 100) return x / 10;
    return null;
  }

  function rawDiscountFromRow(row) {
    if (!row || typeof row !== 'object') return null;
    var v = row.discount_zhe != null ? row.discount_zhe : row.discount;
    return normalizeDiscountZhe(v);
  }

  function parseActivityPayload(j) {
    if (!j || !j.ok) return null;
    var globalZ = normalizeDiscountZhe(j.discount_zhe != null ? j.discount_zhe : j.discount);
    var byKey = {};
    var rows = j.items || j.rows || j.by_car || j.cars;
    if (Array.isArray(rows)) {
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var name = String((row && (row.car_name != null ? row.car_name : row.name)) || '').trim();
        var dz = rawDiscountFromRow(row);
        if (name && dz != null) byKey[normalizeNameKey(name)] = dz;
      }
    }
    return { globalZhe: globalZ, byKey: byKey };
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function isoFromLocalDate(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + pad2(m) + '-' + pad2(day);
  }

  function parseIsoToCanonical(iso) {
    var m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10);
    var da = parseInt(m[3], 10);
    var d = new Date(y, mo - 1, da, 12, 0, 0, 0);
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
    return isoFromLocalDate(d);
  }

  function isoToMmDd(iso) {
    var canon = parseIsoToCanonical(iso);
    if (!canon) return '';
    var m = canon.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[2] + '-' + m[3] : '';
  }

  function isoToDayOnly(iso) {
    var canon = parseIsoToCanonical(iso);
    if (!canon) return '';
    var m = canon.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? String(parseInt(m[3], 10)) : '';
  }

  function anchorNoon() {
    var base = new Date();
    base.setHours(12, 0, 0, 0);
    return base;
  }

  function isoForDayOffset(off) {
    var d = new Date(anchorNoon().getTime());
    d.setDate(d.getDate() + off);
    return isoFromLocalDate(d);
  }

  function initialIsoFromUrl() {
    try {
      var sp = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
      var iso = parseIsoToCanonical(sp.get('date'));
      if (iso) return iso;
    } catch (eU) {}
    return isoForDayOffset(0);
  }

  function replaceBrowserUrlDate(iso) {
    try {
      if (String(location.protocol || '').indexOf('http') !== 0) return;
      var u = new URL(location.href);
      u.searchParams.set('date', iso);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (eR) {}
  }

  function activityPriceQueryString(iso) {
    var ds = parseIsoToCanonical(iso) || isoForDayOffset(0);
    return '?date=' + encodeURIComponent(ds);
  }

  function fetchActivityJson(base, path, iso) {
    var url = base + path + activityPriceQueryString(iso);
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error('activity http');
        var p = parseActivityPayload(j);
        if (!p) throw new Error('activity payload');
        return p;
      });
    });
  }

  function fetchActivityFrom(base, iso) {
    return fetchActivityJson(base, '/api/activity', iso).catch(function () {
      return fetchActivityJson(base, '/api/m2-activity', iso);
    });
  }

  function loadActivity(iso) {
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('activity failed'));
      var base = candidates[i++];
      return fetchActivityFrom(base, iso).catch(next);
    }
    return next();
  }

  function defaultActivityDatesQueryRange() {
    var a = anchorNoon();
    var from = new Date(a.getTime());
    from.setDate(from.getDate() - 60);
    var to = new Date(a.getTime());
    to.setDate(to.getDate() + 180);
    return { from: isoFromLocalDate(from), to: isoFromLocalDate(to) };
  }

  function fetchActivityDatesJson(base, fromIso, toIso) {
    var qs =
      '?from=' +
      encodeURIComponent(fromIso) +
      '&to=' +
      encodeURIComponent(toIso);
    return fetch(base + '/api/activity-dates' + qs, { credentials: 'omit' }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j || !j.ok || !Array.isArray(j.dates)) throw new Error('activity-dates');
        return j.dates;
      });
    });
  }

  function loadActivityDates(fromIso, toIso) {
    var candidates = apiBaseCandidates();
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.reject(new Error('activity-dates failed'));
      var base = candidates[i++];
      return fetchActivityDatesJson(base, fromIso, toIso).catch(next);
    }
    return next();
  }

  function folderFromCarHref(href) {
    var h = String(href || '');
    var m = h.match(/carpark\/([^/?#]+)\/car\.html/i);
    if (!m) return '';
    try {
      return decodeURIComponent(m[1]);
    } catch (_) {
      return m[1];
    }
  }

  function findCatalogCar(cars, folderLabel) {
    var folder = canonicalCarFolderLabel(folderLabel);
    var keys = [normalizeNameKey(folder), normalizeNameKey(folderLabel)].filter(Boolean);
    var uniq = [];
    keys.forEach(function (k) {
      if (uniq.indexOf(k) === -1) uniq.push(k);
    });
    for (var i = 0; i < cars.length; i++) {
      var cn = String((cars[i] && cars[i].car_name) || '').trim();
      var key = normalizeNameKey(cn);
      var keyCanon = normalizeNameKey(canonicalCarFolderLabel(cn));
      if (uniq.indexOf(key) !== -1 || uniq.indexOf(keyCanon) !== -1) return cars[i];
    }
    return null;
  }

  function formatYuan(n) {
    var x = parseInt(String(n), 10);
    if (!isFinite(x) || x <= 0) return '--';
    return String(x);
  }

  function formatZheLabel(zhe) {
    var z = Number(zhe);
    if (!isFinite(z) || z <= 0) return '--';
    var r = Math.round(z * 100) / 100;
    var s = String(r);
    if (s.indexOf('.') !== -1) {
      s = s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    }
    return s + '折';
  }

  function ceilSalePrice(origInt, zhe) {
    return Math.ceil(origInt * (zhe / 10));
  }

  function discountForCar(act, folderLabel, catalogCar) {
    var names = [];
    if (catalogCar && catalogCar.car_name) names.push(String(catalogCar.car_name).trim());
    names.push(folderLabel);
    names.push(canonicalCarFolderLabel(folderLabel));
    for (var i = 0; i < names.length; i++) {
      var k = normalizeNameKey(names[i]);
      if (k && act.byKey && act.byKey[k] != null) return act.byKey[k];
    }
    return act.globalZhe;
  }

  function applyCard(link, catalogCar, act) {
    var origEl = link.querySelector('.m2-activity-car-orig');
    var discEl = link.querySelector('.m2-activity-car-disc');
    var currNum = link.querySelector('.m2-activity-car-curr-num');
    var folder = folderFromCarHref(link.getAttribute('href') || '');
    var orig = catalogCar ? parseInt(String(catalogCar.rent_price != null ? catalogCar.rent_price : ''), 10) : NaN;
    var origOk = isFinite(orig) && orig > 0;
    var zhe = act ? discountForCar(act, folder, catalogCar) : null;

    if (origEl) origEl.textContent = origOk ? '¥' + formatYuan(orig) : '¥--';

    if (!discEl || !currNum) return;

    if (zhe == null || !origOk) {
      discEl.textContent = '--';
      currNum.textContent = '--';
      return;
    }

    discEl.textContent = formatZheLabel(zhe);
    currNum.textContent = formatYuan(ceilSalePrice(orig, zhe));
  }

  function run() {
    var links = document.querySelectorAll('a.m2-activity-car[href]');
    if (!links.length) return;

    var cells = document.querySelectorAll('[data-activity-day-offset]');
    var trigger = document.getElementById('m2-activity-picker-trigger');
    var backdrop = document.getElementById('m2-activity-cal-backdrop');
    var panel = document.getElementById('m2-activity-cal-panel');
    var calGrid = document.getElementById('m2-activity-cal-grid');
    var calTitle = document.getElementById('m2-activity-cal-title');

    var selectedIso = initialIsoFromUrl();
    var cachedCars = null;
    var allowedDateSet = null;
    var allowedDatesPromise = null;
    var calViewY = anchorNoon().getFullYear();
    var calViewM = anchorNoon().getMonth();
    var calPanelOpen = false;

    function applyStripSelection(iso) {
      cells.forEach(function (cell) {
        var off = parseInt(String(cell.getAttribute('data-activity-day-offset') || ''), 10);
        var cellIso = isoForDayOffset(off);
        var on = isFinite(off) && cellIso === iso;
        cell.classList.toggle('is-selected', on);
        cell.setAttribute('aria-pressed', on ? 'true' : 'false');
        var md = cell.querySelector('.m2-activity-date-md');
        if (md) md.textContent = on ? isoToMmDd(cellIso) : isoToDayOnly(cellIso);
        var labEl = cell.querySelector('.m2-activity-date-label');
        var lab = labEl ? String(labEl.textContent || '').trim() : '';
        var disp = on ? isoToMmDd(cellIso) : isoToDayOnly(cellIso);
        cell.setAttribute('aria-label', (lab ? lab + ' ' : '') + disp + '，查看当日活动折扣');
      });
      if (trigger) {
        var inQuick = false;
        for (var q = -1; q <= 2; q++) {
          if (isoForDayOffset(q) === iso) {
            inQuick = true;
            break;
          }
        }
        trigger.classList.toggle('is-selected', !inQuick);
        trigger.setAttribute('aria-pressed', !inQuick ? 'true' : 'false');
        var pickerLine = trigger.querySelector('.m2-activity-picker-date-line');
        if (pickerLine) pickerLine.textContent = !inQuick ? isoToMmDd(iso) : '';
        trigger.setAttribute(
          'aria-label',
          !inQuick ? '已选 ' + isoToMmDd(iso) + '，展开日历可更换活动日' : '展开日历选择更多活动日'
        );
      }
    }

    function applyAll(cars, act) {
      var list = cars && Array.isArray(cars) ? cars : [];
      links.forEach(function (link) {
        var folder = folderFromCarHref(link.getAttribute('href') || '');
        var catalogCar = list.length ? findCatalogCar(list, folder) : null;
        applyCard(link, catalogCar, act);
      });
    }

    function refreshActivityForIso(iso) {
      replaceBrowserUrlDate(iso);
      return loadActivity(iso)
        .then(function (act) {
          applyAll(cachedCars, act);
        })
        .catch(function () {
          applyAll(cachedCars, null);
        });
    }

    function ensureAllowedDates() {
      if (allowedDatesPromise) return allowedDatesPromise;
      var range = defaultActivityDatesQueryRange();
      allowedDatesPromise = loadActivityDates(range.from, range.to).then(function (arr) {
        allowedDateSet = {};
        for (var i = 0; i < arr.length; i++) {
          var k = parseIsoToCanonical(arr[i]);
          if (k) allowedDateSet[k] = true;
        }
        return allowedDateSet;
      }).catch(function () {
        allowedDateSet = {};
        return allowedDateSet;
      });
      return allowedDatesPromise;
    }

    function syncCalViewToIso(iso) {
      var pStr = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (pStr) {
        calViewY = parseInt(pStr[1], 10);
        calViewM = parseInt(pStr[2], 10) - 1;
      } else {
        var now = anchorNoon();
        calViewY = now.getFullYear();
        calViewM = now.getMonth();
      }
    }

    function positionCalPanel() {
      if (!trigger || !panel) return;
      var margin = 10;
      var r = trigger.getBoundingClientRect();
      panel.style.top = Math.min(window.innerHeight - 48, r.bottom + 8) + 'px';
      var pw = panel.offsetWidth || 300;
      var left = r.right - pw;
      if (left < margin) left = margin;
      if (left + pw > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - pw - margin);
      panel.style.left = left + 'px';
    }

    function renderCalendar() {
      if (!calGrid || !calTitle) return;
      calGrid.textContent = '';
      calTitle.textContent = calViewY + '年' + (calViewM + 1) + '月';

      var firstWeekday = new Date(calViewY, calViewM, 1).getDay();
      var daysInMonth = new Date(calViewY, calViewM + 1, 0).getDate();
      var rows = Math.ceil((firstWeekday + daysInMonth) / 7);
      var totalCells = rows * 7;
      var startCounter = 1 - firstWeekday;
      var allowed = allowedDateSet || {};

      for (var i = 0; i < totalCells; i++) {
        var dayCounter = startCounter + i;
        var dCell = new Date(calViewY, calViewM, dayCounter, 12, 0, 0, 0);
        var iso = isoFromLocalDate(dCell);
        var inMonth = dCell.getMonth() === calViewM && dCell.getFullYear() === calViewY;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm2-activity-cal-day';
        btn.textContent = String(dCell.getDate());

        if (!inMonth) {
          btn.classList.add('is-muted');
          btn.disabled = true;
        } else if (!allowed[iso]) {
          btn.classList.add('is-disabled');
          btn.disabled = true;
          btn.setAttribute('aria-label', iso + ' 暂无活动折扣');
        } else {
          btn.classList.add('is-selectable');
          btn.setAttribute('aria-label', iso + ' 有活动折扣，点击选择');
          if (iso === selectedIso) btn.classList.add('is-picked');
          (function (evIso) {
            btn.addEventListener('click', function () {
              selectedIso = evIso;
              applyStripSelection(selectedIso);
              refreshActivityForIso(selectedIso);
              closeCalPanel();
            });
          })(iso);
        }

        calGrid.appendChild(btn);
      }
    }

    function closeCalPanel() {
      calPanelOpen = false;
      if (!panel || !backdrop || !trigger) return;
      panel.hidden = true;
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function openCalPanel() {
      if (!panel || !backdrop || !trigger) return;
      calPanelOpen = true;
      backdrop.hidden = false;
      backdrop.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      ensureAllowedDates().then(function () {
        if (!calPanelOpen) return;
        syncCalViewToIso(selectedIso);
        renderCalendar();
        panel.hidden = false;
        requestAnimationFrame(positionCalPanel);
      });
    }

    applyStripSelection(selectedIso);
    replaceBrowserUrlDate(selectedIso);

    Promise.all([
      loadCatalog().catch(function () { return null; }),
      loadActivity(selectedIso).catch(function () { return null; }),
    ])
      .then(function (pair) {
        cachedCars = pair[0];
        var act = pair[1];
        applyAll(cachedCars, act);

        cells.forEach(function (cell) {
          cell.addEventListener('click', function () {
            var off = parseInt(String(cell.getAttribute('data-activity-day-offset') || ''), 10);
            if (!isFinite(off)) return;
            var iso = isoForDayOffset(off);
            if (iso === selectedIso) return;
            selectedIso = iso;
            applyStripSelection(selectedIso);
            refreshActivityForIso(selectedIso);
          });
        });

        if (trigger && backdrop && panel && calGrid && calTitle) {
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (calPanelOpen) closeCalPanel();
            else openCalPanel();
          });

          backdrop.addEventListener('click', closeCalPanel);

          panel.addEventListener('click', function (e) {
            var nav = e.target.closest('[data-cal-nav]');
            if (!nav) return;
            var dir = nav.getAttribute('data-cal-nav');
            if (dir === 'prev') {
              calViewM--;
              if (calViewM < 0) {
                calViewM = 11;
                calViewY--;
              }
            } else if (dir === 'next') {
              calViewM++;
              if (calViewM > 11) {
                calViewM = 0;
                calViewY++;
              }
            }
            renderCalendar();
            requestAnimationFrame(positionCalPanel);
          });

          document.addEventListener('keydown', function calEsc(e) {
            if (e.key !== 'Escape') return;
            if (!calPanelOpen) return;
            closeCalPanel();
          });

          window.addEventListener('resize', function () {
            if (!panel || panel.hidden) return;
            positionCalPanel();
          });
        }
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
