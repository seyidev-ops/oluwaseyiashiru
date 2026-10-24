(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Presets: knowledge as heard -> knowledge as usable ---------- */
  var PRESETS = [
    {
      id: 'remote',
      label: 'A remote-jobs webinar',
      source: 'Source: a remote-jobs webinar',
      noise: ['Networking is everything', 'Learn 10 new tools', 'Build a personal brand', 'Upwork or LinkedIn?', 'Get certified first', 'Cold outreach scripts', 'Portfolio sites', 'Optimise your profile', 'Time zones matter', 'Join 20 communities', 'Negotiate your rate'],
      keys: ['Find your niche', 'Use ATS keywords', 'Apply to 100 jobs a week'],
      title: 'Land your first remote interview',
      steps: [
        ['Pick one role you can already do', 'Not ten. One role you have done some version of before.'],
        ['Rewrite your CV in the job’s own words', 'Copy the key phrases from three real job posts for that role.'],
        ['Send five tailored applications this week', 'Five careful ones beat a hundred copied ones.']
      ],
      first: 'List three roles you have already done some version of, and circle one.'
    },
    {
      id: 'sermon',
      label: 'Sunday’s sermon on giving',
      source: 'Source: a sermon on giving',
      noise: ['First fruits', 'Bring it to the storehouse', 'Sow in tears', 'The widow’s mite', 'Seed for the sower', 'Open windows of heaven', 'Bread for the eater', 'Give and it shall be given', 'Generosity is a lifestyle', 'Pressed down, shaken together'],
      keys: ['A cheerful giver', 'Faithful in little', 'Count the cost'],
      title: 'Give with a plan, not pressure',
      steps: [
        ['Decide before the money arrives', '“Each one must do just as he has purposed in his heart” (2 Corinthians 9:7, NASB 1995).'],
        ['Start faithful in little', 'Choose one fixed amount you can keep giving every month.'],
        ['Review it at month-end', 'Write down what you gave and what changed in you.']
      ],
      first: 'Write down the amount you have purposed to give this month.'
    },
    {
      id: 'ai',
      label: 'An AI tutorial you saved',
      source: 'Source: a saved AI tutorial',
      noise: ['Prompt engineering', 'Context windows', 'Chain of thought', 'AI agents', '100 prompts that work', 'Custom assistants', 'Temperature settings', 'Multimodal everything', 'Automate your life', 'The future of work'],
      keys: ['Start with a real task', 'Give it a role', 'Show an example'],
      title: 'Make AI do one real job for you',
      steps: [
        ['Pick one weekly task you dislike', 'A report, a reply, a plan: something you already do.'],
        ['Write one prompt: role, task, example', '“You are my assistant. Draft this. Here is last week’s version.”'],
        ['Reuse it and refine it weekly', 'Save the prompt. Improve one line each time.']
      ],
      first: 'Name the task, then paste one past example of it into your AI tool.'
    },
    {
      id: 'fractions',
      label: 'Your child’s fractions lesson',
      source: 'Source: a primary-school maths lesson',
      noise: ['Numerator', 'Denominator', 'Simplify', 'Common denominator', 'Homework, page 42', 'Mixed numbers', 'Improper fractions', 'Number lines', 'Times tables first', 'Test on Friday'],
      keys: ['Equal parts', 'What is left?', '1/2 = 2/4'],
      title: 'Turn fractions into a kitchen game',
      steps: [
        ['Cut food into equal parts', 'Bread, an orange, a pizza: four equal pieces.'],
        ['Ask what fraction is left', 'After each bite: “How much is left now?”'],
        ['Find two fractions that match', 'Show that two quarters are the same as one half.']
      ],
      first: 'At dinner tonight, cut one item into four and ask what one piece is.'
    }
  ];

  /* ---------- Elements ---------- */
  var stage = document.getElementById('stage');
  var noiseEl = document.getElementById('noise');
  var card = document.getElementById('card');
  var chipsEl = document.getElementById('chips');
  var makeBtn = document.getElementById('make');
  var resetBtn = document.getElementById('reset');
  var dot = document.querySelector('.orbit-dot');

  if (!stage) return;

  var current = 0;
  var frags = [];
  var running = false;
  var visible = true;
  var rafId = 0;
  var pointer = { x: -9999, y: -9999 };
  var t0 = performance.now();

  /* Deterministic pseudo-random so each preset always lays out the same way */
  function rng(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ---------- Chips ---------- */
  PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.tabIndex = i === 0 ? 0 : -1;
    b.textContent = p.label;
    b.addEventListener('click', function () { choose(i); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % PRESETS.length;
      if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + PRESETS.length) % PRESETS.length;
      if (n !== null) { e.preventDefault(); choose(n); chipsEl.children[n].focus(); }
    });
    chipsEl.appendChild(b);
  });

  function choose(i) {
    current = i;
    Array.prototype.forEach.call(chipsEl.children, function (c, j) {
      c.setAttribute('aria-checked', j === i ? 'true' : 'false');
      c.tabIndex = j === i ? 0 : -1;
    });
    showNoise();
  }

  /* ---------- Build the noise ---------- */
  function buildNoise() {
    var p = PRESETS[current];
    noiseEl.innerHTML = '';
    frags = [];
    var limit = stage.clientWidth < 520 ? 5 : (stage.clientWidth < 760 ? 8 : p.noise.length);
    var words = p.noise.slice(0, limit).map(function (w) { return { text: w, key: -1 }; });
    p.keys.forEach(function (w, k) { words.splice(Math.min(words.length, 1 + k * Math.ceil(limit / 3)), 0, { text: w, key: k }); });

    words.forEach(function (w) {
      var s = document.createElement('span');
      s.className = 'frag' + (w.key >= 0 ? ' key' : '');
      s.textContent = w.text;
      noiseEl.appendChild(s);
      frags.push({ el: s, key: w.key, bx: 0, by: 0, px: 0, py: 0, ph: 0, sp: 0, ax: 0, ay: 0, w: 0, h: 0, x: 0, y: 0 });
    });
    layout();
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    var cx = W / 2, cy = H / 2;
    var r = rng(17 + current * 101);
    var n = frags.length;
    var ex = W * (W < 520 ? 0.3 : 0.27), ey = H * 0.31; /* keep the portrait clear */
    frags.forEach(function (f, i) {
      f.w = f.el.offsetWidth; f.h = f.el.offsetHeight;
      var ang = (i / n) * Math.PI * 2 + r() * 0.4;
      var k = 1.15 + r() * 0.35;
      f.bx = cx + Math.cos(ang) * ex * k - f.w / 2;
      f.by = cy + Math.sin(ang) * ey * k - f.h / 2;
      f.ph = r() * Math.PI * 2;
      f.sp = 0.25 + r() * 0.35;
      f.ax = 5 + r() * 9;
      f.ay = 4 + r() * 7;
      f.px = 0; f.py = 0;
    });
    /* Relax: push labels apart, out of the portrait, inside the frame */
    var pad = 10;
    for (var it = 0; it < 160; it++) {
      for (var a = 0; a < n; a++) {
        var A = frags[a];
        for (var b = a + 1; b < n; b++) {
          var B = frags[b];
          var ox = Math.min(A.bx + A.w, B.bx + B.w) + pad - Math.max(A.bx, B.bx);
          var oy = Math.min(A.by + A.h, B.by + B.h) + pad - Math.max(A.by, B.by);
          if (ox > 0 && oy > 0) {
            if (ox < oy) { var sx = (A.bx < B.bx ? -1 : 1) * ox / 2; A.bx += sx; B.bx -= sx; }
            else { var sy = (A.by < B.by ? -1 : 1) * oy / 2; A.by += sy; B.by -= sy; }
          }
        }
        var mx = A.bx + A.w / 2 - cx, my = A.by + A.h / 2 - cy;
        var rx = ex + A.w / 2, ry = ey + A.h / 2;
        var q = (mx * mx) / (rx * rx) + (my * my) / (ry * ry);
        if (q < 1) {
          var s = 1 / Math.sqrt(q || 0.01);
          A.bx = cx + mx * s - A.w / 2; A.by = cy + my * s - A.h / 2;
        }
        var mX = 8 + A.ax, mY = 8 + A.ay;
        A.bx = Math.max(mX, Math.min(W - A.w - mX, A.bx));
        A.by = Math.max(mY, Math.min(H - A.h - mY, A.by));
      }
    }
    frags.forEach(function (f) { place(f, f.bx, f.by); });
  }

  function place(f, x, y) {
    f.x = x; f.y = y;
    f.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }

  /* ---------- Life: drift, pointer push, orbiting dot ---------- */
  function tick(now) {
    if (!running || !visible) { rafId = 0; return; }
    var t = (now - t0) / 1000;
    frags.forEach(function (f) {
      var tx = 0, ty = 0;
      var fx = f.bx + f.w / 2, fy = f.by + f.h / 2;
      var dx = fx - pointer.x, dy = fy - pointer.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 130 && d > 0.1) { var push = (130 - d) * 0.45; tx = dx / d * push; ty = dy / d * push; }
      f.px += (tx - f.px) * 0.08;
      f.py += (ty - f.py) * 0.08;
      place(f, f.bx + Math.sin(t * f.sp + f.ph) * f.ax + f.px, f.by + Math.cos(t * f.sp * 0.8 + f.ph) * f.ay + f.py);
    });
    if (dot) {
      var a = t * 0.5;
      dot.setAttribute('cx', (200 + Math.cos(a) * 188).toFixed(1));
      dot.setAttribute('cy', (200 + Math.sin(a) * 150).toFixed(1));
    }
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    if (reduceMotion) { if (dot) { dot.setAttribute('cx', '388'); dot.setAttribute('cy', '200'); } return; }
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function stop() { running = false; }

  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  stage.addEventListener('pointerleave', function () { pointer.x = -9999; pointer.y = -9999; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && running && !reduceMotion && !rafId) rafId = requestAnimationFrame(tick);
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible && running && !reduceMotion && !rafId) rafId = requestAnimationFrame(tick);
  });

  /* ---------- The transformation ---------- */
  function fillCard() {
    var p = PRESETS[current];
    document.getElementById('card-source').textContent = p.source;
    document.getElementById('card-title').textContent = p.title;
    document.getElementById('card-first').textContent = p.first;
    var ol = document.getElementById('card-steps');
    ol.innerHTML = '';
    p.steps.forEach(function (s) {
      var li = document.createElement('li');
      var div = document.createElement('div');
      var st = document.createElement('strong'); st.textContent = s[0];
      var sp = document.createElement('span'); sp.textContent = s[1];
      div.appendChild(st); div.appendChild(sp); li.appendChild(div); ol.appendChild(li);
    });
  }

  function makeUsable() {
    stop();
    fillCard();
    stage.setAttribute('data-state', 'usable');
    card.hidden = false;
    makeBtn.hidden = true;
    resetBtn.hidden = false;

    if (reduceMotion || !card.animate) {
      noiseEl.style.visibility = 'hidden';
      return;
    }

    var sr = stage.getBoundingClientRect();
    var W = sr.width, H = sr.height;

    card.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 520, delay: 260, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });

    frags.forEach(function (f) {
      if (f.key >= 0) return;
      var cx = f.x + f.w / 2 - W / 2, cy = f.y + f.h / 2 - H / 2;
      var len = Math.sqrt(cx * cx + cy * cy) || 1;
      f.el.animate([
        { transform: f.el.style.transform, opacity: 1, filter: 'blur(0)' },
        { transform: 'translate(' + (f.x + cx / len * 90) + 'px,' + (f.y + cy / len * 90) + 'px)', opacity: 0, filter: 'blur(4px)' }
      ], { duration: 600, easing: 'ease-in', fill: 'forwards' });
    });

    var items = card.querySelectorAll('.card-steps li');
    frags.forEach(function (f) {
      if (f.key < 0) return;
      var li = items[f.key];
      var lr = li.getBoundingClientRect();
      var fx = sr.left + f.x, fy = sr.top + f.y;
      var dx = fx - lr.left, dy = fy - lr.top;
      li.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.7)', opacity: 0.2 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ], { duration: 760, delay: 420 + f.key * 180, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      f.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 380 + f.key * 180, fill: 'forwards' });
    });

    var first = card.querySelector('.card-first');
    first.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: 1150, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    var sign = card.querySelector('.card-sign');
    sign.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1450, fill: 'backwards' });
  }

  function showNoise() {
    card.hidden = true;
    stage.setAttribute('data-state', 'noise');
    makeBtn.hidden = false;
    resetBtn.hidden = true;
    noiseEl.style.visibility = '';
    buildNoise();
    start();
  }

  makeBtn.addEventListener('click', makeUsable);
  resetBtn.addEventListener('click', function () { showNoise(); makeBtn.focus(); });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (stage.getAttribute('data-state') === 'noise') layout(); }, 150);
  });

  showNoise();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (stage.getAttribute('data-state') === 'noise') layout(); });

  /* ---------- Header and navigation ---------- */
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () { header.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

  var toggle = document.querySelector('.nav-toggle');
  var list = document.getElementById('nav-list');
  toggle.addEventListener('click', function () {
    var open = list.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Close' : 'Menu';
  });
  list.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' && list.classList.contains('open')) toggle.click();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Bring your knowledge ---------- */
  var form = document.getElementById('bring-form');
  var what = document.getElementById('f-what');
  var err = document.getElementById('f-what-err');
  var via = 'whatsapp';
  form.querySelectorAll('button[type="submit"]').forEach(function (b) {
    b.addEventListener('click', function () { via = b.getAttribute('data-via'); });
  });
  what.addEventListener('input', function () { err.hidden = true; what.parentNode.classList.remove('invalid'); what.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!what.value.trim()) {
      err.hidden = false;
      what.parentNode.classList.add('invalid');
      what.setAttribute('aria-invalid', 'true');
      what.focus();
      return;
    }
    var name = document.getElementById('f-name').value.trim();
    var link = document.getElementById('f-link').value.trim();
    var goal = document.getElementById('f-goal').value.trim();
    var lines = ['Hello Oluwaseyi, ' + (name ? 'my name is ' + name + '. ' : '') + 'I want to make this usable:', '', 'What I learned: ' + what.value.trim()];
    if (link) lines.push('Link: ' + link);
    if (goal) lines.push('What I want to be able to do: ' + goal);
    var body = lines.join('\n');
    if (via === 'email') {
      window.location.href = 'mailto:info@oluwaseyiashiru.com?subject=' + encodeURIComponent('Make this usable') + '&body=' + encodeURIComponent(body);
    } else {
      window.open('https://wa.me/2347033134979?text=' + encodeURIComponent(body), '_blank', 'noopener');
    }
  });
})();
