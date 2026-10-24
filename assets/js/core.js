/* Shared: theme (day / night orbit toggle) + the living knowledge field */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Theme: day, night, or auto (follows the device) ---------------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var MODES = ['light', 'dark', 'system'];
  var NAMES = { light: 'Day', dark: 'Night', system: 'Auto' };
  var mode = store('oa-theme'); if (MODES.indexOf(mode) < 0) mode = 'system';
  function resolved() { return mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode; }
  function applyTheme() {
    var t = resolved();
    root.setAttribute('data-theme', t);
    root.classList.toggle('is-dark', t === 'dark');
    root.classList.toggle('is-auto', mode === 'system');
    var next = MODES[(MODES.indexOf(mode) + 1) % 3];
    document.querySelectorAll('.orbit-toggle').forEach(function (b) {
      b.setAttribute('aria-label', 'Theme: ' + NAMES[mode] + '. Switch to ' + NAMES[next] + (next === 'system' ? ' (match your device)' : ''));
      var l = b.querySelector('.toggle-label');
      if (l) l.textContent = NAMES[mode] + (mode === 'system' ? ' · matches your device' : '') + ' → ' + NAMES[next];
    });
    document.dispatchEvent(new CustomEvent('oa-theme'));
  }
  if (mq.addEventListener) mq.addEventListener('change', function () { if (mode === 'system') applyTheme(); });
  applyTheme();

  var TOGGLE_SVG =
    '<span class="toggle-label" aria-hidden="true"></span>' +
    '<svg viewBox="0 0 44 44" aria-hidden="true">' +
      '<defs><mask id="oa-sun-mask"><rect x="0" y="0" width="44" height="44" fill="#fff"/><circle class="bite" cx="22" cy="22" r="7" fill="#000"/></mask></defs>' +
      '<g class="rays"><path d="M22 6v3M22 35v3M6 22h3M35 22h3M10.7 10.7l2.1 2.1M31.2 31.2l2.1 2.1M10.7 33.3l2.1-2.1M31.2 12.8l2.1-2.1"/></g>' +
      '<circle class="ring" cx="22" cy="22" r="19" stroke-dasharray="2 4"/>' +
      '<circle class="sun" cx="22" cy="22" r="8" mask="url(#oa-sun-mask)"/>' +
      '<path class="auto-half" d="M22 14a8 8 0 0 1 0 16z"/>' +
      '<circle class="moonlet" cx="41" cy="22" r="2.4"/>' +
    '</svg>';

  function mountToggles() {
    document.querySelectorAll('[data-orbit-toggle]').forEach(function (b) {
      b.classList.add('orbit-toggle');
      b.type = 'button';
      b.innerHTML = TOGGLE_SVG;
      b.addEventListener('click', function () {
        mode = MODES[(MODES.indexOf(mode) + 1) % 3];
        store('oa-theme', mode); applyTheme();
        b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
      });
    });
    applyTheme();
  }

  /* ---------------- Mobile menu ---------------- */
  function mountMenu() {
    var btn = document.querySelector('.menu-btn'), nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
    });
  }

  /* ---------------- Inner pages: threads of order (calm lines that bend toward you) ---------------- */
  function Threads(canvas) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, raf = 0, colors = {};
    var lines = [], N = 0;
    function readColors() {
      var cs = getComputedStyle(root);
      colors.line = cs.getPropertyValue('--thread').trim() || 'rgba(212,162,76,.3)';
      colors.dot = cs.getPropertyValue('--gold').trim() || '#D4A24C';
      colors.ink = cs.getPropertyValue('--thread-ink').trim() || 'rgba(20,33,61,.12)';
    }
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = W < 700 ? 6 : 9;
      lines = [];
      for (var i = 0; i < N; i++) {
        lines.push({ y: H * (i + 1) / (N + 1), amp: 18 + (i % 3) * 14, len: 260 + (i % 4) * 90, sp: 0.18 + (i % 5) * 0.05, ph: i * 1.3,
          gold: i % 3 === 1, dots: [Math.random(), Math.random() * 0.5 + 0.5].map(function (p) { return { p: p, v: 0.025 + Math.random() * 0.03 }; }) });
      }
    }
    function yAt(L, x, t) {
      var y = L.y + Math.sin(x / L.len * Math.PI * 2 + t * L.sp + L.ph) * L.amp + Math.sin(x / (L.len * 2.3) + t * 0.11 + L.ph) * L.amp * 0.6;
      if (pointer.active) {
        var dx = x - pointer.x, dy = pointer.y - y, g = Math.exp(-(dx * dx) / (2 * 120 * 120));
        if (Math.abs(dy) < 220) y += dy * 0.45 * g * (1 - Math.abs(dy) / 220);
      }
      return y;
    }
    function draw(now) {
      var t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      lines.forEach(function (L) {
        ctx.beginPath();
        for (var x = -20; x <= W + 20; x += 14) { var y = yAt(L, x, t); if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.strokeStyle = L.gold ? colors.line : colors.ink; ctx.lineWidth = L.gold ? 0.9 : 0.7; ctx.stroke();
        L.dots.forEach(function (d) {
          if (!reduce) { d.p += d.v * 0.016; if (d.p > 1.05) d.p = -0.05; }
          var x = d.p * W, y = yAt(L, x, t);
          ctx.beginPath(); ctx.arc(x, y, L.gold ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fillStyle = colors.dot; ctx.globalAlpha = L.gold ? 0.55 : 0.3; ctx.fill(); ctx.globalAlpha = 1;
        });
      });
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw); else raf = 0;
    }
    readColors(); size();
    window.addEventListener('resize', function () { size(); if (reduce) draw(0); });
    document.addEventListener('oa-theme', function () { readColors(); if (reduce) draw(0); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !raf && !reduce) raf = requestAnimationFrame(draw); });
    raf = requestAnimationFrame(draw);
  }

  /* ---------------- Knowledge from every field ---------------- */
  var KNOWLEDGE = [
    ['Academics', 'How to solve quadratic equations'], ['English', 'When to use “its” and “it’s”'],
    ['Idiom', 'Break a leg: what it really means'], ['Photoshop', 'Remove a background in 2 minutes'],
    ['Business', 'How to turn that idea into money'], ['Language', 'How to translate this into French'],
    ['Money', 'How to save 10% of every salary'], ['AI', 'How to get ChatGPT to do real work'],
    ['Career', 'A CV that actually gets read'], ['Faith', 'How to pray when words won’t come'],
    ['Parenting', 'Fractions with a pizza'], ['Excel', 'VLOOKUP without the headache'],
    ['Idiom', 'The ball is in your court'], ['Science', 'Newton’s three laws, simply'],
    ['Marketing', 'How to sell on WhatsApp'], ['Design', 'Canva in ten minutes'],
    ['Speaking', 'Public speaking without fear'], ['Tech', 'Python for absolute beginners'],
    ['Business', 'How to price your product'], ['Farming', 'Start a small poultry farm'],
    ['Study', 'How to revise for exams'], ['English', 'Active or passive voice?'],
    ['Faith', 'Read the Bible in a year'], ['Career', 'Answering “tell me about yourself”'],
    ['Video', 'Start a YouTube channel'], ['Photography', 'The rule of thirds'],
    ['Chemistry', 'Balancing chemical equations'], ['Money', 'Build an emergency fund'],
    ['Idiom', 'Bite the bullet'], ['Writing', 'Write a business plan'],
    ['Time', 'Plan your week in 15 minutes'], ['AI', 'Write a prompt that works first time'],
    ['Music', 'Learn three chords on guitar'], ['Language', 'Spanish greetings in a day'],
    ['Remote work', 'Land your first remote job'], ['Leadership', 'Run a meeting people value'],
    ['Academics', 'Percentages in your head'], ['Cooking', 'Bake bread at home'],
    ['Business', 'Register a business in Nigeria'], ['Design', 'Choose colours that match'],
    ['Health', 'Build a 20-minute morning routine'], ['Tech', 'Build a website in a weekend'],
    ['Negotiation', 'How to ask for a raise'], ['Idiom', 'Once in a blue moon'],
    ['Social media', 'Grow your first 1,000 followers'], ['Faith', 'Give with a plan, not pressure'],
    ['Excel', 'Make a budget that balances'], ['Writing', 'Write an email people answer']
  ];

  function shuffle(a, seed) {
    var s = seed || 7, r = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------------- The field: fragments that drift or orbit, and run from you ---------------- */
  var pointer = { x: -9999, y: -9999, active: false, t: 0 };
  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.t = performance.now(); }, { passive: true });
  window.addEventListener('pointerdown', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.t = performance.now(); }, { passive: true });
  window.addEventListener('pointerleave', function () { pointer.active = false; });
  document.addEventListener('pointerout', function (e) { if (!e.relatedTarget) pointer.active = false; });

  function Field(container, opts) {
    this.c = container; this.o = opts || {};
    this.mode = this.o.mode || 'drift';
    this.frags = []; this.running = false; this.raf = 0; this.last = 0; this.panic = 0;
    this.build();
  }
  Field.prototype.build = function () {
    var self = this, W = window.innerWidth;
    var n = typeof this.o.count === 'function' ? this.o.count(W) : (this.o.count || 14);
    var items = shuffle(KNOWLEDGE, this.o.seed || 11).slice(0, n);
    this.c.innerHTML = '';
    this.frags = items.map(function (it, i) {
      var el = document.createElement('span');
      el.className = 'frag';
      el.setAttribute('aria-hidden', 'true');
      var tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = it[0];
      el.appendChild(tag); el.appendChild(document.createTextNode(it[1]));
      self.c.appendChild(el);
      var f = { el: el, i: i, dx: 0, dy: 0, vx: 0, vy: 0, w: 0, h: 0, x: 0, y: 0, alpha: 1 };
      el.addEventListener('pointerenter', function () { self.kick(f, 9); });
      el.addEventListener('pointerdown', function () { self.kick(f, 16); });
      return f;
    });
    this.layout();
  };
  /* Size of the area the field lives in (the container, not the whole window) */
  Field.prototype.box = function () { var r = this.c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width || window.innerWidth, h: r.height || window.innerHeight }; };
  Field.prototype.localCenter = function (B) {
    if (!this.o.center) return { x: B.w / 2, y: B.h / 2 };
    var c = this.o.center(); return { x: c.x - B.x, y: c.y - B.y };
  };
  /* Orbit mode: evenly spaced rings. Every ring turns as one, so the spacing never bunches up. */
  Field.prototype.layout = function () {
    var B = this.box(), W = B.w, H = B.h, n = this.frags.length;
    var rings = W < 700 ? 3 : 4, perRing = Math.ceil(n / rings);
    var inner = this.o.inner ? this.o.inner() : Math.min(W, H) * 0.22;
    var s = 3, r = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    this.frags.forEach(function (f, i) {
      f.w = f.el.offsetWidth; f.h = f.el.offsetHeight;
      var ring = i % rings, slot = Math.floor(i / rings);
      var k = (ring + 1) / rings;                       // 0..1, inner to outer
      f.ring = ring;
      f.theta = slot / perRing * Math.PI * 2 + ring * 0.7;
      f.rx = inner + 40 + (W / 2 - inner - 40) * (0.15 + 0.85 * k) - f.w * 0.15;
      f.ry = inner * 0.75 + 20 + (H / 2 - inner * 0.75 - 30) * (0.2 + 0.8 * k);
      f.omega = (0.07 - ring * 0.01) * (ring % 2 ? -1 : 1);
      f.tilt = r() * Math.PI * 2;
      f.wob = 4 + r() * 6; f.wsp = 0.4 + r() * 0.5;
      f.bx = r() * W; f.by = r() * H;
      f.sx = (r() - 0.5) * 14; f.sy = (r() - 0.5) * 10;
    });
  };
  Field.prototype.kick = function (f, power) {
    var B = this.box(), px = pointer.x - B.x, py = pointer.y - B.y;
    var cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    var ax = cx - px, ay = cy - py, d = Math.sqrt(ax * ax + ay * ay) || 1;
    if (pointer.x < -999) { ax = Math.random() - 0.5; ay = Math.random() - 0.5; d = Math.sqrt(ax * ax + ay * ay) || 1; }
    f.vx += ax / d * power * 60; f.vy += ay / d * power * 60;
    this.panic = Math.min(1, this.panic + 0.25);
  };
  Field.prototype.step = function (now) {
    var self = this;
    if (!this.running) { this.raf = 0; return; }
    var dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    var t = now / 1000, B = this.box(), W = B.w, H = B.h;
    var center = this.localCenter(B);
    var px = pointer.x - B.x, py = pointer.y - B.y;
    var R = this.o.flee || (W < 700 ? 110 : 160);
    var pActive = pointer.active && (now - pointer.t < 2500 || !matchMedia('(hover: none)').matches);
    this.panic *= 0.985;
    var speed = (1 + this.panic * 2.5) * (this.o.speedMul ? this.o.speedMul() : 1);

    this.frags.forEach(function (f) {
      var bx, by, depth = 1, e = 0;
      if (self.mode === 'orbit' || self.mode === 'collapse') {
        f.theta += f.omega * dt * speed;
        bx = center.x + Math.cos(f.theta) * f.rx - f.w / 2;
        by = center.y + Math.sin(f.theta) * f.ry + Math.sin(t * f.wsp + f.tilt) * f.wob - f.h / 2;
        depth = 0.5 + 0.5 * Math.sin(f.theta);
      } else {
        f.bx += f.sx * dt * speed; f.by += f.sy * dt * speed;
        if (f.bx < -f.w - 40) f.bx = W + 20; if (f.bx > W + 40) f.bx = -f.w - 20;
        if (f.by < -60) f.by = H + 20; if (f.by > H + 60) f.by = -40;
        bx = f.bx + Math.sin(t * 0.3 + f.i) * 12; by = f.by + Math.cos(t * 0.25 + f.i) * 10;
      }
      if (pActive) {
        var cx = bx + f.dx + f.w / 2, cy = by + f.dy + f.h / 2;
        var ax = cx - px, ay = cy - py, d = Math.sqrt(ax * ax + ay * ay);
        if (d < R && d > 0.1) { var force = (1 - d / R) * 2600; f.vx += ax / d * force * dt; f.vy += ay / d * force * dt; }
      }
      f.vx += -f.dx * 3.2 * dt; f.vy += -f.dy * 3.2 * dt;
      f.vx *= Math.pow(0.12, dt); f.vy *= Math.pow(0.12, dt);
      f.dx += f.vx * dt; f.dy += f.vy * dt;
      if (self.mode === 'collapse') {
        f.k = Math.min(1, (f.k || 0) + dt * 1.8);
        e = f.k * f.k;
        bx = bx + (center.x - f.w / 2 - bx) * e; by = by + (center.y - f.h / 2 - by) * e;
        f.alpha = 1 - e;
      }
      f.x = bx + f.dx; f.y = by + f.dy;
      var sc = self.mode === 'drift' ? 1 : (0.84 + depth * 0.22) * (1 - e * 0.7);
      f.el.style.transform = 'translate3d(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
      if (self.mode !== 'drift') {
        f.el.style.opacity = ((0.5 + depth * 0.5) * f.alpha).toFixed(3);
        f.el.style.zIndex = depth > 0.55 ? 6 : 2;
      }
    });
    if (this.o.onTick) this.o.onTick(t, dt);
    this.raf = requestAnimationFrame(this.step.bind(this));
  };
  Field.prototype.start = function () {
    if (reduce) { this.still(); return; }
    this.running = true; if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(this.step.bind(this)); }
  };
  Field.prototype.stop = function () { this.running = false; };
  Field.prototype.still = function () {
    var B = this.box(), self = this, center = this.localCenter(B);
    this.frags.forEach(function (f) {
      var x = self.mode === 'orbit' ? center.x + Math.cos(f.theta) * f.rx - f.w / 2 : f.bx;
      var y = self.mode === 'orbit' ? center.y + Math.sin(f.theta) * f.ry - f.h / 2 : f.by;
      f.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
  };
  Field.prototype.collapse = function () { this.mode = 'collapse'; this.frags.forEach(function (f) { f.k = 0; }); };

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { (window.OA.fields || []).forEach(function (f) { f.layout(); if (reduce) f.still(); }); }, 200);
  });
  document.addEventListener('visibilitychange', function () {
    (window.OA.fields || []).forEach(function (f) { if (document.hidden) f.stop(); else if (f.mode !== 'collapse') f.start(); });
  });

  window.OA = {
    reduce: reduce, store: store, Field: Field, fields: [], KNOWLEDGE: KNOWLEDGE,
    field: function (el, o) { var f = new Field(el, o); this.fields.push(f); return f; }
  };

  function ready() {
    mountToggles(); mountMenu();
    var th = document.querySelector('canvas.threads'); if (th && th.getContext) Threads(th);
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
