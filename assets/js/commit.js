(function () {
  'use strict';
  var reduce = window.OA.reduce;
  var plan = null;
  try { plan = JSON.parse(localStorage.getItem('oa-plan') || 'null'); } catch (e) {}
  var a = plan && plan.answers;

  /* ---------- Their plan ---------- */
  var title = '', first = '';
  if (a && a.want) {
    title = a.want.trim().replace(/[.!]+$/, ''); title = title.charAt(0).toUpperCase() + title.slice(1);
    document.getElementById('plan-chip').hidden = false;
    document.getElementById('plan-empty').hidden = true;
    document.getElementById('plan-title').textContent = title;
    first = plan.pack && plan.pack.first_step ? 'Your one thing: ' + plan.pack.first_step.action : (a.what ? 'From: “' + a.what.replace(/^Source:\s*/, '').trim() + '”' : '');
    if (plan.pack && plan.pack.title) document.getElementById('plan-title').textContent = plan.pack.title;
    document.getElementById('plan-first').textContent = first;
    document.getElementById('plan-status').textContent = plan.member ? 'Deeper Systems member: your packs open in full.' : plan.unlocked ? 'Full pack unlocked. It is saved on the Start page.' : plan.done ? 'First step done. You reached point B.' : 'First step not ticked yet. The next level works best after it.';
  }

  /* ---------- Where you are on the stairs ---------- */
  var rungs = document.querySelectorAll('#stairs li');
  var here = plan && plan.member ? 3 : plan && (plan.committed || plan.unlocked) ? 2 : 1;
  rungs.forEach(function (li, i) {
    if (i + 1 < here || (i === 0 && plan && plan.done)) li.classList.add('reached');
    if (i + 1 === here) li.classList.add('here');
  });

  /* ---------- Press and hold to commit ---------- */
  var hold = document.getElementById('hold');
  var fill = document.getElementById('h-fill');
  var committed = document.getElementById('committed');
  var C = 2 * Math.PI * 92, DURATION = 1800;
  fill.style.strokeDasharray = C; fill.style.strokeDashoffset = C;
  var t0 = 0, raf = 0, k = 0, done = false;

  function draw() { fill.style.strokeDashoffset = (C * (1 - k)).toFixed(1); }
  function tick(now) {
    if (!t0) t0 = now;
    k = Math.min(1, (now - t0) / DURATION); draw();
    if (k >= 1) return complete();
    raf = requestAnimationFrame(tick);
  }
  function press(e) {
    if (done) return;
    if (e && e.type === 'keydown') { if (e.key !== ' ' && e.key !== 'Enter') return; if (e.repeat) return; e.preventDefault(); }
    hold.classList.add('pressing'); t0 = 0;
    if (reduce) { k = 1; draw(); return complete(); }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function release() {
    if (done) return;
    hold.classList.remove('pressing'); cancelAnimationFrame(raf);
    var start = k, s0 = 0;
    (function back(now) { if (!s0) s0 = now; k = Math.max(0, start - (now - s0) / 400); draw(); if (k > 0 && !done) raf = requestAnimationFrame(back); })(performance.now());
  }
  function complete() {
    done = true; cancelAnimationFrame(raf);
    hold.classList.remove('pressing'); hold.classList.add('complete');
    hold.setAttribute('aria-disabled', 'true');
    document.getElementById('hold-help').textContent = 'You held on.';
    committed.hidden = false;
    document.getElementById('committed-title').focus({ preventScroll: true });
    committed.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    try { var s = JSON.parse(localStorage.getItem('oa-plan') || '{}'); s.committed = true; localStorage.setItem('oa-plan', JSON.stringify(s)); } catch (e) {}
    rungs.forEach(function (li, i) { li.classList.toggle('here', i === 1); if (i === 0) li.classList.add('reached'); });
    document.getElementById('pay').focus({ preventScroll: true });
    if (!reduce && hold.animate) hold.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  hold.addEventListener('pointerdown', function (e) { hold.setPointerCapture && hold.setPointerCapture(e.pointerId); press(e); });
  hold.addEventListener('pointerup', release);
  hold.addEventListener('pointercancel', release);
  hold.addEventListener('keydown', press);
  hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); });
  hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  hold.addEventListener('click', function (e) { e.preventDefault(); });

  /* ---------- Send it ---------- */
  function message() {
    var lines = ['Hello Oluwaseyi, I’m committing to the next level.'];
    if (a) {
      lines.push('', 'What I’m holding: ' + (a.what || '').trim());
      if (a.want) lines.push('What I want: ' + a.want.trim());
      lines.push('First step: ' + (plan.done ? 'done' : 'not yet'));
    }
    return lines.join('\n');
  }
  document.getElementById('wa').addEventListener('click', function () { this.href = 'https://wa.me/2347033134979?text=' + encodeURIComponent(message()); });
  document.getElementById('wa').href = 'https://wa.me/2347033134979?text=' + encodeURIComponent(message());
  document.getElementById('copy-plan').addEventListener('click', function () {
    var msg = document.getElementById('copy-msg'), text = message();
    function fb() { msg.textContent = 'Copy didn’t work here. Send the number above a message instead.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { msg.textContent = 'Plan copied.'; }, fb); else fb();
  });

  if (plan && plan.committed) {
    done = true; k = 1; draw(); hold.classList.add('complete'); committed.hidden = false;
    document.getElementById('hold-help').textContent = 'You already committed. Send your plan if you haven’t yet.';
  }
})();

