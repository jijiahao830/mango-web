(function () {
  var rail = document.getElementById('m2CarRail');
  if (!rail) return;
  if (!rail.classList.contains('m2-car-rail--static')) return;

  var peek = document.getElementById('m2CarRailPeek');
  var closeBtn = document.getElementById('m2CarRailClose');
  if (!peek || !closeBtn) return;

  closeBtn.addEventListener('click', function () {
    rail.classList.add('is-collapsed');
  });
  peek.addEventListener('click', function () {
    rail.classList.remove('is-collapsed');
  });

  /* 加入清单 / 咨询 / 用车清单 由 m2-actions.js 的 bindEvents 统一绑定，此处勿重复监听（否则会触发两次 handleAddChecklist，表现为加入后立即被当作「再点移除」） */
})();
