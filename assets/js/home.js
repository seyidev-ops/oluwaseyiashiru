(function () {
  'use strict';
  var OA = window.OA;

  /* the logo writes itself in only once the image has arrived, so the writing is never missed on a slow connection */
  (function () {
    var wm = document.querySelector('.wordmark'); if (!wm) return;
    var started = false;
    function go() { if (started) return; started = true; requestAnimationFrame(function () { wm.classList.add('go'); }); }
    function shown() { var imgs = wm.querySelectorAll('img'); for (var i = 0; i < imgs.length; i++) if (getComputedStyle(imgs[i]).display !== 'none') return imgs[i]; return imgs[0]; }
    function watch() {
      var img = shown();
      if (img.complete && img.naturalWidth) { (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(go); }
      else { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); }
    }
    watch(); setTimeout(go, 4000);
    document.addEventListener('oa-theme', function () { if (!started) watch(); });
  })();
  var core = document.getElementById('core');
  var halo = core.querySelector('.core-halo');
  var hovering = false, leaving = false;

  function coreCenter() {
    var r = core.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }

  function wide() { return window.innerWidth > 760; }
  function ringBox() { var r = document.getElementById('ring'); return r.offsetWidth / 2 + 10; }

  var field = OA.field(document.getElementById('field'), {
    mode: 'orbit', seed: 5,
    count: function (W) { return W < 700 ? 34 : 58; },
    center: coreCenter,
    /* computer: labels keep clear of the icon and its words; phone: they may cross it, as a fading ghost */
    inner: function () { return core.offsetWidth * (wide() ? 0.66 : 0.46); },
    clear: function () { return wide() ? 0 : core.offsetWidth * 0.44; },
    guard: function () { return wide() ? ringBox() : 0; },
    speedMul: function () { return hovering ? 0.3 : 1; },
    order: function () { return window.OA_ORDER || 0; }
  });
  window.OA_FIELD = field;

  /* The portrait leans toward you, and the noise calms as you reach it */
  core.addEventListener('pointerenter', function () { hovering = true; });
  core.addEventListener('pointerleave', function () { hovering = false; halo.style.transform = ''; });
  core.addEventListener('pointermove', function (e) {
    if (OA.reduce) return;
    var c = coreCenter(), dx = (e.clientX - c.x) / c.r, dy = (e.clientY - c.y) / c.r;
    halo.style.transform = 'perspective(700px) rotateY(' + (dx * 10).toFixed(2) + 'deg) rotateX(' + (-dy * 10).toFixed(2) + 'deg) scale(1.03)';
  });

  /* Click the icon: the running stops, everything comes to you */
  core.addEventListener('click', function (e) {
    if (OA.reduce || leaving) return;
    e.preventDefault();
    leaving = true;
    core.classList.add('leaving');
    var ring = document.getElementById('ring'); ring.style.transition = 'opacity .3s'; ring.style.opacity = '0';
    field.collapse();
    var href = core.getAttribute('href');
    setTimeout(function () { window.location.href = href; }, 900);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) window.location.reload(); });

  /* The circling words: the instruction twice, and About standing alone in the middle of the gap */
  var ringPath = document.getElementById('ring-path'), instr = document.getElementById('ring-instr'), about = document.getElementById('ring-about');
  function fitRing() {
    if (!ringPath || !instr || !instr.getComputedTextLength) return;
    var L = ringPath.getTotalLength(), aboutText = about.parentNode;
    var size = 12;
    for (var i = 0; i < 4; i++) {
      instr.style.fontSize = aboutText.style.fontSize = size + 'px';
      var used = instr.getComputedTextLength(), al = aboutText.getComputedTextLength();
      var target = L - al - size * 1.6;                 /* just enough room left for About, with a breath either side */
      size = Math.max(7, Math.min(22, size * target / used));
    }
    instr.style.fontSize = aboutText.style.fontSize = size + 'px';
    used = instr.getComputedTextLength();
    var mid = (used + L) / 2;
    about.setAttribute('startOffset', mid.toFixed(1));
    /* an arrow outside the ring points in at About and travels round with it */
    var ptr = document.getElementById('about-ptr');
    if (ptr) {
      var pt = ringPath.getPointAtLength(mid % L), ux = pt.x - 150, uy = pt.y - 150, ul = Math.sqrt(ux * ux + uy * uy) || 1;
      var R = 138 + size * 1.1 + 24, ang = Math.atan2(uy, ux) * 180 / Math.PI + 180;
      ptr.setAttribute('transform', 'translate(' + (150 + ux / ul * R).toFixed(1) + ',' + (150 + uy / ul * R).toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
    }
  }

  /* the quote stays on one line: shrink to fit; on very narrow screens let it break at the sentence */
  var hq = document.getElementById('hq'), fig = hq && hq.closest('.home-quote');
  function fitQuote() {
    if (!hq) return;
    fig.classList.remove('wrap'); var size = 16; hq.style.fontSize = size + 'px';
    var room = fig.clientWidth;
    while (hq.scrollWidth > room && size > 11) { size -= 0.5; hq.style.fontSize = size + 'px'; }
    if (hq.scrollWidth > room) { fig.classList.add('wrap'); hq.style.fontSize = '12px'; }
  }
  fitQuote(); window.addEventListener('resize', fitQuote);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitQuote);

  var go = function () { fitRing(); field.layout(); field.start(); };
  window.addEventListener('resize', fitRing);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
})();
