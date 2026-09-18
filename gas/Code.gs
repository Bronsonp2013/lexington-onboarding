/**
 * Lexington New Account Application — ingestion endpoint (Google Apps Script).
 *
 * One web app, owned by Bronson's Google account, does everything a submission needs:
 *   submit  (public)   → upsert Applications row, append Contacts/Locations/Suppliers,
 *                        file PDFs in Drive, email the zipped packet from Gmail,
 *                        create the first workflow task, call the CRM adapter, log.
 *   list / get / status (rep-only, REP_TOKEN) → read rows, advance stage, set account number.
 *
 * Setup: run setup() once from the editor (authorizes Sheets, Drive, Gmail, Tasks), then
 * Deploy → New deployment → Web app → Execute as Me → Who has access: Anyone.
 * Paste the /exec URL into the site's VITE_INGEST_URL.
 */

// ---------- configuration ----------------------------------------------------------
const CONFIG = {
  repName: "Bronson Prachyl",
  repEmail: "BPrachyl@lexington.com",       // where the packet email goes
  repPhone: "214-789-9107",
  spreadsheetName: "Lexington New Accounts",
  driveRootName: "Lexington New Accounts",
  tasksListName: "Lexington Onboarding",
  maxPayloadBytes: 8 * 1024 * 1024,
  maxSubmitsPerHour: 20,
  followUpBusinessDays: 5,
};

const STAGES = [
  ["application_received", "Application received"],
  ["packet_reviewed", "Packet reviewed"],
  ["sent_to_lexington", "Sent to Lexington"],
  ["account_number_assigned", "Account number assigned"],
  ["welcome_sent", "Welcome sent"],
  ["first_order", "First order"],
];

// Must match APPLICATION_COLUMNS in src/lib/crmRecord.js (docs/CUSTOMER_RECORD.md).
const APPLICATION_COLUMNS = [
  "application_id", "submitted_at", "status", "account_number", "pathfinder_sync", "drive_folder_url", "demo",
  "business_type", "path", "account_type", "lexington_class", "pricing_tier_suggested",
  "legal_name", "dba", "entity_type",
  "address_line1", "address_line2", "city", "state", "zip", "county",
  "phone", "fax", "email", "website", "ack_method",
  "primary_contact", "primary_title", "primary_email", "primary_phone",
  "ship_to_count", "ship_to_1",
  "carrier", "preferred_carrier_name", "partial_ship_ok", "freight_state", "freight_rate_pct",
  "tax_state", "tax_permit_number", "fein", "tax_reason", "tax_certificate_file",
  "type_of_business", "date_started", "est_annual_sales", "dnb",
  "suppliers", "financial_statement_file",
  "signed_by", "signed_title", "signed_date", "sales_policy_agreed",
  "source_url", "record_version",
];
// Appended by the script (not sent by the client).
const EXTRA_COLUMNS = ["received_at", "updated_at", "pathfinder_account_id", "notes", "record_json", "submission_json"];
const ALL_COLUMNS = APPLICATION_COLUMNS.concat(EXTRA_COLUMNS);

const CONTACT_COLUMNS = ["application_id", "legal_name", "role", "first_name", "last_name", "title", "email", "phone", "is_primary"];
const LOCATION_COLUMNS = ["application_id", "legal_name", "kind", "label", "address_line1", "address_line2", "city", "state", "postal_code", "is_primary", "attention", "phone", "is_dc", "hours", "days", "holidays"];
const SUPPLIER_COLUMNS = ["application_id", "legal_name", "company", "contact", "phone", "account"];
const LOG_COLUMNS = ["at", "application_id", "action", "step", "ok", "detail"];

const WELCOME_TEMPLATE = {
  subject: "Welcome aboard — Your Lexington account is open",
  body:
    "Hi {{first_name}},\n\n" +
    "Great news—your account with Lexington Home Brands is now open! Welcome aboard.\n\n" +
    "Here's a quick summary of what's available to you:\n\n" +
    "- Account Number: {{account_number}}\n" +
    "- Brands: Lexington, Tommy Bahama Home, Artistica, Barclay Butera, Sligh\n" +
    "- Pricing Tier: {{pricing_tier}}\n\n" +
    "To place an order, simply reach out to me with the items you're interested in and I'll provide pricing and lead times. You can also browse our collections online at lexington.com.\n\n" +
    "I'm here to help with product selection, pricing, fabric options, and anything else you need. Don't hesitate to reach out.\n\n" +
    "Looking forward to working with you!\n\n" +
    "Thanks,\n\nBronson Prachyl\nSales Representative\n1300 National Highway, Thomasville NC 27360\n214-789-9107  |  BPrachyl@lexington.com  |  lexington.com\n",
};

