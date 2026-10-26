/**
 * Making Knowledge Usable — the USE Pack engine.
 *
 * Runs as a Google Apps Script web app in Oluwaseyi Ashiru's Google account.
 * For every entry from oluwaseyiashiru.com/start.html it:
 *   1. saves any uploaded video to Google Drive (Making Knowledge Usable / Uploads),
 *   2. reads the video (YouTube link or upload) with the Gemini API and runs the USE method on it,
 *   3. builds a branded USE Pack PDF (Drive: Making Knowledge Usable / USE Packs),
 *   4. emails the PDF to the visitor and a copy, with their details and the next action, to the owner,
 *   5. logs everything as one row in the "Entries" Google Sheet,
 *   6. returns the pack to the page so the visitor sees it immediately.
 *
 * Setup: see SETUP.md. Secrets live in Script Properties, never in this file.
 */

var DEFAULTS = {
  MODEL: 'gemini-3.8-flash',
  OWNER_EMAIL: 'info@oluwaseyiashiru.com',
  DAILY_LIMIT_PER_EMAIL: '3',
  MAX_UPLOAD_MB: '25',
  SITE_URL: 'https://seyidev-ops.github.io/oluwaseyiashiru/',
  PAY_MIN_NGN: '1000',
  PAY_MIN_USD: '1'
};

var HEADERS = ['Received', 'Entry ID', 'Name', 'Email', 'WhatsApp', 'Holding', 'Life area', 'What they described',
  'What they want', 'What stops them', 'Time today', 'Link', 'Uploaded file', 'Source read?', 'USE Pack (PDF)',
  'Readiness', 'Their challenge', 'Our next action', 'Stage', 'Status'];

/* ------------------------------------------------------------------ */
/* One-time setup: run this once from the editor (Run ▸ setup).        */
/* ------------------------------------------------------------------ */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var root = DriveApp.createFolder('Making Knowledge Usable');
  var uploads = root.createFolder('Uploads');
  var packs = root.createFolder('USE Packs');
  var ss = SpreadsheetApp.create('Making Knowledge Usable — Entries');
  var sheet = ss.getSheets()[0];
  sheet.setName('Entries');
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#14213D').setFontColor('#F7F5F0');
  sheet.setFrozenRows(1);
  DriveApp.getFileById(ss.getId()).moveTo(root);
  props.setProperties({ SHEET_ID: ss.getId(), UPLOADS_ID: uploads.getId(), PACKS_ID: packs.getId(), ROOT_ID: root.getId() });
  Object.keys(DEFAULTS).forEach(function (k) { if (!props.getProperty(k)) props.setProperty(k, DEFAULTS[k]); });
  Logger.log('Folder: ' + root.getUrl());
  Logger.log('Sheet: ' + ss.getUrl());
  Logger.log('Now add GEMINI_API_KEY in Project Settings ▸ Script properties, then Deploy ▸ New deployment ▸ Web app.');
}

function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || DEFAULTS[k] || ''; }

