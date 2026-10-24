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
  MODEL: 'gemini-2.5-flash',
  OWNER_EMAIL: 'info@oluwaseyiashiru.com',
  DAILY_LIMIT_PER_EMAIL: '3',
  MAX_UPLOAD_MB: '25'
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
function doGet() { return json({ ok: true, service: 'USE Pack engine', ready: !!prop('GEMINI_API_KEY') && !!prop('SHEET_ID') }); }

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return json({ ok: true, ignored: true });               // honeypot: bots fill hidden fields
    var err = validate(d); if (err) return json({ ok: false, error: err });
    if (overLimit(d.email)) return json({ ok: false, error: 'You have made several packs today. Please try again tomorrow, or send your link on WhatsApp.' });

    var id = 'OA-' + Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyMMdd-HHmm') + '-' + Math.floor(Math.random() * 900 + 100);
    var upload = saveUpload(d, id);
    var source = sourceFor(d, upload);
    var pack = makePack(d, source);
    var pdf = makePdf(d, pack, id);
    notifyVisitor(d, pack, pdf);
    notifyOwner(d, pack, pdf, upload, id);
    logRow(d, pack, pdf, upload, source, id);
    return json({ ok: true, id: id, pack: pack, pdf: Utilities.base64Encode(pdf.getBlob().getBytes()), pdfName: pdf.getName() });
  } catch (x) {
    console.error(x && x.stack || x);
    return json({ ok: false, error: 'Something went wrong while making your pack. Your first step above still works; please try again in a few minutes.' });
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

function sourceFor(d, upload) {
  var link = String(d.link || '').trim();
  if (upload && /^(video|audio)\//.test(upload.blob.getContentType())) {
    var f = uploadToGemini(upload.blob);
    if (f) return { kind: 'file', part: { file_data: { mime_type: f.mimeType, file_uri: f.uri } }, read: true };
  }
  if (isYouTube(link)) return { kind: 'youtube', part: { file_data: { file_uri: link } }, read: true };
  return { kind: link ? 'link' : 'none', part: null, read: false };
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
  var brief = [
    'VISITOR',
    'Name: ' + d.name,
    'What they want to put to use: ' + (LABELS.type[d.type] || d.type),
    'Life area: ' + (d.fieldLabel || d.field),
    'Their description: ' + d.what,
    'What they want it to do for them: ' + (d.want || ''),
    'What usually stops them: ' + (LABELS.block[d.block] || d.block),
    'Time they can give today: ' + d.time + ' minutes',
    'Link they shared: ' + (d.link || 'none'),
    source.read ? 'The video is attached. Watch and listen to all of it before answering.' :
      'You CANNOT see the source itself' + (d.link ? ' (the link could not be opened automatically)' : '') + '. Work only from their description, say so in note_to_visitor, and set source_read to false.'
  ].join('\n');

  var instructions = [
    'You make knowledge usable for Oluwaseyi Ashiru ("Making Knowledge Usable"). Apply the USE method: Understand it (pick the few points that matter and check them), Simplify it (order the steps, fit them to this person’s life, shrink the first step), Execute it (one first step today, then a 7-day tracker).',
    'Voice: plain, warm, firm, everyday words a teenager or a grandmother can follow. Short sentences. Local, practical examples (the visitor is likely in Nigeria). No hype, no money promises, no "guaranteed", no invented statistics. Credit the creator of the source.',
    'Fit everything to the visitor: their life area, what they want, what stops them, and the time they have today. The first step must fit inside their time.',
    'MOST IMPORTANT: the pack must come from THIS source. First find the specific ideas, techniques, phrases and moments in it (with rough timestamps when you can). Every plan step and the first step must name one of those specific ideas and show how to use it for what the visitor wants. If the source is from another world (a film scene, a sermon, a sports clip) and the visitor wants it for business, work or life, translate the exact technique into their situation, e.g. "In the clip he does X; on your sales call, do X by ...".',
    'Never give generic advice that could fit any video ("write it in one sentence", "test with three people", "build the smallest version") unless the source itself teaches it. If you catch yourself writing a step that does not mention the source, rewrite it.',
    'The first step is a concrete task they can start right now, with exactly what to say, write or do, using the source idea, sized to their time.',
    'If the visitor’s description has typos, read past them; do not repeat the typos in the title.',
    'In checks, judge each key claim honestly: verdict is one of "Verified", "Partly true", "Opinion", "Caution". Explain why in one sentence. Do not invent sources.',
    'If the content touches health, money or law, add a caution where needed. Never encourage anything harmful.',
    'If the life area is Faith, you may add one short Bible verse from the NASB 1995 in faith_note, quoted accurately; otherwise leave faith_note empty.',
    'The owner section is private, for Oluwaseyi’s team: summarise the person, name their real challenge, judge readiness for the $1 commitment ("Ready", "Needs support" or "Not yet"), and give one concrete next action for the team.',
    'Reply with JSON only, exactly in this shape:',
    JSON.stringify({
      title: 'short usable headline', source_read: true,
      source: { title: '', creator: '', length: '', for_whom: '', status: '' },
      says: ['5 short lines'],
      checks: [{ claim: '', verdict: '', why: '' }],
      plan: [{ step: '1. ...', what: '', time: '', proof: '' }],
      first_step: { action: '', time: '', result: '' },
      tracker: [{ day: 1, morning: '', evening: '' }],
      stuck: [{ problem: '', fix: '' }],
      faith_note: '',
      note_to_visitor: '',
      owner: { summary: '', challenge: '', readiness: '', next_action: '' }
    }),
    'Use 3 to 5 plan steps, exactly 7 tracker days, and 3 stuck items.'
  ].join('\n');

  var parts = [];
  if (source.part) parts.push(source.part);
  parts.push({ text: brief });
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + prop('MODEL') + ':generateContent?key=' + prop('GEMINI_API_KEY'), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts: parts }],
      generationConfig: { temperature: 0.5, responseMimeType: 'application/json' }
    })
  });
  var body = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200 && source.part) {          // the video could not be read: retry from the description only
    console.warn('Video read failed, retrying without it: ' + res.getContentText().slice(0, 300));
    return makePack(d, { kind: 'failed', part: null, read: false });
  }
  var text = body.candidates && body.candidates[0] && body.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
  var pack = JSON.parse(String(text).replace(/^```json\s*|```$/g, ''));
  pack.source_read = !!(pack.source_read && source.read);
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
    '<div style="background:' + navy + ';color:#F7F5F0;border-radius:10px;padding:14px 16px;margin:18px 0"><p style="font-family:Georgia,serif;color:' + gold + ';font-size:18px;margin:0 0 6px">Your first step today</p><p style="margin:0 0 6px;font-size:13px">' + esc(p.first_step && p.first_step.action) + '</p><p style="margin:0;font-size:11px;color:#C9CEDA">Time: ' + esc(p.first_step && p.first_step.time) + ' · Result: ' + esc(p.first_step && p.first_step.result) + '</p></div>' +
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

function notifyVisitor(d, p, pdf) {
  MailApp.sendEmail({
    to: d.email, name: 'Oluwaseyi Ashiru', replyTo: prop('OWNER_EMAIL'),
    subject: 'Your USE Pack: ' + p.title,
    htmlBody: '<p>Hello ' + esc(d.name) + ',</p><p>Here is your USE Pack. Start with your first step today: <b>' + esc(p.first_step && p.first_step.action) + '</b></p>' + packHtml(d, p, false) +
      '<p>When you’ve done it, reply to this email or message +2347033134979 on WhatsApp. Now use it.</p>',
    attachments: [pdf.getBlob()]
  });
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
      LABELS.block[d.block] || d.block, d.time + ' min', d.link || '', upload ? upload.file.getUrl() : '', p.source_read ? 'Yes' : 'No (from description)',
      pdf.getUrl(), o.readiness || '', o.challenge || '', o.next_action || '', 'Free', 'Pack sent'
    ]);
  } finally { lock.releaseLock(); }
}