// ---------- one-time setup ------------------------------------------------------------
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  if (props.getProperty("SHEET_ID")) ss = SpreadsheetApp.openById(props.getProperty("SHEET_ID"));
  else { ss = SpreadsheetApp.create(CONFIG.spreadsheetName); props.setProperty("SHEET_ID", ss.getId()); }

  ensureSheet_(ss, "Applications", ALL_COLUMNS);
  ensureSheet_(ss, "Contacts", CONTACT_COLUMNS);
  ensureSheet_(ss, "Locations", LOCATION_COLUMNS);
  ensureSheet_(ss, "Suppliers", SUPPLIER_COLUMNS);
  ensureSheet_(ss, "Log", LOG_COLUMNS);
  const cfg = ensureSheet_(ss, "Config", ["key", "value"]);
  if (cfg.getLastRow() < 2) {
    cfg.getRange(2, 1, 3, 2).setValues([
      ["stages", STAGES.map((s) => s.join("=")).join("|")],
      ["follow_up_business_days", CONFIG.followUpBusinessDays],
      ["rep_email", CONFIG.repEmail],
    ]);
  }
  const first = ss.getSheets()[0];
  if (first.getName() === "Sheet1" && first.getLastRow() === 0) ss.deleteSheet(first);

  if (!props.getProperty("DRIVE_ROOT_ID")) {
    const root = DriveApp.createFolder(CONFIG.driveRootName);
    props.setProperty("DRIVE_ROOT_ID", root.getId());
  }
  if (!props.getProperty("REP_TOKEN")) props.setProperty("REP_TOKEN", Utilities.getUuid().replace(/-/g, ""));
  ensureTaskList_();

  // installable trigger so hand edits to Status / Account number fire the workflow hooks
  const has = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === "onSheetEdit");
  if (!has) ScriptApp.newTrigger("onSheetEdit").forSpreadsheet(ss).onEdit().create();

  Logger.log("Sheet: %s", ss.getUrl());
  Logger.log("Drive folder id: %s", props.getProperty("DRIVE_ROOT_ID"));
  Logger.log("REP_TOKEN (paste into rep tools): %s", props.getProperty("REP_TOKEN"));
}

function ensureSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
    sh.setFrozenRows(1);
  } else {
    // add any new columns at the end without disturbing existing data
    const existing = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].filter(String);
    const missing = header.filter((h) => existing.indexOf(h) < 0);
    if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold");
  }
  return sh;
}

function ensureTaskList_() {
  try {
    const lists = Tasks.Tasklists.list().items || [];
    let list = lists.filter((l) => l.title === CONFIG.tasksListName)[0];
    if (!list) list = Tasks.Tasklists.insert({ title: CONFIG.tasksListName });
    PropertiesService.getScriptProperties().setProperty("TASKS_LIST_ID", list.id);
    return list.id;
  } catch (e) { Logger.log("Tasks unavailable: " + e); return null; }
}

// ---------- HTTP -------------------------------------------------------------------------
function doGet() {
  return json_({ ok: true, service: "lexington-onboarding-ingest", version: 1 });
}

