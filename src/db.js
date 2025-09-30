"use strict";

const fs = require("node:fs");
const path = require("node:path");

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

module.exports = {
  openDatabase,
  getStats,
  seedSampleData,
  resolveDbPath,
};
