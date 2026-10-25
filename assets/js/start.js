(function () {
  'use strict';
  var OA = window.OA, reduce = OA.reduce;

  /* ---------------- The run-through: one thing at a time ---------------- */
  var ENDPOINT = (window.OA_ENDPOINT || '').trim();
  var fileObj = null, MAX_MB = 25;
  var WHERE = [
    ['social', 'Social media', 'Facebook, TikTok, Instagram, WhatsApp', 'other'],
    ['youtube', 'YouTube or a video online', 'A video, course or livestream', 'other'],
    ['church', 'Church or ministry', 'A sermon, teaching or Bible study', 'faith'],
    ['seminar', 'A seminar, workshop or training', 'In person or online', 'career'],
    ['school', 'School or a class', 'A lecture, lesson or course', 'learning'],
    ['ai', 'An AI answer', 'ChatGPT, Gemini, Claude and others', 'tech'],
    ['book', 'A book, article or podcast', 'Something you read or listened to', 'other'],
    ['other', 'Somewhere else', 'A conversation, a mentor, anywhere', 'other']
  ];
  function whereOf(k) { for (var i = 0; i < WHERE.length; i++) if (WHERE[i][0] === k) return WHERE[i]; return WHERE[WHERE.length - 1]; }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  var QUESTIONS = [
    { id: 'where', kind: 'select', q: 'Where did you last pick up something you’d like to put to use?', opts: WHERE },
    { id: 'have', kind: 'choice', when: function () { return !!ENDPOINT; },
      q: function (a) { return a.where === 'ai' ? 'Do you have the answer with you?' : 'Do you have it with you?'; },
      opts: [['link', 'I have the link', 'YouTube, Facebook, a website…'], ['file', 'I have the video or audio', 'On my phone or computer'], ['none', 'I don’t, but I can tell you about it', 'A few words is enough']] },
    { id: 'link', kind: 'link', when: function (a) { return a.have === 'link'; }, q: 'Paste the link here.' },
    { id: 'upload', kind: 'upload', when: function (a) { return a.have === 'file'; }, q: 'Add the video or audio.' },
    { id: 'what', kind: 'text', when: function (a) { return !ENDPOINT || a.have === 'none'; },
      q: function (a) { return 'What was it about? Say it the way you’d tell a friend.'; },
      ph: function (a) { return { church: 'The pastor taught on faithfulness in small things', ai: 'ChatGPT explained how to price my services', school: 'Our lecturer explained how to write a business plan' }[a.where] || 'A video on getting your first remote job'; } },
    { id: 'want', kind: 'line', q: 'What do you want it to do for you?',
      ph: function (a) { return { church: 'Be more consistent in prayer this month', ai: 'Send my first price list to clients', school: 'Pass my exam with a better grade' }[a.where] || 'Land my first remote interview'; } },
    { id: 'time', kind: 'choice', compact: true, q: 'How much time can you give it today?', opts: [['15', '15 minutes'], ['30', '30 minutes'], ['60', 'An hour']] },
    { id: 'contact', kind: 'contact', when: function () { return !!ENDPOINT; }, q: 'Where should we send your USE Pack?' }
  ];
  function flow() { return QUESTIONS.filter(function (Q) { return !Q.when || Q.when(answers); }); }
  function txt(v) { return typeof v === 'function' ? v(answers) : v; }
  /* fill in what the engine and the quick plan expect from the few answers we asked for */
  function complete() {
    var W = whereOf(answers.where);
    answers.type = 'learned'; answers.block = answers.block || 'start'; answers.field = W[3];
    var said = (answers.what || '').trim(), about = (answers.about || '').trim();
    answers.what = 'Source: ' + W[1] + '. ' + (said || about || (answers.link ? 'the link shared' : fileObj ? 'the video shared' : 'what I learned'));
  }

  var answers = {}, step = 0;
  var stage = document.getElementById('q-stage');
  var form = document.getElementById('wiz-form');
  var back = document.getElementById('back');
  var next = document.getElementById('next');
  var err = document.getElementById('q-error');
  var count = document.getElementById('wiz-count');

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function progress() {
    var n = flow().length + (ENDPOINT && !answers.have ? 1 : 0), dots = document.getElementById('calm-dots');
    if (dots.children.length !== n) { dots.innerHTML = ''; for (var i = 0; i < n; i++) dots.appendChild(el('li')); }
    Array.prototype.forEach.call(dots.children, function (d, i) { d.className = i < step ? 'done' : i === step ? 'now' : ''; });
    count.textContent = (step + 1) + ' of ' + n;
  }

  function render(dir) {
    var Q = flow()[step];
    var box = el('fieldset', 'q' + (Q.compact ? ' compact' : ''));
    var legend = el('legend', 'q-title', txt(Q.q));
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
          setTimeout(function () { if (flow()[step] === Q) advance(); }, reduce ? 0 : 380);
        });
        list.appendChild(lab);
      });
      box.appendChild(list);
    } else if (Q.kind === 'select') {
      renderSelect(box, Q);
    } else if (Q.kind === 'link') {
      renderLink(box);
    } else if (Q.kind === 'upload') {
      renderUpload(box);
    } else if (Q.kind === 'contact') {
      renderContact(box);
    } else {
      var id = 'q-' + Q.id;
      var lab2 = el('label', 'visually-hidden', txt(Q.q)); lab2.setAttribute('for', id);
      var input = document.createElement(Q.kind === 'text' ? 'textarea' : 'input');
      input.id = id; input.name = Q.id; input.className = 'q-input';
      if (Q.kind === 'text') input.rows = 3;
      input.placeholder = txt(Q.ph);
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
    next.textContent = step === flow().length - 1 ? 'Find my one thing' : 'Next';
    next.hidden = Q.kind === 'choice' && step < flow().length - 1 && !answers[Q.id];
    if (Q.kind === 'choice' && step === flow().length - 1) next.hidden = false;
    progress();
  }

  function field(box, id, label, type, ph, help) {
    var wrap = el('div', 'q-field');
    var l = el('label', 'q-label', label); l.setAttribute('for', id);
    var i = document.createElement('input'); i.id = id; i.type = type; i.className = 'q-input q-input-sm'; if (ph) i.placeholder = ph;
    i.value = answers[id.replace('q-', '')] || '';
    i.addEventListener('input', function () { answers[id.replace('q-', '')] = i.value; hideErr(); });
    wrap.appendChild(l); wrap.appendChild(i);
    if (help) wrap.appendChild(el('p', 'q-help', help));
    box.appendChild(wrap); return i;
  }
  /* A calm dropdown: one tap opens the places, one tap chooses */
  function renderSelect(box, Q) {
    var wrap = el('div', 'calm-select'), chosen = answers[Q.id] ? whereOf(answers[Q.id]) : null;
    var btn = el('button', 'cs-btn'); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-labelledby', 'wiz-q');
    var face = el('span', 'cs-face', chosen ? chosen[1] : 'Choose a place'); if (!chosen) face.classList.add('empty');
    btn.appendChild(face); btn.insertAdjacentHTML('beforeend', '<svg class="cs-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>');
    var list = el('ul', 'cs-list'); list.setAttribute('role', 'listbox'); list.tabIndex = -1;
    Q.opts.forEach(function (o, i) {
      var li = el('li', 'cs-opt'); li.setAttribute('role', 'option'); li.id = 'opt-' + o[0]; li.tabIndex = -1;
      li.setAttribute('aria-selected', answers[Q.id] === o[0] ? 'true' : 'false'); li.style.setProperty('--i', i);
      li.appendChild(el('span', 'cs-t', o[1])); li.appendChild(el('span', 'cs-d', o[2]));
      li.addEventListener('click', function () { pick(o); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o); }
        if (e.key === 'ArrowDown') { e.preventDefault(); (li.nextSibling || li).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (li.previousSibling || li).focus(); }
        if (e.key === 'Escape') { toggle(false); btn.focus(); }
      });
      list.appendChild(li);
    });
    function toggle(open) {
      wrap.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var sel = list.querySelector('[aria-selected="true"]') || list.firstChild; setTimeout(function () { sel.focus({ preventScroll: true }); }, 60); }
    }
    function pick(o) {
      answers[Q.id] = o[0]; hideErr(); face.textContent = o[1]; face.classList.remove('empty');
      list.querySelectorAll('.cs-opt').forEach(function (x) { x.setAttribute('aria-selected', x.id === 'opt-' + o[0] ? 'true' : 'false'); });
      wrap.classList.add('picked'); toggle(false);
      setTimeout(function () { if (flow()[step] === Q) advance(); }, reduce ? 0 : 520);
    }
    btn.addEventListener('click', function () { toggle(!wrap.classList.contains('open')); });
    wrap.appendChild(btn); wrap.appendChild(list); box.appendChild(wrap);
    if (!answers[Q.id]) setTimeout(function () { toggle(true); }, reduce ? 0 : 700);
  }
  function renderLink(box) {
    var bad = /facebook\.com|fb\.watch|instagram\.com|tiktok\.com/i;
    var link = field(box, 'q-link', 'Link', 'url', 'https://…');
    link.setAttribute('inputmode', 'url'); link.classList.add('q-input-big');
    var note = el('p', 'q-help', 'YouTube links are read in full.'); box.appendChild(note);
    function check() {
      var v = link.value.trim();
      if (bad.test(v)) { note.innerHTML = ''; note.appendChild(document.createTextNode('Facebook, Instagram and TikTok links can’t be opened automatically. ')); var sw = el('button', 'q-swap', 'Upload the video instead'); sw.type = 'button'; sw.addEventListener('click', function () { answers.have = 'file'; answers.link = ''; render(1); }); note.appendChild(sw); note.appendChild(document.createTextNode(' or add a line about it below, and we’ll work from that.')); }
      else note.textContent = 'YouTube links are read in full.';
    }
    link.addEventListener('input', check); check();
    field(box, 'q-about', 'In a few words, what is it about? (optional)', 'text', 'Getting your first remote job');
    setTimeout(function () { link.focus({ preventScroll: true }); }, reduce ? 0 : 420);
  }
  function renderUpload(box) {
    var zone = el('label', 'drop'); zone.setAttribute('for', 'q-file');
    zone.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" class="d-ring"/><path d="M24 31V17M17.5 23.5L24 17l6.5 6.5" class="d-arrow"/></svg>';
    var t = el('span', 'drop-t', fileObj ? fileObj.name : 'Tap to choose a video or audio file');
    var d = el('span', 'drop-d', fileObj ? (fileObj.size / 1048576).toFixed(1) + ' MB · tap to change' : 'or drop it here · up to ' + MAX_MB + ' MB');
    zone.appendChild(t); zone.appendChild(d); if (fileObj) zone.classList.add('has');
    var f = document.createElement('input'); f.type = 'file'; f.id = 'q-file'; f.className = 'visually-hidden'; f.accept = 'video/*,audio/*';
    function take(file) {
      hideErr(); fileObj = file || null;
      if (fileObj && fileObj.size > MAX_MB * 1024 * 1024) { showErr('That file is ' + Math.round(fileObj.size / 1048576) + ' MB. The limit is ' + MAX_MB + ' MB, so share a YouTube or Google Drive link instead.'); fileObj = null; f.value = ''; }
      zone.classList.toggle('has', !!fileObj);
      t.textContent = fileObj ? fileObj.name : 'Tap to choose a video or audio file';
      d.textContent = fileObj ? (fileObj.size / 1048576).toFixed(1) + ' MB · tap to change' : 'or drop it here · up to ' + MAX_MB + ' MB';
    }
    f.addEventListener('change', function () { take(f.files && f.files[0]); });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('over'); });
    zone.addEventListener('drop', function (e) { e.preventDefault(); zone.classList.remove('over'); take(e.dataTransfer.files && e.dataTransfer.files[0]); });
    box.appendChild(zone); box.appendChild(f);
    field(box, 'q-about', 'In a few words, what is it about? (optional)', 'text', 'A sermon on faithfulness');
    box.appendChild(el('p', 'q-where', 'Your file is saved privately in Oluwaseyi Ashiru’s Google Drive and used only to make your pack and follow up with you.'));
  }
  function renderContact(box) {
    box.appendChild(el('p', 'q-sub', 'Your one thing appears here in about a minute. Your full USE Pack, made from what you shared, follows by email as a PDF.'));
    field(box, 'q-name', 'Your name', 'text', 'Ada Okafor').setAttribute('autocomplete', 'name');
    field(box, 'q-email', 'Email (your PDF is sent here)', 'email', 'ada@example.com').setAttribute('autocomplete', 'email');
    field(box, 'q-whatsapp', 'WhatsApp number (optional)', 'tel', '+234 …').setAttribute('autocomplete', 'tel');
    var hp = document.createElement('input'); hp.type = 'text'; hp.name = 'website'; hp.id = 'q-website'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.className = 'hp'; hp.setAttribute('aria-hidden', 'true'); hp.addEventListener('input', function () { answers.website = hp.value; });
    box.appendChild(hp);
    var c = el('label', 'q-consent'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'q-consent'; cb.checked = !!answers.consent;
    cb.addEventListener('change', function () { answers.consent = cb.checked; hideErr(); });
    c.appendChild(cb); c.appendChild(el('span', null, 'I agree that my answers, contact details and anything I shared are saved to Oluwaseyi Ashiru’s Google account, so my pack can be made and he can follow up with me.'));
    box.appendChild(c);
  }

  function hideErr() { err.hidden = true; }
  function showErr(m) { err.textContent = m; err.hidden = false; }

  function valid() {
    var Q = flow()[step], v = (answers[Q.id] || '').trim();
    if (Q.kind === 'select') { if (!answers[Q.id]) { showErr('Choose where it came from.'); return false; } return true; }
    if (Q.kind === 'link') {
      var LK = (answers.link || '').trim();
      if (!/^https?:\/\/\S+\.\S+/i.test(LK)) { showErr('Paste the full link. It starts with https://'); return false; }
      return true;
    }
    if (Q.kind === 'upload') { if (!fileObj) { showErr('Choose the file, or go back and pick another option.'); return false; } return true; }
    if (Q.kind === 'source') {
      var L = (answers.link || '').trim();
      if (L && !/^https?:\/\/\S+\.\S+/i.test(L)) { showErr('That link doesn’t look complete. It should start with https://'); return false; }
      return true;
    }
    if (Q.kind === 'contact') {
      if ((answers.name || '').trim().length < 2) { showErr('Add your name.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((answers.email || '').trim())) { showErr('Add a valid email so your pack can reach you.'); return false; }
      if (!answers.consent) { showErr('Tick the box to agree to how your entry is used.'); return false; }
      return true;
    }
    if (Q.kind === 'choice' && !v) { showErr('Choose one answer to continue.'); return false; }
    if (Q.kind !== 'choice' && v.length < 3) { showErr('Write a few words so the plan fits you.'); var i = stage.querySelector('.q-input'); if (i) i.focus(); return false; }
    return true;
  }

  function advance() {
    if (!valid()) return;
    if (step < flow().length - 1) { step++; render(1); }
    else { complete(); if (ENDPOINT) { waiting(); submit(); } else build(true); }
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

  /* With the engine on, the visitor waits for the real pack instead of a template card */
  function waiting() {
    wizard.hidden = true; result.hidden = false;
    card.hidden = true; document.getElementById('after').hidden = true;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  function fromPack(p) {
    var s = p.source || {}, F = FIELD[answers.field] || FIELD.other;
    current = {
      source: (s.title ? s.title + (s.creator ? ' · ' + s.creator : '') : (TYPE_LABEL[answers.type] || 'Your entry')) + ' · ' + F.label,
      title: p.title || 'Your USE Pack',
      steps: (p.plan || []).slice(0, 3).map(function (x) { return [String(x.step || '').replace(/^\d+\.\s*/, ''), x.what || '']; }),
      note: p.note_to_visitor || '',
      first: p.first_step ? p.first_step.action + (p.first_step.time ? ' (' + p.first_step.time + ')' : '') : ''
    };
    document.getElementById('u-source').textContent = current.source;
    document.getElementById('card-title').textContent = current.title;
    document.getElementById('u-note').textContent = current.note;
    document.getElementById('u-first').textContent = current.first;
    var ol = document.getElementById('u-steps'); ol.innerHTML = '';
    current.steps.forEach(function (st) { var li = el('li'), d = el('div'); d.appendChild(el('strong', null, st[0])); d.appendChild(el('span', null, st[1])); li.appendChild(d); ol.appendChild(li); });
    done.checked = false; afterDone.hidden = true; card.classList.remove('is-done');
    card.hidden = false; document.getElementById('after').hidden = false;
    if (!reduce && card.animate) card.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
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

  /* ---------------- The full USE Pack: sent to the engine, shown here, emailed as a PDF ---------------- */
  var engine = document.getElementById('engine'), engineMsg = document.getElementById('engine-msg'), fullpack = document.getElementById('fullpack');
  var STAGES = ['Finding your one thing', 'Reading what you shared', 'Checking what’s true', 'Putting the steps in order', 'Shaping your one thing'];

  function readFile(f) {
    return new Promise(function (res, rej) {
      if (!f) return res(null);
      var r = new FileReader();
      r.onload = function () { res({ name: f.name, mime: f.type || 'application/octet-stream', data: String(r.result).split(',')[1] }); };
      r.onerror = function () { rej(new Error('read')); };
      r.readAsDataURL(f);
    });
  }

  function submit() {
    engine.hidden = false; fullpack.innerHTML = ''; document.getElementById('pdf-dl').hidden = true;
    engine.classList.remove('done', 'failed'); engine.classList.add('working');
    var i = 0; engineMsg.textContent = STAGES[0] + '…';
    var timer = setInterval(function () { i = Math.min(STAGES.length - 1, i + 1); engineMsg.textContent = STAGES[i] + '…'; }, 9000);
    var F = FIELD[answers.field] || FIELD.other;
    readFile(fileObj).then(function (file) {
      var payload = {
        name: (answers.name || '').trim(), email: (answers.email || '').trim(), whatsapp: (answers.whatsapp || '').trim(),
        consent: !!answers.consent, website: answers.website || '',
        type: answers.type, field: answers.field, fieldLabel: F.label, what: answers.what, want: answers.want,
        block: answers.block, time: answers.time, link: (answers.link || '').trim(), file: file
      };
      return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); }).then(function (out) {
      clearInterval(timer); engine.classList.remove('working');
      if (!out.ok) throw new Error(out.error || 'failed');
      engine.classList.add('done');
      engineMsg.textContent = 'Your full USE Pack is below. A PDF copy is on its way to ' + answers.email + '.';
      fromPack(out.pack); renderPack(out.pack);
      if (out.pdf) {
        var bytes = atob(out.pdf), arr = new Uint8Array(bytes.length);
        for (var k = 0; k < bytes.length; k++) arr[k] = bytes.charCodeAt(k);
        var a = document.getElementById('pdf-dl');
        a.href = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' })); a.download = out.pdfName || 'USE Pack.pdf'; a.hidden = false;
      }
      save({ packId: out.id });
    }).catch(function (e) {
      clearInterval(timer); engine.classList.remove('working'); engine.classList.add('failed');
      var m = e && e.message && e.message !== 'failed' && e.message.length > 12 ? e.message : 'We couldn’t read it right now, so here is a quick first step from your answers.';
      card.hidden = false; document.getElementById('after').hidden = false; build(false);
      engineMsg.textContent = m + ' You can also send your link on WhatsApp: +2347033134979.';
    });
  }

  function renderPack(p) {
    fullpack.innerHTML = '';
    function h(t) { fullpack.appendChild(el('h2', 'fp-h', t)); }
    function table(head, rows) {
      var box = el('div', 'fp-scroll'), t = el('table', 'fp-table'), tr = el('tr');
      head.forEach(function (x) { tr.appendChild(el('th', null, x)); }); if (head.join('')) t.appendChild(tr);
      rows.forEach(function (r) { var row = el('tr'); r.forEach(function (c) { row.appendChild(el('td', null, c == null ? '' : String(c))); }); t.appendChild(row); });
      box.appendChild(t); fullpack.appendChild(box);
    }
    fullpack.appendChild(el('p', 'fp-kicker', 'Your full USE Pack'));
    fullpack.appendChild(el('h2', 'fp-title', p.title || 'Your USE Pack'));
    if (p.note_to_visitor) fullpack.appendChild(el('p', 'fp-note', p.note_to_visitor));
    var s = p.source || {};
    if (s.title || s.creator) { h('The source'); table(['', ''], [['Source', s.title], ['Made by', s.creator], ['Length', s.length], ['Who this is for', s.for_whom], ['Status', s.status]].filter(function (r) { return r[1]; })); }
    if (p.says && p.says.length) { h('What it says'); var ol = el('ol', 'fp-list'); p.says.forEach(function (x) { ol.appendChild(el('li', null, x)); }); fullpack.appendChild(ol); }
    if (p.checks && p.checks.length) { h('Is it true?'); table(['Claim', 'Verdict', 'Why'], p.checks.map(function (c) { return [c.claim, c.verdict, c.why]; })); }
    if (p.plan && p.plan.length) { h('The action plan'); table(['Step', 'What to do', 'Time', 'Proof you’ll have'], p.plan.map(function (c) { return [c.step, c.what, c.time, c.proof]; })); }
    if (p.first_step) {
      var fb = el('div', 'fp-first'); fb.appendChild(el('p', 'fp-first-label', 'Your first step today'));
      fb.appendChild(el('p', 'fp-first-text', p.first_step.action)); fb.appendChild(el('p', 'fp-first-meta', 'Time: ' + (p.first_step.time || '') + ' · Result: ' + (p.first_step.result || '')));
      fullpack.appendChild(fb);
    }
    if (p.tracker && p.tracker.length) { h('Seven-day tracker'); table(['Day', 'Morning', 'Evening'], p.tracker.map(function (t) { return [t.day, t.morning, t.evening]; })); }
    if (p.stuck && p.stuck.length) { h('If you get stuck'); table(['If this happens', 'Do this'], p.stuck.map(function (c) { return [c.problem, c.fix]; })); }
    if (p.faith_note) fullpack.appendChild(el('blockquote', 'fp-verse', p.faith_note));
    fullpack.appendChild(el('p', 'fp-sign', 'Now use it.'));
    if (!reduce && fullpack.animate) fullpack.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' });
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
  /* Another entry: clear the last one (keep name and contact so they don't retype), back to question one */
  function newEntry() {
    var keep = { name: answers.name, email: answers.email, whatsapp: answers.whatsapp, consent: answers.consent };
    answers = {}; for (var k in keep) if (keep[k]) answers[k] = keep[k];
    fileObj = null; step = 0; current = null;
    result.hidden = true; wizard.hidden = false; engine.hidden = true; fullpack.innerHTML = '';
    document.getElementById('pdf-dl').hidden = true; card.hidden = false; document.getElementById('after').hidden = false;
    document.getElementById('copy-msg').textContent = '';
    document.getElementById('intro').hidden = true; document.querySelector('.wiz-head').hidden = false; form.hidden = false;
    document.getElementById('resume').hidden = true; hideErr();
    try { localStorage.removeItem('oa-plan'); } catch (e) {}
    stage.innerHTML = ''; render(1);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.getElementById('restart').addEventListener('click', newEntry);
  document.getElementById('new-entry').addEventListener('click', newEntry);
  document.getElementById('fresh-entry').addEventListener('click', function () {
    try { localStorage.removeItem('oa-plan'); } catch (e) {}
    document.getElementById('resume').hidden = true;
  });

  /* Resume a saved plan */
  var saved = load();
  if (saved && saved.answers && saved.answers.time) {
    var rs = document.getElementById('resume'); rs.hidden = false;
    document.getElementById('resume-btn').addEventListener('click', function () { answers = saved.answers; build(false); });
  }

  /* The opening line flips away into the first question */
  var intro = document.getElementById('intro'), head = document.querySelector('.wiz-head');
  var goBtn = document.getElementById('intro-go');

  /* Arrival: the noise from the home page drifts in, slows, and settles into one still point */
  (function () {
    var box = document.getElementById('settle'); if (!box || reduce || !box.animate) return;
    var words = ['How-to video', 'Tutorial', 'Training video', 'Seminar', 'Interview', 'Live lesson', 'AI answer', 'Informative post', 'Sermon excerpt', 'Webinar', 'Podcast', 'Workshop', 'YouTube', 'TikTok', 'Course', 'Article'];
    var R = box.getBoundingClientRect(), cx = R.width / 2, cy = Math.min(R.height, 520) * 0.18;
    words.forEach(function (w, i) {
      var s = el('span', 'frag', w); box.appendChild(s);
      var a = Math.random() * Math.PI * 2, d = 160 + Math.random() * Math.max(220, R.width * 0.42);
      var x0 = cx + Math.cos(a) * d, y0 = cy + 120 + Math.sin(a) * d * 0.55, x1 = cx + Math.cos(a + 1.4) * d * 0.5, y1 = cy + 120 + Math.sin(a + 1.4) * d * 0.3;
      s.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px) translate(-50%,-50%) rotate(' + (Math.random() * 30 - 15) + 'deg)', opacity: 0 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) translate(-50%,-50%) rotate(' + (Math.random() * 20 - 10) + 'deg)', opacity: .9, offset: .35 },
        { transform: 'translate(' + cx + 'px,' + (cy + 40) + 'px) translate(-50%,-50%) scale(.2)', opacity: 0 }
      ], { duration: 2000 + i * 40, delay: i * 25, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' }).onfinish = function () { s.remove(); };
    });
  })();

  /* The button comes alive: it leans toward you and turns from gold to navy as you get close */
  (function () {
    if (reduce) return;
    var raf = 0, px = -1e4, py = -1e4;
    function tick() {
      raf = 0; if (intro.hidden) return;
      var r = goBtn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = px - cx, dy = py - cy, d = Math.sqrt(dx * dx + dy * dy), reach = 220;
      var p = Math.max(0, Math.min(1, 1 - (d - r.width * 0.35) / reach));
      goBtn.style.setProperty('--p', p.toFixed(3));
      var pull = d < reach ? (1 - d / reach) : 0;
      goBtn.style.setProperty('--mx', (dx * 0.18 * pull).toFixed(1) + 'px'); goBtn.style.setProperty('--my', (dy * 0.25 * pull).toFixed(1) + 'px');
    }
    window.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    document.addEventListener('pointerleave', function () { px = py = -1e4; tick(); });
    goBtn.addEventListener('touchstart', function () { goBtn.classList.add('pressed'); }, { passive: true });
  })();
  function begin() {
    function show() { intro.hidden = true; head.hidden = false; form.hidden = false; render(0); var t = stage.querySelector('input, textarea'); if (t) t.focus({ preventScroll: true }); }
    if (reduce || !intro.animate) return show();
    intro.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'perspective(900px) rotateX(70deg) translateY(-30px)' }],
      { duration: 420, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = function () {
      show();
      form.animate([{ opacity: 0, transform: 'perspective(900px) rotateX(-60deg) translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
    };
  }
  goBtn.addEventListener('click', begin);
})();
