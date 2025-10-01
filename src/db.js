"use strict";



const fs = require("node:fs");

const path = require("node:path");



const allowedStatuses = [

  "Geplant",

  "Beworben",

  "Vorstellungsgespräch",

  "Angebot",

  "Eingestellt",

  "Abgelehnt",

  "Zurückgestellt"

];



const statusMigrationMap = new Map([

  ["Planned", "Geplant"],

  ["Applied", "Beworben"],

  ["Interviewing", "Vorstellungsgespräch"],

  ["VorstellungsgesprÃ¤ch", "Vorstellungsgespräch"],

  ["VorstellungsgesprÃ�ch", "Vorstellungsgespräch"],

  ["VorstellungsgesprÃch", "Vorstellungsgespräch"],

  ["Offer", "Angebot"],

  ["Hired", "Eingestellt"],

  ["Rejected", "Abgelehnt"],

  ["On Hold", "Zurückgestellt"],

  ["ZurÃ¼ckgestellt", "Zurückgestellt"],

  ["ZurÃckgestellt", "Zurückgestellt"],

]);



function isValidHttpUrl(u) {

  if (!u) return false;

  try {

    const parsed = new URL(u);

    return parsed.protocol === "http:" || parsed.protocol === "https:";

  } catch {

    return false;

  }

}



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





function maybeMigrateApplicationStatuses(db, schema) {

  if (!schema) return;

  let tableSql = null;

  try {

    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='applications'").get();

    tableSql = row && typeof row.sql === "string" ? row.sql : null;

  } catch {

    return;

  }

  if (!tableSql) return;

  const needsEnglishMigration = tableSql.includes("'Planned'") && !tableSql.includes("'Geplant'");

  const needsUtfFix = tableSql.includes("'VorstellungsgesprÃ¤ch'") || tableSql.includes("'VorstellungsgesprÃ�ch'") || tableSql.includes("'VorstellungsgesprÃch'") || tableSql.includes("'ZurÃ¼ckgestellt'") || tableSql.includes("'ZurÃckgestellt'");

  if (!needsEnglishMigration && !needsUtfFix) return;



  const match = schema.match(/CREATE TABLE IF NOT EXISTS applications\s*\([\s\S]*?\);/);

  if (!match) return;

  const createSql = match[0].replace('IF NOT EXISTS ', '');



  const previousForeignKeys = db.pragma('foreign_keys', { simple: true });

  db.pragma('foreign_keys = OFF');

  db.exec('BEGIN TRANSACTION;');

  try {

    db.exec('ALTER TABLE applications RENAME TO applications_old;');

    db.exec(createSql);

    const selectStmt = db.prepare('SELECT id, company, role, status, url, notes, created_at FROM applications_old ORDER BY id');

    const rows = selectStmt.all();

    const insertStmt = db.prepare('INSERT INTO applications(id, company, role, status, url, notes, created_at) VALUES (?,?,?,?,?,?,?)');

    const insertMany = db.transaction((items) => {

      for (const row of items) {

        const nextStatus = statusMigrationMap.get(row.status) || row.status;

        insertStmt.run(row.id, row.company, row.role, nextStatus, row.url, row.notes, row.created_at);

      }

    });

    insertMany(rows);

    db.exec('DROP TABLE applications_old;');

    db.exec('COMMIT;');

  } catch (err) {

    db.exec('ROLLBACK;');

    try { db.exec('ALTER TABLE applications_old RENAME TO applications;'); } catch {}

    throw err;

  } finally {

    const pragmaValue = previousForeignKeys ? 'ON' : 'OFF';

    db.pragma(`foreign_keys = ${pragmaValue}`);

  }

}



