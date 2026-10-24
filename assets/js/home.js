(function () {
  'use strict';
  var OA = window.OA;
  var core = document.getElementById('core');
  var halo = core.querySelector('.core-halo');
  var msg = document.getElementById('messenger');
  var hovering = false, leaving = false;

  function coreCenter() {
    var r = core.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, bottom: r.bottom, top: r.top };
  }

  var field = OA.field(document.getElementById('field'), {
    mode: 'orbit', seed: 5,
    count: function (W) { return W < 700 ? 26 : 46; },
    center: coreCenter,
    speedMul: function () { return hovering ? 0.3 : 1; },
    onTick: tickMessage
  });

  /* ---------- The portrait leans toward you, and calms the noise when you reach it ---------- */
  core.addEventListener('pointerenter', function () { hovering = true; });
  core.addEventListener('pointerleave', function () { hovering = false; halo.style.transform = ''; });
  core.addEventListener('pointermove', function (e) {
    if (OA.reduce) return;
    var c = coreCenter(), dx = (e.clientX - c.x) / c.r, dy = (e.clientY - c.y) / c.r;
    halo.style.transform = 'perspective(700px) rotateY(' + (dx * 10).toFixed(2) + 'deg) rotateX(' + (-dy * 10).toFixed(2) + 'deg) scale(1.03)';
  });

  /* ---------- The message that travels from screen to screen ---------- */
  var PHASES = [
    { text: 'The knowledge you don’t apply', dur: 6.8, path: 'rtl', y: 0.17 },
    { text: 'keeps running from you.', dur: 6.8, path: 'ltr', y: 0.82 },
    { text: 'To stop that,', dur: 2.8, path: 'above' },
    { text: 'click the icon.', dur: 5.5, path: 'below', final: true },
    { text: '', dur: 1.4, path: 'rest' }
  ];
  var phase = -1, pStart = 0, msgW = 0, msgH = 0;

  function setPhase(i, t) {
    phase = i % PHASES.length; pStart = t;
    var p = PHASES[phase];
    msg.textContent = p.text;
    msg.classList.toggle('final', !!p.final);
    msgW = msg.offsetWidth; msgH = msg.offsetHeight;
    core.classList.toggle('calling', !!p.final);
  }

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function tickMessage(t) {
    if (leaving) return;
    if (phase < 0) setPhase(0, t);
    var p = PHASES[phase], k = (t - pStart) / p.dur;
    if (k >= 1) { setPhase(phase + 1, t); p = PHASES[phase]; k = 0; }
    var W = window.innerWidth, H = window.innerHeight, x = 0, y = 0, o = 1;
    var c = coreCenter();
    if (p.path === 'rtl' || p.path === 'ltr') {
      var from = p.path === 'rtl' ? W + 30 : -msgW - 30, to = p.path === 'rtl' ? -msgW - 30 : W + 30;
      x = from + (to - from) * k;
      y = H * p.y - msgH / 2 + Math.sin(k * Math.PI * 2.5) * 26;
      if (W < 640) { x = from + (to - from) * k; }
      o = 1;
    } else if (p.path === 'above') {
      x = (W - msgW) / 2;
      y = Math.max(70, c.top - msgH - 28) - (1 - ease(Math.min(1, k * 3))) * 30;
      o = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
    } else if (p.path === 'below') {
      x = (W - msgW) / 2;
      y = c.bottom + 18 + (1 - ease(Math.min(1, k * 3))) * 24;
      o = Math.min(1, k * 4) * (k > 0.88 ? (1 - k) / 0.12 : 1);
    } else { o = 0; }
    msg.style.opacity = o.toFixed(3);
    msg.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }

  /* ---------- Click the icon: the running stops, everything comes to you ---------- */
  core.addEventListener('click', function (e) {
    if (OA.reduce || leaving) return;
    e.preventDefault();
    leaving = true;
    core.classList.remove('calling');
    core.classList.add('leaving');
    msg.style.transition = 'opacity .3s'; msg.style.opacity = '0';
    field.collapse();
    var href = core.getAttribute('href');
    setTimeout(function () { window.location.href = href; }, 900);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { window.location.reload(); }
  });

  if (OA.reduce) {
    msg.textContent = 'The knowledge you don’t apply keeps running from you. To stop that, click the icon.';
    msg.style.whiteSpace = 'normal'; msg.style.textAlign = 'center'; msg.style.fontSize = '1.4rem';
    msg.style.width = Math.min(window.innerWidth - 40, 560) + 'px';
    var c = coreCenter();
    msg.style.transform = 'translate(' + ((window.innerWidth - msg.offsetWidth) / 2) + 'px,' + (c.bottom + 16) + 'px)';
    msg.style.opacity = '1';
    core.classList.add('calling');
  }

  var go = function () { field.layout(); field.start(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
})();
