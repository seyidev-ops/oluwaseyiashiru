(function () {
  'use strict';
  var tabs = document.querySelectorAll('.dt-tabs button'), forms = { attend: 'f-attend', partner: 'f-partner', circle: 'f-circle' };
  function show(p) {
    tabs.forEach(function (t) { var on = t.dataset.pane === p; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    Object.keys(forms).forEach(function (k) { document.getElementById(forms[k]).hidden = k !== p; });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.pane); }); });
  document.querySelectorAll('[data-tab]').forEach(function (a) { a.addEventListener('click', function () { show(a.dataset.tab); }); });
  if (/circle|apply/.test(location.hash)) show('circle'); else if (/partner|sponsor/.test(location.hash)) show('partner');

  /* the programme line fills as you scroll */
  var steps = document.getElementById('dt-steps');
  function fill() { var r = steps.getBoundingClientRect(), k = Math.max(0, Math.min(1, (innerHeight * .75 - r.top) / r.height)); steps.style.setProperty('--k', k.toFixed(3)); }
  window.addEventListener('scroll', fill, { passive: true }); fill();

  /* send each form to the engine: a row in the Sheet, an email to the owner, a confirmation to the person */
  document.querySelectorAll('.dt-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = { action: 'dothis', type: f.dataset.type }, msg = f.querySelector('.sp-msg'), btn = f.querySelector('button[type=submit]');
      Array.prototype.forEach.call(f.elements, function (x) { if (x.name) d[x.name] = x.type === 'checkbox' ? x.checked : (x.value || '').trim(); });
      if (d.website) return;
      if ((d.name || '').length < 2) { msg.textContent = 'Add your name.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) { msg.textContent = 'Add a valid email so we can reply.'; return; }
      if (d.type === 'partner' && (d.org || '').length < 2) { msg.textContent = 'Add your organisation.'; return; }
      if (d.type !== 'partner' && !d.consent) { msg.textContent = 'Tick the box to agree to how your answers are used.'; return; }
      var url = (window.OA_ENDPOINT || '').trim();
      function done() { f.classList.add('sent'); msg.innerHTML = { attend: '<b>Request received.</b> Check your email. We’ll let you know when places are confirmed.', partner: '<b>Thank you.</b> We’ll be in touch within two working days.', circle: '<b>Application received.</b> We review every one and will reply by email.' }[d.type]; }
      function fail() { msg.innerHTML = 'We couldn’t send that just now. Please message <b>+234 703 313 4979</b> on WhatsApp.'; btn.disabled = false; }
      if (!url) return fail();
      btn.disabled = true; msg.textContent = 'Sending…';
      fetch(url, { method: 'POST', body: JSON.stringify(d) }).then(function (r) { return r.json(); }).then(function (o) { if (o.ok) done(); else { msg.textContent = o.error || 'Please check the form.'; btn.disabled = false; } }).catch(fail);
    });
  });
})();
