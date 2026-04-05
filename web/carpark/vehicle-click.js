/**
 * 详情页加载时上报车辆点击（与选车页卡片 data-car-display-name 一致的品牌/型号拆分逻辑）
 * 依赖 sessionStorage.mango_driver_name；API 根地址同 login：window.MANGO_API_ORIGIN
 */
(function () {
  function apiOrigin() {
    if (typeof window.MANGO_API_ORIGIN !== 'undefined' && window.MANGO_API_ORIGIN) {
      return String(window.MANGO_API_ORIGIN).replace(/\/$/, '');
    }
    return '';
  }

  /** 与 car.html 品牌筛选一致，长品牌优先匹配 */
  var KNOWN_BRANDS = [
    '阿斯顿马丁', '劳斯莱斯', '兰博基尼', '玛莎拉蒂', '雷克萨斯', '保时捷',
    '法拉利', '迈巴赫', '奔驰', '宝马', '奥迪', '路虎', '特斯拉', '理想',
    '小米', '路特斯', '岚图', '雪佛兰', '丰田', '房车', '五菱宏光', '五菱',
    '其他'
  ].sort(function (a, b) { return b.length - a.length; });

  function parseBrandModel(displayName) {
    var s = (displayName || '').trim();
    if (!s) return { brand: '', model: '' };
    var b = document.body.getAttribute('data-car-brand');
    var m = document.body.getAttribute('data-car-model');
    if (b && m) {
      return { brand: b.trim(), model: m.trim() };
    }
    for (var i = 0; i < KNOWN_BRANDS.length; i++) {
      var br = KNOWN_BRANDS[i];
      if (s.indexOf(br) === 0) {
        var rest = s.slice(br.length).replace(/^\s+/, '');
        return { brand: br, model: rest || s };
      }
    }
    var parts = s.split(/\s+/);
    return { brand: parts[0] || '', model: parts.slice(1).join(' ') || s };
  }

  function send() {
    var member = sessionStorage.getItem('mango_driver_name');
    if (!member || !String(member).trim()) return;

    var display = document.body.getAttribute('data-car-display-name') || '';
    var bm = parseBrandModel(display);
    if (!bm.brand || !bm.model) return;

    var rawPrice = document.body.getAttribute('data-daily-price');
    var priceNum = 0;
    if (rawPrice != null && String(rawPrice).trim() !== '') {
      var p = parseFloat(String(rawPrice).trim());
      if (!isNaN(p)) priceNum = p;
    }

    var url = apiOrigin() + '/api/vehicle-click';
    var payload = JSON.stringify({
      member: String(member).trim(),
      brand: bm.brand,
      model: bm.model,
      price: priceNum
    });

    if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        credentials: 'omit'
      }).catch(function () {});
    }
  }

  function runAfterRentSync() {
    var p = window.__mangoRentSyncPromise;
    if (p && typeof p.then === 'function') {
      p.then(function () {
        send();
      }).catch(function () {
        send();
      });
    } else {
      send();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAfterRentSync);
  } else {
    runAfterRentSync();
  }
})();
