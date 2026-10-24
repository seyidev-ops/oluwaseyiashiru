(function () {
  'use strict';
  var OA = window.OA;
  var core = document.getElementById('core');
  var halo = core.querySelector('.core-halo');
  var hovering = false, leaving = false;

  function coreCenter() {
    var r = core.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }

  var field = OA.field(document.getElementById('field'), {
    mode: 'orbit', seed: 5,
    count: function (W) { return W < 700 ? 16 : 32; },
    center: coreCenter,
    inner: function () { return core.offsetWidth * 0.74; },
    clear: function () { return core.offsetWidth * 0.56; },
    speedMul: function () { return hovering ? 0.3 : 1; }
  });

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
    field.collapse();
    var href = core.getAttribute('href');
    setTimeout(function () { window.location.href = href; }, 900);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) window.location.reload(); });

  var go = function () { field.layout(); field.start(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
})();