/* ------------------------------------------------------------------ */
/* Web app endpoints                                                   */
/* ------------------------------------------------------------------ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.check) {                                    // open .../exec?check=1 in a browser to test the setup
    var out = { ok: true, sheet: !!prop('SHEET_ID'), key_present: !!prop('GEMINI_API_KEY'), model: prop('MODEL') };
    try { out.gemini = gemini([{ text: 'Reply with the single word: ready' }], 'You are a test.', {}).trim().slice(0, 40); }
    catch (x) { out.ok = false; out.gemini_error = String(x.message || x); }
    if (p.url) { try { var s = readSource({ link: p.url }, null); out.source = { kind: s.kind, readable: s.readable, title: s.title, points: (s.points || []).slice(0, 5), note: s.note }; } catch (x2) { out.source_error = String(x2.message || x2); } }
    return json(out);
  }
  return json({ ok: true, service: 'USE Pack engine', ready: !!prop('GEMINI_API_KEY') && !!prop('SHEET_ID') });
}

function doPost(e) {
  var stage = 'start';
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json({ ok: true, ignored: true });               // honeypot: bots fill hidden fields
    if (d.action === 'unlock') { stage = 'unlock'; return json(unlock(d)); }
    if (d.action === 'booking') { stage = 'booking'; return json(booking(d)); }
    if (d.action === 'member') { stage = 'member'; return json(member(d)); }
    var err = validate(d); if (err) return json({ ok: false, error: err });
    if (overLimit(d.email)) return json({ ok: false, error: 'You have made several packs today. Please try again tomorrow, or send your link on WhatsApp.' });

    var id = 'OA-' + Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyMMdd-HHmm') + '-' + Math.floor(Math.random() * 900 + 100);
    stage = 'saving'; var upload = saveUpload(d, id);
    stage = 'reading'; var source = readSource(d, upload);
    var described = String(d.what || '').replace(/^Source:[^.]*\.\s*/, '').trim();
    if (!source.readable && (!described || /^(the link shared|the video shared|what I learned)$/i.test(described))) {
      return json({ ok: false, code: 'unreadable', error: source.note || 'We couldn’t open what you shared, so we can’t build a step from it yet.', kind: source.kind });
    }
    stage = 'thinking'; var pack = makePack(d, source);
    stage = 'pdf'; var pdf = makePdf(d, pack, id);
    stage = 'save'; savePack(id, d, pack, pdf);
    var isMember = memberUse(d.email);
    stage = 'email';
    if (isMember) MailApp.sendEmail({ to: d.email, name: 'Oluwaseyi Ashiru', replyTo: prop('OWNER_EMAIL'), subject: 'Your USE Pack: ' + pack.title, htmlBody: '<p>Hello ' + esc(d.name) + ',</p><p>Your full USE Pack is attached and below (Deeper Systems: ' + isMember + ' of 10 this month).</p>' + packHtml(d, pack, false) + '<p>Now use it.</p>', attachments: [pdf.getBlob()] });
    else notifyVisitor(d, pack, id);
    notifyOwner(d, pack, pdf, upload, id);
    stage = 'log'; logRow(d, pack, pdf, upload, source, id);
    if (isMember) { markRow(id, 'Member', 'Pack ' + isMember + ' of 10'); return json({ ok: true, id: id, locked: false, member: isMember, pack: pack, pdf: Utilities.base64Encode(pdf.getBlob().getBytes()), pdfName: pdf.getName() }); }
    return json({ ok: true, id: id, locked: true, pack: freePart(pack) });
  } catch (x) {
    console.error('Failed at ' + stage + ': ' + (x && x.stack || x));
    var m = String(x && x.message || x);
    var friendly = /API key|API_KEY|PERMISSION_DENIED|403/.test(m) ? 'The AI key in the engine was rejected. (Owner: check GEMINI_API_KEY.)'
      : /429|RESOURCE_EXHAUSTED|quota/i.test(m) ? 'The AI is busy right now. Please try again in a minute.'
      : /Timeout|timed out|Exceeded maximum execution/i.test(m) ? 'That took too long to read. Try a shorter clip, or upload just the part that matters.'
      : 'Something went wrong while ' + ({ reading: 'reading what you shared', thinking: 'working out your first step', pdf: 'making your PDF', email: 'sending your email' }[stage] || 'making your pack') + '. Please try again.';
    return json({ ok: false, error: friendly, stage: stage, detail: m.slice(0, 300) });
  }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function validate(d) {
  if (!d.consent) return 'Please agree to how your entry is used.';
  if (!d.name || String(d.name).trim().length < 2) return 'Please add your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ''))) return 'Please add a valid email so your pack can reach you.';
  if (!d.what || String(d.what).trim().length < 3) return 'Please describe what you want to put to use.';
  if (d.file && d.file.data && d.file.data.length * 0.75 > Number(prop('MAX_UPLOAD_MB')) * 1024 * 1024) return 'That file is too large. Share a link instead.';
  return '';
}

function overLimit(email) {
  var sheet = SpreadsheetApp.openById(prop('SHEET_ID')).getSheetByName('Entries');
  var last = sheet.getLastRow(); if (last < 2) return false;
  var rows = sheet.getRange(Math.max(2, last - 300), 1, Math.min(300, last - 1), 4).getValues();
  var since = Date.now() - 24 * 3600 * 1000, n = 0;
  rows.forEach(function (r) { if (String(r[3]).toLowerCase() === String(email).toLowerCase() && new Date(r[0]).getTime() > since) n++; });
  return n >= Number(prop('DAILY_LIMIT_PER_EMAIL'));
}

/* ------------------------------------------------------------------ */
/* Files and sources                                                   */
/* ------------------------------------------------------------------ */
function saveUpload(d, id) {
  if (!d.file || !d.file.data) return null;
  var blob = Utilities.newBlob(Utilities.base64Decode(d.file.data), d.file.mime || 'application/octet-stream', id + ' - ' + (d.file.name || 'upload'));
  var file = DriveApp.getFolderById(prop('UPLOADS_ID')).createFile(blob);
  return { file: file, blob: blob };
}

function isYouTube(url) { return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/)/i.test(url || ''); }
function isSocial(url) { return /facebook\.com|fb\.watch|instagram\.com|tiktok\.com|x\.com\/|twitter\.com/i.test(url || ''); }