function migrate(db, driverType) {

  const schema = readSchema();

  if (driverType === "better-sqlite3") {

    maybeMigrateApplicationStatuses(db, schema);

    db.exec(schema);

    try {

      const repaired = fixBrokenApplicationForeignKeys(db);

      if (repaired) {

        db.exec(schema);

      }

    } catch (err) {

      try {

        console.warn('Foreign key repair failed:', err && err.message ? err.message : err);

      } catch {}

    }

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

        "Beworben",

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

  let status = (input.status || "Geplant").trim();

  if (!allowedStatuses.includes(status)) {

    throw new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);

  }

  const url = (input.url || "").trim() || null;

  const notes = (input.notes || "").trim() || null;



  if (url && !isValidHttpUrl(url)) {

    throw new Error("Invalid URL: must start with http(s) and be absolute");

  }



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

    if (url && !isValidHttpUrl(url)) {

      throw new Error("Invalid URL: must start with http(s) and be absolute");

    }

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



function listContacts(db, driverType = "better-sqlite3") {

  const sql = `SELECT c.id, c.application_id, c.name, c.email, c.phone, c.title, c.linkedin, c.created_at, a.company AS application_company, a.role AS application_role

  FROM contacts c

  JOIN applications a ON a.id = c.application_id

  ORDER BY c.created_at DESC, c.id DESC`;

  if (driverType === "better-sqlite3") {

    return db.prepare(sql).all();

  }

  return new Promise((resolve, reject) => {

    db.all(sql, [], (err, rows) => {

      if (err) return reject(err);

      resolve(rows || []);

    });

  });

}



function createContact(db, driverType = "better-sqlite3", input = {}) {

  const appIdRaw = input.applicationId ?? input.application_id;

  const appId = Number(appIdRaw);

  if (!Number.isFinite(appId) || appId <= 0) throw new Error("'applicationId' is required");

  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!name) throw new Error("'name' is required");

  const email = typeof input.email === 'string' ? input.email.trim() : '';

  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  const title = typeof input.title === 'string' ? input.title.trim() : '';

  const linkedin = typeof input.linkedin === 'string' ? input.linkedin.trim() : '';

  if (linkedin && !isValidHttpUrl(linkedin)) {

    throw new Error("LinkedIn must be a valid http(s) URL");

  }

  if (driverType === "better-sqlite3") {

    try {

      const stmt = db.prepare("INSERT INTO contacts(application_id, name, email, phone, title, linkedin) VALUES (?,?,?,?,?,?)");

      const res = stmt.run(appId, name, email || null, phone || null, title || null, linkedin || null);

      return { id: res.lastInsertRowid, changes: res.changes || 0 };

    } catch (err) {

      if (err && typeof err.message === 'string' && err.message.includes('FOREIGN KEY constraint failed')) {

        throw new Error("Application not found");

      }

      throw err;

    }

  }

  return new Promise((resolve, reject) => {

    db.get("SELECT id FROM applications WHERE id = ?", [appId], (err, row) => {

      if (err) return reject(err);

      if (!row) return reject(new Error("Application not found"));

      const sql = "INSERT INTO contacts(application_id, name, email, phone, title, linkedin) VALUES (?,?,?,?,?,?)";

      db.run(sql, [appId, name, email || null, phone || null, title || null, linkedin || null], function (err2) {

        if (err2) {

          if (typeof err2.message === 'string' && err2.message.includes('FOREIGN KEY constraint failed')) {

            return reject(new Error("Application not found"));

          }

          return reject(err2);

        }

        resolve({ id: this.lastID, changes: this.changes || 0 });

      });

    });

  });

}