function doPost(e) {
  let body = {};
  try {
    const raw = (e && e.postData && e.postData.contents) || "{}";
    if (raw.length > CONFIG.maxPayloadBytes) return json_({ ok: false, error: "Payload too large" });
    body = JSON.parse(raw);
  } catch (err) { return json_({ ok: false, error: "Bad JSON" }); }

  const action = body.action || "submit";
  try {
    if (action === "submit") return json_(handleSubmit_(body));
    requireRep_(body);
    if (action === "list") return json_(handleList_(body));
    if (action === "get") return json_(handleGet_(body));
    if (action === "status") return json_(handleStatus_(body));
    return json_({ ok: false, error: "Unknown action" });
  } catch (err) {
    log_(body.application_id || (body.record && body.record.application_id) || "", action, "error", false, String(err));
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function requireRep_(body) {
  const token = PropertiesService.getScriptProperties().getProperty("REP_TOKEN");
  if (!token || body.token !== token) throw new Error("Not authorized");
}

// ---------- submit -------------------------------------------------------------------------
function handleSubmit_(body) {
  const record = body.record, submission = body.submission || {};
  if (!record || !record.application_id || !record.account || !record.account.name) throw new Error("Missing record");
  if (record.demo) return { ok: true, demo: true, steps: [] };
  if (body.website) return { ok: true, steps: [] }; // honeypot: pretend success, store nothing
  rateLimit_();

  const steps = [];
  const id = record.application_id;
  const ss = sheet_();

  // 1. durable first: the Applications row (upsert) + child rows
  const row = body.row || flattenRecord_(record);
  row.received_at = row.received_at || new Date().toISOString();
  row.updated_at = new Date().toISOString();
  row.status = row.status || "application_received";
  row.pathfinder_sync = row.pathfinder_sync || "pending";
  row.record_json = JSON.stringify(record);
  row.submission_json = JSON.stringify(submission);
  const existed = upsertRow_(ss.getSheetByName("Applications"), ALL_COLUMNS, "application_id", id, row);
  replaceChildRows_(ss.getSheetByName("Contacts"), CONTACT_COLUMNS, id,
    (record.contacts || []).map((c) => Object.assign({ application_id: id, legal_name: record.account.name }, c, { is_primary: c.is_primary ? "yes" : "" })));
  replaceChildRows_(ss.getSheetByName("Locations"), LOCATION_COLUMNS, id,
    (record.locations || []).map((l) => Object.assign({ application_id: id, legal_name: record.account.name }, l, { is_primary: l.is_primary ? "yes" : "", is_dc: l.is_dc ? "yes" : "" })));
  replaceChildRows_(ss.getSheetByName("Suppliers"), SUPPLIER_COLUMNS, id,
    ((record.onboarding && record.onboarding.suppliers) || []).map((s) => Object.assign({ application_id: id, legal_name: record.account.name }, s)));
  steps.push({ step: "sheet", ok: true, detail: existed ? "updated" : "created" });
  log_(id, "submit", "sheet", true, existed ? "updated existing row" : "new row");

  // 2. Drive folder with every file
  let folderUrl = "", blobs = [];
  try {
    const folder = folderFor_(record);
    const files = body.files || [];
    files.forEach((f) => {
      const blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.mime || "application/octet-stream", f.name);
      blobs.push(blob);
      const old = folder.getFilesByName(f.name);
      while (old.hasNext()) old.next().setTrashed(true);
      folder.createFile(blob);
    });
    folder.createFile(Utilities.newBlob(JSON.stringify(record, null, 2), "application/json", "customer_record.json"));
    if (!files.some((f) => f.name === "submission.json")) folder.createFile(Utilities.newBlob(JSON.stringify(submission, null, 2), "application/json", "submission.json"));
    folderUrl = folder.getUrl();
    updateCells_(ss.getSheetByName("Applications"), ALL_COLUMNS, id, { drive_folder_url: folderUrl });
    steps.push({ step: "drive", ok: true, detail: folderUrl });
    log_(id, "submit", "drive", true, folderUrl);
  } catch (err) { steps.push({ step: "drive", ok: false, detail: String(err) }); log_(id, "submit", "drive", false, String(err)); }

  // 3. email the packet from Gmail
  try {
    const zipName = "LHB-New-Account-" + slug_(record.account.name) + "-" + (record.submitted_at || "").slice(0, 10) + ".zip";
    const attachments = blobs.length ? [Utilities.zip(blobs, zipName)] : [];
    const primary = (record.contacts || [])[0] || {};
    GmailApp.sendEmail(CONFIG.repEmail,
      "New account application — " + record.account.name + " (" + id + ")",
      (body.summary || flatSummary_(record)) + "\n\nDrive folder: " + (folderUrl || "(not filed)") + "\nApplication row: " + ss.getUrl() + "\n",
      { name: "Lexington New Account Application", replyTo: primary.email || record.account.email || "", attachments: attachments });
    steps.push({ step: "email", ok: true, detail: CONFIG.repEmail });
    log_(id, "submit", "email", true, CONFIG.repEmail);
  } catch (err) { steps.push({ step: "email", ok: false, detail: String(err) }); log_(id, "submit", "email", false, String(err)); }

  // 4. first workflow task
  try {
    const t = createTask_("Review packet — " + record.account.name, "Application " + id + "\n" + (folderUrl || ""), businessDaysFrom_(new Date(), 1));
    steps.push({ step: "task", ok: !!t, detail: t ? "Review packet (due tomorrow)" : "Tasks unavailable" });
  } catch (err) { steps.push({ step: "task", ok: false, detail: String(err) }); }

  // 5. CRM adapter
  crmDispatch_("onApplicationReceived", record, { folderUrl: folderUrl });

  return { ok: true, application_id: id, steps: steps, sheet_url: ss.getUrl(), drive_folder_url: folderUrl };
}

function rateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = "submits:" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHH");
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 3600);
  if (n > CONFIG.maxSubmitsPerHour) throw new Error("Too many submissions right now. Please try again in an hour.");
}

