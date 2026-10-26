/* Home, second act: scrolling turns the chaos into order, then the page tells the story */
(function () {
  'use strict';
  var act = document.getElementById('act1'), stage = document.getElementById('stage');
  var card = document.getElementById('order-card'), cue = document.getElementById('scroll-cue');
  var reduce = window.OA && window.OA.reduce, raf = 0;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function update() {
    raf = 0;
    var run = act.offsetHeight - window.innerHeight, y = -act.getBoundingClientRect().top;
    var p = run > 0 ? clamp(y / run) : 0;
    var ord = clamp((p - 0.08) / 0.62);
    window.OA_ORDER = reduce ? (ord > .5 ? 1 : 0) : ord;
    stage.style.setProperty('--ord', ord.toFixed(3));
    stage.classList.toggle('ordered', ord > 0.85);
    cue.style.opacity = String(1 - clamp(p / 0.08));
  }
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update); update();

  /* the demo types out its one step when it comes into view */
  var step = document.getElementById('demo-step'), typed = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, ob) {
      es.forEach(function (e) {
        if (!e.isIntersecting || typed) return; typed = true; ob.disconnect();
        var t = step.getAttribute('data-text'), i = 0;
        document.getElementById('demo').classList.add('live');
        if (reduce) { step.textContent = t; return; }
        (function type() { step.textContent = t.slice(0, i); i += 2; if (i <= t.length + 1) setTimeout(type, 22); })();
      });
    }, { threshold: .45 }).observe(document.getElementById('demo'));
  } else step.textContent = step.getAttribute('data-text');

  /* sections rise in as they arrive */
  var acts = document.querySelectorAll('.act');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .15 });
    acts.forEach(function (a) { a.classList.add('pre'); io.observe(a); });
  }
})();
