"use strict";

const test = require("node:test");
const assert = require("node:assert");

const {
  createApplication,
  getStats,
  listApplications,
  deleteApplication,
  updateApplication,
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
      if (/DELETE FROM applications WHERE id = \?/i.test(sql)) {
        return {
          run: (id) => {
            const before = data.rows.length;
            data.rows = data.rows.filter(r => r.id !== Number(id));
            const after = data.rows.length;
            const changes = before - after;
            if (changes > 0) data.counts.applications -= changes;
            return { changes };
          }
        }
      }
      if (/UPDATE applications SET/i.test(sql)) {
        // Very small parser for "SET a=?, b=? WHERE id=?"
        const m = sql.match(/set\s+(.+)\s+where/i);
        const order = m ? m[1].split(",").map(s => s.trim().split(" ")[0]) : [];
        return {
          run: (...params) => {
            const id = Number(params[params.length - 1]);
            const row = data.rows.find(r => r.id === id);
            if (!row) return { changes: 0 };
            order.forEach((col, idx) => {
              row[col] = params[idx];
            });
            return { changes: 1 };
          }
        }
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

test("deleteApplication removes a row via fake db", () => {
  const db = makeFakeDb();
  const a = createApplication(db, "better-sqlite3", { company: "A", status: allowedStatuses[0] });
  const b = createApplication(db, "better-sqlite3", { company: "B", status: allowedStatuses[1] });
  const rowsBefore = listApplications(db, "better-sqlite3");
  assert.strictEqual(rowsBefore.length, 2);
  const res = deleteApplication(db, "better-sqlite3", a.id);
  assert.ok(res.changes >= 1);
  const rowsAfter = listApplications(db, "better-sqlite3");
  assert.strictEqual(rowsAfter.length, 1);
  assert.strictEqual(rowsAfter[0].id, b.id);
});

test("updateApplication updates fields and validates via fake db", () => {
  const db = makeFakeDb();
  const a = createApplication(db, "better-sqlite3", { company: "A", status: allowedStatuses[0], role: "Old" });
  // update role and status
  let res = updateApplication(db, "better-sqlite3", a.id, { role: "New", status: allowedStatuses[1] });
  assert.ok(res.changes >= 1);
  let rows = listApplications(db, "better-sqlite3");
  assert.strictEqual(rows[0].role, "New");
  assert.strictEqual(rows[0].status, allowedStatuses[1]);

  // invalid status
  assert.throws(() => updateApplication(db, "better-sqlite3", a.id, { status: "Nope" }));

  // empty company when provided
  assert.throws(() => updateApplication(db, "better-sqlite3", a.id, { company: "" }));
});