/* ------------------------------------------------------------------ */
/* The source reader: open what they shared, and pull out what it      */
/* actually teaches, before anything is written for them.              */
/* ------------------------------------------------------------------ */
function readSource(d, upload) {
  var link = String(d.link || '').trim(), parts = [], kind = 'none', meta = {}, note = '';

  if (upload && /^(video|audio)\//.test(upload.blob.getContentType())) {
    var f = uploadToGemini(upload.blob);
    if (f) { parts.push({ file_data: { mime_type: f.mimeType, file_uri: f.uri } }); kind = 'upload'; }
    else note = 'We saved your file but couldn’t read it. Try an MP4 video or MP3 audio.';
  } else if (upload && /pdf|text/.test(upload.blob.getContentType())) {
    parts.push({ inline_data: { mime_type: upload.blob.getContentType(), data: Utilities.base64Encode(upload.blob.getBytes()) } }); kind = 'upload';
  } else if (isYouTube(link)) {
    parts.push({ file_data: { file_uri: link } }); kind = 'youtube';
  } else if (link) {
    var page = fetchPage(link);
    meta = page.meta;
    if (page.videoUrl) {                           // a public social video exposes its file: read the video itself
      var vid = downloadVideo(page.videoUrl);
      if (vid) { var g = uploadToGemini(vid); if (g) { parts.push({ file_data: { mime_type: g.mimeType, file_uri: g.uri } }); kind = 'social-video'; } }
    }
    if (!parts.length && page.text && page.text.length > 200) { parts.push({ text: 'PAGE TEXT FROM ' + link + ':\n' + page.text }); kind = 'page'; }
    if (!parts.length && (meta.description || meta.title)) { parts.push({ text: 'ONLY THE POST CAPTION IS AVAILABLE (the video itself could not be opened).\nTitle: ' + (meta.title || '') + '\nCaption: ' + (meta.description || '') }); kind = 'caption'; }
    if (!parts.length) kind = 'unopened';
  }
  if (!parts.length) {
    return { kind: kind, readable: false, points: [], note: note || (link ? (isSocial(link)
      ? 'That post is private or blocks outside apps, so we couldn’t open it. Upload the video itself, or tell us in a few words what it said.'
      : 'We couldn’t open that link. Upload the video, or tell us in a few words what it said.') : '') };
  }

  var sys = [
    'You read one piece of content a person learned from (a video, audio, page, or post) and report what it ACTUALLY says. Never invent or guess content.',
    'Pick out the specific, usable teaching: techniques, steps, rules, examples, phrases, numbers, and named methods, with rough timestamps (mm:ss) for audio or video when you can.',
    'If you only have a caption or the content is unclear, say so in limits and keep points to what is really there.',
    'Reply with JSON only: {"readable":true,"title":"","creator":"","format":"video|audio|article|post|other","length":"","summary":"two plain sentences","points":[{"point":"short name of the idea","detail":"what exactly it says or shows, in plain words","when":"mm:ss or empty","quote":"a short exact phrase if useful"}],"limits":""}',
    'Give 3 to 8 points, most usable first. If you cannot see or hear any real content, return {"readable":false,"limits":"why"}.'
  ].join('\n');
  var raw = gemini(parts.concat([{ text: 'What the person says it is about: ' + (d.about || d.what || 'not given') }]), sys,
    { json: true, lowMedia: kind !== 'page' && kind !== 'caption' });
  var x = parseJson(raw) || {};
  return {
    kind: kind, readable: !!x.readable && (x.points || []).length > 0, title: x.title || meta.title || '', creator: x.creator || meta.site || '',
    format: x.format || '', length: x.length || '', summary: x.summary || '', points: x.points || [], limits: x.limits || '',
    note: x.readable ? '' : (x.limits || note)
  };
}

function fetchPage(url) {
  var out = { meta: {}, text: '', videoUrl: '' };
  try {
    var ua = isSocial(url) ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' : 'Mozilla/5.0 (compatible; USEPackReader/1.0)';
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': ua, 'Accept-Language': 'en' } });
    if (r.getResponseCode() >= 400) return out;
    var html = r.getContentText();
    function metaOf(p) { var m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]*content=["\']([^"\']*)', 'i')) || html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + p + '["\']', 'i')); return m ? decode(m[1]) : ''; }
    out.meta = { title: metaOf('og:title') || (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || '', description: metaOf('og:description') || metaOf('description'), site: metaOf('og:site_name') };
    var v = metaOf('og:video:secure_url') || metaOf('og:video:url') || metaOf('og:video');
    if (!v) { var m2 = html.match(/"(?:browser_native_sd_url|playable_url|video_url|contentUrl)"\s*:\s*"(https?:[^"]+)"/); if (m2) v = m2[1].replace(/\\\//g, '/').replace(/\\u0025/g, '%').replace(/\\u0026/g, '&'); }
    if (v && /\.(mp4|m4a|mov)|video/i.test(v) && !/youtube\.com\/embed/i.test(v)) out.videoUrl = decode(v);
    out.text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<\/(p|div|li|h\d|br|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, 40000);
    if (/tiktok\.com/i.test(url) && !out.meta.description) {
      var o = UrlFetchApp.fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), { muteHttpExceptions: true });
      if (o.getResponseCode() === 200) { var oj = JSON.parse(o.getContentText()); out.meta.description = oj.title || ''; out.meta.site = oj.author_name || 'TikTok'; }
    }
  } catch (x) { console.warn('fetchPage: ' + x); }
  return out;
}

function downloadVideo(url) {
  try {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.getResponseCode() !== 200) return null;
    var b = r.getBlob(); if (b.getBytes().length > 45 * 1024 * 1024) return null;
    var type = b.getContentType(); if (!/video|audio|octet/.test(type || '')) return null;
    return b.setContentType(/octet/.test(type) ? 'video/mp4' : type).setName('shared-video.mp4');
  } catch (x) { console.warn('downloadVideo: ' + x); return null; }
}

function pickModel(all) {
  try {
    var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { muteHttpExceptions: true, headers: { 'x-goog-api-key': prop('GEMINI_API_KEY') } });
    var ms = (JSON.parse(r.getContentText()).models || []).filter(function (m) {
      return (m.supportedGenerationMethods || []).indexOf('generateContent') > -1 && /flash/.test(m.name) && !/lite|image|tts|live|audio|embed|exp/.test(m.name);
    }).map(function (m) { return m.name.replace('models/', ''); });
    function ver(n) { var v = (n.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1]; return parseFloat(v) - (/preview/.test(n) ? 0.001 : 0); }
    ms.sort(function (a, b) { return ver(b) - ver(a); });
    return all ? ms : (ms[0] || '');
  } catch (x) { return all ? [] : ''; }
}

