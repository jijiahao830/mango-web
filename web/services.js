document.addEventListener('DOMContentLoaded', function() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  let currentIndex = 0;
  let isAnimating = false;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchMoved = false;

  /** m2/services：仅在最后一帧展示备案 footer */
  function updateM2LegalFooterVisibility() {
    const footer = document.querySelector(
      'body.page-services--m2 footer.site-record-footer.m2-about__footer'
    );
    if (!footer || !slides.length) return;
    const isLast = currentIndex === slides.length - 1;
    footer.classList.toggle('services-legal-foot--hidden', !isLast);
    footer.setAttribute('aria-hidden', isLast ? 'false' : 'true');
  }

  function applyInitialSlideByPackage() {
    if (!slides.length || !dots.length) return;
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
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === target);
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === target);
    });
    currentIndex = target;
  }

  // 切换到指定幻灯片
  function goToSlide(index) {
    if (isAnimating || index === currentIndex) return;
    if (index < 0 || index >= slides.length) return;

    isAnimating = true;

    // 移除当前激活状态
    slides[currentIndex].classList.remove('active');
    dots[currentIndex].classList.remove('active');

    // 设置新的激活状态
    currentIndex = index;
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');

    updateM2LegalFooterVisibility();

    // 800ms后允许下次切换
    setTimeout(() => {
      isAnimating = false;
    }, 800);
  }

  // 下一张
  function nextSlide() {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }

  // 上一张
  function prevSlide() {
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
  }

  // 鼠标滚轮事件
  let wheelTimeout;
  function handleWheel(e) {
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
    touchStartY = e.touches[0].clientY;
    touchEndY = touchStartY;
    touchMoved = false;
  }

  function handleTouchMove(e) {
    touchEndY = e.touches[0].clientY;
    touchMoved = true;
  }

  function handleTouchEnd() {
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

  // 点击导航点
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
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

  applyInitialSlideByPackage();

  updateM2LegalFooterVisibility();

  // 初始化
  console.log('Services carousel initialized with', slides.length, 'slides');
});
