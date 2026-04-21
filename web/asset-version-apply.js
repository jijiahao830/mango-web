(function () {
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
