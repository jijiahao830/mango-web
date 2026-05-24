/* 详情页右侧快捷栏（公共） */
(function () {
  function initShareQr() {
    if (document.querySelector('.m2-car__share')) return;
    var back = document.querySelector('.m2-car__back');
    if (!back || !back.parentNode) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'm2-car__share';
    btn.setAttribute('aria-label', '分享当前车辆');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="18" cy="5" r="3"></circle>' +
      '<circle cx="6" cy="12" r="3"></circle>' +
      '<circle cx="18" cy="19" r="3"></circle>' +
      '<path d="M8.6 10.6 15.4 6.4"></path>' +
      '<path d="M8.6 13.4 15.4 17.6"></path>' +
      '</svg>';
    back.parentNode.insertBefore(btn, back.nextSibling);

    var modal = document.createElement('div');
    modal.className = 'm2-share-modal';
    modal.setAttribute('hidden', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '分享二维码');
    modal.innerHTML =
      '<div class="m2-share-modal__backdrop" data-m2-share-close></div>' +
      '<div class="m2-share-modal__panel">' +
      '<div class="m2-share-modal__head">' +
      '<button type="button" class="m2-share-modal__save m2-share-modal__save--head" id="m2ShareSaveBtn" aria-label="下载分享图">' +
      '<svg class="m2-share-modal__save-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v11"></path>' +
      '<path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>' +
      '<path d="M4 18.5h16"></path>' +
      '</svg>' +
      '</button>' +
      '<button type="button" class="m2-share-modal__close" data-m2-share-close aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="m2-share-modal__cover-wrap">' +
      '<img class="m2-share-modal__cover" alt="">' +
      '<div class="m2-share-modal__meta">' +
      '<p class="m2-share-modal__brand"></p>' +
      '<p class="m2-share-modal__model"></p>' +
      '</div>' +
      '<div class="m2-share-modal__qr-wrap">' +
      '<img class="m2-share-modal__qr" alt="当前页面二维码">' +
      '<div class="m2-share-modal__qr-tips">' +
      '<p class="m2-share-modal__qr-tip">1、保存图片到相册</p>' +
      '<p class="m2-share-modal__qr-tip">2、扫描二维码</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var cover = modal.querySelector('.m2-share-modal__cover');
    var coverWrap = modal.querySelector('.m2-share-modal__cover-wrap');
    var brandEl = modal.querySelector('.m2-share-modal__brand');
    var modelEl = modal.querySelector('.m2-share-modal__model');
    var qr = modal.querySelector('.m2-share-modal__qr');
    var saveBtn = modal.querySelector('#m2ShareSaveBtn');
    var locked = false;

    function currentShareUrl() {
      try {
        return new URL(location.href).href;
      } catch (e) {
        return String(location.href || '');
      }
    }

    function qrUrl(text) {
      return (
        'https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=' +
        encodeURIComponent(text)
      );
    }

    function escFilename(name) {
      return String(name || 'mango-share')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function loadImg(src) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          resolve(img);
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function splitBrandModel(rawName) {
      var name = String(rawName || '').trim();
      if (!name) return { brand: '', model: '' };
      var brands = [
        '阿斯顿马丁',
        '兰博基尼',
        '劳斯莱斯',
        '玛莎拉蒂',
        '迈凯伦',
        '保时捷',
        '法拉利',
        '迈巴赫',
        '广汽传祺',
        '路虎',
        '路特斯',
        '特斯拉',
        '奔驰',
        '宝马',
        '奥迪',
        '宾利',
        '丰田',
        '日产',
        '理想',
        '腾势',
        '问界',
        '岚图',
        '小米',
        '坦克',
        '福特',
        '别克',
        '道奇',
        '五菱',
      ];
      for (var i = 0; i < brands.length; i++) {
        var b = brands[i];
        if (name.indexOf(b) === 0) {
          return {
            brand: b,
            model: String(name.slice(b.length)).trim() || name,
          };
        }
      }
      var parts = name.split(/\s+/);
      if (parts.length <= 1) return { brand: name, model: name };
      return {
        brand: parts[0],
        model: String(name.slice(parts[0].length)).trim() || name,
      };
    }

    function lockScroll() {
      if (locked) return;
      locked = true;
      try {
        if (typeof window.m2aLockOverlayScroll === 'function') {
          window.m2aLockOverlayScroll();
          return;
        }
      } catch (eLock) {}
      try {
        document.documentElement.classList.add('m2a-overlay-scroll-lock');
        document.body.classList.add('m2a-overlay-scroll-lock');
      } catch (eFallbackLock) {}
    }

    function unlockScroll() {
      if (!locked) return;
      locked = false;
      try {
        if (typeof window.m2aUnlockOverlayScroll === 'function') {
          window.m2aUnlockOverlayScroll();
          return;
        }
      } catch (eUnlock) {}
      try {
        document.documentElement.classList.remove('m2a-overlay-scroll-lock');
        document.body.classList.remove('m2a-overlay-scroll-lock');
      } catch (eFallbackUnlock) {}
    }

    function openShare() {
      var url = currentShareUrl();
      var displayName = String(document.body.getAttribute('data-car-display-name') || '').trim();
      var bm = splitBrandModel(displayName);
      if (brandEl) brandEl.textContent = bm.brand || displayName || '';
      if (modelEl) modelEl.textContent = bm.model || displayName || '';
      var mainImg = document.querySelector('.m2-car__bg');
      if (mainImg && mainImg.getAttribute('src')) {
        if (cover) {
          cover.src = mainImg.getAttribute('src');
          cover.alt =
            mainImg.getAttribute('alt') ||
            String(document.body.getAttribute('data-car-display-name') || '车辆主图');
        }
        if (coverWrap) coverWrap.removeAttribute('hidden');
      } else if (coverWrap) {
        coverWrap.setAttribute('hidden', '');
      }
      if (qr) qr.src = qrUrl(url);
      modal.removeAttribute('hidden');
      lockScroll();
    }

    function closeShare() {
      if (modal.hasAttribute('hidden')) return;
      modal.setAttribute('hidden', '');
      unlockScroll();
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    function drawCoverImageCrop(ctx, img, x, y, w, h, objectPosY) {
      var srcW = img.naturalWidth || img.width;
      var srcH = img.naturalHeight || img.height;
      if (!srcW || !srcH) return;
      var targetRatio = w / h;
      var srcRatio = srcW / srcH;
      var cropW = srcW;
      var cropH = srcH;
      if (srcRatio > targetRatio) {
        cropW = srcH * targetRatio;
      } else {
        cropH = srcW / targetRatio;
      }
      var sx = (srcW - cropW) * 0.5;
      var posY = Math.max(0, Math.min(1, objectPosY));
      var sy = (srcH - cropH) * posY;
      ctx.drawImage(img, sx, sy, cropW, cropH, x, y, w, h);
    }

    function downloadCanvas(canvas, filename) {
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = filename + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function canvasToBlob(canvas) {
      return new Promise(function (resolve, reject) {
        try {
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error('blob_empty'));
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      });
    }

    function isLikelyIOS() {
      var ua = String(navigator.userAgent || '');
      var isIOS = /iPad|iPhone|iPod/i.test(ua);
      var isMacTouch = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      return isIOS || isMacTouch;
    }

    function shareOrDownloadCanvas(canvas, filename, opts) {
      opts = opts || {};
      var preferAlbum = !!opts.preferAlbum;
      return canvasToBlob(canvas).then(function (blob) {
        var file = new File([blob], filename + '.png', { type: 'image/png' });
        var canShareFile =
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        if (preferAlbum && canShareFile && isLikelyIOS()) {
          return navigator
            .share({
              title: filename,
              files: [file],
            })
            .catch(function (err) {
              var msg = String((err && err.name) || '');
              if (msg === 'AbortError') return;
              downloadCanvas(canvas, filename);
            });
        }

        if (preferAlbum && (!canShareFile || !isLikelyIOS())) {
          window.alert('当前环境不支持直接保存到相册，将为你下载文件。');
        }

        downloadCanvas(canvas, filename);
      });
    }

    function createSharePoster() {
      var displayName = String(document.body.getAttribute('data-car-display-name') || '').trim() || '芒果超跑';
      var bm = splitBrandModel(displayName);
      var coverSrc = cover && cover.getAttribute('src') ? cover.getAttribute('src') : '';
      var qrSrc = qr && qr.getAttribute('src') ? qr.getAttribute('src') : '';
      if (!coverSrc || !qrSrc) throw new Error('分享素材未就绪');
      var wrapEl = modal.querySelector('.m2-share-modal__cover-wrap');
      var metaEl = modal.querySelector('.m2-share-modal__meta');
      var qrWrapEl = modal.querySelector('.m2-share-modal__qr-wrap');
      var tips = modal.querySelectorAll('.m2-share-modal__qr-tip');
      if (!wrapEl || !metaEl || !qrWrapEl || !brandEl || !modelEl || !qr) {
        throw new Error('分享布局未就绪');
      }

      function relRect(childRect, parentRect) {
        return {
          x: childRect.left - parentRect.left,
          y: childRect.top - parentRect.top,
          w: childRect.width,
          h: childRect.height,
        };
      }

      function toCanvasFont(el, scale) {
        var st = window.getComputedStyle(el);
        var size = parseFloat(st.fontSize || '16') * scale;
        var weight = st.fontWeight || '400';
        var family = st.fontFamily || '"PingFang SC","Microsoft YaHei",sans-serif';
        return String(weight) + ' ' + Math.max(1, size).toFixed(1) + 'px ' + family;
      }

      function toCanvasColor(el, fallback) {
        var st = window.getComputedStyle(el);
        return st.color || fallback;
      }

      function parseObjectPosY(val) {
        var raw = String(val || '').trim();
        if (!raw) return 0.5;
        var parts = raw.split(/\s+/);
        var y = parts.length >= 2 ? parts[1] : parts[0];
        if (y === 'top') return 0;
        if (y === 'center') return 0.5;
        if (y === 'bottom') return 1;
        if (/%$/.test(y)) {
          var n = parseFloat(y);
          if (isFinite(n)) return Math.max(0, Math.min(1, n / 100));
        }
        return 0.5;
      }

      return Promise.all([loadImg(coverSrc), loadImg(qrSrc)]).then(function (imgs) {
        var coverImg = imgs[0];
        var qrImg = imgs[1];

        var wrapRect = wrapEl.getBoundingClientRect();
        var metaRect = metaEl.getBoundingClientRect();
        var brandRect = brandEl.getBoundingClientRect();
        var modelRect = modelEl.getBoundingClientRect();
        var qrWrapRect = qrWrapEl.getBoundingClientRect();
        var qrRect = qr.getBoundingClientRect();
        var tip1Rect = tips[0] ? tips[0].getBoundingClientRect() : null;
        var tip2Rect = tips[1] ? tips[1].getBoundingClientRect() : null;

        var scale = Math.max(2, Math.min(3, (window.devicePixelRatio || 1) * 2));
        var W = Math.max(1, Math.round(wrapRect.width * scale));
        var H = Math.max(1, Math.round(wrapRect.height * scale));
        var canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法创建画布');

        function s(v) {
          return v * scale;
        }

        var radius = parseFloat(window.getComputedStyle(wrapEl).borderTopLeftRadius || '0') || 0;
        drawRoundedRect(ctx, 0, 0, W, H, s(radius));
        ctx.save();
        ctx.clip();

        var posY = parseObjectPosY(window.getComputedStyle(cover).objectPosition);
        drawCoverImageCrop(ctx, coverImg, 0, 0, W, H, posY);

        var metaRel = relRect(metaRect, wrapRect);
        var grd = ctx.createLinearGradient(0, s(metaRel.y), 0, s(metaRel.y + metaRel.h));
        grd.addColorStop(0, 'rgba(0,0,0,0.58)');
        grd.addColorStop(0.56, 'rgba(0,0,0,0.24)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(s(metaRel.x), s(metaRel.y), s(metaRel.w), s(metaRel.h));

        var brandRel = relRect(brandRect, wrapRect);
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = s(4);
        ctx.fillStyle = toCanvasColor(brandEl, '#fff');
        ctx.font = toCanvasFont(brandEl, scale);
        ctx.fillText(brandEl.textContent || bm.brand || displayName, s(brandRel.x), s(brandRel.y));

        var modelRel = relRect(modelRect, wrapRect);
        ctx.fillStyle = toCanvasColor(modelEl, '#fff');
        ctx.font = toCanvasFont(modelEl, scale);
        ctx.fillText(modelEl.textContent || bm.model || displayName, s(modelRel.x), s(modelRel.y));
        ctx.shadowBlur = 0;

        var qrWrapRel = relRect(qrWrapRect, wrapRect);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(s(qrWrapRel.x), s(qrWrapRel.y), s(qrWrapRel.w), s(qrWrapRel.h));
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = Math.max(1, scale);
        ctx.strokeRect(s(qrWrapRel.x) + 0.5, s(qrWrapRel.y) + 0.5, s(qrWrapRel.w) - 1, s(qrWrapRel.h) - 1);

        var qrRel = relRect(qrRect, wrapRect);
        ctx.drawImage(qrImg, s(qrRel.x), s(qrRel.y), s(qrRel.w), s(qrRel.h));

        if (tips[0] && tip1Rect) {
          var tip1Rel = relRect(tip1Rect, wrapRect);
          ctx.fillStyle = toCanvasColor(tips[0], 'rgba(255,255,255,0.92)');
          ctx.font = toCanvasFont(tips[0], scale);
          ctx.fillText(tips[0].textContent || '1、保存图片到相册', s(tip1Rel.x), s(tip1Rel.y));
        }
        if (tips[1] && tip2Rect) {
          var tip2Rel = relRect(tip2Rect, wrapRect);
          ctx.fillStyle = toCanvasColor(tips[1], 'rgba(255,255,255,0.92)');
          ctx.font = toCanvasFont(tips[1], scale);
          ctx.fillText(tips[1].textContent || '2、扫描二维码', s(tip2Rel.x), s(tip2Rel.y));
        }

        ctx.restore();
        return canvas;
      });
    }

    btn.addEventListener('click', openShare);
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (saveBtn.disabled) return;
        saveBtn.disabled = true;
        saveBtn.classList.add('is-loading');
        createSharePoster()
          .then(function (canvas) {
            var name = escFilename(document.body.getAttribute('data-car-display-name') || 'mango-share');
            var preferAlbum = window.confirm(
              '是否保存到相册？\n确定：打开系统分享，可选择“存储图像”\n取消：直接下载文件'
            );
            return shareOrDownloadCanvas(canvas, name + '-分享', { preferAlbum: preferAlbum });
          })
          .catch(function () {
            window.alert('生成失败，请稍后重试');
          })
          .finally(function () {
            saveBtn.disabled = false;
            saveBtn.classList.remove('is-loading');
          });
      });
    }
    modal.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-m2-share-close]')) {
        closeShare();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeShare();
    });
    window.addEventListener('pagehide', closeShare);
  }

  initShareQr();

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

  /** m2-actions 弹窗层打开时对 html/body 添加（首页滚动容器为 .m2-home 不加）；暂停详情全屏翻页与轮播滑动手势 */
  function m2DetailOverlayConsumesGestures() {
    try {
      var root = document.documentElement;
      return !!(root && root.classList.contains('m2a-overlay-scroll-lock'));
    } catch (e) {
      return false;
    }
  }

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
      if (m2DetailOverlayConsumesGestures()) return;
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
        if (m2DetailOverlayConsumesGestures()) return;
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
      if (m2DetailOverlayConsumesGestures()) return;
      e.preventDefault();
      if (e.deltaY > 0) nextSection();
      else if (e.deltaY < 0) prevSection();
    }

    function onTouchStart(e) {
      if (!e.touches || !e.touches[0]) return;
      touchStartX = e.touches[0].clientX;
      touchEndX = touchStartX;
      touchStartY = e.touches[0].clientY;
      touchEndY = touchStartY;
      touchMoved = false;
      if (m2DetailOverlayConsumesGestures()) return;
    }

    function onTouchMove(e) {
      if (m2DetailOverlayConsumesGestures()) return;
      touchEndX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
      touchMoved = true;
    }

    function onTouchEnd() {
      if (m2DetailOverlayConsumesGestures()) return;
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
      if (m2DetailOverlayConsumesGestures()) return;
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

  /** 详情页价格区（含封面价卡）点击四档租期 → 打开份数弹窗（与清单 days 文案一致） */
  function initDetailPricingQtyPick() {
    if (document.documentElement.__m2PricingQtyBound) return;
    if (!String(document.body.getAttribute('data-car-display-name') || '').trim())
      return;

    function callOpenQtyLine(lineKey) {
      var fn = window.m2aOpenQtyFromDetailPricingLine;
      if (typeof fn === 'function') {
        fn(lineKey);
        return;
      }
      if (window.__m2ActionsQtyPricingLoading) return;
      window.__m2ActionsQtyPricingLoading = true;
      var s = document.createElement('script');
      s.src = '../../m2-actions.js';
      s.onload = function () {
        window.__m2ActionsQtyPricingLoading = false;
        var fn2 = window.m2aOpenQtyFromDetailPricingLine;
        if (typeof fn2 === 'function') fn2(lineKey);
      };
      s.onerror = function () {
        window.__m2ActionsQtyPricingLoading = false;
      };
      document.body.appendChild(s);
    }

    var pricing = document.getElementById('m2Pricing');
    if (pricing && !pricing.__m2PricingQtyDelegated) {
      pricing.__m2PricingQtyDelegated = true;
      pricing.addEventListener('click', function (ev) {
        var row = ev.target && ev.target.closest
          ? ev.target.closest('.m2-car__pricing-row[data-pricing-line]')
          : null;
        if (!row || !pricing.contains(row)) return;
        var line = String(row.getAttribute('data-pricing-line') || '').trim();
        if (line !== '1' && line !== '2' && line !== '3' && line !== '4') return;
        ev.preventDefault();
        callOpenQtyLine(line);
      });
    }

    var coverRoot = document.querySelector('.m2-cover-wrapper');
    if (coverRoot && !coverRoot.__m2CoverPricingQtyDelegated) {
      coverRoot.__m2CoverPricingQtyDelegated = true;
      coverRoot.addEventListener('click', function (ev) {
        var line = null;
        var t = ev.target;
        if (!t || !t.closest) return;
        if (t.closest('.m2-cover-price__day')) line = '1';
        else {
          var item = t.closest('.m2-cover-price__item');
          if (!item || !coverRoot.contains(item)) return;
          var priced = item.querySelector('[data-cover-price]');
          var key = priced ? String(priced.getAttribute('data-cover-price') || '') : '';
          var map = { week: '2', half: '3', month: '4' };
          line = map[key] || null;
        }
        if (!line) return;
        ev.preventDefault();
        callOpenQtyLine(line);
      });
    }

    document.documentElement.__m2PricingQtyBound = true;
  }

  initDetailPricingQtyPick();

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

  /** 用于仅在「进入 / 离开封面」时切换收起态，避免 resize 时打断用户在封面手动展开 */
  var railCoverPrevOnCover = null;

  /**
   * 封面：快捷栏收起为小拉手；离开封面（fade：下一屏 / 滚动过长页）后自动展开面板。
   */
  function updateRailScrollGate() {
    var onCover = false;
    if (document.body.classList.contains('m2d-page--fade')) {
      var coverSec = document.querySelector('.m2-cover-wrapper.m2d-page-section');
      onCover = !!(coverSec && coverSec.classList.contains('is-active'));
    } else {
      var y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      var threshold = 8;
      onCover = y + threshold < coverScrollEndPx();
    }

    var crossed =
      railCoverPrevOnCover === null ? true : onCover !== railCoverPrevOnCover;
    railCoverPrevOnCover = onCover;

    if (!crossed) return;

    if (onCover) {
      rail.classList.add('is-collapsed');
    } else {
      rail.classList.remove('is-collapsed');
    }
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
