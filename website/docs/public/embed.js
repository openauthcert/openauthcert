/*!
 * OpenAuthCert embed widget — https://openauthcert.org/embed.js
 *
 * Renders a vendor's live status badge that links to their entry in the
 * registry. Drop this on any page:
 *
 *   <div data-openauthcert
 *        data-vendor="acme-cloud"
 *        data-application="cloud-sso"
 *        data-version="1.0.0"></div>
 *   <script src="https://openauthcert.org/embed.js" async></script>
 *
 * Or with a single slug: <div data-openauthcert data-badge="acme-cloud/cloud-sso/1.0.0"></div>
 *
 * The badge image is generated/refreshed on openauthcert.org, so it flips to
 * "expired" or "revoked" on its own. Clicking it opens the registry filtered to
 * that vendor + application. No tracking, no cookies, no external calls beyond
 * loading the badge image from openauthcert.org.
 *
 * URL logic mirrors `@openauthcert/core` (statusSvgPath / registryDeepLink).
 */
(function () {
  "use strict";

  var DEFAULT_SITE = "https://openauthcert.org";

  // Resolve the site origin from this script's own src so the widget works on
  // staging/preview hosts too; fall back to the production domain.
  function siteOrigin() {
    try {
      var cur = document.currentScript;
      if (cur && cur.src) return new URL(cur.src).origin;
    } catch (e) {
      /* ignore */
    }
    return DEFAULT_SITE;
  }

  function parseConfig(el) {
    var vendor = el.getAttribute("data-vendor");
    var application = el.getAttribute("data-application");
    var version = el.getAttribute("data-version");
    var badge = el.getAttribute("data-badge");
    if ((!vendor || !application || !version) && badge) {
      var parts = badge.split("/");
      if (parts.length === 3) {
        vendor = vendor || parts[0];
        application = application || parts[1];
        version = version || parts[2];
      }
    }
    if (!vendor || !application || !version) return null;
    return { vendor: vendor, application: application, version: version };
  }

  function urlsFor(cfg, site) {
    var base = (site || DEFAULT_SITE).replace(/\/+$/, "");
    var v = encodeURIComponent(cfg.vendor);
    var a = encodeURIComponent(cfg.application);
    var ver = encodeURIComponent(cfg.version);
    return {
      img: base + "/badges/" + v + "/" + a + "/" + ver + ".svg",
      link: base + "/registry?vendor=" + v + "&app=" + a,
    };
  }

  function render(el, site) {
    if (!el || el.getAttribute("data-openauthcert-rendered") === "1") return;
    var cfg = parseConfig(el);
    if (!cfg) return;
    var urls = urlsFor(cfg, site);

    var a = document.createElement("a");
    a.href = urls.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "openauthcert-badge-link";
    a.setAttribute(
      "aria-label",
      "OpenAuthCert certification status for " +
        cfg.vendor +
        "/" +
        cfg.application +
        " — opens the registry",
    );

    var img = document.createElement("img");
    img.src = urls.img;
    img.alt = "OpenAuthCert: " + cfg.vendor + "/" + cfg.application + " status";
    img.height = 20;
    img.loading = "lazy";
    img.style.verticalAlign = "middle";

    a.appendChild(img);
    el.appendChild(a);
    el.setAttribute("data-openauthcert-rendered", "1");
  }

  function renderAll(root) {
    var site = siteOrigin();
    var nodes = (root || document).querySelectorAll(
      "[data-openauthcert], .openauthcert-badge",
    );
    for (var i = 0; i < nodes.length; i++) render(nodes[i], site);
  }

  // Public surface (also enables headless testing).
  var api = { render: render, renderAll: renderAll, urlsFor: urlsFor };
  if (typeof globalThis !== "undefined") globalThis.OpenAuthCert = api;

  // Auto-run in the browser only.
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        renderAll();
      });
    } else {
      renderAll();
    }
  }
})();