/* Pay $1: Paystack checkout when connected, otherwise WhatsApp with the pack number */
(function () {
  var plan = null; try { plan = JSON.parse(localStorage.getItem('oa-plan') || 'null'); } catch (e) {}
  var id = plan && plan.packId, pay = document.getElementById('pay'), L = (window.OA_PAY && window.OA_PAY.link) || '';
  var wa = 'https://wa.me/2347033134979?text=' + encodeURIComponent('Hello Oluwaseyi, I want to unlock my full USE Pack for $1.' + (id ? ' My pack number is ' + id + '.' : ''));
  pay.href = L || wa; if (!L) { pay.target = '_blank'; pay.rel = 'noopener'; pay.textContent = 'Unlock for $1 on WhatsApp'; }
  if (plan && (plan.unlocked || plan.member)) { pay.href = 'start.html'; pay.removeAttribute('target'); pay.textContent = 'Open my full pack'; L = ''; }
  pay.addEventListener('click', function (e) {
    if (!L) return;
    if (!id) { e.preventDefault(); document.getElementById('copy-msg').textContent = 'Make your first step on the Start page first, then come back to unlock it.'; return; }
  });
  var monthly = document.querySelector('[data-plan="monthly"]');
  var ML = (window.OA_PAY && window.OA_PAY.monthly) || '';
  if (monthly) { monthly.href = ML || 'https://wa.me/2347033134979?text=' + encodeURIComponent('Hello Oluwaseyi, I want Deeper Systems (10 packs a month).'); if (!ML) { monthly.target = '_blank'; monthly.rel = 'noopener'; } }
})();

/* Back from the $5 monthly checkout (redirect to commit.html?plan=monthly) */
(function () {
  var q = new URLSearchParams(location.search), ref = q.get('reference') || q.get('trxref');
  if (!ref) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  var box = document.createElement('section'); box.className = 'welcome'; box.setAttribute('role', 'status');
  box.innerHTML = '<p class="n-kick">Deeper Systems</p><h2>Confirming your membership…</h2><p class="w-msg"></p>';
  var hero = document.querySelector('.n-hero'); hero.insertAdjacentElement('afterend', box);
  box.scrollIntoView({ block: 'center' });
  var url = (window.OA_ENDPOINT || '').trim(), h = box.querySelector('h2'), p = box.querySelector('.w-msg');
  fetch(url, { method: 'POST', body: JSON.stringify({ action: 'member', reference: ref }) }).then(function (r) { return r.json(); }).then(function (o) {
    if (!o.ok) { h.textContent = 'We couldn’t confirm it yet.'; p.textContent = o.error; return; }
    try { var s = JSON.parse(localStorage.getItem('oa-plan') || '{}'); s.member = o.email || true; localStorage.setItem('oa-plan', JSON.stringify(s)); } catch (e) {}
    h.textContent = 'Welcome to Deeper Systems.'; p.textContent = 'Your month has started. A welcome email is on its way' + (o.email ? ' to ' + o.email : '') + '. Your ten packs a month open in full on the Start page.';
  }).catch(function () { h.textContent = 'We couldn’t reach the engine.'; p.textContent = 'Refresh this page to try again. Your payment is safe.'; });
})();
