(function () {
  var allowed = { m2Chooser: 1, m2Packages: 1, m2Service: 1, m2About: 1, m2activity: 1 };
  var q = new URLSearchParams(location.search || '');
  var raw = String(q.get('m2from') || 'm2Chooser').trim();
  if (!allowed[raw]) raw = 'm2Chooser';
  q.delete('m2from');
  var qs = q.toString();
  /* 活动页入口：返回 activity.html；其余仍为首页锚点（见 index.js） */
  var href =
    raw === 'm2activity'
      ? '../../activity.html' + (qs ? '?' + qs : '')
      : /* file:// 下 ?query 常被浏览器丢掉，用 hash：--m2ns 与 index.html / index.js 一致 */
        '../../index.html' + (qs ? '?' + qs : '') + '#' + raw + '--m2ns';
  var back = document.querySelector('.m2-car__back');
  if (back) {
    back.setAttribute('href', href);
    back.addEventListener('click', function () {
      try {
        sessionStorage.setItem('mango_m2_skip_splash_once', '1');
        sessionStorage.setItem('m2_skip_next_index_splash', '1');
      } catch (e) {}
    });
  }
  /* file:// 下部分环境会丢 query 或 hash，用 session 兜底（活动页不需要首页滚位） */
  try {
    if (raw === 'm2activity') {
      sessionStorage.removeItem('m2HomeScrollTarget');
      sessionStorage.removeItem('m2HomeReturnQs');
    } else {
      sessionStorage.setItem('m2HomeScrollTarget', raw);
      if (qs) sessionStorage.setItem('m2HomeReturnQs', qs);
      else sessionStorage.removeItem('m2HomeReturnQs');
    }
  } catch (e) {}
})();
