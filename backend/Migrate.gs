/**
 * Moving the USE Pack engine to another Google account.
 *
 * Step 1, in the OLD project (old account): set NEW_OWNER below, then Run ▸ exportForMigration.
 *   It shares the engine's Drive folder and sheet with the new account, writes
 *   migration-settings.json into that folder (every setting except the two secret keys),
 *   and prints the folder ID in the log.
 *
 * Step 2, in the NEW project (new account): paste the folder ID into OLD_ROOT_ID below,
 *   then Run ▸ importFromOldAccount. It makes the new account's own copies of the folder,
 *   uploads, USE Packs and the sheet, and sets up the Script Properties to point at them.
 *   If it stops at the 6-minute limit, run it again: it skips what is already copied.
 *
 * Secret keys (GEMINI_API_KEY, PAYSTACK_SECRET_KEY) are never copied or logged.
 * Type them into the new project yourself: Project Settings ▸ Script Properties.
 */

var NEW_OWNER = 'oluwaseyiashiruii@gmail.com';
var OLD_ROOT_ID = '';   // optional: the folder ID from step 1 (it finds the shared settings file without it)
var SECRET_KEYS = ['GEMINI_API_KEY', 'PAYSTACK_SECRET_KEY'];
var MOVED_IDS = ['SHEET_ID', 'UPLOADS_ID', 'PACKS_ID'];

/* ---------- Step 1: run in the OLD project ---------- */
function exportForMigration() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var uploads = DriveApp.getFolderById(props.UPLOADS_ID);
  var root = uploads.getParents().next();
  var sheetFile = DriveApp.getFileById(props.SHEET_ID);

  root.addEditor(NEW_OWNER);
  sheetFile.addEditor(NEW_OWNER);

  var keep = {};
  Object.keys(props).forEach(function (k) { if (SECRET_KEYS.indexOf(k) < 0) keep[k] = props[k]; });
  var old = root.getFilesByName('migration-settings.json');
  while (old.hasNext()) old.next().setTrashed(true);
  root.createFile('migration-settings.json', JSON.stringify(keep), 'application/json');

  Logger.log('Shared with ' + NEW_OWNER + '. Settings saved: ' + Object.keys(keep).length + '.');
  Logger.log('OLD_ROOT_ID = ' + root.getId());
}

/* ---------- Step 2: run in the NEW project ---------- */
function importFromOldAccount() {
  var started = Date.now();
  var store = PropertiesService.getScriptProperties();

  // Find the settings file the old account shared (by folder ID if given, otherwise by name)
  var f = null;
  if (OLD_ROOT_ID) { try { f = DriveApp.getFolderById(OLD_ROOT_ID.trim()).getFilesByName('migration-settings.json'); } catch (e) { f = null; } }
  if (!f || !f.hasNext()) f = DriveApp.searchFiles("title = 'migration-settings.json' and trashed = false");
  if (!f.hasNext()) throw new Error('migration-settings.json is not visible to this account. In the OLD project, run exportForMigration and check its log says "Shared with ' + NEW_OWNER + '".');
  var old = JSON.parse(f.next().getBlob().getDataAsString());
  Logger.log('Found the old settings (' + Object.keys(old).length + ' items).');

  // New folders (made once; reused on a re-run)
  var root, uploads, packs;
  if (store.getProperty('MIGRATED_ROOT_ID')) {
    root = DriveApp.getFolderById(store.getProperty('MIGRATED_ROOT_ID'));
    uploads = DriveApp.getFolderById(store.getProperty('UPLOADS_ID'));
    packs = DriveApp.getFolderById(store.getProperty('PACKS_ID'));
  } else {
    root = DriveApp.createFolder('Turning Knowing into Doing');
    uploads = root.createFolder('Uploads');
    packs = root.createFolder('USE Packs');
    store.setProperties({ MIGRATED_ROOT_ID: root.getId(), UPLOADS_ID: uploads.getId(), PACKS_ID: packs.getId() });
  }

  // Settings, payment references and counters (not the secret keys, not the old IDs)
  var set = {};
  Object.keys(old).forEach(function (k) { if (MOVED_IDS.indexOf(k) < 0 && SECRET_KEYS.indexOf(k) < 0) set[k] = old[k]; });
  Object.keys(DEFAULTS).forEach(function (k) { if (!(k in set) && !store.getProperty(k)) set[k] = DEFAULTS[k]; });
  store.setProperties(set);

  // The sheet: one full copy, owned by this account
  if (!store.getProperty('SHEET_ID')) {
    var copy = DriveApp.getFileById(old.SHEET_ID).makeCopy('Turning Knowing into Doing — Entries', root);
    store.setProperty('SHEET_ID', copy.getId());
  }

  // Files: copy anything not already here
  var done = copyMissing(DriveApp.getFolderById(old.UPLOADS_ID), uploads, started) &&
             copyMissing(DriveApp.getFolderById(old.PACKS_ID), packs, started);
  if (!done) { Logger.log('Stopped near the time limit. Run importFromOldAccount again to finish.'); return; }

  var missing = SECRET_KEYS.filter(function (k) { return !store.getProperty(k); });
  Logger.log('Copy complete. Uploads: ' + count(uploads) + ', USE Packs: ' + count(packs) + '.');
  Logger.log(missing.length ? 'Now add by hand in Project Settings ▸ Script Properties: ' + missing.join(', ') : 'Secret keys are in place.');
}

function copyMissing(from, to, started) {
  var have = {}, it = to.getFiles();
  while (it.hasNext()) have[it.next().getName()] = true;
  var src = from.getFiles();
  while (src.hasNext()) {
    if (Date.now() - started > 5 * 60 * 1000) return false;
    var file = src.next();
    if (!have[file.getName()]) file.makeCopy(file.getName(), to);
  }
  return true;
}

function count(folder) { var n = 0, it = folder.getFiles(); while (it.hasNext()) { it.next(); n++; } return n; }