function folderFor_(record) {
  const root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("DRIVE_ROOT_ID"));
  const year = String((record.submitted_at || new Date().toISOString()).slice(0, 4));
  const yearFolder = childFolder_(root, year);
  return childFolder_(yearFolder, (record.account.name || "Application") + " — " + record.application_id);
}
function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ---------- rep actions ----------------------------------------------------------------------
function handleList_(body) {
  const sh = sheet_().getSheetByName("Applications");
  const rows = readRows_(sh, ALL_COLUMNS);
  const light = rows.map((r) => {
    const o = {};
    ["application_id", "submitted_at", "status", "account_number", "legal_name", "dba", "business_type", "path", "city", "state", "primary_contact", "primary_email", "primary_phone", "carrier", "drive_folder_url", "pathfinder_sync", "updated_at"].forEach((k) => { o[k] = r[k]; });
    return o;
  }).sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
  return { ok: true, applications: light, stages: STAGES, sheet_url: sheet_().getUrl() };
}

function handleGet_(body) {
  const sh = sheet_().getSheetByName("Applications");
  const r = readRows_(sh, ALL_COLUMNS).filter((x) => x.application_id === body.application_id)[0];
  if (!r) throw new Error("Not found");
  let record = null, submission = null;
  try { record = JSON.parse(r.record_json || "null"); } catch (e) { /* ignore */ }
  try { submission = JSON.parse(r.submission_json || "null"); } catch (e) { /* ignore */ }
  delete r.record_json; delete r.submission_json;
  return { ok: true, row: r, record: record, submission: submission };
}

function handleStatus_(body) {
  const id = body.application_id;
  if (!id) throw new Error("application_id required");
  const changes = {};
  if (body.status) {
    if (!STAGES.some((s) => s[0] === body.status)) throw new Error("Unknown stage");
    changes.status = body.status;
  }
  if (body.account_number != null) changes.account_number = String(body.account_number).trim();
  if (body.notes != null) changes.notes = body.notes;
  if (body.pathfinder_sync) changes.pathfinder_sync = body.pathfinder_sync;
  if (body.pathfinder_account_id != null) changes.pathfinder_account_id = body.pathfinder_account_id;
  changes.updated_at = new Date().toISOString();
  const sh = sheet_().getSheetByName("Applications");
  const before = readRows_(sh, ALL_COLUMNS).filter((x) => x.application_id === id)[0];
  if (!before) throw new Error("Not found");
  updateCells_(sh, ALL_COLUMNS, id, changes);
  const after = Object.assign({}, before, changes);
  const events = applyWorkflow_(before, after);
  return { ok: true, application_id: id, status: after.status, account_number: after.account_number, events: events };
}

// Fires for manual edits in the sheet as well as API changes.
function onSheetEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== "Applications" || e.range.getRow() < 2) return;
    const col = ALL_COLUMNS[e.range.getColumn() - 1];
    if (col !== "status" && col !== "account_number") return;
    const rowVals = sh.getRange(e.range.getRow(), 1, 1, ALL_COLUMNS.length).getValues()[0];
    const after = {}; ALL_COLUMNS.forEach((k, i) => { after[k] = rowVals[i]; });
    const before = Object.assign({}, after, { [col]: e.oldValue });
    applyWorkflow_(before, after);
  } catch (err) { log_("", "onEdit", "error", false, String(err)); }
}

