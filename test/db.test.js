"use strict";

const test = require("node:test");
const assert = require("node:assert");

const {
  createApplication,
  getStats,
  listApplications,
  allowedStatuses,
} = require("../src/db");

function makeFakeDb() {
  const calls = [];
  const data = {
    counts: { applications: 0, contacts: 0, activities: 0 },
    rows: [],
  };
  return {
    _calls: calls,
    _data: data,
    prepare(sql) {
      // Record the SQL used for verification if needed
      calls.push(sql);
      if (/SELECT COUNT\(\*\) as c FROM applications/i.test(sql)) {
        return { get: () => ({ c: data.counts.applications }) };
      }
      if (/SELECT COUNT\(\*\) as c FROM contacts/i.test(sql)) {
        return { get: () => ({ c: data.counts.contacts }) };
      }
      if (/SELECT COUNT\(\*\) as c FROM activities/i.test(sql)) {
        return { get: () => ({ c: data.counts.activities }) };
      }
      if (/SELECT id, company, role, status, url, notes, created_at FROM applications/i.test(sql)) {
        return { all: () => data.rows.slice() };
      }
      if (/INSERT INTO applications\(company, role, status, url, notes\)/i.test(sql)) {
        return {
          run: (company, role, status, url, notes) => {
            const id = data.rows.length + 1;
            const row = {
              id,
              company,
              role,
              status,
              url,
              notes,
              created_at: new Date().toISOString(),
            };
            data.rows.push(row);
            data.counts.applications += 1;
            return { lastInsertRowid: id };
          },
        };
      }
      // Default dummy
      return { get: () => ({}), all: () => [], run: () => ({ lastInsertRowid: 0 }) };
    },
  };
}

test("createApplication validates input and inserts via fake db", () => {
  const db = makeFakeDb();

  // Missing company should throw
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "" }));

  // Invalid status should throw
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "Acme", status: "Nope" }));

  // Valid insert returns id and increments counts
  const res = createApplication(db, "better-sqlite3", { company: "Acme", status: allowedStatuses[0] });
  assert.ok(res.id >= 1);
  const stats = getStats(db, "better-sqlite3");
  assert.strictEqual(stats.applications, 1);
});

test("listApplications returns rows from fake db", () => {
  const db = makeFakeDb();
  createApplication(db, "better-sqlite3", { company: "A", status: allowedStatuses[0] });
  createApplication(db, "better-sqlite3", { company: "B", status: allowedStatuses[1] });
  const rows = listApplications(db, "better-sqlite3");
  assert.ok(Array.isArray(rows));
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].company, "A");
  assert.strictEqual(rows[1].company, "B");
});
