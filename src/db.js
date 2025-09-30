"use strict";

const fs = require("node:fs");
const path = require("node:path");

const allowedStatuses = [
  "Planned",
  "Applied",
  "Interviewing",
  "Offer",
  "Hired",
  "Rejected",
  "On Hold",
];

function resolveDbPath(preferredPath) {
  if (preferredPath) {
    const dir = path.dirname(preferredPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return preferredPath;
  }
  // Default to local data/ folder in this project for non-Electron contexts
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "apptracker.sqlite");
}

function loadSqlite() {
  try {
    const BetterSqlite3 = require("better-sqlite3");
    return { type: "better-sqlite3", mod: BetterSqlite3 };
  } catch {}
  try {
    const sqlite3 = require("sqlite3");
    return { type: "sqlite3", mod: sqlite3 };
  } catch {}
  return null;
}

function readSchema() {
  const schemaPath = path.join(__dirname, "../db/schema.sql");
  return fs.readFileSync(schemaPath, "utf8");
}

// Open DB and apply schema if needed
function openDatabase(options = {}) {
  const target = loadSqlite();
  if (!target) {
    throw new Error(
      "No SQLite driver installed. Install 'better-sqlite3' or 'sqlite3'."
    );
  }

  const dbPath = resolveDbPath(options.path);
  if (target.type === "better-sqlite3") {
    const Database = target.mod;
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    migrate(db, target.type);
    return db;
  }

  // sqlite3 (callback-based)
  const sqlite3 = target.mod;
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");
    const schema = readSchema();
    db.exec(schema);
  });
  return db;
}

function migrate(db, driverType) {
  const schema = readSchema();
  if (driverType === "better-sqlite3") {
    db.exec(schema);
    return;
  }
}

function seedSampleData(db, driverType = "better-sqlite3") {
  // Simple idempotent seed: insert a sample application if none exists
  if (driverType === "better-sqlite3") {
    const row = db.prepare("SELECT COUNT(*) as c FROM applications").get();
    if (row.c === 0) {
      const insertApp = db.prepare(
        "INSERT INTO applications(company, role, status, url, notes) VALUES(?,?,?,?,?)"
      );
      const appId = insertApp.run(
        "OpenAI",
        "Software Engineer",
        "Applied",
        "https://openai.com/careers",
        "Exciting opportunity"
      ).lastInsertRowid;
      const insertContact = db.prepare(
        "INSERT INTO contacts(application_id, name, email, title) VALUES(?,?,?,?)"
      );
      insertContact.run(appId, "Alex Doe", "alex@example.com", "Recruiter");
      const insertAct = db.prepare(
        "INSERT INTO activities(application_id, type, date, notes) VALUES(?,?,?,?)"
      );
      insertAct.run(appId, "Phone Screen", new Date().toISOString(), "Intro call");
    }
    return;
  }

  // For sqlite3 driver we skip for simplicity in this MVP
}

function getStats(db, driverType = "better-sqlite3") {
  if (driverType === "better-sqlite3") {
    const apps = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;
    const contacts = db.prepare("SELECT COUNT(*) as c FROM contacts").get().c;
    const activities = db.prepare("SELECT COUNT(*) as c FROM activities").get().c;
    return { applications: apps, contacts, activities };
  }
  // Minimal path for sqlite3 driver: we use a callback wrapper
  // Not used in tests unless sqlite3 is present.
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as c FROM applications", (e1, r1) => {
      if (e1) return reject(e1);
      db.get("SELECT COUNT(*) as c FROM contacts", (e2, r2) => {
        if (e2) return reject(e2);
        db.get("SELECT COUNT(*) as c FROM activities", (e3, r3) => {
          if (e3) return reject(e3);
          resolve({ applications: r1.c, contacts: r2.c, activities: r3.c });
        });
      });
    });
  });
}