function decode(s) { return String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); }); }
function parseJson(t) { try { return JSON.parse(String(t).replace(/^[\s\S]*?```(?:json)?\s*|```[\s\S]*$/g, '').trim()); } catch (e) { var m = String(t).match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } }

/* One call to Gemini, made sturdy: retries brief hiccups, drops optional settings if they cause trouble,
   moves to a backup model when one is overloaded, and switches for good if a model is retired. */
function gemini(parts, system, o) {
  o = o || {};
  var models = [prop('MODEL')].concat(backupModels()), lastErr = '';
  for (var m = 0; m < models.length; m++) {
    var lowMedia = !!o.lowMedia;
    for (var attempt = 0; attempt < 3; attempt++) {
      var cfg = { temperature: o.temperature == null ? 0.4 : o.temperature };
      if (o.json) cfg.responseMimeType = 'application/json';
      if (lowMedia) cfg.mediaResolution = 'MEDIA_RESOLUTION_LOW';
      var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[m] + ':generateContent', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': prop('GEMINI_API_KEY') },
        payload: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: parts }], generationConfig: cfg })
      });
      var code = res.getResponseCode(), body = res.getContentText();
      if (code === 200) {
        var j = JSON.parse(body), c0 = j.candidates && j.candidates[0];
        var text = c0 && c0.content && c0.content.parts ? c0.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
        if (text) { if (m > 0) console.warn('Answered by backup model ' + models[m]); return text; }
        lastErr = 'Gemini returned no answer: ' + body.slice(0, 200); break;
      }
      lastErr = 'Gemini ' + code + ' (' + models[m] + '): ' + body.slice(0, 300);
      if (code === 404) {                            // retired model: take Google's suggested replacement and keep it
        var next = (body.match(/use models\/([\w.\-]+)/) || [])[1];
        if (next && models.indexOf(next) < 0) { if (m === 0) PropertiesService.getScriptProperties().setProperty('MODEL', next); models.splice(m + 1, 0, next); }
        break;
      }
      if (code === 400 && lowMedia) { lowMedia = false; continue; }      // a setting this model dislikes: drop it and retry
      if (code === 400 || code === 401 || code === 403) throw new Error(lastErr);
      if (code === 500 && lowMedia) lowMedia = false;
      if (code === 429 || code >= 500) { Utilities.sleep([1500, 4000, 0][attempt]); continue; }   // busy or hiccup: wait and retry
      break;
    }
  }
  throw new Error(lastErr || 'Gemini did not answer');
}

function backupModels() {
  var cached = CacheService.getScriptCache().get('backupModels');
  if (cached) return JSON.parse(cached);
  var list = [], best = pickModel(true);
  best.forEach(function (n) { if (n !== prop('MODEL') && list.length < 2) list.push(n); });
  if (list.indexOf('gemini-flash-latest') < 0) list.push('gemini-flash-latest');
  CacheService.getScriptCache().put('backupModels', JSON.stringify(list), 21600);
  return list;
}

/* Gemini Files API: resumable upload, then wait until the video is processed */
function uploadToGemini(blob) {
  var key = prop('GEMINI_API_KEY'), bytes = blob.getBytes();
  var start = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/upload/v1beta/files?key=' + key, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length), 'X-Goog-Upload-Header-Content-Type': blob.getContentType() },
    payload: JSON.stringify({ file: { display_name: blob.getName() } })
  });
  var h = start.getAllHeaders(), url = h['x-goog-upload-url'] || h['X-Goog-Upload-URL'];
  if (!url) { console.error('Upload start failed: ' + start.getContentText()); return null; }
  var up = UrlFetchApp.fetch(url, { method: 'post', muteHttpExceptions: true, contentType: blob.getContentType(),
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, payload: bytes });
  var file = JSON.parse(up.getContentText()).file;
  for (var i = 0; i < 40 && file && file.state === 'PROCESSING'; i++) {
    Utilities.sleep(3000);
    file = JSON.parse(UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/' + file.name + '?key=' + key, { muteHttpExceptions: true }).getContentText());
  }
  return file && file.state === 'ACTIVE' ? file : null;
}

/* ------------------------------------------------------------------ */
/* The USE method                                                      */
/* ------------------------------------------------------------------ */
var LABELS = {
  type: { idea: 'An idea', learned: 'Something they learned', skill: 'A skill they have', goal: 'A goal they keep postponing' },
  block: { start: 'Doesn’t know where to start', time: 'Doesn’t have time', money: 'Doesn’t have money', fear: 'Afraid it won’t work', stopped: 'Started before and stopped' }
};

