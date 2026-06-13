/* ============================================================
   CinéFree — script.js
   - Bandeau cookies RGPD (Accepter / Refuser / En savoir plus)
   - Google Analytics 4 chargé uniquement après consentement
   - Popup de don (PayPal) : 1 seule fois par utilisateur / 30 jours
   - Menu mobile
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Config ---------- */
  var GA_ID = "G-XXXXXXXXXX"; // <-- remplace par ton vrai ID Google Analytics 4
  var PAYPAL_URL = "https://www.paypal.com/ncp/payment/AMYW5R5Q7LNY4";
  var COOKIE_KEY = "cinefree_cookie_consent";
  var DON_KEY = "cinefree_don_popup";
  var DON_DELAY_DAYS = 30;

  /* ============================================================
     1) GOOGLE ANALYTICS 4 (conditionnel)
     ============================================================ */
  function loadGA() {
    if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return; // pas d'ID réel -> on ne charge rien
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  /* ============================================================
     2) BANDEAU COOKIES
     ============================================================ */
  function initCookies() {
    var banner = document.getElementById("cookie-banner");
    if (!banner) return;
    var choice = localStorage.getItem(COOKIE_KEY);

    if (choice === "accepted") { loadGA(); return; }
    if (choice === "refused") { return; }

    // pas encore de choix -> on affiche
    banner.classList.add("show");

    var accept = document.getElementById("cookie-accept");
    var refuse = document.getElementById("cookie-refuse");

    if (accept) accept.addEventListener("click", function () {
      localStorage.setItem(COOKIE_KEY, "accepted");
      banner.classList.remove("show");
      loadGA();
    });
    if (refuse) refuse.addEventListener("click", function () {
      localStorage.setItem(COOKIE_KEY, "refused");
      banner.classList.remove("show");
    });
  }

  /* ============================================================
     3) POPUP DE DON (1x / 30 jours)
     ============================================================ */
  function shouldShowDon() {
    var raw = localStorage.getItem(DON_KEY);
    if (!raw) return true;
    var last = parseInt(raw, 10);
    if (isNaN(last)) return true;
    var elapsed = Date.now() - last;
    return elapsed > DON_DELAY_DAYS * 24 * 60 * 60 * 1000;
  }
  function dismissDon() {
    localStorage.setItem(DON_KEY, String(Date.now()));
  }
  function initDonPopup() {
    var overlay = document.getElementById("don-overlay");
    if (!overlay) return;
    if (!shouldShowDon()) return;

    // léger délai pour ne pas heurter le chargement
    setTimeout(function () { overlay.classList.add("open"); }, 900);

    var btnDon = document.getElementById("don-give");
    var btnClose = document.getElementById("don-close");
    var btnX = document.getElementById("don-x");

    function close() { overlay.classList.remove("open"); dismissDon(); }

    if (btnDon) btnDon.addEventListener("click", function () {
      window.open(PAYPAL_URL, "_blank", "noopener");
      close();
    });
    if (btnClose) btnClose.addEventListener("click", close);
    if (btnX) btnX.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  /* ============================================================
     4) MENU MOBILE
     ============================================================ */
  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    var links = document.getElementById("nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initCookies();
    initDonPopup();
    initNav();
  });

  /* ---------- Service worker (PWA) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
