/* ============================================================
   CinéFree — script.js
   - Menu mobile
   - Bandeau cookies RGPD (localStorage) + GA4 conditionnel
   - Popup de don (localStorage, 1 fois / 30 jours)
   ============================================================ */
(function () {
  "use strict";

  /* -------- ID Google Analytics : remplace par le tien -------- */
  var GA_ID = "G-XXXXXXXXXX";

  /* ---------------- Menu mobile ---------------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  /* ---------------- Google Analytics (chargé seulement si consenti) ---------------- */
  function loadAnalytics() {
    if (!GA_ID || GA_ID.indexOf("XXXX") !== -1) return; // pas d'ID réel -> on ne charge rien
    if (window.__ga_loaded) return;
    window.__ga_loaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  /* ---------------- Bandeau cookies RGPD ---------------- */
  var banner = document.getElementById("cookie-banner");
  var COOKIE_KEY = "cf_cookie_consent";
  var consent = null;
  try { consent = localStorage.getItem(COOKIE_KEY); } catch (e) {}

  if (consent === "accepted") {
    loadAnalytics();
  } else if (consent !== "refused" && banner) {
    banner.classList.add("show");
  }

  function setConsent(value) {
    try { localStorage.setItem(COOKIE_KEY, value); } catch (e) {}
    if (banner) banner.classList.remove("show");
    if (value === "accepted") loadAnalytics();
  }
  var accept = document.getElementById("cookie-accept");
  var refuse = document.getElementById("cookie-refuse");
  if (accept) accept.addEventListener("click", function () { setConsent("accepted"); });
  if (refuse) refuse.addEventListener("click", function () { setConsent("refused"); });

  /* ---------------- Popup de don (1x / 30 jours) ---------------- */
  var modal = document.getElementById("donate-modal");
  if (modal) {
    var DON_KEY = "cf_donate_seen";
    var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    var last = 0;
    try { last = parseInt(localStorage.getItem(DON_KEY) || "0", 10); } catch (e) {}

    var shouldShow = !last || (Date.now() - last) > THIRTY_DAYS;

    function dismiss() {
      modal.classList.remove("show");
      try { localStorage.setItem(DON_KEY, String(Date.now())); } catch (e) {}
    }

    if (shouldShow) {
      setTimeout(function () { modal.classList.add("show"); }, 1200);
    }

    var closeBtn = modal.querySelector(".m-close");
    var laterBtn = document.getElementById("donate-close");
    var giveBtn = document.getElementById("donate-give");

    if (closeBtn) closeBtn.addEventListener("click", dismiss);
    if (laterBtn) laterBtn.addEventListener("click", dismiss);
    if (giveBtn) giveBtn.addEventListener("click", dismiss); // le lien s'ouvre dans un nouvel onglet, on mémorise le clic
    modal.addEventListener("click", function (e) {
      if (e.target === modal) dismiss();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("show")) dismiss();
    });
  }

  /* ---------------- Année footer auto ---------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

/* ============================================================
   Catalogue dynamique — Internet Archive (JSONP, sans clé)
   Remplit les rangées avec de vrais films du domaine public,
   triés par popularité. S'exécute seulement si #rails existe.
   ============================================================ */
(function () {
  var mount = document.getElementById("rails");
  if (!mount) return;

  // Définition des rangées : titre + requête + tri
  var RAILS = [
    { t: "Les plus regardés",        q: 'mediatype:(movies) AND collection:(feature_films)', s: "downloads desc" },
    { t: "Classiques (1900–1950)",   q: 'mediatype:(movies) AND collection:(feature_films) AND year:[1900 TO 1950]', s: "downloads desc" },
    { t: "Comédie",                  q: 'mediatype:(movies) AND collection:(feature_films) AND subject:(comedy)', s: "downloads desc" },
    { t: "Horreur & fantastique",    q: 'mediatype:(movies) AND collection:(feature_films) AND subject:(horror)', s: "downloads desc" },
    { t: "Documentaires",            q: 'mediatype:(movies) AND collection:(prelinger)', s: "downloads desc" },
    { t: "Séries & télévision",      q: 'mediatype:(movies) AND collection:(television)', s: "downloads desc" },
    { t: "Théâtre & adaptations",    q: 'mediatype:(movies) AND (subject:(theatre) OR subject:(theater) OR title:(shakespeare))', s: "downloads desc" },
    { t: "Animation",                q: 'mediatype:(movies) AND collection:(animationandcartoons)', s: "downloads desc" }
  ];

  var ROWS = 14, cbN = 0;

  function iaSearch(query, sort, cb) {
    var name = "iacb_" + (cbN++);
    var done = false;
    var s = document.createElement("script");
    window[name] = function (data) {
      done = true;
      var docs = (data && data.response && data.response.docs) ? data.response.docs : [];
      cleanup(); cb(docs);
    };
    function cleanup() {
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }
    s.onerror = function () { if (!done) { cleanup(); cb([]); } };
    s.src = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(query) +
            "&fl[]=identifier&fl[]=title&fl[]=year" +
            "&sort[]=" + encodeURIComponent(sort) +
            "&rows=" + ROWS + "&page=1&output=json&callback=" + name;
    document.head.appendChild(s);
    setTimeout(function () { if (!done) { cleanup(); cb([]); } }, 9000);
  }

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cardHTML(doc) {
    var id = doc.identifier;
    var title = Array.isArray(doc.title) ? doc.title[0] : (doc.title || id);
    var year = doc.year ? String(doc.year).slice(0, 4) : "";
    var img = "https://archive.org/services/img/" + encodeURIComponent(id);
    var href = "https://archive.org/details/" + encodeURIComponent(id);
    return '<a class="rail-card" href="' + href + '" target="_blank" rel="noopener">' +
             '<div class="poster">' +
               '<img src="' + img + '" alt="Affiche : ' + esc(title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.poster\').classList.add(\'noimg\')">' +
               '<div class="grad"></div>' +
               '<div class="play"><span><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span></div>' +
               (year ? '<div class="cap"><span class="yr">' + esc(year) + '</span></div>' : '') +
             '</div>' +
             '<div class="rc-title">' + esc(title) + '</div>' +
           '</a>';
  }

  function skeletons(n) {
    var h = "";
    for (var i = 0; i < n; i++) h += '<div class="rail-skel"><div class="sk"></div></div>';
    return h;
  }

  RAILS.forEach(function (row) {
    var sec = document.createElement("section");
    sec.className = "rail";
    sec.innerHTML =
      '<div class="rail-head"><h3>' + esc(row.t) + '</h3><span class="count"></span></div>' +
      '<div class="rail-track">' + skeletons(8) + '</div>';
    mount.appendChild(sec);

    var track = sec.querySelector(".rail-track");
    var count = sec.querySelector(".count");

    iaSearch(row.q, row.s, function (docs) {
      docs = docs.filter(function (d) { return d && d.identifier; });
      if (!docs.length) { sec.style.display = "none"; return; }
      track.innerHTML = docs.map(cardHTML).join("");
      count.textContent = docs.length + " titres";
    });
  });
})();