function makePack(d, source) {
  var described = String(d.what || '').replace(/^Source:[^.]*\.\s*/, '').trim();
  var brief = [
    'VISITOR', 'Name: ' + d.name,
    'Where they got it: ' + String(d.what || '').replace(/^Source:\s*([^.]*)\..*$/, '$1'),
    'What they say it is about: ' + (d.about || described || 'not given'),
    'What they want it to do for them: ' + (d.want || ''),
    'Time they can give today: ' + d.time + ' minutes',
    'Link: ' + (d.link || 'none'), '',
    source.readable ? 'WHAT THE SOURCE ACTUALLY SAYS (read from the ' + source.kind + '):\n' + JSON.stringify({ title: source.title, creator: source.creator, format: source.format, length: source.length, summary: source.summary, points: source.points, limits: source.limits })
      : 'THE SOURCE COULD NOT BE OPENED. Work only from what they described; say so plainly in note_to_visitor.'
  ].join('\n');

  var instructions = [
    'You make knowledge usable for Oluwaseyi Ashiru ("Making Knowledge Usable"), using the USE method: Understand it, Simplify it, Execute it.',
    'THE JOB: give this person ONE first step that comes straight out of THIS source and moves them toward what they want, sized to the time they have today.',
    'Rules for first_step:',
    '- It must be built on ONE specific point from the source (name it in from_source, with the timestamp if there is one). Someone who has not seen the source should be able to tell which idea it uses.',
    '- action: one sentence, starting with a verb, saying exactly what to do with that idea for THEIR goal (e.g. "Rewrite your WhatsApp offer using his 3-part hook (problem, proof, promise) and send it to 5 contacts").',
    '- how: 2 to 4 tiny concrete sub-steps, including exact words to say or write when useful.',
    '- done_when: what they will see or have when it is done (proof).',
    '- Never give generic advice ("write the main point down", "make a plan", "pick one idea", "test with three people") unless the source itself teaches exactly that.',
    'If the source is from another world (a film, a sermon, sport) translate the exact technique into their situation.',
    'Voice: plain, warm, firm. Short sentences a teenager or grandmother can follow. Local, practical (they are likely in Nigeria). No hype, no money promises, no invented facts. Credit the creator.',
    'checks: judge each key claim honestly: "Verified", "Partly true", "Opinion" or "Caution", with a one-line why. Add cautions for health, money or law.',
    'faith_note: only if the source or their goal is about faith, one short accurate Bible verse from the NASB 1995; else empty.',
    'owner: private notes for Oluwaseyi’s team: who they are, their real challenge, readiness for the $1 commitment ("Ready", "Needs support" or "Not yet"), and one concrete next action.',
    'Reply with JSON only, in exactly this shape:',
    JSON.stringify({
      title: 'short headline naming the idea and their goal', source_read: true,
      source: { title: '', creator: '', length: '', for_whom: '', status: 'Read in full | Caption only | From your description' },
      says: ['3 to 6 short lines of what it actually teaches'],
      first_step: { from_source: 'the point it uses, e.g. "The 3-part hook (02:15)"', action: '', how: ['', ''], time: 'minutes', done_when: '' },
      plan: [{ step: '1. ...', what: 'each step also tied to a point from the source', time: '', proof: '' }],
      checks: [{ claim: '', verdict: '', why: '' }],
      tracker: [{ day: 1, morning: '', evening: '' }],
      stuck: [{ problem: '', fix: '' }],
      faith_note: '', note_to_visitor: '',
      owner: { summary: '', challenge: '', readiness: '', next_action: '' }
    }),
    'Use 3 plan steps after the first step, exactly 7 tracker days, and 3 stuck items.'
  ].join('\n');

  var pack = parseJson(gemini([{ text: brief }], instructions, { json: true, temperature: 0.5 }));
  if (!pack || !pack.first_step || !pack.first_step.action) throw new Error('The answer came back incomplete.');
  pack.first_step.result = pack.first_step.result || pack.first_step.done_when || '';
  pack.source_read = !!source.readable;
  pack.source = pack.source || {};
  if (!pack.source.title && source.title) pack.source.title = source.title;
  if (!pack.source.creator && source.creator) pack.source.creator = source.creator;
  return pack;
}