function createApplication(db, driverType = "better-sqlite3", input = {}) {
  const company = (input.company || "").trim();
  if (!company) throw new Error("'company' is required");
  const role = (input.role || "").trim() || null;
  let status = (input.status || "Planned").trim();
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);
  }
  const url = (input.url || "").trim() || null;
  const notes = (input.notes || "").trim() || null;

  if (driverType === "better-sqlite3") {
    const stmt = db.prepare(
      "INSERT INTO applications(company, role, status, url, notes) VALUES(?,?,?,?,?)"
    );
    const res = stmt.run(company, role, status, url, notes);
    return { id: Number(res.lastInsertRowid) };
  }

  // sqlite3 callback path
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO applications(company, role, status, url, notes) VALUES(?,?,?,?,?)",
      [company, role, status, url, notes],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

function listApplications(db, driverType = "better-sqlite3") {
  if (driverType === "better-sqlite3") {
    const rows = db
      .prepare(
        "SELECT id, company, role, status, url, notes, created_at FROM applications ORDER BY created_at DESC, id DESC"
      )
      .all();
    return rows;
  }
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, company, role, status, url, notes, created_at FROM applications ORDER BY created_at DESC, id DESC",
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function deleteApplication(db, driverType = "better-sqlite3", id) {
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new Error("Invalid id");
  }
  if (driverType === "better-sqlite3") {
    const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
    const res = stmt.run(appId);
    return { changes: res.changes || 0 };
  }
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM applications WHERE id = ?", [appId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes || 0 });
    });
  });
}

function updateApplication(db, driverType = "better-sqlite3", id, patch = {}) {
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid id");

  const fields = {};
  if (Object.prototype.hasOwnProperty.call(patch, "company")) {
    const company = (patch.company || "").trim();
    if (!company) throw new Error("'company' cannot be empty");
    fields.company = company;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "role")) {
    const role = (patch.role || "").trim();
    fields.role = role || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    const status = String(patch.status || "").trim();
    if (!allowedStatuses.includes(status)) throw new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);
    fields.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "url")) {
    const url = (patch.url || "").trim();
    fields.url = url || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
    const notes = (patch.notes || "").trim();
    fields.notes = notes || null;
  }

  const keys = Object.keys(fields);
  if (keys.length === 0) return { changes: 0 };

  if (driverType === "better-sqlite3") {
    const sets = keys.map(k => `${k} = ?`).join(", ");
    const sql = `UPDATE applications SET ${sets} WHERE id = ?`;
    const stmt = db.prepare(sql);
    const values = keys.map(k => fields[k]);
    const res = stmt.run(...values, appId);
    return { changes: res.changes || 0 };
  }

  // sqlite3 path
  return new Promise((resolve, reject) => {
    const sets = keys.map(k => `${k} = ?`).join(", ");
    const sql = `UPDATE applications SET ${sets} WHERE id = ?`;
    const values = keys.map(k => fields[k]);
    values.push(appId);
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes || 0 });
    });
  });
}

function getApplicationFull(db, driverType = "better-sqlite3", id) {
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid id");
  if (driverType === "better-sqlite3") {
    const app = db.prepare(
      "SELECT id, company, role, status, url, notes, created_at FROM applications WHERE id = ?"
    ).get(appId);
    if (!app) return null;
    const contacts = db.prepare(
      "SELECT id, name, email, phone, title, linkedin, created_at FROM contacts WHERE application_id = ? ORDER BY id ASC"
    ).all(appId);
    const activities = db.prepare(
      "SELECT id, type, date, notes, created_at FROM activities WHERE application_id = ? ORDER BY date DESC, id DESC"
    ).all(appId);
    const tags = db.prepare(
      "SELECT t.id, t.name FROM tags t JOIN application_tags at ON at.tag_id = t.id WHERE at.application_id = ? ORDER BY t.name ASC"
    ).all(appId);
    return { application: app, contacts, activities, tags };
  }
  // sqlite3 path (simplified): only fetch application row
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, company, role, status, url, notes, created_at FROM applications WHERE id = ?",
      [appId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? { application: row, contacts: [], activities: [], tags: [] } : null);
      }
    );
  });
}

module.exports = {
  openDatabase,
  getStats,
  seedSampleData,
  resolveDbPath,
  createApplication,
  listApplications,
  deleteApplication,
  updateApplication,
  getApplicationFull,
  allowedStatuses,
};
