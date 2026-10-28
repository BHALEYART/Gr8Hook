// Gr8 Hook — site scripts
(function () {
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  var PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  // Ad showcase slider
  document.querySelectorAll('[data-slider]').forEach(function (slider) {
    var slides = slider.querySelectorAll('.slide');
    var dotsWrap = slider.querySelector('.slider-dots');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = 0, timer = null, DELAY = 6500;
    var dots = [];
    slides.forEach(function (s, n) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'slider-dot';
      d.setAttribute('aria-label', 'Show ad example ' + (n + 1));
      d.addEventListener('click', function () { go(n); restart(); });
      dotsWrap.appendChild(d);
      dots.push(d);
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    var paused = reduce;
    function start() { if (!paused && !timer) timer = setInterval(function () { go(i + 1); }, DELAY); }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }
    slider.querySelector('[data-prev]').addEventListener('click', function () { go(i - 1); restart(); });
    slider.querySelector('[data-next]').addEventListener('click', function () { go(i + 1); restart(); });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', start);
    var toggle = slider.querySelector('[data-toggle]');
    function syncToggle() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      toggle.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
    }
    if (toggle) toggle.addEventListener('click', function () { paused = !paused; if (paused) stop(); else start(); syncToggle(); });
    go(0);
    syncToggle();
    start();
  });

  // Scrolling services strip: pause button
  document.querySelectorAll('[data-strip]').forEach(function (strip) {
    var btn = strip.querySelector('[data-strip-toggle]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var on = strip.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Play scrolling text' : 'Pause scrolling text');
      btn.innerHTML = on ? PLAY_ICON : PAUSE_ICON;
    });
  });

  // Contact form: picking a package checks and highlights the services it includes
  var pick = document.querySelector('[data-package-pick]');
  var checks = document.querySelectorAll('[data-service-checks] input[type="checkbox"]');
  var hint = document.querySelector('[data-package-hint]');
  if (pick && checks.length) {
    var radios = pick.querySelectorAll('input[type="radio"]');
    var applyPackage = function (radio) {
      var included = (radio.getAttribute('data-services') || '').split(' ').filter(Boolean);
      checks.forEach(function (cb) {
        var on = included.indexOf(cb.getAttribute('data-service')) !== -1;
        var label = cb.closest('label');
        if (on) {
          if (!cb.checked) { cb.checked = true; cb.setAttribute('data-auto', ''); }
        } else if (cb.hasAttribute('data-auto')) {
          cb.checked = false; cb.removeAttribute('data-auto');
        }
        label.classList.toggle('is-included', on && cb.checked);
      });
      if (hint) {
        hint.textContent = included.length
          ? radio.value + ' includes the ' + included.length + ' highlighted services below. Add anything else you need.'
          : '';
      }
    };
    radios.forEach(function (r) { r.addEventListener('change', function () { applyPackage(r); }); });
    checks.forEach(function (cb) {
      cb.addEventListener('change', function () {
        cb.removeAttribute('data-auto'); // it's the visitor's choice now
        if (!cb.checked) cb.closest('label').classList.remove('is-included');
      });
    });
    // Pre-check a service from links like /contact/?service=consulting
    var wantedService = (new URLSearchParams(location.search).get('service') || '').toLowerCase();
    checks.forEach(function (cb) { if (wantedService && cb.getAttribute('data-service') === wantedService) cb.checked = true; });
    // Pre-select from links like /contact/?package=pro
    var wanted = (new URLSearchParams(location.search).get('package') || '').toLowerCase();
    radios.forEach(function (r) {
      if (wanted && r.value.toLowerCase() === wanted) { r.checked = true; applyPackage(r); }
    });
  }

  // Meta Pixel conversion events (only if the pixel loaded)
  function track(event) { if (typeof window.fbq === 'function') window.fbq('track', event); }
  var quoteForm = document.getElementById('quote');
  if (quoteForm) quoteForm.addEventListener('submit', function () { track('Lead'); });
  window.addEventListener('message', function (e) {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled') track('Schedule');
  });

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