/* ------------------------------------------------------------------ */
/* PDF, emails and the Sheet                                           */
/* ------------------------------------------------------------------ */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function packHtml(d, p, forOwner) {
  var gold = '#D4A24C', navy = '#14213D', slate = '#5A6275';
  var th = 'style="text-align:left;background:' + navy + ';color:#F7F5F0;padding:7px 8px;font-size:11px"';
  var td = 'style="border-bottom:1px solid #E3DED3;padding:7px 8px;font-size:11px;vertical-align:top"';
  function table(head, rows) { return '<table style="width:100%;border-collapse:collapse;margin:8px 0 18px">' + (head.join('') ? '<tr>' + head.map(function (h) { return '<th ' + th + '>' + esc(h) + '</th>'; }).join('') + '</tr>' : '') + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td ' + td + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>'; }
  function h2(t) { return '<h2 style="font-family:Georgia,serif;color:' + navy + ';font-size:17px;margin:20px 0 4px">' + esc(t) + '</h2>'; }
  var s = p.source || {};
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;color:' + navy + ';max-width:720px">' +
    '<p style="letter-spacing:3px;font-size:10px;color:' + slate + ';text-transform:uppercase;border-bottom:2px solid ' + gold + ';padding-bottom:8px">USE Pack for ' + esc(d.name) + ' · Oluwaseyi Ashiru — Making Knowledge Usable</p>' +
    '<h1 style="font-family:Georgia,serif;font-size:28px;margin:6px 0 12px">' + esc(p.title) + '</h1>' +
    (p.note_to_visitor ? '<p style="font-size:12px;color:' + slate + '">' + esc(p.note_to_visitor) + '</p>' : '') +
    h2('The source') + table(['', ''], [['Source', s.title || d.link || 'Your description'], ['Made by', s.creator || ''], ['Length', s.length || ''], ['Who this is for', s.for_whom || ''], ['Status', s.status || '']]) +
    h2('What it says') + '<ol style="font-size:12px;line-height:1.6">' + (p.says || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
    h2('Is it true?') + table(['Claim', 'Verdict', 'Why'], (p.checks || []).map(function (c) { return [c.claim, c.verdict, c.why]; })) +
    h2('The action plan') + table(['Step', 'What to do', 'Time', 'Done', 'Proof you’ll have'], (p.plan || []).map(function (c) { return [c.step, c.what, c.time, '☐', c.proof]; })) +
    '<div style="background:' + navy + ';color:#F7F5F0;border-radius:10px;padding:14px 16px;margin:18px 0"><p style="font-family:Georgia,serif;color:' + gold + ';font-size:18px;margin:0 0 6px">Your one thing today</p>' + (p.first_step && p.first_step.from_source ? '<p style="margin:0 0 6px;font-size:11px;color:' + gold + '">From the source: ' + esc(p.first_step.from_source) + '</p>' : '') + '<p style="margin:0 0 6px;font-size:13px">' + esc(p.first_step && p.first_step.action) + '</p>' + (p.first_step && p.first_step.how && p.first_step.how.length ? '<ol style="margin:0 0 8px;padding-left:18px;font-size:12px">' + p.first_step.how.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol>' : '') + '<p style="margin:0;font-size:11px;color:#C9CEDA">Time: ' + esc(p.first_step && p.first_step.time) + ' · Result: ' + esc(p.first_step && p.first_step.result) + '</p></div>' +
    h2('Seven-day tracker') + table(['Day', 'Morning', 'Evening', 'Done'], (p.tracker || []).map(function (t) { return [t.day, t.morning, t.evening, '☐']; })) +
    h2('If you get stuck') + table(['If this happens', 'Do this'], (p.stuck || []).map(function (c) { return [c.problem, c.fix]; })) +
    (p.faith_note ? '<p style="font-family:Georgia,serif;font-size:13px;border-left:3px solid ' + gold + ';padding-left:10px">' + esc(p.faith_note) + '</p>' : '') +
    '<p style="font-family:Georgia,serif;font-size:20px;text-align:center;margin:22px 0 4px">Now use it.</p>' +
    '<p style="text-align:center;font-size:10px;color:' + slate + '">oluwaseyiashiru.com · info@oluwaseyiashiru.com · +2347033134979</p>';
  if (forOwner && p.owner) {
    html += '<hr><h2 style="font-family:Georgia,serif">For the team</h2>' + table(['', ''], [['Summary', p.owner.summary], ['Their challenge', p.owner.challenge], ['Ready for the $1 step?', p.owner.readiness], ['Our next action', p.owner.next_action]]);
  }
  return html + '</div>';
}

function makePdf(d, p, id) {
  var html = '<html><head><meta charset="utf-8"></head><body style="margin:28px">' + packHtml(d, p, false) + '</body></html>';
  var name = id + ' - USE Pack - ' + String(d.name).replace(/[^\w\s-]/g, '').trim() + '.pdf';
  var blob = Utilities.newBlob(html, 'text/html', 'pack.html').getAs('application/pdf').setName(name);
  return DriveApp.getFolderById(prop('PACKS_ID')).createFile(blob);
}

/* Free: the visitor gets their one thing by email, and the way to unlock the rest. */
function notifyVisitor(d, p, id) {
  var f = p.first_step || {}, link = prop('SITE_URL') + 'commit.html#commit';
  MailApp.sendEmail({
    to: d.email, name: 'Oluwaseyi Ashiru', replyTo: prop('OWNER_EMAIL'),
    subject: 'Your one thing today: ' + p.title,
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#14213D;max-width:600px"><p>Hello ' + esc(d.name) + ',</p>' +
      '<p>Here is your first step, made from what you shared.</p>' +
      '<div style="background:#14213D;color:#F7F5F0;border-radius:12px;padding:16px 18px;margin:14px 0"><p style="font-family:Georgia,serif;color:#D4A24C;font-size:18px;margin:0 0 6px">Your one thing today</p>' +
      (f.from_source ? '<p style="margin:0 0 6px;font-size:12px;color:#D4A24C">From what you shared: ' + esc(f.from_source) + '</p>' : '') +
      '<p style="margin:0 0 8px;font-size:14px">' + esc(f.action) + '</p>' + (f.how && f.how.length ? '<ol style="margin:0 0 8px;padding-left:18px;font-size:13px">' + f.how.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol>' : '') +
      '<p style="margin:0;font-size:12px;color:#C9CEDA">Time: ' + esc(f.time) + (f.done_when ? ' · Done when: ' + esc(f.done_when) : '') + '</p></div>' +
      '<p>Your full USE Pack is ready too: every step after this one, a truth check, a 7-day tracker and fixes for when you get stuck. <a href="' + link + '" style="color:#B07F2A;font-weight:bold">Unlock it for $1</a>. Your pack number is <b>' + id + '</b>.</p>' +
      '<p>Now use it.<br>Oluwaseyi Ashiru · Making Knowledge Usable</p></div>'
  });
}

/* What the free page may see. The rest stays in Drive until the $1 is confirmed. */
function freePart(p) {
  return { title: p.title, source: p.source, source_read: p.source_read, note_to_visitor: p.note_to_visitor, first_step: p.first_step,
    teaser: { plan: (p.plan || []).length, checks: (p.checks || []).length, tracker: (p.tracker || []).length, stuck: (p.stuck || []).length } };
}

function savePack(id, d, p, pdf) {
  var data = { id: id, created: new Date().toISOString(), email: d.email, name: d.name, pdfId: pdf.getId(), pack: p };
  DriveApp.getFolderById(prop('PACKS_ID')).createFile(id + '.json', JSON.stringify(data), 'application/json');
}
function loadPack(id) {
  if (!/^OA-[\w-]+$/.test(String(id || ''))) return null;
  var it = DriveApp.getFolderById(prop('PACKS_ID')).getFilesByName(id + '.json');
  return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null;
}

/* $1 unlock: confirm the payment with Paystack, then release the full pack, the PDF and the email. */
function unlock(d) {
  var saved = loadPack(d.id);
  if (!saved) return { ok: false, error: 'We couldn’t find that pack. Message +2347033134979 on WhatsApp with your pack number.' };
  var props = PropertiesService.getScriptProperties(), ref = String(d.reference || '').trim();
  var used = props.getProperty('REF_' + ref);
  if (!ref) return { ok: false, error: 'No payment reference came back from the checkout.' };
  if (used && used !== d.id) return { ok: false, error: 'That payment has already been used for another pack.' };
  if (!used) {
    var secret = prop('PAYSTACK_SECRET_KEY');
    if (!secret) return { ok: false, error: 'Payments are not switched on yet. Message +2347033134979 on WhatsApp with your pack number ' + d.id + '.' };
    var r = UrlFetchApp.fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref), { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + secret } });
    var v = JSON.parse(r.getContentText() || '{}'), t = v.data || {};
    var min = t.currency === 'USD' ? Number(prop('PAY_MIN_USD')) * 100 : Number(prop('PAY_MIN_NGN')) * 100;
    if (!v.status || t.status !== 'success') return { ok: false, error: 'We couldn’t confirm that payment yet. If you were charged, message +2347033134979 on WhatsApp with your pack number ' + d.id + '.' };
    if (Number(t.amount) < min) return { ok: false, error: 'That payment was less than the unlock amount.' };
    props.setProperty('REF_' + ref, d.id);
    MailApp.sendEmail({ to: saved.email, name: 'Oluwaseyi Ashiru', replyTo: prop('OWNER_EMAIL'), subject: 'Your full USE Pack: ' + saved.pack.title,
      htmlBody: '<p>Hello ' + esc(saved.name) + ',</p><p>Thank you for committing. Your full USE Pack is attached and below.</p>' + packHtml({ name: saved.name, link: '' }, saved.pack, false) + '<p>Now use it.</p>',
      attachments: [DriveApp.getFileById(saved.pdfId).getBlob()] });
    markRow(d.id, 'Paid $1', 'Unlocked · ' + ref);
  }
  var pdf = DriveApp.getFileById(saved.pdfId);
  return { ok: true, id: d.id, pack: saved.pack, pdf: Utilities.base64Encode(pdf.getBlob().getBytes()), pdfName: pdf.getName() };
}

