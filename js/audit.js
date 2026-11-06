// Free website audit (gr8hook.com/audit): sends the URL to our audit endpoint, renders scores and findings,
// and offers the full report in exchange for contact details (sent to our inbox via FormSubmit).
(function () {
  var main = document.getElementById('main');
  var ENDPOINT = main.getAttribute('data-audit-endpoint');
  var LEAD = main.getAttribute('data-lead-endpoint');
  var LEAD_FALLBACK = main.getAttribute('data-lead-fallback');
  var $ = function (id) { return document.getElementById(id); };
  var form = $('audit-form'), input = $('audit-url'), err = $('audit-error');
  var progress = $('audit-progress'), report = $('audit-report'), lead = $('audit-lead');
  var device = 'mobile', current = null;
  // Live run state: page checks plus Google's mobile and desktop tests, which arrive separately.
  var run = null;

  var ICONS = {
    pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    fail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
  };
  var STATUS_TEXT = { pass: 'Passed', warn: 'Needs attention', fail: 'Problem', info: 'Worth considering' };
  var GROUPS = [
    ['speed', 'Speed & experience'], ['seo', 'Search & visibility'], ['conversion', 'Getting in touch'],
    ['tracking', 'Tracking & measurement'], ['access', 'Accessibility & best practices'], ['security', 'Security']
  ];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var host = function (u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

  // ── Gauges ──
  function rating(n) { return n === null || n === undefined ? ['none', 'Not available'] : n >= 90 ? ['good', 'Good'] : n >= 50 ? ['ok', 'Needs work'] : ['poor', 'Poor']; }
  function gauge(label, n) {
    var r = rating(n), C = 2 * Math.PI * 40, arc = C * 0.75, fill = n === null || n === undefined ? 0 : arc * n / 100;
    return '<div class="gauge gauge--' + r[0] + '" role="img" aria-label="' + label + ': ' + (n === null || n === undefined ? 'not available' : n + ' out of 100, ' + r[1].toLowerCase()) + '">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="g-track" cx="50" cy="50" r="40" stroke-dasharray="' + arc + ' ' + C + '"/>' +
      '<circle class="g-fill" cx="50" cy="50" r="40" stroke-dasharray="' + fill + ' ' + C + '"/></svg>' +
      '<b>' + (n === null || n === undefined ? '–' : n) + '</b><span class="g-label">' + label + '</span><span class="g-rating">' + r[1] + '</span></div>';
  }
  function renderGauges() {
    var sp = run && run.speed[device];
    if (sp && sp.status === 'pending') {
      $('gauges').innerHTML = '<div class="audit-empty audit-pending"><span class="audit-spinner" aria-hidden="true"></span><span>Running Google\u2019s ' + device + ' speed test. Heavier sites can take up to two minutes.</span></div>';
      return;
    }
    if (sp && sp.status === 'error') {
      $('gauges').innerHTML = '<div class="audit-empty"><p>' + esc(sp.error) + ' The checks below still ran.</p><button type="button" class="btn btn--ghost audit-retry" data-retry="' + device + '">Try Google\u2019s ' + device + ' test again</button></div>';
      return;
    }
    if (sp && sp.status === 'done' && sp.data.source === 'field') {
      $('gauges').innerHTML = '<div class="audit-empty audit-field"><p>Google\u2019s lab test couldn\u2019t run on this site (some sites block automated tests), so here\u2019s how fast it loads for <strong>real ' + device + ' visitors</strong> over the last 28 days.</p><ul class="audit-metrics">' +
        sp.data.metrics.map(function (m) { return '<li class="metric metric--' + m.status + '"><span>' + esc(m.label.replace(/ \(real \w+ visitors\)/, '')) + '</span><b>' + esc(m.value) + '</b></li>'; }).join('') + '</ul></div>';
      return;
    }
    var s = current[device];
    $('gauges').innerHTML = s
      ? gauge('Performance', s.performance) + gauge('Accessibility', s.accessibility) + gauge('SEO Basics', s.seo) + gauge('Best Practices', s.bestPractices)
      : '<p class="audit-empty">Google\u2019s ' + device + ' test didn\u2019t finish for this site. The checks below still ran.</p>';
  }
  $('gauges').addEventListener('click', function (e) {
    var b = e.target.closest('[data-retry]');
    if (b && run) runSpeed(b.getAttribute('data-retry'), true);
  });

  // ── Findings ──
  function item(c) {
    return '<li class="finding finding--' + c.status + '"><span class="finding-icon">' + ICONS[c.status] + '<span class="sr-only">' + STATUS_TEXT[c.status] + ': </span></span>' +
      '<div><h4>' + esc(c.title) + '</h4>' + (c.detail ? '<p>' + esc(c.detail) + '</p>' : '') + '</div></li>';
  }
  function render(data, isSample) {
    current = data;
    $('report-site').textContent = host(data.finalUrl || data.url);
    $('report-badge').hidden = !isSample;
    $('lead-site').textContent = host(data.finalUrl || data.url);
    renderGauges();
    $('metrics').innerHTML = (data.metrics || []).map(function (m) {
      return '<li class="metric metric--' + m.status + '"><span>' + esc(m.label) + '</span><b>' + esc(m.value) + '</b></li>';
    }).join('');
    var speed = (data.lighthouseIssues || []).map(function (i) {
      return { group: { Speed: 'speed', SEO: 'seo', Accessibility: 'access' }[i.category] || 'access', status: i.status, title: i.title,
        detail: i.category === 'Speed' ? '' : i.category + ' check from Google Lighthouse.' };
    });
    var all = speed.concat(data.checks || []);
    var order = { fail: 0, warn: 1, info: 2, pass: 3 };
    $('groups').innerHTML = GROUPS.map(function (g) {
      var items = all.filter(function (c) { return c.group === g[0]; }).sort(function (a, b) { return order[a.status] - order[b.status]; });
      if (!items.length) return '';
      var issues = items.filter(function (c) { return c.status === 'fail' || c.status === 'warn'; }).length;
      return '<section class="audit-group"><h3>' + g[1] + ' <span class="audit-count">' + (issues ? issues + ' to fix' : 'Looks good') + '</span></h3><ul>' + items.map(item).join('') + '</ul></section>';
    }).join('');
    $('notes').textContent = (data.notes || []).join(' ');
  }

  // ── Toggle ──
  document.querySelectorAll('[data-device]').forEach(function (b) {
    b.addEventListener('click', function () {
      device = b.getAttribute('data-device');
      document.querySelectorAll('[data-device]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      if (current) renderGauges();
    });
  });

  // ── Run ──
  var STEPS = ['Loading the page…', 'Checking search basics and sitemap…', 'Looking for contact options and forms…', 'Checking for tracking…', 'Putting your report together…'];
  var timer = null;
  function showError(msg) { err.textContent = msg; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); }
  function busy(on, site) {
    form.querySelector('button').disabled = on;
    progress.hidden = !on;
    report.classList.toggle('is-loading', on);
    clearInterval(timer);
    if (on) {
      var i = 0;
      $('progress-site').textContent = site;
      $('progress-step').textContent = STEPS[0];
      timer = setInterval(function () { i = Math.min(i + 1, STEPS.length - 1); $('progress-step').textContent = STEPS[i]; }, 2500);
    }
  }
  // Combine the page checks with whichever speed tests have finished.
  function compose() {
    var m = run.speed.mobile, d = run.speed.desktop, data = Object.assign({}, run.base);
    data.mobile = m.status === 'done' ? m.data.scores : null;
    data.desktop = d.status === 'done' ? d.data.scores : null;
    data.metrics = m.status === 'done' && m.data.source !== 'field' ? m.data.metrics : [];
    data.lighthouseIssues = m.status === 'done' ? m.data.issues : [];
    return data;
  }
  function refresh() { if (run && run.base) render(compose(), false); }
  function post(body) {
    return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }
  function runSpeed(strategy, auto) {
    var mine = run;
    mine.speed[strategy] = { status: 'pending' };
    refresh();
    post({ url: mine.url, strategy: strategy }).then(function (res) {
      if (mine !== run) return;
      // Google's first run on a site often times out and the second succeeds, so retry once automatically.
      var failed = !res.ok || (!res.body.scores && !(res.body.metrics || []).length);
      if (failed && !auto && res.status !== 400 && res.status !== 429) return runSpeed(strategy, true);
      mine.speed[strategy] = failed
        ? { status: 'error', error: res.body.error || 'Google\u2019s test didn\u2019t finish. Try again in a minute.' }
        : { status: 'done', data: res.body, token: res.body.token };
      refresh();
    }).catch(function () {
      if (mine !== run) return;
      mine.speed[strategy] = { status: 'error', error: 'Google\u2019s test couldn\u2019t be reached.' };
      refresh();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true; input.removeAttribute('aria-invalid');
    var url = input.value.trim();
    if (!url || !/^(https?:\/\/)?[^\s\/]+\.[^\s]{2,}/i.test(url)) return showError('Enter your website address, like yourbusiness.com.');
    busy(true, host(/^https?:\/\//i.test(url) ? url : 'https://' + url));
    lead.hidden = true;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    var mine = run = { url: url, base: null, speed: { mobile: { status: 'pending' }, desktop: { status: 'pending' } } };
    // Google's tests run as their own requests, in parallel with the page checks.
    runSpeed('mobile'); runSpeed('desktop');
    post({ url: url })
      .then(function (res) {
        if (mine !== run) return;
        busy(false);
        if (!res.ok || res.body.error) { run = null; return showError(res.body.error || 'Something went wrong. Please try again.'); }
        run.base = res.body;
        refresh();
        lead.hidden = false;
        $('results').focus({ preventScroll: true });
        if (typeof window.fbq === 'function') window.fbq('trackCustom', 'WebsiteAudit');
      })
      .catch(function () {
        if (mine !== run) return;
        busy(false); run = null;
        showError('We couldn\u2019t run the audit right now. Please try again in a minute, or email Sales@Gr8Hook.com and we\u2019ll run it for you.');
      });
  });

  // ── Full report request ──
  // Where this visit came from, for the lead record.
  var params = new URLSearchParams(location.search), source = { source: 'website-audit', referrer: document.referrer || '' };
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { if (params.get(k)) source[k] = params.get(k); });

  $('lead-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, status = $('lead-status');
    var v = {
      name: f.name.value.trim(), business: f.business.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(),
      concern: f.concern.value, concernDetail: f.concernDetail.value.trim(), marketingOptIn: f.marketingOptIn.checked, fax: f.fax.value
    };
    var missing = !v.name ? f.name : !v.business ? f.business : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? f.email : !v.concern ? f.concern : null;
    [f.name, f.business, f.email, f.concern].forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (missing) {
      missing.setAttribute('aria-invalid', 'true');
      status.textContent = 'Please add your name, business, a valid email and your biggest concern.';
      missing.focus();
      return;
    }
    var d = current || {};
    var btn = f.querySelector('button'); btn.disabled = true; status.textContent = 'Sending your report…';
    var done = function (msg) {
      f.reset(); btn.disabled = false; status.textContent = msg;
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
    };
    var fail = function () { btn.disabled = false; status.textContent = 'That didn\u2019t send. Please try again, or email Sales@Gr8Hook.com.'; };
    // Backup route: send the details to our inbox so the lead isn't lost if the report service isn't available.
    var fallback = function () {
      var s = d.mobile || {};
      var issues = (d.checks || []).filter(function (c) { return c.status === 'fail' || c.status === 'warn'; }).map(function (c) { return c.title; })
        .concat((d.lighthouseIssues || []).map(function (i) { return i.title; }));
      return fetch(LEAD_FALLBACK, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Website audit lead: ' + host(d.finalUrl || d.url || ''), _template: 'table',
          name: v.name, business: v.business, email: v.email, phone: v.phone, concern: f.concern.options[f.concern.selectedIndex].text,
          details: v.concernDetail, marketing_opt_in: v.marketingOptIn ? 'Yes' : 'No', website: d.finalUrl || d.url || '',
          mobile_scores: 'Performance ' + s.performance + ' · Accessibility ' + s.accessibility + ' · SEO ' + s.seo + ' · Best practices ' + s.bestPractices,
          issues_found: issues.join('; '), source: [source.utm_source, source.utm_campaign].filter(Boolean).join(' / ') || source.referrer
        })
      }).then(function (r) { return r.json(); }).then(function (j) { if (!j || String(j.success) !== 'true') throw new Error(); });
    };
    var speed = run ? { mobile: run.speed.mobile.token || null, desktop: run.speed.desktop.token || null } : {};
    var payload = Object.assign({}, v, { source: source, speed: speed }, (run && run.base && run.base.token) || {});
    fetch(LEAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok) return done(res.body.emailed
          ? 'Your report is on its way to ' + v.email + '. Check your inbox in a few minutes.'
          : 'Thanks! Your account manager will send your full report within one business day.');
        if (res.body.fallback) return fallback().then(function () { done('Thanks! Your account manager will send your full report within one business day.'); });
        btn.disabled = false; status.textContent = res.body.error || 'That didn\u2019t send. Please try again.';
      })
      .catch(function () { fallback().then(function () { done('Thanks! Your account manager will send your full report within one business day.'); }, fail); });
  });

  // ── Sample report shown before the first run ──
  render({
    url: 'https://example.com', finalUrl: 'https://example.com/',
    mobile: { performance: 48, accessibility: 82, seo: 67, bestPractices: 91 },
    desktop: { performance: 79, accessibility: 82, seo: 67, bestPractices: 91 },
    metrics: [
      { label: 'Main content loads (mobile)', value: '5.8 s', status: 'fail' }, { label: 'First content appears (mobile)', value: '2.9 s', status: 'warn' },
      { label: 'Time page is unresponsive', value: '640 ms', status: 'warn' }, { label: 'Layout shifting', value: '0.04', status: 'pass' }
    ],
    lighthouseIssues: [{ title: 'Images are larger than they need to be', category: 'Speed', status: 'fail' }],
    checks: [
      { group: 'seo', status: 'warn', title: 'Missing page description', detail: 'A meta description wasn\u2019t detected. It\u2019s the summary people read in search results before they click.' },
      { group: 'conversion', status: 'warn', title: 'No click-to-call link found', detail: 'On phones, a tappable number is often the fastest way a customer reaches you.' },
      { group: 'tracking', status: 'warn', title: 'No Google tag detected', detail: 'Without analytics, it\u2019s hard to know where visitors come from or what they do.' },
      { group: 'security', status: 'pass', title: 'HTTPS enabled', detail: 'The website uses an encrypted connection.' }
    ],
    notes: ['Sample results for illustration. Run your own audit above.']
  }, true);

  // Started from the homepage box (or any link with ?url=): fill it in and run right away.
  var startUrl = (new URLSearchParams(location.search).get('url') || '').trim();
  if (startUrl) {
    input.value = startUrl.slice(0, 300);
    if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
  }
})();
