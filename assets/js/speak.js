(function () {
  'use strict';
  var reduce = window.OA && window.OA.reduce;

  /* the audience word changes: staff, students, team, congregation… */
  var who = document.getElementById('sp-who'), words = ['staff', 'students', 'team', 'delegates', 'leaders', 'congregation'], wi = 0;
  if (!reduce) setInterval(function () {
    who.classList.add('out');
    setTimeout(function () { wi = (wi + 1) % words.length; who.textContent = words[wi]; who.classList.remove('out'); }, 350);
  }, 2600);

  /* the room: seats light up one by one as each person gets their step */
  var seats = document.getElementById('sp-seats'), N = window.innerWidth < 640 ? 72 : 120, lit = 0, timer = 0;
  document.getElementById('sp-total').textContent = N;
  for (var i = 0; i < N; i++) { var s = document.createElement('i'); s.style.setProperty('--d', (Math.random() * 6).toFixed(2) + 's'); seats.appendChild(s); }
  var order = Array.prototype.slice.call(seats.children).sort(function () { return Math.random() - .5; });
  function light() {
    if (lit >= N) { setTimeout(function () { order.forEach(function (x) { x.classList.remove('on'); }); lit = 0; document.getElementById('sp-n').textContent = 0; timer = setTimeout(light, 1200); }, 3500); return; }
    order[lit].classList.add('on'); lit++; document.getElementById('sp-n').textContent = lit;
    timer = setTimeout(light, reduce ? 0 : 45);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !timer) light(); }); }, { threshold: .3 }).observe(seats);
  else light();

  /* session cards turn over to show what people leave with */
  document.querySelectorAll('.sp-card').forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('flip'); }); });

  /* how a session runs: the line fills as you scroll */
  var steps = document.getElementById('sp-steps');
  function fill() { var r = steps.getBoundingClientRect(), k = Math.max(0, Math.min(1, (innerHeight * .8 - r.top) / (r.height + innerHeight * .3))); steps.style.setProperty('--k', k.toFixed(3)); }
  window.addEventListener('scroll', fill, { passive: true }); fill();

  /* the request ticket fills in as they type */
  function bind(id, out, dflt) { var f = document.getElementById(id), o = document.getElementById(out); function u() { o.textContent = (f.value || '').trim() || dflt; o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop'); } f.addEventListener('input', u); f.addEventListener('change', u); }
  bind('f-event', 't-event', 'Your event'); bind('f-org', 't-org', 'Your organisation'); bind('f-date', 't-date', 'Date to confirm');
  bind('f-where', 't-where', 'In person'); bind('f-topic', 't-topic', 'From hearing to doing'); bind('f-size', 't-size', 'Under 50');

  var f = document.getElementById('sp-form'), msg = document.getElementById('sp-msg');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {}; Array.prototype.forEach.call(f.elements, function (x) { if (x.name) d[x.name] = (x.value || '').trim(); });
    if (d.website) return;
    if (d.name.length < 2 || d.org.length < 2) { msg.textContent = 'Add your name and organisation.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { msg.textContent = 'Add a valid email so we can reply.'; return; }
    var url = (window.OA_ENDPOINT || '').trim(), btn = f.querySelector('button[type=submit]');
    function done() { window.oaTrack && oaTrack('Schedule', { content_name: 'Speaking request' }); f.classList.add('sent'); document.querySelector('.ticket').classList.add('sent'); msg.innerHTML = '<b>Thank you, ' + d.name.split(' ')[0] + '.</b> Your request is in. You’ll hear back within two working days.'; }
    function fallback() { msg.innerHTML = 'We couldn’t send that just now. Please message <b>+234 703 313 4979</b> on WhatsApp or email <b>info@oluwaseyiashiru.com</b>.'; btn.disabled = false; }
    if (!url) return fallback();
    btn.disabled = true; msg.textContent = 'Sending…'; d.action = 'booking';
    fetch(url, { method: 'POST', body: JSON.stringify(d) }).then(function (r) { return r.json(); }).then(function (o) { if (o.ok) done(); else { msg.textContent = o.error || 'Please check the form.'; btn.disabled = false; } }).catch(fallback);
  });
})();