function markRow(id, stage, status) {
  var sh = SpreadsheetApp.openById(prop('SHEET_ID')).getSheetByName('Entries'), last = sh.getLastRow(); if (last < 2) return;
  var ids = sh.getRange(2, 2, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (ids[i][0] === id) { sh.getRange(i + 2, 19, 1, 2).setValues([[stage, status]]); return; }
}

/* Deeper Systems ($5 a month): confirm the subscription payment, record the member, tell both sides. */
function member(d) {
  var ref = String(d.reference || '').trim(), secret = prop('PAYSTACK_SECRET_KEY');
  if (!ref) return { ok: false, error: 'No payment reference came back from the checkout.' };
  if (!secret) return { ok: false, error: 'Payments are not switched on yet. Message +2347033134979 on WhatsApp.' };
  var props = PropertiesService.getScriptProperties();
  var r = UrlFetchApp.fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref), { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + secret } });
  var v = JSON.parse(r.getContentText() || '{}'), t = v.data || {}, cust = t.customer || {};
  if (!v.status || t.status !== 'success') return { ok: false, error: 'We couldn’t confirm that payment yet. If you were charged, message +2347033134979 on WhatsApp.' };
  var email = cust.email || '', first = props.getProperty('MREF_' + ref);
  if (!first) {
    props.setProperty('MREF_' + ref, email || 'yes');
    var ss = SpreadsheetApp.openById(prop('SHEET_ID')), sh = ss.getSheetByName('Members');
    var H = ['Joined', 'Email', 'Name', 'Phone', 'Plan', 'Amount', 'Currency', 'Reference', 'Packs used this month', 'Status'];
    if (!sh) { sh = ss.insertSheet('Members'); sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#14213D').setFontColor('#F7F5F0'); sh.setFrozenRows(1); }
    var name = [cust.first_name, cust.last_name].filter(Boolean).join(' ');
    sh.appendRow([new Date(), email, name, cust.phone || '', (t.plan_object && t.plan_object.name) || 'Deeper Systems', Number(t.amount) / 100, t.currency, ref, 0, 'Active']);
    MailApp.sendEmail({ to: prop('OWNER_EMAIL'), subject: 'New Deeper Systems member: ' + (name || email), body: 'Email: ' + email + '\nName: ' + name + '\nAmount: ' + (Number(t.amount) / 100) + ' ' + t.currency + '\nReference: ' + ref });
    if (email) MailApp.sendEmail({ to: email, name: 'Oluwaseyi Ashiru', replyTo: prop('OWNER_EMAIL'), subject: 'Welcome to Deeper Systems',
      htmlBody: '<p>Welcome' + (name ? ', ' + esc(name.split(' ')[0]) : '') + '.</p><p>Your Deeper Systems month has started: ten full USE Packs from your own links and uploads. Use this email address on the Start page and your packs open in full.</p><p>Now use it.<br>Oluwaseyi Ashiru</p>' });
  }
  return { ok: true, email: email };
}

