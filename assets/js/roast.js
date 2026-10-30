(function () {
  'use strict';
  var reduce = window.OA && window.OA.reduce;

  /* ---- the round table: each advisor speaks in a bubble beside their own seat ---- */
  var lines = [['Who pays first, and how much?', 2], ['What does one customer cost you to win?', 3], ['Cut the steps. What is the real constraint?', 1], ['What happens to your cash if this fails?', 6], ['Will they tell their friends about it?', 4], ['Can it run without you holding it together?', 5], ['Is this a one-way door or a two-way door?', 0]];
  var calls = [['7.4', 'Start small, test in 30 days'], ['6.1', 'Not yet: prove demand first'], ['8.2', 'Go, but raise the price'], ['5.3', 'Buy, don’t build']];
  var rt = document.querySelector('.rt'), seats = document.querySelectorAll('.rt-seat'), bub = document.getElementById('rt-bubble'), i = 0, c = 0;
  function place(s) {
    var R = rt.getBoundingClientRect(), r = s.getBoundingClientRect();
    var cx = r.left + r.width / 2 - R.left, cy = r.top + r.height / 2 - R.top, above = cy < R.height * 0.55;
    var bw = bub.offsetWidth, x = Math.max(bw / 2 - 10, Math.min(R.width - bw / 2 + 10, cx));
    bub.style.left = x + 'px';
    bub.style.top = (above ? r.top - R.top - 12 : r.bottom - R.top + 12) + 'px';
    bub.classList.toggle('below', !above);
    bub.style.setProperty('--tail', (cx - x + bw / 2) + 'px');
  }
  if (rt && seats.length && !reduce) setInterval(function () {
    var L = lines[i % lines.length], s = seats[L[1]]; i++;
    seats.forEach(function (x) { x.classList.remove('talk'); }); s.classList.add('talk');
    bub.classList.remove('in'); bub.textContent = L[0]; place(s); void bub.offsetWidth; bub.classList.add('in');
    if (i % 4 === 0) { c++; var k = calls[c % calls.length]; document.getElementById('rt-n').textContent = k[0]; document.getElementById('rt-call').textContent = k[1]; var t = document.querySelector('.rt-table'); t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
  }, 2600);

  /* ---- the deck: swipe through the advisors; the one in the middle comes alive and talks ---- */
  var track = document.getElementById('dk-track'); if (!track) return;
  var cards = Array.prototype.slice.call(track.children), dots = document.getElementById('dk-dots'), cur = -1, talkT = 0, autoT = 0, userAt = 0;
  cards.forEach(function (_, k) { var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Advisor ' + (k + 1)); d.addEventListener('click', function () { userAt = Date.now(); go(k); }); dots.appendChild(d); });
  function go(k) { var cd = cards[(k + cards.length) % cards.length]; track.scrollTo({ left: cd.offsetLeft - (track.clientWidth - cd.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' }); }
  function nearest() { var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9; cards.forEach(function (cd, k) { var d = Math.abs(cd.offsetLeft + cd.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } }); return best; }
  function setActive(k) {
    if (k === cur) return; cur = k;
    cards.forEach(function (cd, j) { cd.classList.toggle('on', j === k); cd.dataset.shape = 'base'; });
    Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('on', j === k); });
    clearInterval(talkT); if (reduce) return;
    var cd = cards[k], seq = ['open', 'mid', 'base', 'open', 'base', 'mid', 'open', 'base', 'base', 'blink', 'base', 'base'], n = 0;
    talkT = setInterval(function () { cd.dataset.shape = seq[n++ % seq.length]; }, 140);
  }
  var raf = 0; track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; setActive(nearest()); }); }, { passive: true });
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) { track.addEventListener(ev, function () { userAt = Date.now(); }, { passive: true }); });
  document.querySelector('.dk-arrow.prev').addEventListener('click', function () { userAt = Date.now(); go(nearest() - 1); });
  document.querySelector('.dk-arrow.next').addEventListener('click', function () { userAt = Date.now(); go(nearest() + 1); });
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(nearest() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(nearest() - 1); } });
  cards.forEach(function (cd, k) { cd.addEventListener('click', function () { userAt = Date.now(); go(k); }); });
  setActive(0);
  if (!reduce) autoT = setInterval(function () { if (Date.now() - userAt > 7000 && document.visibilityState === 'visible') go(nearest() + 1); }, 3600);
})();
