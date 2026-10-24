(function () {
  'use strict';
  var OA = window.OA, reduce = OA.reduce;

  /* ---------------- The run-through ---------------- */
  var QUESTIONS = [
    { id: 'type', kind: 'choice', q: 'What do you want to put to use?', opts: [
      ['idea', 'An idea', 'Something I want to start or build'],
      ['learned', 'Something I learned', 'A seminar, sermon, video or AI answer'],
      ['skill', 'A skill I have', 'Something I can already do well'],
      ['goal', 'A goal I keep postponing', 'Something I keep meaning to do']] },
    { id: 'field', kind: 'choice', compact: true, q: 'Which part of life is it about?', opts: [
      ['career', 'Work and career'], ['business', 'Business'], ['money', 'Personal money'], ['tech', 'AI and tech'],
      ['faith', 'Faith'], ['learning', 'School and learning'], ['family', 'Family and relationships'], ['health', 'Health and wellbeing'],
      ['creative', 'Creative work'], ['trades', 'Skills and trades'], ['community', 'Leadership and community'], ['other', 'Something else']] },
    { id: 'what', kind: 'text', q: {
      idea: 'Describe your idea in one sentence.', learned: 'What did you learn, and where?',
      skill: 'What can you do?', goal: 'What is the goal?' },
      ph: { idea: 'A food delivery service for offices near me', learned: 'A webinar on getting remote jobs',
        skill: 'I design flyers in Canva', goal: 'Read one book every month' } },
    { id: 'want', kind: 'line', q: 'What do you want it to do for you?',
      ph: { idea: 'Get my first paying customer', learned: 'Land my first remote interview', skill: 'Earn from it this month', goal: 'Finish the first book' } },
    { id: 'block', kind: 'choice', q: 'What usually stops you?', opts: [
      ['start', 'I don’t know where to start'], ['time', 'I don’t have time'], ['money', 'I don’t have money'],
      ['fear', 'I’m afraid it won’t work'], ['stopped', 'I started before and stopped']] },
    { id: 'time', kind: 'choice', compact: true, q: 'How much time can you give today?', opts: [
      ['15', '15 minutes'], ['30', '30 minutes'], ['60', 'An hour']] }
  ];

  var answers = {}, step = 0;
  var stage = document.getElementById('q-stage');
  var form = document.getElementById('wiz-form');
  var back = document.getElementById('back');
  var next = document.getElementById('next');
  var err = document.getElementById('q-error');
  var count = document.getElementById('wiz-count');
  var arc = document.getElementById('p-arc');
  var dot = document.getElementById('p-dot');
  var CIRC = 2 * Math.PI * 26;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function progress() {
    var k = (step + 1) / QUESTIONS.length;
    arc.style.strokeDasharray = CIRC;
    arc.style.strokeDashoffset = CIRC * (1 - k);
    var a = -Math.PI / 2 + k * Math.PI * 2;
    dot.setAttribute('cx', (30 + Math.cos(a) * 26).toFixed(2));
    dot.setAttribute('cy', (30 + Math.sin(a) * 26).toFixed(2));
    count.textContent = 'Question ' + (step + 1) + ' of ' + QUESTIONS.length;
  }

  function render(dir) {
    var Q = QUESTIONS[step], type = answers.type || 'idea';
    var box = el('fieldset', 'q' + (Q.compact ? ' compact' : ''));
    var legend = el('legend', 'q-title', typeof Q.q === 'string' ? Q.q : Q.q[type]);
    legend.id = 'wiz-q';
    box.appendChild(legend);

    if (Q.kind === 'choice') {
      var list = el('div', 'choices');
      Q.opts.forEach(function (o, i) {
        var lab = el('label', 'choice');
        var inp = document.createElement('input');
        inp.type = 'radio'; inp.name = Q.id; inp.value = o[0]; inp.id = 'q-' + Q.id + '-' + o[0];
        if (answers[Q.id] === o[0]) inp.checked = true;
        var body = el('span', 'choice-body');
        body.appendChild(el('span', 'choice-label', o[1]));
        if (o[2]) body.appendChild(el('span', 'choice-hint', o[2]));
        lab.appendChild(inp); lab.appendChild(body);
        lab.style.setProperty('--i', i);
        inp.addEventListener('change', function () {
          answers[Q.id] = inp.value; hideErr();
          setTimeout(function () { if (QUESTIONS[step] === Q) advance(); }, reduce ? 0 : 380);
        });
        list.appendChild(lab);
      });
      box.appendChild(list);
    } else {
      var id = 'q-' + Q.id;
      var lab2 = el('label', 'visually-hidden', typeof Q.q === 'string' ? Q.q : Q.q[type]); lab2.setAttribute('for', id);
      var input = document.createElement(Q.kind === 'text' ? 'textarea' : 'input');
      input.id = id; input.name = Q.id; input.className = 'q-input';
      if (Q.kind === 'text') input.rows = 3;
      input.placeholder = Q.ph[type];
      input.value = answers[Q.id] || '';
      input.setAttribute('aria-describedby', 'q-error');
      input.addEventListener('input', function () { answers[Q.id] = input.value; hideErr(); });
      box.appendChild(lab2); box.appendChild(input);
      setTimeout(function () { input.focus({ preventScroll: true }); }, reduce ? 0 : 420);
    }

    /* One card at a time: the answered card folds away, the next one opens in its place */
    var olds = Array.prototype.slice.call(stage.querySelectorAll('.q'));
    var fromH = stage.offsetHeight;
    olds.forEach(function (o) { o.classList.add('leaving'); o.style.position = 'absolute'; o.style.left = '0'; o.style.right = '0'; o.style.top = '0'; });
    stage.appendChild(box);
    if (reduce || !box.animate) {
      olds.forEach(function (o) { o.remove(); });
    } else {
      var off = dir < 0 ? 1 : -1;
      olds.forEach(function (o) {
        o.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(' + (off * 24) + 'px) scale(.96)' }],
          { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { o.remove(); };
      });
      box.animate([{ opacity: 0, transform: 'translateY(' + (-off * 28) + 'px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 460, delay: 200, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      var toH = box.offsetHeight;
      if (fromH && toH) stage.animate([{ height: fromH + 'px' }, { height: toH + 'px' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    var wizTop = document.getElementById('wizard').getBoundingClientRect().top;
    if (dir !== 0 && wizTop < 0) window.scrollTo({ top: window.scrollY + wizTop - 90, behavior: reduce ? 'auto' : 'smooth' });
    back.hidden = step === 0;
    next.textContent = step === QUESTIONS.length - 1 ? 'Make it usable' : 'Next';
    next.hidden = Q.kind === 'choice' && step < QUESTIONS.length - 1 && !answers[Q.id];
    if (Q.kind === 'choice' && step === QUESTIONS.length - 1) next.hidden = false;
    progress();
  }

  function hideErr() { err.hidden = true; }
  function showErr(m) { err.textContent = m; err.hidden = false; }

  function valid() {
    var Q = QUESTIONS[step], v = (answers[Q.id] || '').trim();
    if (Q.kind === 'choice' && !v) { showErr('Choose one answer to continue.'); return false; }
    if (Q.kind !== 'choice' && v.length < 3) { showErr('Write a few words so the plan fits you.'); var i = stage.querySelector('.q-input'); if (i) i.focus(); return false; }
    return true;
  }

  function advance() {
    if (!valid()) return;
    if (step < QUESTIONS.length - 1) { step++; render(1); }
    else build(true);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); advance(); });
  back.addEventListener('click', function () { if (step > 0) { step--; hideErr(); render(-1); } });

  /* ---------------- Streamline the entry into a first to-do ---------------- */
  var FIELD = {
    career: { label: 'Work and career', who: 'A recruiter, a hiring manager or a company posting jobs you can do.', make: 'a one-page CV, a portfolio piece or a LinkedIn post' },
    business: { label: 'Business', who: 'A shop, a founder or a customer who has the problem you solve.', make: 'a WhatsApp catalogue, a one-page offer or a sample product' },
    tech: { label: 'AI and tech', who: 'A small business that still does this by hand.', make: 'a simple prototype, a demo video or a form' },
    faith: { label: 'Faith', who: 'Your church, a ministry or a believer who needs this help.', make: 'a short study, a prayer guide or one small group meeting' },
    learning: { label: 'School and learning', who: 'A student, a parent or a school.', make: 'a one-page guide, a short lesson or a practice sheet' },
    creative: { label: 'Creative work', who: 'A brand, an event planner or a friend with a launch coming.', make: 'one finished piece you can share' },
    money: { label: 'Personal money', who: 'Someone who handles money well and could check your plan.', make: 'a simple budget, a savings tracker or a price list' },
    family: { label: 'Family and relationships', who: 'A family member or friend this would help.', make: 'a family plan, a shared routine or one honest conversation' },
    health: { label: 'Health and wellbeing', who: 'A friend who wants the same change and can keep you accountable.', make: 'a weekly routine, a meal plan or a walking schedule' },
    trades: { label: 'Skills and trades', who: 'A shop, workshop or customer near you who needs this work done.', make: 'one finished sample, photos of past work or a price list' },
    community: { label: 'Leadership and community', who: 'A group, church or association that needs this.', make: 'a one-page proposal, a meeting plan or a small first event' },
    other: { label: 'Everyday life', who: 'Someone in your circle who has asked for this before.', make: 'something simple you can show' }
  };
  var TYPE_LABEL = { idea: 'Your idea', learned: 'What you learned', skill: 'Your skill', goal: 'Your goal' };

  function quote(s) { s = s.trim().replace(/\s+/g, ' '); if (s.length > 90) s = s.slice(0, 87).trim() + '…'; return '“' + s + '”'; }
  function cap(s) { s = s.trim().replace(/[.!]+$/, ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function plan(a) {
    var F = FIELD[a.field] || FIELD.other, w = quote(a.what), want = a.want.trim().replace(/[.!]+$/, '');
    var steps = {
      idea: [
        ['Say it in one sentence', 'Who it helps, and how. Start from what you wrote: ' + w + '.'],
        ['Test it with three real people', 'Ask two questions: would you use this, and what would make it better? Spend nothing yet.'],
        ['Build the smallest version in seven days', 'For example, ' + F.make + '.']],
      learned: [
        ['Keep the one point that matters most', 'From ' + w + ', pick the single idea you can use this week.'],
        ['Turn it into one action with a day and time', 'Write: “On [day] at [time], I will …”'],
        ['Do it once, then note what changed', 'One line is enough. That line is your proof.']],
      skill: [
        ['Name one person who needs this now', F.who],
        ['Make one small sample of your work', 'Something they can understand in a minute, based on ' + w + '.'],
        ['Offer it in one clear message', 'Say what you will do, by when, and your price or a free trial.']],
      goal: [
        ['Shrink it to a seven-day milestone', 'What would “' + want + '” look like after one week?'],
        ['Book the time, same time every day', 'Put it in your calendar like an appointment you keep.'],
        ['Tick a box each day you show up', 'Seven ticks, then look back at what moved.']]
    }[a.type];
    var first = {
      idea: { '15': 'Write your idea in one sentence and send it to one person you trust.', '30': 'Write your idea in one sentence, send it to one person you trust, and ask: would you use it, and what would make it better?', '60': 'Write your idea in one sentence and ask three people: would you use it, and what would make it better?' },
      learned: { '15': 'Write down the one point you will use this week, with a day and a time.', '30': 'Write down the one point, with a day and a time, then set a reminder on your phone.', '60': 'Use the one point right now, for the first time, and write one line about what happened.' },
      skill: { '15': 'Write the name of one person or business who needs this skill.', '30': 'Name one person who needs this skill and draft the message you will send them.', '60': 'Make a quick sample of your work and send it to one person with your offer.' },
      goal: { '15': 'Write what one week of progress looks like, in one sentence.', '30': 'Write what one week of progress looks like, then book the same time daily for seven days.', '60': 'Do your first session now, and tick day one.' }
    }[a.type][a.time];
    var note = {
      start: 'You said you don’t know where to start. Your start is the first step below, today. Nothing more.',
      time: 'You said time is the problem. Set a timer for ' + a.time + ' minutes and stop when it rings.',
      money: 'You said money is the problem. Every step here is free: your phone, WhatsApp and what you already have.',
      fear: 'You said you’re afraid it won’t work. Treat this as a test, not a launch. A test can’t fail; it only teaches you.',
      stopped: 'You started before and stopped. This time, go half the size you think. Small is how you keep going.'
    }[a.block];
    return { source: TYPE_LABEL[a.type] + ' · ' + F.label, title: cap(want), steps: steps, first: first, note: note };
  }

  /* ---------------- Show the plan: their words fly in and settle ---------------- */
  var wizard = document.getElementById('wizard');
  var result = document.getElementById('result');
  var forming = document.getElementById('forming');
  var card = document.getElementById('ucard');
  var done = document.getElementById('done');
  var afterDone = document.getElementById('after-done');
  var current = null;

  function save(extra) {
    try { var s = JSON.parse(localStorage.getItem('oa-plan') || '{}'); } catch (e) { s = {}; }
    s.answers = answers; s.saved = new Date().toISOString();
    if (extra) for (var k in extra) s[k] = extra[k];
    try { localStorage.setItem('oa-plan', JSON.stringify(s)); } catch (e) {}
  }
  function load() { try { return JSON.parse(localStorage.getItem('oa-plan') || 'null'); } catch (e) { return null; } }

  function build(animate) {
    current = plan(answers);
    document.getElementById('u-source').textContent = current.source;
    document.getElementById('card-title').textContent = current.title;
    document.getElementById('u-note').textContent = current.note;
    document.getElementById('u-first').textContent = current.first;
    var ol = document.getElementById('u-steps'); ol.innerHTML = '';
    current.steps.forEach(function (s) {
      var li = el('li'); var d = el('div');
      d.appendChild(el('strong', null, s[0])); d.appendChild(el('span', null, s[1]));
      li.appendChild(d); ol.appendChild(li);
    });
    var saved = load();
    var isDone = !!(saved && saved.done && !animate);
    done.checked = isDone; afterDone.hidden = !isDone; card.classList.toggle('is-done', isDone);
    if (animate) save({ done: false });

    wizard.hidden = true; result.hidden = false;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (!animate || reduce || !card.animate) { document.getElementById('card-title').focus && card.focus(); return; }

    // Their own words scatter across the screen, then gather into the card
    forming.innerHTML = '';
    var words = (answers.what + ' ' + answers.want).split(/\s+/).filter(Boolean).slice(0, 22);
    var R = result.getBoundingClientRect(), W = R.width;
    var cr = card.getBoundingClientRect();
    words.forEach(function (w, i) {
      var s = el('span', 'f-word', w); forming.appendChild(s);
      var x = Math.random() * (W - 80), y = Math.random() * 380 - 40;
      var tx = cr.left - R.left + cr.width / 2 - 20, ty = cr.top - R.top + 80;
      s.animate([
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.4)', opacity: 0 },
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.15)', opacity: 1, offset: .35 },
        { transform: 'translate(' + x + 'px,' + (y + 10) + 'px) scale(1)', opacity: 1, offset: .6 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.3)', opacity: 0 }
      ], { duration: 1700, delay: i * 30, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    });
    card.animate([{ opacity: 0, transform: 'translateY(40px) scale(.94)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: 1300, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    card.querySelectorAll('.u-steps li').forEach(function (li, i) {
      li.animate([{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: 1700 + i * 180, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
    card.querySelector('.u-first').animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }],
      { duration: 520, delay: 2350, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    document.getElementById('after').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 2700, fill: 'backwards' });
  }

  /* I've done it: a small celebration, point B reached */
  done.addEventListener('change', function () {
    card.classList.toggle('is-done', done.checked);
    afterDone.hidden = !done.checked;
    save({ done: done.checked });
    if (done.checked && !reduce && card.animate) burst(done);
  });
  function burst(from) {
    var r = from.getBoundingClientRect();
    for (var i = 0; i < 22; i++) {
      var p = el('span', 'spark'); document.body.appendChild(p);
      var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 110;
      p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height / 2) + 'px';
      p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(.2)', opacity: 0 }],
        { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }).onfinish = (function (n) { return function () { n.remove(); }; })(p);
    }
  }

  /* Copy, restart */
  document.getElementById('copy').addEventListener('click', function () {
    var msg = document.getElementById('copy-msg');
    var text = current.title + '\n' + current.source + '\n\n' + current.steps.map(function (s, i) { return (i + 1) + '. ' + s[0] + ': ' + s[1]; }).join('\n') +
      '\n\nYour first step today: ' + current.first + '\n\nNow use it. — oluwaseyiashiru.com';
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); msg.textContent = ok ? 'Plan copied.' : 'Copy didn’t work here. Select the card text to copy it.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { msg.textContent = 'Plan copied.'; }, fallback);
    else fallback();
  });
  document.getElementById('restart').addEventListener('click', function () {
    answers = {}; step = 0; result.hidden = true; wizard.hidden = false;
    document.getElementById('resume').hidden = true;
    stage.innerHTML = ''; render(1);
  });

  /* Resume a saved plan */
  var saved = load();
  if (saved && saved.answers && saved.answers.time) {
    var rs = document.getElementById('resume'); rs.hidden = false;
    document.getElementById('resume-btn').addEventListener('click', function () { answers = saved.answers; build(false); });
  }

  render(0);
})();
