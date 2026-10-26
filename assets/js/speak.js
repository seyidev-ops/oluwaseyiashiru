(function () {
  'use strict';
  var f = document.getElementById('sp-form'), msg = document.getElementById('sp-msg');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {}; Array.prototype.forEach.call(f.elements, function (x) { if (x.name) d[x.name] = (x.value || '').trim(); });
    if (d.website) return;
    if (d.name.length < 2 || d.org.length < 2) { msg.textContent = 'Add your name and organisation.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { msg.textContent = 'Add a valid email so we can reply.'; return; }
    var url = (window.OA_ENDPOINT || '').trim(), btn = f.querySelector('button[type=submit]');
    function done() { f.classList.add('sent'); msg.innerHTML = '<b>Thank you, ' + d.name.split(' ')[0] + '.</b> Your request is in. You’ll hear back within two working days.'; }
    function fallback() { msg.innerHTML = 'We couldn’t send that just now. Please message <b>+234 703 313 4979</b> on WhatsApp or email <b>info@oluwaseyiashiru.com</b>.'; btn.disabled = false; }
    if (!url) return fallback();
    btn.disabled = true; msg.textContent = 'Sending…'; d.action = 'booking';
    fetch(url, { method: 'POST', body: JSON.stringify(d) }).then(function (r) { return r.json(); }).then(function (o) { if (o.ok) done(); else { msg.textContent = o.error || 'Please check the form.'; btn.disabled = false; } }).catch(fallback);
  });
})();