// Workflow rules. Nothing is ever sent automatically; drafts and tasks only.
function applyWorkflow_(before, after) {
  const events = [];
  const id = after.application_id;
  const name = after.legal_name || "";
  if (before.status !== after.status) {
    log_(id, "status", after.status, true, "from " + (before.status || "—"));
    events.push("status:" + after.status);
    if (after.status === "sent_to_lexington") {
      createTask_("Follow up with Lexington — " + name, "Application " + id + " sent to newaccount@lexington.com. Chase if no account number yet.", businessDaysFrom_(new Date(), CONFIG.followUpBusinessDays));
      events.push("task:follow_up");
    }
    if (after.status === "first_order") events.push("done");
    crmDispatch_("onStatusChanged", rowToRecordStub_(after), { from: before.status, to: after.status });
  }
  const gotNumber = String(after.account_number || "").trim() && String(after.account_number || "").trim() !== String(before.account_number || "").trim();
  if (gotNumber) {
    log_(id, "account_number", after.account_number, true, "");
    events.push("account_number");
    const draft = createWelcomeDraft_(after);
    if (draft) events.push("draft:welcome");
    createTask_("Send welcome email — " + name, "Draft is in Gmail. Review and send. Account " + after.account_number, businessDaysFrom_(new Date(), 1));
    events.push("task:welcome");
    if (["application_received", "packet_reviewed", "sent_to_lexington"].indexOf(after.status) >= 0) {
      updateCells_(sheet_().getSheetByName("Applications"), ALL_COLUMNS, id, { status: "account_number_assigned" });
      events.push("status:account_number_assigned");
    }
    crmDispatch_("onAccountNumberAssigned", rowToRecordStub_(after), { account_number: after.account_number });
  }
  return events;
}

function createWelcomeDraft_(row) {
  const to = row.primary_email || row.email;
  if (!to) return null;
  const first = String(row.primary_contact || "").split(" ")[0] || "there";
  const body = WELCOME_TEMPLATE.body
    .replace("{{first_name}}", first)
    .replace("{{account_number}}", row.account_number)
    .replace("{{pricing_tier}}", row.pricing_tier_suggested || "");
  try { return GmailApp.createDraft(to, WELCOME_TEMPLATE.subject, body, { name: CONFIG.repName }); }
  catch (err) { log_(row.application_id, "draft", "welcome", false, String(err)); return null; }
}

// ---------- CRM adapter -----------------------------------------------------------------------
// Targets implement onApplicationReceived / onStatusChanged / onAccountNumberAssigned.
// Pathfinder cannot be pushed to (NAS, Tailscale-only), so its target only marks the
// queue; Pathfinder's importer pulls rows where pathfinder_sync = pending.
const CRM_TARGETS = [
  {
    name: "pathfinder-queue",
    onApplicationReceived: function (record, ctx) {
      updateCells_(sheet_().getSheetByName("Applications"), ALL_COLUMNS, record.application_id, { pathfinder_sync: "pending" });
      return "queued";
    },
    onStatusChanged: function (record, ctx) { return "noted " + ctx.to; },
    onAccountNumberAssigned: function (record, ctx) { return "external_id ready: " + ctx.account_number; },
  },
  // Later: { name: "pathfinder-api", onApplicationReceived: (r) => UrlFetchApp.fetch(PATHFINDER_URL + "/api/onboarding", {...}) }
];

function crmDispatch_(event, record, ctx) {
  CRM_TARGETS.forEach((t) => {
    try {
      const out = t[event] ? t[event](record, ctx || {}) : "skipped";
      log_(record.application_id, "crm:" + t.name, event, true, String(out || ""));
    } catch (err) { log_(record.application_id, "crm:" + t.name, event, false, String(err)); }
  });
}

// ---------- sheet helpers ----------------------------------------------------------------------
function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("Run setup() first");
  return SpreadsheetApp.openById(id);
}

