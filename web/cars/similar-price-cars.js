    document.addEventListener('DOMContentLoaded', function() {
      var body = document.body;
      var currentPrice = parseInt(body.getAttribute('data-daily-price'), 10);
      var currentCarName = (body.getAttribute('data-car-display-name') || '').trim();
      var similarCarsGrid = document.getElementById('similarCarsGrid');
      var similarCarsSection = document.getElementById('similarCarsSection');
      if (!similarCarsGrid || !similarCarsSection) return;
      if (!currentPrice || isNaN(currentPrice) || !currentCarName) return;

      function formatPriceThousands(num) {
        return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }

      function updateSimilarRowLayout() {
        var row = similarCarsGrid;
        if (!row || !row.children.length) return;
        row.classList.remove('is-centered');
        requestAnimationFrame(function () {
          var styles = window.getComputedStyle(row);
          var gap = parseFloat(styles.columnGap || styles.gap) || 20;
          var total = 0;
          var i;
          for (i = 0; i < row.children.length; i++) {
            total += row.children[i].getBoundingClientRect().width;
          }
          if (row.children.length > 1) total += gap * (row.children.length - 1);
          if (total <= row.clientWidth + 2) {
            row.classList.add('is-centered');
          }
        });
      }

      var layoutResizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(layoutResizeTimer);
        layoutResizeTimer = setTimeout(updateSimilarRowLayout, 120);
      });

      function appendSimilarCarCard(link) {
        var originalHref = link.getAttribute('href');
        if (originalHref && originalHref.startsWith('./cars/')) {
          link.setAttribute('href', originalHref.replace('./cars/', '../'));
        }
        link.querySelectorAll('source').forEach(function (source) {
          var srcset = source.getAttribute('srcset');
          if (srcset && srcset.indexOf('./cars/') !== -1) {
            source.setAttribute('srcset', srcset.replace(/\.\/cars\//g, '../'));
          }
        });
        link.querySelectorAll('img').forEach(function (img) {
          var src = img.getAttribute('src');
          if (src && src.indexOf('./cars/') !== -1) {
            img.setAttribute('src', src.replace(/\.\/cars\//g, '../'));
          }
        });
        if (!link.querySelector('.car-info')) return;
        similarCarsGrid.appendChild(link.cloneNode(true));
      }

      function collectSamePriceLinks(doc) {
        var out = [];
        var seenHref = {};
        doc.querySelectorAll('.car-card-link').forEach(function (link) {
          if (link.closest('#recommendSection')) return;
          if (link.closest('#comingSoonSection')) return;
          var priceElem = link.querySelector('.car-price');
          var nameElem = link.querySelector('.car-name');
          if (!priceElem || !nameElem) return;
          var price = parseInt(priceElem.textContent.replace(/[^0-9]/g, ''), 10);
          var name = nameElem.textContent.trim();
          if (name === currentCarName) return;
          if (price !== currentPrice) return;
          var href = (link.getAttribute('href') || '').trim();
          if (!href || seenHref[href]) return;
          seenHref[href] = true;
          out.push(link);
        });
        return out;
      }

      function resolveCarListUrl() {
        var path = location.pathname;
        var m = path.match(/^(.*)\/cars\/[^/]+\/car\.html$/);
        if (m) {
          var base = m[1] || '';
          return new URL(base + '/car.html', location.origin).href;
        }
        return new URL('../../car.html', location.href).href;
      }

      function fetchCarListHtml() {
        var urls = [resolveCarListUrl(), new URL('../../car.html', location.href).href];
        var seen = {};
        urls = urls.filter(function (u) {
          if (seen[u]) return false;
          seen[u] = true;
          return true;
        });
        function tryFetch(i) {
          if (i >= urls.length) {
            return Promise.reject(new Error('car list fetch failed'));
          }
          return fetch(urls[i], { credentials: 'same-origin' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + urls[i]);
              return r.text();
            })
            .catch(function () {
              return tryFetch(i + 1);
            });
        }
        return tryFetch(0);
      }

      fetchCarListHtml()
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          if (!doc.querySelector('.car-card-link')) {
            console.warn('[同价位] 已拉取页面但未找到 .car-card-link，请确认根目录 car.html 是否为选车页。');
            return;
          }
          collectSamePriceLinks(doc).forEach(function (link) {
            appendSimilarCarCard(link);
          });
          var subEl = document.querySelector('.similar-cars-subtitle');
          var n = similarCarsGrid.children.length;
          if (subEl && n > 0) {
            var priceStr = formatPriceThousands(currentPrice);
            subEl.innerHTML =
              '共 <strong>' +
              n +
              '</strong> 辆 · 日租 <strong>¥' +
              priceStr +
              '/天</strong> 与您所选车型相同；车多时可左右滑动浏览';
          }
          if (n > 0) {
            similarCarsSection.style.display = 'block';
            updateSimilarRowLayout();
            setTimeout(updateSimilarRowLayout, 50);
            window.addEventListener('load', updateSimilarRowLayout, { once: true });
          }
        })
        .catch(function () {
          if (location.protocol === 'file:') {
            console.warn(
              '[同价位] 用 file:// 打开时浏览器会拦截 fetch。请在项目根目录启动 HTTP 服务（如 python3 -m http.server）后通过 http:// 访问。'
            );
            return;
          }
          console.warn(
            '[同价位] 无法加载车库 car.html。请确认：① 静态服务根目录是包含 car.html 的项目根；② 不要用「仅打开 cars 子目录」作为站点根。当前尝试过：' +
              resolveCarListUrl() +
              ' 与 ../../car.html'
          );
        });
    });
  
