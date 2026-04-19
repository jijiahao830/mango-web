/**
 * 选车页分流（本地与服务器相同逻辑）：
 * - 判定为「移动 / 平板」布局时：car.html → car-mobile.html；直接打开 car-mobile.html 时保持。
 * - 判定为 PC 时：car-mobile.html → car.html；直接打开 car.html 时保持。
 *
 * 覆盖规则（与 preferMobileCarLayout 一致）：
 *   ?view=mobile 强制移动；?view=pc 强制桌面；
 *   localStorage.mango_car_device_mode = mobile | pc | auto（默认按 UA / 视口等）。
 */
(function (global) {
  var STORAGE_KEY = 'mango_car_device_mode';

  function currentFileName() {
    var p = (global.location && global.location.pathname) || '';
    var parts = p.split('/');
    return (parts.pop() || '').toLowerCase();
  }

  function getQueryView() {
    try {
      var q = new URLSearchParams(global.location.search || '').get('view');
      q = (q || '').toLowerCase();
      if (q === 'mobile' || q === 'pc') return q;
    } catch (e) {}
    return '';
  }

  function isMobileOrTabletUA() {
    var ua = global.navigator.userAgent || '';
    if (/iPad/i.test(ua)) return true;
    if (global.navigator.platform === 'MacIntel' && global.navigator.maxTouchPoints > 1) return true;
    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true;
    if (
      /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS/i.test(
        ua
      )
    )
      return true;
    return false;
  }

  function isCoarsePointerNarrow() {
    try {
      if (!global.matchMedia) return false;
      var coarse = global.matchMedia('(pointer: coarse)').matches;
      var narrow = global.matchMedia('(max-width: 1024px)').matches;
      return coarse && narrow;
    } catch (e) {
      return false;
    }
  }

  function isNarrowViewportFallback() {
    try {
      var w = Math.max(
        global.innerWidth || 0,
        (global.document && global.document.documentElement && global.document.documentElement.clientWidth) || 0
      );
      return w > 0 && w <= 1024;
    } catch (e) {
      return false;
    }
  }

  function isMobileHintFromUAData() {
    try {
      return !!(global.navigator.userAgentData && global.navigator.userAgentData.mobile);
    } catch (e) {
      return false;
    }
  }

  function isMobileOrTablet() {
    return (
      isMobileHintFromUAData() ||
      isMobileOrTabletUA() ||
      isCoarsePointerNarrow() ||
      isNarrowViewportFallback()
    );
  }

  function preferMobileCarLayout() {
    var q = getQueryView();
    if (q === 'mobile') return true;
    if (q === 'pc') return false;
    try {
      var m = String(global.localStorage.getItem(STORAGE_KEY) || '').toLowerCase();
      if (m === 'mobile') return true;
      if (m === 'pc') return false;
    } catch (e) {}
    return isMobileOrTablet();
  }

  /** 首页等入口：移动进 car-mobile，否则 car.html，均带 #carSection */
  function carEntryHref() {
    return (preferMobileCarLayout() ? 'car-mobile.html' : 'car.html') + '#carSection';
  }

  function withSameQueryHash(name) {
    var s = global.location.search || '';
    var h = global.location.hash || '';
    return name + s + h;
  }

  function redirectFromPcCarPage() {
    var tail = currentFileName();
    if (tail !== 'car.html') return;
    if (!preferMobileCarLayout()) return;
    global.location.replace(withSameQueryHash('car-mobile.html'));
  }

  function redirectFromMobileCarPage() {
    var tail = currentFileName();
    if (tail !== 'car-mobile.html') return;
    if (preferMobileCarLayout()) return;
    global.location.replace(withSameQueryHash('car.html'));
  }

  global.MangoDeviceRedirect = {
    STORAGE_KEY: STORAGE_KEY,
    isMobileOrTablet: isMobileOrTablet,
    preferMobileCarLayout: preferMobileCarLayout,
    carEntryHref: carEntryHref,
    redirectFromPcCarPage: redirectFromPcCarPage,
    redirectFromMobileCarPage: redirectFromMobileCarPage,
  };
})(typeof window !== 'undefined' ? window : this);
