(function () {
  'use strict';
  var reduce = window.OA.reduce;
  var GLYPHS = 'abcdefghijklmnopqrstuvwxyz';

  /* ---------- The five breaks: the fix scrambles, then settles into order ---------- */
  function scramble(btn) {
    var target = btn.getAttribute('data-fix'), out = btn.querySelector('.brk-text');
    btn.classList.remove('fixed');
    if (reduce) { out.textContent = target; btn.classList.add('fixed'); return; }
    var frame = 0, total = 26;
    (function run() {
      frame++;
      var settled = Math.floor(target.length * frame / total);
      var s = '';
      for (var i = 0; i < target.length; i++) {
        var ch = target[i];
        s += i < settled || ch === ' ' || ch === '.' || ch === ',' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      out.textContent = s;
      if (frame < total) requestAnimationFrame(function () { setTimeout(run, 24); });
      else { out.textContent = target; btn.classList.add('fixed'); }
    })();
  }
  var breaks = document.querySelectorAll('.brk');
  breaks.forEach(function (b) { b.addEventListener('click', function () { scramble(b); }); });

  /* ---------- Things that come alive as they enter the screen ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target.id === 'breaks') breaks.forEach(function (b, i) { setTimeout(function () { scramble(b); }, i * 260); });
        if (e.target.classList.contains('use-letter')) e.target.classList.add('draw');
      });
    }, { threshold: 0.35 });
    io.observe(document.getElementById('breaks'));
    document.querySelectorAll('.use-letter').forEach(function (l) { io.observe(l); });
  } else {
    breaks.forEach(function (b) { b.classList.add('fixed'); });
  }

  /* ---------- The journey line fills as you scroll ---------- */
  var journey = document.getElementById('journey'), fill = document.getElementById('j-fill'), dot = document.getElementById('j-dot');
  var steps = journey.querySelectorAll('.j-steps li');
  function onScroll() {
    var r = journey.getBoundingClientRect(), vh = window.innerHeight;
    var k = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / r.height));
    fill.style.height = (k * 100) + '%';
    dot.style.top = (k * 100) + '%';
    steps.forEach(function (li) {
      var lr = li.getBoundingClientRect();
      li.classList.toggle('lit', lr.top < vh * 0.62);
    });
  }
  if (reduce) { fill.style.height = '100%'; dot.style.top = '100%'; steps.forEach(function (li) { li.classList.add('lit'); }); }
  else { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); onScroll(); }

  /* ---------- The portrait leans toward you ---------- */
  var portrait = document.getElementById('portrait'), img = portrait.querySelector('img');
  if (!reduce) {
    portrait.addEventListener('pointermove', function (e) {
      var r = portrait.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      img.style.transform = 'perspective(900px) rotateY(' + (dx * 8).toFixed(2) + 'deg) rotateX(' + (-dy * 8).toFixed(2) + 'deg)';
    });
    portrait.addEventListener('pointerleave', function () { img.style.transform = ''; });
    img.style.transition = 'transform .4s cubic-bezier(.2,.7,.2,1)';
  }
})();
