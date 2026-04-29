(function () {
  var allowed = { m2Chooser: 1, m2Packages: 1, m2Service: 1, m2About: 1 };
  var q = new URLSearchParams(location.search || '');
  var raw = String(q.get('m2from') || 'm2Chooser').trim();
  if (!allowed[raw]) raw = 'm2Chooser';
  q.delete('m2from');
  var qs = q.toString();
  /* file:// 下 ?query 常被浏览器丢掉，用 hash 传参：#m2Chooser&m2ns=1（与 index.js 开屏、滚位一致） */
  /* 不用 hash 里的 &（本地 file / 部分 WebView 会吞片段）；--m2ns 后缀与 index.html head 脚本、index.js 一致 */
  var href = '../../index.html' + (qs ? '?' + qs : '') + '#' + raw + '--m2ns';
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
  /* file:// 下部分环境会丢 query 或 hash，用 session 兜底 */
  try {
    sessionStorage.setItem('m2HomeScrollTarget', raw);
    if (qs) sessionStorage.setItem('m2HomeReturnQs', qs);
    else sessionStorage.removeItem('m2HomeReturnQs');
  } catch (e) {}
})();