/* Members get up to 10 full packs a calendar month. Returns the pack number this month, or 0. */
function memberUse(email) {
  email = String(email || '').toLowerCase().trim(); if (!email) return 0;
  var sh = SpreadsheetApp.openById(prop('SHEET_ID')).getSheetByName('Members'); if (!sh || sh.getLastRow() < 2) return 0;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues(), idx = -1;
  for (var i = rows.length - 1; i >= 0; i--) if (String(rows[i][1]).toLowerCase() === email && rows[i][9] === 'Active') { idx = i; break; }
  if (idx < 0) return 0;
  var key = 'MUSE_' + email + '_' + Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyyyMM'), props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty(key) || 0); if (n >= 10) return 0;
  props.setProperty(key, String(n + 1)); sh.getRange(idx + 2, 9).setValue(n + 1);
  return n + 1;
}

/* Speaking requests from speak.html: a row in "Bookings" and an email to the owner. */
function booking(d) {
  if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ''))) return { ok: false, error: 'Add your name and a valid email.' };
  var ss = SpreadsheetApp.openById(prop('SHEET_ID')), sh = ss.getSheetByName('Bookings');
  var H = ['Received', 'Name', 'Organisation', 'Email', 'Phone', 'Event', 'Date', 'Where', 'City / venue', 'Audience', 'Talk', 'Format', 'Brief', 'Status'];
  if (!sh) { sh = ss.insertSheet('Bookings'); sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#14213D').setFontColor('#F7F5F0'); sh.setFrozenRows(1); }
  var row = [new Date(), d.name, d.org, d.email, d.phone, d.event, d.date, d.where, d.city, d.size, d.topic, d.format, d.brief, 'New'];
  sh.appendRow(row);
  MailApp.sendEmail({ to: prop('OWNER_EMAIL'), replyTo: d.email, subject: 'Speaking request: ' + (d.org || d.name) + (d.date ? ' · ' + d.date : ''),
    htmlBody: '<table style="font-family:Arial,sans-serif;font-size:13px">' + H.slice(1, 13).map(function (h, i) { return '<tr><td style="padding:4px 10px;color:#5A6275">' + h + '</td><td style="padding:4px 10px">' + esc(row[i + 1]) + '</td></tr>'; }).join('') + '</table>' });
  return { ok: true };
}

function notifyOwner(d, p, pdf, upload, id) {
  var o = p.owner || {};
  MailApp.sendEmail({
    to: prop('OWNER_EMAIL'), name: 'USE Pack engine', replyTo: d.email,
    subject: '[' + (o.readiness || 'New') + '] ' + d.name + ': ' + p.title + ' (' + id + ')',
    htmlBody: '<p><b>' + esc(d.name) + '</b> · ' + esc(d.email) + ' · WhatsApp: ' + esc(d.whatsapp || 'not given') + '</p>' +
      '<p><b>Their challenge:</b> ' + esc(o.challenge) + '<br><b>Ready for the $1 step:</b> ' + esc(o.readiness) + '<br><b>Our next action:</b> ' + esc(o.next_action) + '</p>' +
      '<p>Link: ' + esc(d.link || 'none') + (upload ? '<br>Upload: ' + upload.file.getUrl() : '') + '<br>PDF: ' + pdf.getUrl() + '</p>' + packHtml(d, p, true),
    attachments: [pdf.getBlob()]
  });
}

function logRow(d, p, pdf, upload, source, id) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var o = p.owner || {};
    SpreadsheetApp.openById(prop('SHEET_ID')).getSheetByName('Entries').appendRow([
      new Date(), id, d.name, d.email, d.whatsapp || '', LABELS.type[d.type] || d.type, d.fieldLabel || d.field, d.what, d.want || '',
      LABELS.block[d.block] || d.block, d.time + ' min', d.link || '', upload ? upload.file.getUrl() : '', p.source_read ? 'Yes (' + source.kind + ')' : 'No (' + source.kind + ')',
      pdf.getUrl(), o.readiness || '', o.challenge || '', o.next_action || '', 'Free', 'First step sent'
    ]);
  } finally { lock.releaseLock(); }
}