function readRows_(sh, columns) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const width = Math.max(columns.length, sh.getLastColumn());
  const header = sh.getRange(1, 1, 1, width).getValues()[0];
  const vals = sh.getRange(2, 1, last - 1, width).getValues();
  return vals.map((v, i) => { const o = { _row: i + 2 }; header.forEach((h, j) => { if (h) o[h] = v[j]; }); return o; });
}

function colIndex_(sh, name) {
  const header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const i = header.indexOf(name);
  return i < 0 ? -1 : i + 1;
}

function upsertRow_(sh, columns, keyCol, keyVal, obj) {
  const rows = readRows_(sh, columns);
  const hit = rows.filter((r) => String(r[keyCol]) === String(keyVal))[0];
  const header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const line = header.map((h) => (h in obj ? cell_(obj[h]) : (hit ? hit[h] : "")));
  if (hit) { sh.getRange(hit._row, 1, 1, line.length).setValues([line]); return true; }
  sh.appendRow(line);
  return false;
}

function updateCells_(sh, columns, keyVal, changes) {
  const rows = readRows_(sh, columns);
  const hit = rows.filter((r) => String(r.application_id) === String(keyVal))[0];
  if (!hit) return false;
  Object.keys(changes).forEach((k) => {
    const c = colIndex_(sh, k);
    if (c > 0) sh.getRange(hit._row, c).setValue(cell_(changes[k]));
  });
  return true;
}

function replaceChildRows_(sh, columns, id, items) {
  const rows = readRows_(sh, columns).filter((r) => String(r.application_id) === String(id));
  for (let i = rows.length - 1; i >= 0; i--) sh.deleteRow(rows[i]._row);
  if (!items.length) return;
  const header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const lines = items.map((it) => header.map((h) => (h in it ? cell_(it[h]) : "")));
  sh.getRange(sh.getLastRow() + 1, 1, lines.length, header.length).setValues(lines);
}

function cell_(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

function log_(id, action, step, ok, detail) {
  try { sheet_().getSheetByName("Log").appendRow([new Date().toISOString(), id, action, step, ok ? "ok" : "fail", String(detail || "").slice(0, 500)]); }
  catch (e) { Logger.log("log failed: " + e); }
}

// Fallback flattening when the client did not send `row` (keeps the sheet usable from any caller).
function flattenRecord_(r) {
  const a = r.account || {}, o = r.onboarding || {}, p = (r.contacts || [])[0] || {};
  const ship = (r.locations || []).filter((l) => l.kind === "ship_to");
  return {
    application_id: r.application_id, submitted_at: r.submitted_at, status: r.status, account_number: r.account_number,
    pathfinder_sync: r.pathfinder_sync, drive_folder_url: r.drive_folder_url, demo: r.demo ? "yes" : "",
    business_type: a.business_type_label, path: a.path, account_type: a.account_type, lexington_class: a.lexington_class, pricing_tier_suggested: a.pricing_tier_suggested,
    legal_name: a.name, dba: a.dba, entity_type: a.entity_type,
    address_line1: a.address_line1, address_line2: a.address_line2, city: a.city, state: a.state, zip: a.zip, county: a.county,
    phone: a.phone, fax: a.fax, email: a.email, website: a.website, ack_method: a.ack_method,
    primary_contact: [p.first_name, p.last_name].filter(Boolean).join(" "), primary_title: p.title, primary_email: p.email, primary_phone: p.phone,
    ship_to_count: ship.length, ship_to_1: ship[0] ? ship[0].label + " · " + ship[0].address_line1 + ", " + ship[0].city + ", " + ship[0].state + " " + ship[0].postal_code : "",
    carrier: o.carrier, preferred_carrier_name: o.preferred_carrier_name, partial_ship_ok: o.partial_ship_ok ? "yes" : "no",
    freight_state: o.freight_state, freight_rate_pct: o.freight_rate_pct,
    tax_state: o.tax_state, tax_permit_number: o.tax_permit_number, fein: o.fein, tax_reason: o.tax_reason, tax_certificate_file: o.tax_certificate_file,
    type_of_business: a.type_of_business, date_started: a.date_started, est_annual_sales: a.est_annual_sales, dnb: a.dnb,
    suppliers: (o.suppliers || []).map((s) => s.company + " (" + s.phone + ")").join("; "), financial_statement_file: o.financial_statement_file,
    signed_by: o.signed_by, signed_title: o.signed_title, signed_date: o.signed_date, sales_policy_agreed: o.sales_policy_agreed ? "yes" : "no",
    source_url: (r.source || {}).url, record_version: r.record_version,
  };
}

function rowToRecordStub_(row) {
  return { application_id: row.application_id, account: { name: row.legal_name, email: row.email }, status: row.status, account_number: row.account_number };
}

function flatSummary_(r) {
  const a = r.account || {}, p = (r.contacts || [])[0] || {};
  return [
    "LEXINGTON HOME BRANDS — NEW ACCOUNT APPLICATION " + r.application_id,
    "Company: " + a.name + (a.dba ? " (dba " + a.dba + ")" : ""),
    "Type: " + a.business_type_label + " · " + a.path,
    "Address: " + [a.address_line1, a.address_line2].filter(Boolean).join(", ") + ", " + a.city + ", " + a.state + " " + a.zip,
    "Phone: " + a.phone + " · Email: " + a.email,
    "Primary contact: " + [p.first_name, p.last_name].filter(Boolean).join(" ") + " · " + (p.email || "") + " · " + (p.phone || ""),
  ].join("\n");
}

// ---------- tasks / dates ----------------------------------------------------------------------
function createTask_(title, notes, due) {
  const listId = PropertiesService.getScriptProperties().getProperty("TASKS_LIST_ID") || ensureTaskList_();
  if (!listId) return null;
  try {
    return Tasks.Tasks.insert({ title: title, notes: notes || "", due: Utilities.formatDate(due, "UTC", "yyyy-MM-dd'T'00:00:00.000'Z'") }, listId);
  } catch (err) { log_("", "task", title, false, String(err)); return null; }
}

function businessDaysFrom_(start, n) {
  const d = new Date(start.getTime());
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) left--; }
  return d;
}

