document.addEventListener('DOMContentLoaded', () => {
  const video = document.querySelector('.hero-video');
  const scrollport = document.querySelector('.index-scrollport');
  if (!video || !scrollport) return;

  /* 再次保证静音，避免部分浏览器忽略 HTML 属性导致 autoplay 失败 */
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');
  /* 腾讯 X5（微信内置浏览器等）：播放前设置才可靠 */
  video.setAttribute('x5-playsinline', 'true');
  video.setAttribute('x5-video-player-type', 'h5');
  video.setAttribute('x5-video-player-fullscreen', 'false');
  video.setAttribute('x5-video-orientation', 'portrait');
  video.play().catch(() => {});

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
