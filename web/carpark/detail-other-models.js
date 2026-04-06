/**
 * 详情页顶栏「其他车型」：拉取 /api/cars-catalog，筛选与当前车 brand 相同、排除当前车，
 * 按 rent_price 降序，填入 .dropdown-grid。封面优先 封面.webp / 封面.jpg，失败用占位图。
 */
(function () {
  var PLACEHOLDER_IMG =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">' +
        '<rect fill="#1e2128" width="800" height="400"/>' +
        '<text x="400" y="210" text-anchor="middle" fill="#5c6370" font-size="28" font-family="system-ui,sans-serif">暂无封面</text>' +
        '</svg>'
    );

  function apiCatalogBase() {
    var o =
      typeof window.MANGO_API_ORIGIN !== 'undefined'
        ? String(window.MANGO_API_ORIGIN || '').replace(/\/$/, '')
        : '';
    return o || (typeof location !== 'undefined' ? String(location.origin).replace(/\/$/, '') : '');
  }

  function normName(s) {
    return String(s || '')
      .replace(/\s+/g, ' ')
      .replace(/：/g, ':')
      .trim();
  }

  function normBrand(s) {
    return String(s || '').trim();
  }

  function folderNameFromUrl() {
    try {
      var path = String(location.pathname || '');
      var m = path.match(/\/carpark\/([^/]+)\/car\.html$/);
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {}
    return '';
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function siblingBase(carName) {
    return '../' + encodeURIComponent(String(carName).trim()) + '/';
  }

  function shortTitle(c) {
    var m = String(c.model || '').trim();
    if (m) return m;
    var n = String(c.car_name || '');
    var br = normBrand(c.brand);
    if (br && n.indexOf(br) === 0) n = n.slice(br.length).replace(/^\s+/, '');
    return n.trim() || String(c.car_name || '');
  }

  function findSelfCar(cars, displayName, folder) {
    var d = normName(displayName);
    var f = normName(folder);
    var i;
    for (i = 0; i < cars.length; i++) {
      if (normName(cars[i].car_name) === d) return cars[i];
    }
    if (f) {
      for (i = 0; i < cars.length; i++) {
        if (normName(cars[i].car_name) === f) return cars[i];
      }
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.querySelector('.header-center-nav .dropdown-grid');
    if (!grid) return;

    var body = document.body;
    var displayName = (body.getAttribute('data-car-display-name') || '').trim();
    var folder = folderNameFromUrl();
    var base = apiCatalogBase();
    if (!base || typeof fetch === 'undefined') return;

    fetch(base + '/api/cars-catalog', { credentials: 'omit' })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok || !Array.isArray(j.cars) || !j.cars.length) return;

        var self = findSelfCar(j.cars, displayName, folder);
        if (!self || !normBrand(self.brand)) {
          grid.innerHTML = '';
          return;
        }

        var b = normBrand(self.brand);
        var selfKey = normName(self.car_name);
        var others = j.cars.filter(function (c) {
          return normBrand(c.brand) === b && normName(c.car_name) !== selfKey;
        });

        others.sort(function (a, b2) {
          return (parseInt(String(b2.rent_price), 10) || 0) - (parseInt(String(a.rent_price), 10) || 0);
        });

        function bindImgFallback(img) {
          img.addEventListener(
            'error',
            function onErr() {
              img.removeEventListener('error', onErr);
              if (img.getAttribute('data-ph-done') === '1') return;
              img.setAttribute('data-ph-done', '1');
              img.classList.add('car-image--placeholder');
              img.src = PLACEHOLDER_IMG;
              img.alt = '暂无封面';
            },
            false
          );
        }

        var html = others
          .map(function (c) {
            var name = String(c.car_name || '').trim();
            var href = siblingBase(name) + 'car.html';
            var baseU = siblingBase(name);
            var title = escHtml(shortTitle(c));
            var alt = escHtml(name);
            var cat = escHtml(String(c.category || ''));
            return (
              '<a href="' +
              escHtml(href) +
              '" class="car-card-link">' +
              '<div class="car-card" data-category="' +
              cat +
              '">' +
              '<picture>' +
              '<source srcset="' +
              escHtml(baseU + '封面.webp') +
              '" type="image/webp">' +
              '<img class="car-image car-image-photo" src="' +
              escHtml(baseU + '封面.jpg') +
              '" alt="' +
              alt +
              '" loading="lazy">' +
              '</picture>' +
              '<div class="car-badge card-badge-overlay title-badge">' +
              title +
              '</div>' +
              '</div></a>'
            );
          })
          .join('');

        grid.innerHTML = html || '<p class="detail-other-models-empty">暂无同品牌其他车型</p>';

        grid.querySelectorAll('.car-image-photo').forEach(bindImgFallback);
      })
      .catch(function () {});
  });
})();
