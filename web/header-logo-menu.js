/**
 * 顶栏中间 logo 下拉（窄屏）：选车「服务 / 关于我们」；关于「车辆 / 服务」；服务「车辆 / 关于我们」。宽屏与车辆页一致用顶栏三链。
 */
(function () {
  function wire(btnId, panelId, opts) {
    opts = opts || {};
    var narrowOnly = opts.narrowOnly !== false;

    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    if (!btn || !panel) return;

    var mq = narrowOnly
      ? window.matchMedia('(max-width: 1024px)')
      : { matches: true, addEventListener: function () {}, addListener: function () {} };

    function isActive() {
      return narrowOnly ? mq.matches : true;
    }

    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }

    function close() {
      setOpen(false);
    }

    btn.addEventListener('click', function (e) {
      if (!isActive()) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(panel.hasAttribute('hidden'));
    });

    document.addEventListener(
      'click',
      function (e) {
        if (!isActive()) return;
        if (panel.hasAttribute('hidden')) return;
        var t = e.target;
        if (btn.contains(t) || panel.contains(t)) return;
        close();
      },
      true
    );

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (panel.hasAttribute('hidden')) return;
      close();
    });

    function onMqChange() {
      if (narrowOnly && !mq.matches) close();
    }
    if (narrowOnly) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onMqChange);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(onMqChange);
      }
    }

    panel.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () {
        close();
      });
    });
  }

  function init() {
    wire('carHeaderLogoMenuBtn', 'carHeaderLogoMenuPanel', { narrowOnly: true });
    wire('aboutHeaderLogoMenuBtn', 'aboutHeaderLogoMenuPanel', { narrowOnly: true });
    wire('servicesHeaderLogoMenuBtn', 'servicesHeaderLogoMenuPanel', { narrowOnly: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
