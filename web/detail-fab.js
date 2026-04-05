/**
 * 详情页右侧「立即预约 / 咨询客服」悬浮条：Hero（.hero-detail）在视口内时隐藏，滚出后显示。
 * 与兰博基尼各车型 car.js 中逻辑一致。
 */
(function () {
  var heroSection = document.querySelector('.hero-detail');
  var fab = document.getElementById('detailFabActions');
  if (!heroSection || !fab) return;

  function heroIntersectsViewport() {
    var rect = heroSection.getBoundingClientRect();
    var vh = window.innerHeight;
    return rect.bottom > 0 && rect.top < vh;
  }

  function syncFab() {
    if (heroIntersectsViewport()) {
      fab.classList.remove('is-visible');
      fab.setAttribute('aria-hidden', 'true');
    } else {
      fab.classList.add('is-visible');
      fab.setAttribute('aria-hidden', 'false');
    }
  }

  window.addEventListener('scroll', syncFab, { passive: true });
  window.addEventListener('resize', syncFab);
  syncFab();
})();
