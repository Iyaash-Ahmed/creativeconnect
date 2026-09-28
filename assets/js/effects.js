/*
 * CreativeConnect — visual effects (styling layer only).
 *  - First-visit preloader (once per browser session, so it doesn't reappear
 *    on internal navigation across this multi-page site)
 *  - Hero animated background + floating shapes
 *  - Hero cursor-follow glow (pointer devices only)
 *  - Subtle hero parallax
 * Everything degrades gracefully on touch devices and prefers-reduced-motion.
 * Scroll-reveal is already handled by main.js (IntersectionObserver on [data-reveal]).
 */
(function () {
  "use strict";

  var mm = window.matchMedia ? window.matchMedia.bind(window) : null;
  var reduce = mm ? mm("(prefers-reduced-motion: reduce)").matches : false;
  var fine = mm ? mm("(hover: hover) and (pointer: fine)").matches : false;

  // ---- Theme (dark/light): applied before paint to avoid a flash ----
  var savedTheme = null;
  try { savedTheme = localStorage.getItem("cc_theme"); } catch (e) {}
  var theme = savedTheme || (mm && mm("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme);

  // ---- Preloader: show once per session (skips on internal navigation) ----
  try {
    if (!sessionStorage.getItem("cc_seen")) {
      var pre = document.createElement("div");
      pre.className = "cc-preloader";
      // Inline base styles so it covers the page even before enhance.css loads.
      pre.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;" +
        "align-items:center;justify-content:center;background:#0b0c0f;";
      pre.innerHTML =
        '<img class="cc-preloader__logo" src="assets/img/logo.svg" alt="" width="84" height="84">' +
        '<span class="cc-preloader__word">CreativeConnect</span>';
      (document.body || document.documentElement).appendChild(pre);

      var removed = false;
      var hide = function () {
        if (removed) return;
        removed = true;
        sessionStorage.setItem("cc_seen", "1");
        pre.classList.add("is-hidden");
        setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 650);
      };
      // Fade out shortly after the page finishes loading, with a safety cap.
      window.addEventListener("load", function () { setTimeout(hide, 350); });
      setTimeout(hide, 3500);
    }
  } catch (e) { /* sessionStorage unavailable — skip preloader */ }

  // ---- Hero effects ----
  function initHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    initHeroSlides(hero);

    if (!reduce) {
      var aurora = document.createElement("div");
      aurora.className = "hero__aurora";
      var shapes = document.createElement("div");
      shapes.className = "hero__shapes";
      shapes.innerHTML =
        '<span class="hero__shape hero__shape--1"></span>' +
        '<span class="hero__shape hero__shape--2"></span>' +
        '<span class="hero__shape hero__shape--3"></span>' +
        '<span class="hero__shape hero__shape--4"></span>';
      hero.insertBefore(shapes, hero.firstChild);
      hero.insertBefore(aurora, hero.firstChild);
    }

    // Cursor-follow glow — pointer-capable devices only (no dead state on touch)
    if (fine && !reduce) {
      var glow = document.createElement("div");
      glow.className = "hero__glow";
      hero.appendChild(glow);
      var gx = 0, gy = 0, gRaf = null;
      hero.addEventListener("pointerenter", function () { hero.classList.add("is-pointer"); });
      hero.addEventListener("pointerleave", function () { hero.classList.remove("is-pointer"); });
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        gx = e.clientX - r.left;
        gy = e.clientY - r.top;
        if (!gRaf) {
          gRaf = requestAnimationFrame(function () {
            glow.style.transform = "translate(" + gx + "px," + gy + "px)";
            gRaf = null;
          });
        }
      });
    }

    // Subtle parallax on the hero image (transform only — no layout thrash)
    if (!reduce) {
      var media = hero.querySelector(".hero__media");
      if (media) {
        var pRaf = null;
        window.addEventListener("scroll", function () {
          if (pRaf) return;
          pRaf = requestAnimationFrame(function () {
            var y = window.scrollY || window.pageYOffset || 0;
            if (y < window.innerHeight) {
              media.style.transform = "translate3d(0," + (y * 0.15).toFixed(1) + "px,0) scale(1.06)";
            }
            pRaf = null;
          });
        }, { passive: true });
      }
    }
  }

  // ---- Hero image slideshow (ported from the robotics site's Swiper, CSP-safe) ----
  function initHeroSlides(hero) {
    var slides = hero.querySelectorAll(".hero__slide");
    if (slides.length < 2) return;
    var dotsWrap = hero.querySelector(".hero__dots");
    var i = 0;
    var dots = [];
    if (dotsWrap) {
      Array.prototype.forEach.call(slides, function (_s, idx) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show slide " + (idx + 1));
        if (idx === 0) b.className = "is-active";
        b.addEventListener("click", function () { go(idx); restart(); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }
    function go(n) {
      slides[i].classList.remove("is-active");
      if (dots[i]) dots[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active");
      if (dots[i]) dots[i].classList.add("is-active");
    }
    var timer = null;
    function start() { if (!reduce) timer = setInterval(function () { go(i + 1); }, 4000); }
    function restart() { if (timer) clearInterval(timer); start(); }
    start();
  }

  // ---- Card tilt on hover (ported from tilt.js; vanilla, no jQuery) ----
  function initTilt() {
    if (!fine || reduce) return;
    var SEL = ".package-card, .showcase-item";
    var active = null, raf = null, pend = null;
    function apply() {
      raf = null;
      if (!pend || !active) return;
      var el = pend.el, r = el.getBoundingClientRect();
      var px = (pend.x - r.left) / r.width;
      var py = (pend.y - r.top) / r.height;
      var max = 8;
      var rx = (max / 2 - py * max).toFixed(2);
      var ry = (px * max - max / 2).toFixed(2);
      el.style.transform = "perspective(700px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    }
    function reset(el) { el.removeAttribute("data-tilting"); el.style.transform = ""; }
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest ? e.target.closest(SEL) : null;
      if (el !== active) {
        if (active) reset(active);
        active = el;
        if (el) el.setAttribute("data-tilting", "");
      }
      if (!el) return;
      pend = { el: el, x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { if (active) { reset(active); active = null; } });
    window.addEventListener("blur", function () { if (active) { reset(active); active = null; } });
  }

  // ---- Animated number counters (ported from the robotics .data count-up) ----
  function initCounters() {
    var section = document.querySelector(".cc-stats");
    if (!section) return;
    var nums = section.querySelectorAll(".num[data-val]");
    var done = false;
    function run() {
      if (done) return;
      done = true;
      Array.prototype.forEach.call(nums, function (el) {
        var max = parseInt(el.getAttribute("data-val"), 10) || 0;
        if (reduce) { el.textContent = max; return; }
        var dur = 1800, step = 20;
        var inc = Math.max(1, Math.ceil(max / (dur / step)));
        var cur = 0;
        var t = setInterval(function () {
          cur += inc;
          if (cur >= max) { cur = max; clearInterval(t); }
          el.textContent = cur;
        }, step);
      });
    }
    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); obs.disconnect(); } });
      }, { threshold: 0.3 });
      obs.observe(section);
    } else {
      run();
    }
  }

  // ---- Lamp dark/light toggle (hanging bulb; injected so it's on every page) ----
  function initLamp() {
    if (document.getElementById("cc-lamp")) return;
    var BULB =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.5h6c0-1.2.4-1.9 1-2.5A6 6 0 0 0 12 3z"/></svg>';
    var lamp = document.createElement("button");
    lamp.id = "cc-lamp";
    lamp.className = "cc-lamp";
    lamp.type = "button";
    lamp.setAttribute("aria-label", "Toggle light and dark mode");
    lamp.innerHTML = '<span class="cc-lamp__cord"></span><span class="cc-lamp__bulb">' + BULB + "</span>";
    function sync() {
      lamp.setAttribute("aria-pressed", document.documentElement.getAttribute("data-theme") === "light" ? "true" : "false");
    }
    sync();
    lamp.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("cc_theme", next); } catch (e) {}
      sync();
      lamp.classList.remove("is-pull");
      void lamp.offsetWidth; // restart the pull animation
      lamp.classList.add("is-pull");
    });
    document.body.appendChild(lamp);
  }

  // ---- Fire lantern = the dark/light theme toggle (real lamp photos) ----
  //   Lantern LIT  = dark mode (it glows in the dark)
  //   Blown OUT    = light mode (daylight — no lantern needed)
  function initLantern() {
    if (document.getElementById("cc-lantern")) return;
    var el = document.createElement("button");
    el.id = "cc-lantern";
    el.className = "lantern";
    el.type = "button";
    el.innerHTML =
      '<span class="lantern__chain"></span>' +
      '<span class="lantern__lamp">' +
        '<span class="lantern__glow"></span>' +
        '<img class="lantern__img lantern__img--off" src="assets/img/lantern-off.png" alt="" width="76" height="114" decoding="async">' +
        '<img class="lantern__img lantern__img--lit" src="assets/img/lantern-lit.png" alt="" width="76" height="114" decoding="async">' +
        '<span class="lantern__smoke"></span>' +
      "</span>";
    document.body.appendChild(el);

    var litImg = el.querySelector(".lantern__img--lit");
    var glow = el.querySelector(".lantern__glow");
    var timer = null;
    var lit = document.documentElement.getAttribute("data-theme") !== "light"; // dark => lit

    function label() {
      el.setAttribute("aria-pressed", lit ? "true" : "false");
      el.setAttribute(
        "aria-label",
        lit
          ? "Dark mode on. Click to blow out the lantern and switch to light mode."
          : "Light mode on. Click to relight the lantern and switch to dark mode."
      );
    }
    function setTheme(mode) {
      document.documentElement.setAttribute("data-theme", mode);
      try { localStorage.setItem("cc_theme", mode); } catch (e) {}
    }
    // Organic flicker: waver the glow + the lit photo's brightness.
    function flicker() {
      glow.style.opacity = (0.55 + Math.random() * 0.35).toFixed(2);
      litImg.style.filter = "brightness(" + (0.93 + Math.random() * 0.15).toFixed(3) +
        ") drop-shadow(0 8px 12px rgba(0,0,0,.5))";
    }
    function startFlicker() { if (reduce) return; stopFlicker(); timer = setInterval(flicker, 120); }
    function stopFlicker() { if (timer) { clearInterval(timer); timer = null; } }

    function blow() {   // -> light mode
      lit = false; setTheme("light"); label();
      stopFlicker();
      el.classList.remove("is-lit");
      glow.style.opacity = "0";
      litImg.style.filter = "";
      if (!reduce) { el.classList.remove("is-smoking"); void el.offsetWidth; el.classList.add("is-smoking"); }
    }
    function ignite() { // -> dark mode
      lit = true; setTheme("dark"); label();
      el.classList.remove("is-smoking");
      el.classList.add("is-lit");
      glow.style.opacity = "0.8";
      startFlicker();
    }

    el.addEventListener("click", function () { lit ? blow() : ignite(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopFlicker();
      else if (lit && !reduce) startFlicker();
    });

    // Initial state reflects the current theme (no blow/relight animation).
    if (lit) { el.classList.add("is-lit"); glow.style.opacity = "0.8"; if (!reduce) startFlicker(); }
    else { el.classList.remove("is-lit"); glow.style.opacity = "0"; }
    label();
  }

  // ---- Navigation bar: scroll progress, shrink-on-scroll, active-link spy ----
  function initNavExtras() {
    var header = document.querySelector(".site-header");
    var bar = document.createElement("div");
    bar.id = "cc-progress";
    document.body.appendChild(bar);

    var raf = null;
    function onScroll() {
      var doc = document.documentElement;
      var y = window.scrollY || doc.scrollTop || 0;
      if (header) header.classList.toggle("is-scrolled", y > 8);
      var max = doc.scrollHeight - doc.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? (y / max).toFixed(4) : 0) + ")";
    }
    window.addEventListener("scroll", function () {
      if (!raf) raf = requestAnimationFrame(function () { onScroll(); raf = null; });
    }, { passive: true });
    onScroll();

    // Active-section highlight (only matches sections that exist on this page)
    var links = Array.prototype.slice.call(document.querySelectorAll('.primary-nav a[href*="#"]'));
    if (links.length && "IntersectionObserver" in window) {
      var map = {};
      links.forEach(function (a) {
        var id = (a.getAttribute("href") || "").split("#")[1];
        if (id && document.getElementById(id)) map[id] = a;
      });
      var ids = Object.keys(map);
      if (ids.length) {
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              links.forEach(function (a) { a.classList.remove("is-active"); });
              map[e.target.id].classList.add("is-active");
            }
          });
        }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
        ids.forEach(function (id) { spy.observe(document.getElementById(id)); });
      }
    }
  }

  function boot() { initHero(); initTilt(); initCounters(); initLantern(); initNavExtras(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
