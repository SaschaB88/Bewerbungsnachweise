"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

let sqliteAvailable = false;
let driver = null;
try {
  const Better = require("better-sqlite3");
  try {
    const tmp = new Better(":memory:");
    tmp.close();
    sqliteAvailable = true;
    driver = "better-sqlite3";
  } catch {
    sqliteAvailable = false;
  }
} catch {}

const { openDatabase, createApplication, allowedStatuses } = sqliteAvailable ? require("../src/db") : { openDatabase: null };

const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

(sqliteAvailable ? test : test.skip)("database creates required tables", () => {
  const dbPath = path.join(tmpDir, `test-${Date.now()}.sqlite`);
  const db = openDatabase({ path: dbPath });
  // Verify tables in sqlite_master
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of ["applications","contacts","activities","tags","application_tags"]) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
  try { db.close(); } catch {}
});

(sqliteAvailable ? test : test.skip)("createApplication inserts a valid row", () => {
  const dbPath = path.join(tmpDir, `test-insert-${Date.now()}.sqlite`);
  const db = openDatabase({ path: dbPath });
  const before = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;
  const res = createApplication(db, "better-sqlite3", { company: "Acme Inc", status: allowedStatuses[0] });
  assert.ok(res.id > 0);
  const after = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;
  assert.strictEqual(after, before + 1);
  try { db.close(); } catch {}
});

(sqliteAvailable ? test : test.skip)("createApplication rejects invalid status", () => {
  const dbPath = path.join(tmpDir, `test-invalid-${Date.now()}.sqlite`);
  const db = openDatabase({ path: dbPath });
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "Bad Co", status: "Wrong" }));
  try { db.close(); } catch {}
});
