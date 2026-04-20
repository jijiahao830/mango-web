document.addEventListener('DOMContentLoaded', () => {
  const video = document.querySelector('.hero-video');
  const videoWrap = document.querySelector('.hero-video-wrapper');
  const scrollport = document.querySelector('.index-scrollport');
  if (!video || !scrollport) return;

  const desktopSrc = video.dataset.srcDesktop || '';
  const mobileSrc = video.dataset.srcMobile || desktopSrc;
  const widthFallbackMq = window.matchMedia('(max-width: 1024px)');
  let isMobilePad = false;

  function detectMobilePad() {
    try {
      if (window.MangoDeviceRedirect && typeof window.MangoDeviceRedirect.isMobileOrTablet === 'function') {
        return !!window.MangoDeviceRedirect.isMobileOrTablet();
      }
    } catch (e) {}

    const ua = navigator.userAgent || '';
    const isIOSPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isIPhone = /iPhone|iPod/i.test(ua);
    if (isIOSPad || isAndroid || isIPhone) return true;

    return widthFallbackMq.matches;
  }

  function setupSourceAndAudioPolicy() {
    isMobilePad = detectMobilePad();
    const nextSrc = isMobilePad ? mobileSrc : desktopSrc;
    if (nextSrc && video.currentSrc.indexOf(nextSrc) === -1) {
      video.src = nextSrc;
      video.load();
    }

    if (isMobilePad) {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.setAttribute('muted', '');
    } else {
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
      video.removeAttribute('muted');
    }
  }

  setupSourceAndAudioPolicy();

  video.controls = false;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  /* 腾讯 X5（微信内置浏览器等）：播放前设置才可靠 */
  video.setAttribute('x5-playsinline', 'true');
  video.setAttribute('x5-video-player-type', 'h5-page');
  video.setAttribute('x5-video-player-fullscreen', 'false');
  video.setAttribute('x5-video-orientation', 'portrait');
  video.setAttribute('disablepictureinpicture', '');
  video.setAttribute('disableremoteplayback', '');
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback nofullscreen');
  video.setAttribute('tabindex', '-1');
  video.setAttribute('aria-hidden', 'true');
  video.removeAttribute('controls');
  video.setAttribute('x-webkit-airplay', 'deny');

  ['click', 'touchstart', 'touchend', 'contextmenu'].forEach((evt) => {
    video.addEventListener(
      evt,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false }
    );
  });

  function tryPlayWithPolicy() {
    video.play().catch(() => {
      if (!isMobilePad) {
        // 桌面端若被自动播放策略拦截，先静音保底播放；首个用户手势后恢复声音。
        video.muted = true;
        video.defaultMuted = true;
        video.play().catch(() => {});
        const restoreAudioOnce = () => {
          video.muted = false;
          video.defaultMuted = false;
          video.play().catch(() => {});
        };
        window.addEventListener('pointerdown', restoreAudioOnce, { once: true });
        window.addEventListener('keydown', restoreAudioOnce, { once: true });
      }
    });
  }

  tryPlayWithPolicy();

  /**
   * 安卓部分浏览器（含部分内置 WebView）对 video 的 object-fit 支持异常，
   * 会把视频缩成中间小框。这里按真实视频宽高做一层 cover 尺寸兜底。
   */
  function applyVideoCoverFallback() {
    if (!videoWrap) return;
    const wrapW = Math.max(1, videoWrap.clientWidth || window.innerWidth || 1);
    const wrapH = Math.max(1, videoWrap.clientHeight || window.innerHeight || 1);
    const vw = Number(video.videoWidth) || 16;
    const vh = Number(video.videoHeight) || 9;
    const scale = Math.max(wrapW / vw, wrapH / vh);
    video.style.width = Math.ceil(vw * scale) + 'px';
    video.style.height = Math.ceil(vh * scale) + 'px';
    video.style.maxWidth = 'none';
    video.style.maxHeight = 'none';
    video.style.top = '50%';
    video.style.left = '50%';
    video.style.transform = 'translate(-50%, -50%) translateZ(0)';
    video.style.webkitTransform = 'translate(-50%, -50%) translateZ(0)';
  }

  video.addEventListener('loadedmetadata', applyVideoCoverFallback);
  video.addEventListener('canplay', applyVideoCoverFallback);
  window.addEventListener('resize', applyVideoCoverFallback);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyVideoCoverFallback);
  }
  window.setTimeout(applyVideoCoverFallback, 0);
  window.setTimeout(applyVideoCoverFallback, 220);

  if (typeof widthFallbackMq.addEventListener === 'function') {
    widthFallbackMq.addEventListener('change', () => {
      setupSourceAndAudioPolicy();
      tryPlayWithPolicy();
    });
  } else if (typeof widthFallbackMq.addListener === 'function') {
    widthFallbackMq.addListener(() => {
      setupSourceAndAudioPolicy();
      tryPlayWithPolicy();
    });
  }

  /**
   * 部分安卓内置 WebView：CSS 入场动画未结束时 opacity 一直为 0，整屏像「只有视频」。
   * 延迟后若仍不可见则强制显示文案区（不影响已正常完成的动画）。
   */
  window.setTimeout(() => {
    document.querySelectorAll('.hero .animate-in').forEach((el) => {
      const op = parseFloat(window.getComputedStyle(el).opacity);
      if (op < 0.05) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.animation = 'none';
      }
    });
  }, 2000);

  /**
   * 仅用 scrollTop 控制，避免双 IntersectionObserver 与 hero 高可见度同时触发 play 的竞态。
   * 首页可滚距离只有约 1px（底部触发条）：向下滑动 scrollTop>0 → 暂停；滑回顶部 → 播放。
   * 用单阈值 + rAF，避免与 IO 打架；亚像素用 <1 / >=1 分界（可滚总量极小）。
   */
  let transport = null;

  function setTransport(next) {
    if (transport === next) return;
    transport = next;
    if (next === 'playing') {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function sync() {
    const st = Math.max(0, scrollport.scrollTop);
    // 总可滚约 1px：多数浏览器为 0 或 1；平滑滚动可能出现小数
    if (st < 1) {
      setTransport('playing');
    } else {
      setTransport('paused');
    }
  }

  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  }

  scrollport.addEventListener('scroll', onScroll, { passive: true });
  if ('onscrollend' in window) {
    scrollport.addEventListener('scrollend', sync, { passive: true });
  }

  window.addEventListener('resize', sync);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', sync);
    window.visualViewport.addEventListener('scroll', sync);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
      transport = 'paused';
    } else {
      sync();
    }
  });

  sync();
});
