document.addEventListener('DOMContentLoaded', function() {
  const slides = Array.from(document.querySelectorAll('.carousel-slide'));
  const dotsWrap = document.querySelector('.carousel-dots');
  const tabButtons = Array.from(document.querySelectorAll('[data-service-tab-button]'));
  const serviceAddBtn = document.getElementById('m2ServiceAddBtn');
  const sideRail = document.getElementById('m2CarRail');
  let currentIndex = 0;
  let isAnimating = false;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchMoved = false;
  let activeTab = 'service';
  let activeSlides = [];

  function persistActiveTab(tab) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab || 'service');
      history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  /** m2-actions 弹窗打开时 html 会带此类；暂停全屏服务轮播手势（不影响未使用该类的页面） */
  function overlayConsumesGestures() {
    try {
      const root = document.documentElement;
      return !!(root && root.classList.contains('m2a-overlay-scroll-lock'));
    } catch (e) {
      return false;
    }
  }

  /** m2/services：在当前 tab 的最后一帧展示备案 footer（服务 / 权益 / 流程） */
  function updateM2LegalFooterVisibility() {
    const footer = document.querySelector(
      'body.page-services--m2 footer.site-record-footer.m2-about__footer'
    );
    if (!footer || !slides.length) return;
    const isLast = currentIndex === activeSlides.length - 1;
    footer.classList.toggle('services-legal-foot--hidden', !isLast);
    footer.setAttribute('aria-hidden', isLast ? 'false' : 'true');
  }

  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    dotsWrap.hidden = activeSlides.length <= 1;
    if (dotsWrap.hidden) return;
    activeSlides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `dot${idx === currentIndex ? ' active' : ''}`;
      dot.dataset.index = String(idx);
      dot.setAttribute('aria-label', `第${idx + 1}张`);
      dot.addEventListener('click', () => {
        goToSlide(idx);
      });
      dotsWrap.appendChild(dot);
    });
  }

  function syncSlideVisibility() {
    slides.forEach((slide) => {
      slide.classList.remove('active');
      slide.hidden = true;
    });
    const slide = activeSlides[currentIndex];
    if (slide) {
      slide.hidden = false;
      slide.classList.add('active');
    }
    if (serviceAddBtn) {
      serviceAddBtn.style.display = activeTab === 'service' ? '' : 'none';
    }
    if (sideRail) {
      sideRail.style.display = activeTab === 'service' ? '' : 'none';
    }
    renderDots();
    updateM2LegalFooterVisibility();
  }

  function setActiveTab(tab) {
    activeTab = tab || 'service';
    persistActiveTab(activeTab);
    activeSlides = slides.filter((slide) => (slide.dataset.serviceTab || 'service') === activeTab);
    currentIndex = 0;
    isAnimating = false;
    tabButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.serviceTabButton === activeTab);
    });
    syncSlideVisibility();
  }

  function applyInitialSlideByPackage() {
    if (!slides.length) return;
    let pkg = '';
    try {
      pkg = new URLSearchParams(window.location.search).get('package') || '';
    } catch (e) {
      pkg = '';
    }
    const packageStartIndexMap = {
      business: 0,
      wedding: 2,
      event: 4
    };
    if (!(pkg in packageStartIndexMap)) return;
    const target = packageStartIndexMap[pkg];
    if (target >= activeSlides.length) return;
    currentIndex = target;
    syncSlideVisibility();
  }

  function initialTabFromUrl() {
    try {
      const tab = String(new URLSearchParams(window.location.search).get('tab') || '').trim();
      if (tab === 'benefits' || tab === 'service') return tab;
    } catch (e) {}
    try {
      const hashTab = String(window.location.hash || '').replace(/^#/, '').trim();
      if (hashTab === 'benefits' || hashTab === 'service') return hashTab;
    } catch (e2) {}
    return 'service';
  }

  // 切换到指定幻灯片
  function goToSlide(index) {
    if (isAnimating || index === currentIndex) return;
    if (index < 0 || index >= activeSlides.length) return;

    isAnimating = true;

    currentIndex = index;
    syncSlideVisibility();

    // 800ms后允许下次切换
    setTimeout(() => {
      isAnimating = false;
    }, 800);
  }

  // 下一张
  function nextSlide() {
    if (activeSlides.length <= 1) return;
    const nextIndex = (currentIndex + 1) % activeSlides.length;
    goToSlide(nextIndex);
  }

  // 上一张
  function prevSlide() {
    if (activeSlides.length <= 1) return;
    const prevIndex = (currentIndex - 1 + activeSlides.length) % activeSlides.length;
    goToSlide(prevIndex);
  }

  // 鼠标滚轮事件
  let wheelTimeout;
  function handleWheel(e) {
    if (overlayConsumesGestures()) return;
    e.preventDefault();
    
    // 防抖处理，避免滚动过快
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      if (e.deltaY > 0) {
        // 向下滚动 - 下一张
        nextSlide();
      } else if (e.deltaY < 0) {
        // 向上滚动 - 上一张
        prevSlide();
      }
    }, 50);
  }

  // 触摸事件（移动端）
  function handleTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    touchStartY = e.touches[0].clientY;
    touchEndY = touchStartY;
    touchMoved = false;
    if (overlayConsumesGestures()) return;
  }

  function handleTouchMove(e) {
    if (overlayConsumesGestures()) return;
    if (!e.touches || !e.touches[0]) return;
    touchEndY = e.touches[0].clientY;
    touchMoved = true;
  }

  function handleTouchEnd() {
    if (overlayConsumesGestures()) return;
    if (!touchMoved) return;
    const deltaY = touchStartY - touchEndY;
    
    // 滑动距离超过50px才触发切换
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        // 向上滑动 - 下一张
        nextSlide();
      } else {
        // 向下滑动 - 上一张
        prevSlide();
      }
    }
  }

  // 键盘事件
  function handleKeydown(e) {
    if (overlayConsumesGestures()) return;
    switch(e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        prevSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(slides.length - 1);
        break;
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.serviceTabButton || 'service');
    });
  });

  // 绑定事件
  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('keydown', handleKeydown);

  // 自动播放（可选，默认关闭）
  let autoplayInterval;
  function startAutoplay(interval = 5000) {
    stopAutoplay();
    autoplayInterval = setInterval(nextSlide, interval);
  }

  function stopAutoplay() {
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }

  // 鼠标移入停止自动播放，移出恢复
  const carousel = document.getElementById('carousel');
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', () => {
    // 如果需要自动播放，取消下面这行的注释
    // startAutoplay();
  });

  // 页面可见性变化时停止/恢复自动播放
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      // 如果需要自动播放，取消下面这行的注释
      // startAutoplay();
    }
  });

  setActiveTab(initialTabFromUrl());
  if (activeTab === 'service') applyInitialSlideByPackage();

  updateM2LegalFooterVisibility();
  if (carousel) carousel.classList.add('is-ready');

  // 初始化
  console.log('Services carousel initialized with', slides.length, 'slides');
});