function slug_(s) { return String(s || "application").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 48); }

// ---------- editor test --------------------------------------------------------------------------
// Runs a fictional submission through the whole path twice (second call must update, not duplicate).
function test_submit() {
  const id = "LHB-TEST-" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHHmm");
  const record = {
    record_version: 1, application_id: id, submitted_at: new Date().toISOString(), demo: false,
    status: "application_received", account_number: "", pathfinder_sync: "pending", drive_folder_url: "",
    account: { name: "Test Company " + id, dba: "", entity_type: "LLC", account_type: "designer", business_type: "designer", business_type_label: "Interior Designer", path: "designer",
      lexington_class: "designer", pricing_tier_suggested: "Designer", address_line1: "1 Main St", address_line2: "", city: "Dallas", state: "TX", zip: "75201", county: "Dallas", country: "US",
      phone: "(214) 555-0100", fax: "", email: "test@example.com", website: "", ack_method: "email" },
    contacts: [{ role: "applicant", first_name: "Test", last_name: "Person", title: "Principal", email: "test@example.com", phone: "(214) 555-0100", is_primary: true }],
    locations: [{ label: "Business", kind: "business", address_line1: "1 Main St", address_line2: "", city: "Dallas", state: "TX", postal_code: "75201", country: "US", is_primary: true }],
    onboarding: { carrier: "prepaid_freight_program", freight_state: "TX", freight_rate_pct: 16.25, tax_state: "TX", tax_permit_number: "3-00000-0000-0", suppliers: [], signed_by: "Test Person", signed_title: "Principal", signed_date: "2026-01-01", sales_policy_agreed: true },
    source: { app: "lexington-onboarding", url: "editor-test" },
  };
  const files = [{ name: "test.txt", mime: "text/plain", base64: Utilities.base64Encode("hello") }];
  const r1 = handleSubmit_({ action: "submit", record: record, submission: { meta: { id: id } }, files: files });
  const r2 = handleSubmit_({ action: "submit", record: record, submission: { meta: { id: id } }, files: files });
  Logger.log(JSON.stringify(r1)); Logger.log(JSON.stringify(r2));
  const rows = readRows_(sheet_().getSheetByName("Applications"), ALL_COLUMNS).filter((x) => x.application_id === id);
  Logger.log("rows for id (expect 1): " + rows.length);
}
