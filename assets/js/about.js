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

  /* ---------- The fields revolve around the portrait, each pointing in ---------- */
  var portrait = document.getElementById('portrait'), photo = portrait.querySelector('.p-photo');
  var chips = Array.prototype.slice.call(portrait.querySelectorAll('.p-chip'));
  var lines = document.getElementById('p-lines'), path = document.getElementById('p-path');
  var NS = 'http://www.w3.org/2000/svg', TILT = -16 * Math.PI / 180;
  var ring = document.createElementNS(NS, 'ellipse');
  ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#D4A24C'); ring.setAttribute('stroke-width', '1.2'); ring.setAttribute('stroke-dasharray', '3 7'); ring.setAttribute('opacity', '.7');
  path.appendChild(ring);
  var rays = chips.map(function () {
    var l = document.createElementNS(NS, 'line');
    l.setAttribute('stroke', '#D4A24C'); l.setAttribute('stroke-width', '1.2'); l.setAttribute('stroke-dasharray', '2 5');
    lines.appendChild(l); return l;
  });
  var hoverSlow = 1, t0 = performance.now(), last = t0, angle = 0;
  portrait.addEventListener('pointerenter', function () { hoverSlow = 0.25; });
  portrait.addEventListener('pointerleave', function () { hoverSlow = 1; photo.style.transform = ''; });
  portrait.addEventListener('pointermove', function (e) {
    if (reduce) return;
    var r = portrait.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    photo.style.transform = 'perspective(900px) rotateY(' + (dx * 10).toFixed(2) + 'deg) rotateX(' + (-dy * 10).toFixed(2) + 'deg)';
  });
  function orbit(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    angle += dt * 0.32 * hoverSlow;
    var S = portrait.clientWidth, cx = S / 2, cy = S / 2, rx = S * 0.47, ry = S * 0.2, pr = S * 0.33;
    ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('rx', rx); ring.setAttribute('ry', ry);
    ring.setAttribute('transform', 'rotate(' + (TILT * 180 / Math.PI) + ' ' + cx + ' ' + cy + ')');
    chips.forEach(function (c, i) {
      var th = angle + i * (Math.PI * 2 / chips.length);
      var ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;
      var x = cx + ex * Math.cos(TILT) - ey * Math.sin(TILT), y = cy + ex * Math.sin(TILT) + ey * Math.cos(TILT);
      var depth = (Math.sin(th) + 1) / 2;                 /* 1 = in front of the portrait */
      var sc = 0.82 + depth * 0.26;
      c.style.transform = 'translate(' + (x - c.offsetWidth / 2).toFixed(1) + 'px,' + (y - c.offsetHeight / 2).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
      c.style.zIndex = depth > 0.5 ? 4 : 1;
      c.style.opacity = (0.55 + depth * 0.45).toFixed(2);
      /* each field points in at the portrait */
      var vx = cx - x, vy = cy - y, d = Math.sqrt(vx * vx + vy * vy) || 1;
      var l = rays[i];
      l.setAttribute('x1', (x + vx / d * (c.offsetWidth * sc / 2 + 4)).toFixed(1)); l.setAttribute('y1', (y + vy / d * (c.offsetHeight * sc / 2 + 4)).toFixed(1));
      l.setAttribute('x2', (cx - vx / d * (pr + 10)).toFixed(1)); l.setAttribute('y2', (cy - vy / d * (pr + 10)).toFixed(1));
      var reach = d - pr - 10 - c.offsetWidth * sc / 2;
      l.setAttribute('opacity', reach > 18 ? Math.min(0.85, 0.3 + reach / 120).toFixed(2) : '0');
    });
    if (!reduce) requestAnimationFrame(orbit);
  }
  requestAnimationFrame(orbit);
})();