function updateContact(db, driverType = "better-sqlite3", id, patch = {}) {

  const contactId = Number(id);

  if (!Number.isFinite(contactId) || contactId <= 0) throw new Error("Invalid id");

  const fields = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {

    const name = typeof patch.name === 'string' ? patch.name.trim() : '';

    if (!name) throw new Error("'name' cannot be empty");

    fields.name = name;

  }

  if (Object.prototype.hasOwnProperty.call(patch, 'email')) {

    const email = typeof patch.email === 'string' ? patch.email.trim() : '';

    fields.email = email || null;

  }

  if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {

    const phone = typeof patch.phone === 'string' ? patch.phone.trim() : '';

    fields.phone = phone || null;

  }

  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {

    const title = typeof patch.title === 'string' ? patch.title.trim() : '';

    fields.title = title || null;

  }

  if (Object.prototype.hasOwnProperty.call(patch, 'linkedin')) {

    const linkedin = typeof patch.linkedin === 'string' ? patch.linkedin.trim() : '';

    if (linkedin && !isValidHttpUrl(linkedin)) {

      throw new Error("LinkedIn must be a valid http(s) URL");

    }

    fields.linkedin = linkedin || null;

  }

  let targetAppId;

  if (Object.prototype.hasOwnProperty.call(patch, 'applicationId') || Object.prototype.hasOwnProperty.call(patch, 'application_id')) {

    const raw = Object.prototype.hasOwnProperty.call(patch, 'applicationId') ? patch.applicationId : patch.application_id;

    const appId = Number(raw);

    if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid applicationId");

    targetAppId = appId;

  }

  if (typeof targetAppId !== 'undefined') {

    fields.application_id = targetAppId;

  }

  const keys = Object.keys(fields);

  if (keys.length === 0) return { changes: 0 };

  if (driverType === "better-sqlite3") {

    const sets = keys.map(k => `${k} = ?`).join(", ");

    const values = keys.map(k => fields[k]);

    const stmt = db.prepare(`UPDATE contacts SET ${sets} WHERE id = ?`);

    try {

      const res = stmt.run(...values, contactId);

      return { changes: res.changes || 0 };

    } catch (err) {

      if (err && typeof err.message === 'string' && err.message.includes('FOREIGN KEY constraint failed')) {

        throw new Error("Application not found");

      }

      throw err;

    }

  }

  return new Promise((resolve, reject) => {

    const proceed = () => {

      const sets = keys.map(k => `${k} = ?`).join(", ");

      const values = keys.map(k => fields[k]);

      values.push(contactId);

      const sql = `UPDATE contacts SET ${sets} WHERE id = ?`;

      db.run(sql, values, function (err) {

        if (err) {

          if (typeof err.message === 'string' && err.message.includes('FOREIGN KEY constraint failed')) {

            return reject(new Error("Application not found"));

          }

          return reject(err);

        }

        resolve({ changes: this.changes || 0 });

      });

    };

    if (typeof targetAppId !== 'undefined') {

      db.get("SELECT id FROM applications WHERE id = ?", [targetAppId], (err, row) => {

        if (err) return reject(err);

        if (!row) return reject(new Error("Application not found"));

        proceed();

      });

    } else {

      proceed();

    }

  });

}



function deleteContact(db, driverType = "better-sqlite3", id) {

  const contactId = Number(id);

  if (!Number.isFinite(contactId) || contactId <= 0) throw new Error("Invalid id");

  if (driverType === "better-sqlite3") {

    const stmt = db.prepare("DELETE FROM contacts WHERE id = ?");

    const res = stmt.run(contactId);

    return { changes: res.changes || 0 };

  }

  return new Promise((resolve, reject) => {

    db.run("DELETE FROM contacts WHERE id = ?", [contactId], function (err) {

      if (err) return reject(err);

      resolve({ changes: this.changes || 0 });

    });

  });

}


function fixBrokenApplicationForeignKeys(db) {
  const tables = [
    {
      name: "contacts",
      columns: "id, application_id, name, email, phone, title, linkedin, created_at",
      createSql: `CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  linkedin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
)`
    },
    {
      name: "activities",
      columns: "id, application_id, type, date, notes, created_at",
      createSql: `CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  type TEXT,
  date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
)`
    },
    {
      name: "application_tags",
      columns: "application_id, tag_id",
      createSql: `CREATE TABLE application_tags (
  application_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (application_id, tag_id),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)`
    }
  ];
  let changed = false;
  for (const info of tables) {
    let rows;
    try {
      rows = db.prepare(`PRAGMA foreign_key_list(${info.name})`).all();
    } catch {
      continue;
    }
    if (!Array.isArray(rows) || !rows.some(row => row && row.table === "applications_old")) {
      continue;
    }
    changed = true;
    const fkState = db.pragma('foreign_keys', { simple: true });
    const wasEnabled = typeof fkState === 'string' ? fkState.toLowerCase() === 'on' : Boolean(fkState);
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(`ALTER TABLE ${info.name} RENAME TO ${info.name}_old_fkfix;`);
      db.exec(info.createSql);
      db.exec(`INSERT INTO ${info.name}(${info.columns}) SELECT ${info.columns} FROM ${info.name}_old_fkfix;`);
      db.exec(`DROP TABLE ${info.name}_old_fkfix;`);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      try { db.exec(`ALTER TABLE ${info.name}_old_fkfix RENAME TO ${info.name};`); } catch {}
      throw err;
    } finally {
      db.pragma(`foreign_keys = ${wasEnabled ? 'ON' : 'OFF'}`);
    }
  }
  return changed;
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

  listContacts,

  createContact,

  updateContact,

  deleteContact,

  isValidHttpUrl,

  getApplicationFull,

  allowedStatuses,

};









