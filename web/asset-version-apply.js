(function () {
  function installGlobalPaintGuard() {
    var root = document.documentElement;
    if (!root) return;
    root.classList.add("mango-page-paint-guard");

    var style = document.createElement("style");
    style.setAttribute("data-mango-page-paint-guard", "1");
    style.textContent =
      "html.mango-page-paint-guard{background:#0a0b0f;}" +
      "html.mango-page-paint-guard body{opacity:0!important;visibility:hidden!important;background:#0a0b0f!important;}" +
      "html.mango-page-paint-ready body{opacity:1!important;visibility:visible!important;transition:opacity .16s ease;}" +
      ".mango-page-nav-mask{position:fixed;inset:0;background:#0a0b0f;opacity:0;visibility:hidden;pointer-events:none;z-index:2147483647;transition:opacity .12s ease;}" +
      ".mango-page-nav-mask.is-visible{opacity:1;visibility:visible;}";
    (document.head || root).appendChild(style);

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      root.classList.remove("mango-page-paint-guard");
      root.classList.add("mango-page-paint-ready");
    }

    function samePathWithoutHash(targetHref) {
      try {
        var t = new URL(targetHref, location.href);
        return t.origin === location.origin && t.pathname === location.pathname && t.search === location.search;
      } catch (e) {
        return false;
      }
    }

    function isHtmlLikeNavigation(targetHref) {
      try {
        var u = new URL(targetHref, location.href);
        if (u.origin !== location.origin) return false;
        var p = String(u.pathname || "").toLowerCase();
        if (!p || p === "/") return true;
        if (p.endsWith(".html")) return true;
        if (p.endsWith("/")) return true;
        return p.indexOf(".") === -1;
      } catch (e) {
        return false;
      }
    }

    var navMask = null;
    function ensureNavMask() {
      if (navMask) return navMask;
      navMask = document.createElement("div");
      navMask.className = "mango-page-nav-mask";
      navMask.setAttribute("aria-hidden", "true");
      (document.body || root).appendChild(navMask);
      return navMask;
    }

    function showNavMask() {
      var m = ensureNavMask();
      requestAnimationFrame(function () {
        m.classList.add("is-visible");
      });
    }

    window.addEventListener("load", function () {
      requestAnimationFrame(function () {
        reveal();
      });
    });
    window.addEventListener("pageshow", function () {
      reveal();
    });
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        if (a.hasAttribute("download")) return;
        if (a.target && String(a.target).toLowerCase() === "_blank") return;
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var href = a.getAttribute("href") || "";
        if (!href || href.charAt(0) === "#") return;
        if (samePathWithoutHash(href)) return;
        if (!isHtmlLikeNavigation(href)) return;
        showNavMask();
      },
      true
    );
    setTimeout(reveal, 2200);
  }

  installGlobalPaintGuard();

  var version = String(window.__MANGO_ASSET_VERSION__ || "").trim();
  if (!version) return;

  function isLocalAssetUrl(raw) {
    var s = String(raw || "").trim();
    if (!s) return false;
    var low = s.toLowerCase();
    if (
      low.indexOf("http://") === 0 ||
      low.indexOf("https://") === 0 ||
      low.indexOf("//") === 0 ||
      low.indexOf("data:") === 0 ||
      low.indexOf("javascript:") === 0 ||
      low.indexOf("mailto:") === 0 ||
      low.indexOf("tel:") === 0 ||
      low.indexOf("#") === 0
    ) {
      return false;
    }
    return /\.((css)|(js)|(html))([?#].*)?$/i.test(s);
  }

  function withVersion(raw) {
    if (!isLocalAssetUrl(raw)) return raw;
    try {
      var u = new URL(raw, location.href);
      u.searchParams.set("v", version);
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return raw;
    }
  }

  function patchAttr(el, attrName) {
    if (!el || !el.getAttribute) return;
    var val = el.getAttribute(attrName);
    if (!val || !isLocalAssetUrl(val)) return;
    var next = withVersion(val);
    if (next && next !== val) {
      el.setAttribute(attrName, next);
    }
  }

  function patchAll() {
    document.querySelectorAll("link[href]").forEach(function (el) {
      patchAttr(el, "href");
    });
    document.querySelectorAll("script[src]").forEach(function (el) {
      patchAttr(el, "src");
    });
    document.querySelectorAll("a[href]").forEach(function (el) {
      patchAttr(el, "href");
    });
  }

  patchAll();

  if (typeof MutationObserver !== "undefined") {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (!m || !m.addedNodes) return;
        Array.prototype.forEach.call(m.addedNodes, function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches) {
            if (node.matches("link[href]")) patchAttr(node, "href");
            if (node.matches("script[src]")) patchAttr(node, "src");
            if (node.matches("a[href]")) patchAttr(node, "href");
          }
          if (node.querySelectorAll) {
            node.querySelectorAll("link[href]").forEach(function (el) {
              patchAttr(el, "href");
            });
            node.querySelectorAll("script[src]").forEach(function (el) {
              patchAttr(el, "src");
            });
            node.querySelectorAll("a[href]").forEach(function (el) {
              patchAttr(el, "href");
            });
          }
        });
      });
    });
    mo.observe(document.documentElement || document, { childList: true, subtree: true });
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      patchAttr(a, "href");
    },
    true
  );
})();
