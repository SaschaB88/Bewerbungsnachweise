"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

let sqliteAvailable = false;
try {
  require("better-sqlite3");
  sqliteAvailable = true;
} catch {}
if (!sqliteAvailable) {
  try {
    require("sqlite3");
    sqliteAvailable = true;
  } catch {}
}

const { openDatabase } = sqliteAvailable ? require("../src/db") : { openDatabase: null };

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

