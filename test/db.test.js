"use strict";

const test = require("node:test");
const assert = require("node:assert");

const {
  createApplication,
  getStats,
  listApplications,
  deleteApplication,
  updateApplication,
  createContact,
  listContacts,
  updateContact,
  deleteContact,
  createActivity,
  listActivities,
  updateActivity,
  deleteActivity,
  allowedStatuses,
} = require("../src/db");

function makeFakeDb() {
  let applicationSeq = 0;
  let contactSeq = 0;
  let activitySeq = 0;
  const data = {
    applications: [],
    contacts: [],
    activities: [],
  };

  function findApplication(id) {
    return data.applications.find(app => app.id === Number(id));
  }

  function parseSetOrder(sql) {
    const match = sql.match(/set\s+(.+)\s+where/i);
    if (!match) return [];
    return match[1]
      .split(",")
      .map(segment => segment.trim().split(" ")[0].replace(/[`\"\[]|]/g, ""));
  }

  function buildUpdateRunner(collection, idField, order) {
    return {
      run: (...params) => {
        const id = Number(params[params.length - 1]);
        const row = collection.find(item => item[idField] === id);
        if (!row) return { changes: 0 };
        order.forEach((column, index) => {
          row[column] = params[index];
        });
        return { changes: 1 };
      },
    };
  }

  return {
    prepare(sql) {
      if (/SELECT COUNT\(\*\) as c FROM applications/i.test(sql)) {
        return { get: () => ({ c: data.applications.length }) };
      }
      if (/SELECT COUNT\(\*\) as c FROM contacts/i.test(sql)) {
        return { get: () => ({ c: data.contacts.length }) };
      }
      if (/SELECT COUNT\(\*\) as c FROM activities/i.test(sql)) {
        return { get: () => ({ c: data.activities.length }) };
      }
      if (/SELECT id, company, role, status, url, notes, created_at FROM applications/i.test(sql)) {
        return {
          all: () => data.applications.map(app => ({ ...app })),
        };
      }
      if (/SELECT id FROM applications WHERE id = \?/i.test(sql)) {
        return {
          get: (id) => {
            const row = findApplication(id);
            return row ? { id: row.id } : undefined;
          },
        };
      }
      if (/INSERT INTO applications\(company, role, status, url, notes\)/i.test(sql)) {
        return {
          run: (company, role, status, url, notes) => {
            const id = ++applicationSeq;
            const row = {
              id,
              company,
              role,
              status,
              url,
              notes,
              created_at: new Date().toISOString(),
            };
            data.applications.push(row);
            return { lastInsertRowid: id };
          },
        };
      }
      if (/DELETE FROM applications WHERE id = \?/i.test(sql)) {
        return {
          run: (id) => {
            const numericId = Number(id);
            const before = data.applications.length;
            data.applications = data.applications.filter(app => app.id !== numericId);
            const changes = before - data.applications.length;
            if (changes > 0) {
              data.contacts = data.contacts.filter(contact => contact.application_id !== numericId);
              data.activities = data.activities.filter(activity => activity.application_id !== numericId);
            }
            return { changes };
          },
        };
      }
      if (/UPDATE applications SET/i.test(sql)) {
        const order = parseSetOrder(sql);
        return buildUpdateRunner(data.applications, "id", order);
      }
      if (/SELECT c\.id, c\.application_id, c\.name, c\.email, c\.phone, c\.title, c\.linkedin, c\.created_at/i.test(sql)) {
        return {
          all: () => data.contacts
            .slice()
            .sort((a, b) => {
              if (a.created_at === b.created_at) {
                return b.id - a.id;
              }
              return new Date(b.created_at) - new Date(a.created_at);
            })
            .map(contact => {
              const app = findApplication(contact.application_id);
              return {
                ...contact,
                application_company: app ? app.company : null,
                application_role: app ? app.role : null,
              };
            }),
        };
      }
      if (/INSERT INTO contacts\(application_id, name, email, phone, title, linkedin\)/i.test(sql)) {
        return {
          run: (applicationId, name, email, phone, title, linkedin) => {
            if (!findApplication(applicationId)) {
              const error = new Error("Application not found");
              error.code = "APPLICATION_NOT_FOUND";
              throw error;
            }
            const id = ++contactSeq;
            data.contacts.push({
              id,
              application_id: Number(applicationId),
              name,
              email,
              phone,
              title,
              linkedin,
              created_at: new Date().toISOString(),
            });
            return { lastInsertRowid: id };
          },
        };
      }
      if (/UPDATE contacts SET/i.test(sql)) {
        const order = parseSetOrder(sql);
        return {
          run: (...params) => {
            const id = Number(params[params.length - 1]);
            const row = data.contacts.find(contact => contact.id === id);
            if (!row) return { changes: 0 };
            order.forEach((column, index) => {
              const value = params[index];
              if (column === 'application_id' && !findApplication(value)) {
                const error = new Error("Application not found");
                error.code = 'APPLICATION_NOT_FOUND';
                throw error;
              }
              row[column] = value;
            });
            return { changes: 1 };
          },
        };
      }
      if (/DELETE FROM contacts WHERE id = \?/i.test(sql)) {
        return {
          run: (id) => {
            const numericId = Number(id);
            const before = data.contacts.length;
            data.contacts = data.contacts.filter(contact => contact.id !== numericId);
            return { changes: before - data.contacts.length };
          },
        };
      }
      if (/SELECT ac\.id, ac\.application_id, ac\.type, ac\.date, ac\.notes, ac\.created_at/i.test(sql)) {
        return {
          all: () => data.activities
            .slice()
            .sort((a, b) => {
              if (a.date === b.date) {
                return b.id - a.id;
              }
              if (a.date === null) return 1;
              if (b.date === null) return -1;
              return new Date(b.date) - new Date(a.date);
            })
            .map(activity => {
              const app = findApplication(activity.application_id);
              return {
                ...activity,
                application_company: app ? app.company : null,
                application_role: app ? app.role : null,
              };
            }),
        };
      }
      if (/INSERT INTO activities\(application_id, type, date, notes\)/i.test(sql)) {
        return {
          run: (applicationId, type, date, notes) => {
            if (!findApplication(applicationId)) {
              const error = new Error("Application not found");
              error.code = "APPLICATION_NOT_FOUND";
              throw error;
            }
            const id = ++activitySeq;
            data.activities.push({
              id,
              application_id: Number(applicationId),
              type,
              date: date || null,
              notes,
              created_at: new Date().toISOString(),
            });
            return { lastInsertRowid: id };
          },
        };
      }
      if (/UPDATE activities SET/i.test(sql)) {
        const order = parseSetOrder(sql);
        return {
        run: (...params) => {
          const id = Number(params[params.length - 1]);
          const row = data.activities.find(activity => activity.id === id);
          if (!row) return { changes: 0 };
          order.forEach((column, index) => {
            const value = params[index];
            if (column === 'application_id' && !findApplication(value)) {
              const error = new Error("Application not found");
              error.code = 'APPLICATION_NOT_FOUND';
              throw error;
            }
            row[column] = value;
          });
          return { changes: 1 };
        },
      };
      }
      if (/DELETE FROM activities WHERE id = \?/i.test(sql)) {
        return {
          run: (id) => {
            const numericId = Number(id);
            const before = data.activities.length;
            data.activities = data.activities.filter(activity => activity.id !== numericId);
            return { changes: before - data.activities.length };
          },
        };
      }
      return {
        get: () => ({}),
        all: () => [],
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
      };
    },
  };
}

function createSampleApplication(db, overrides = {}) {
  return createApplication(db, "better-sqlite3", {
    company: overrides.company || "Acme",
    status: overrides.status || allowedStatuses[0],
    role: overrides.role || null,
    url: overrides.url || null,
    notes: overrides.notes || null,
  });
}

// Application tests

test("createApplication validates input and inserts via fake db", () => {
  const db = makeFakeDb();

  assert.throws(() => createApplication(db, "better-sqlite3", { company: "" }));
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "Acme", status: "Nope" }));

  const res = createSampleApplication(db);
  assert.ok(res.id >= 1);

  const stats = getStats(db, "better-sqlite3");
  assert.strictEqual(stats.applications, 1);
});

test("listApplications returns rows from fake db", () => {
  const db = makeFakeDb();
  createSampleApplication(db, { company: "A" });
  createSampleApplication(db, { company: "B", status: allowedStatuses[1] });

  const rows = listApplications(db, "better-sqlite3");
  assert.ok(Array.isArray(rows));
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].company, "A");
  assert.strictEqual(rows[1].company, "B");
});

test("deleteApplication removes a row and cascades", () => {
  const db = makeFakeDb();
  const a = createSampleApplication(db, { company: "A" });
  const b = createSampleApplication(db, { company: "B", status: allowedStatuses[1] });

  createContact(db, "better-sqlite3", { applicationId: a.id, name: "Max" });
  createActivity(db, "better-sqlite3", { applicationId: a.id, type: "Call", date: "2024-01-01T10:00:00Z" });

  const res = deleteApplication(db, "better-sqlite3", a.id);
  assert.ok(res.changes >= 1);

  const rowsAfter = listApplications(db, "better-sqlite3");
  assert.strictEqual(rowsAfter.length, 1);
  assert.strictEqual(rowsAfter[0].id, b.id);

  assert.strictEqual(listContacts(db, "better-sqlite3").length, 0);
  assert.strictEqual(listActivities(db, "better-sqlite3").length, 0);
});

test("updateApplication updates fields and validates", () => {
  const db = makeFakeDb();
  const a = createSampleApplication(db, { company: "A", role: "Old" });

  let res = updateApplication(db, "better-sqlite3", a.id, { role: "New", status: allowedStatuses[1] });
  assert.ok(res.changes >= 1);
  let rows = listApplications(db, "better-sqlite3");
  assert.strictEqual(rows[0].role, "New");
  assert.strictEqual(rows[0].status, allowedStatuses[1]);

  assert.throws(() => updateApplication(db, "better-sqlite3", a.id, { status: "Nope" }));
  assert.throws(() => updateApplication(db, "better-sqlite3", a.id, { company: "" }));
});

test("createApplication rejects invalid URL", () => {
  const db = makeFakeDb();
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "A", status: allowedStatuses[0], url: "notaurl" }));
  assert.throws(() => createApplication(db, "better-sqlite3", { company: "A", status: allowedStatuses[0], url: "ftp://example.com" }));
});

test("updateApplication rejects invalid URL", () => {
  const db = makeFakeDb();
  const a = createSampleApplication(db, { company: "A" });
  assert.throws(() => updateApplication(db, "better-sqlite3", a.id, { url: "invalid" }));
});

// Contact tests

test("createContact validates input and inserts", () => {
  const db = makeFakeDb();
  const app = createSampleApplication(db);

  assert.throws(() => createContact(db, "better-sqlite3", { applicationId: app.id, name: "" }));
  assert.throws(() => createContact(db, "better-sqlite3", { applicationId: 999, name: "Max" }));
  assert.throws(() => createContact(db, "better-sqlite3", { applicationId: app.id, name: "Max", linkedin: "ftp://invalid" }));

  const res = createContact(db, "better-sqlite3", {
    applicationId: app.id,
    name: "Max Mustermann",
    email: "max@example.com",
    linkedin: "https://linkedin.com/in/max",
  });
  assert.ok(res.id >= 1);

  const contacts = listContacts(db, "better-sqlite3");
  assert.strictEqual(contacts.length, 1);
  const contact = contacts[0];
  assert.strictEqual(contact.application_company, "Acme");
  assert.strictEqual(contact.email, "max@example.com");

  const stats = getStats(db, "better-sqlite3");
  assert.strictEqual(stats.contacts, 1);
});

test("updateContact updates fields and reassigns", () => {
  const db = makeFakeDb();
  const appA = createSampleApplication(db, { company: "Alpha" });
  const appB = createSampleApplication(db, { company: "Beta" });

  const contactRes = createContact(db, "better-sqlite3", { applicationId: appA.id, name: "Erika" });

  assert.throws(() => updateContact(db, "better-sqlite3", contactRes.id, { applicationId: 999 }));

  const result = updateContact(db, "better-sqlite3", contactRes.id, {
    email: "erika@example.com",
    phone: "+4912345",
    applicationId: appB.id,
  });
  assert.ok(result.changes >= 1);

  const updated = listContacts(db, "better-sqlite3").find(c => c.id === contactRes.id);
  assert.strictEqual(updated.email, "erika@example.com");
  assert.strictEqual(updated.application_id, appB.id);
  assert.strictEqual(updated.application_company, "Beta");
});

test("deleteContact removes row", () => {
  const db = makeFakeDb();
  const app = createSampleApplication(db);
  const contact = createContact(db, "better-sqlite3", { applicationId: app.id, name: "Eva" });

  const res = deleteContact(db, "better-sqlite3", contact.id);
  assert.ok(res.changes >= 1);
  assert.strictEqual(listContacts(db, "better-sqlite3").length, 0);
  assert.strictEqual(getStats(db, "better-sqlite3").contacts, 0);
});

// Activity tests

test("createActivity validates input and inserts", () => {
  const db = makeFakeDb();
  const app = createSampleApplication(db);

  assert.throws(() => createActivity(db, "better-sqlite3", { applicationId: app.id, type: "", date: "2024-01-01" }));
  assert.throws(() => createActivity(db, "better-sqlite3", { applicationId: 999, type: "Call" }));
  assert.throws(() => createActivity(db, "better-sqlite3", { applicationId: app.id, type: "Call", date: "not-a-date" }));

  const res = createActivity(db, "better-sqlite3", {
    applicationId: app.id,
    type: "Telefoninterview",
    date: "2024-02-01T09:30:00Z",
    notes: "30 Minuten mit HR",
  });
  assert.ok(res.id >= 1);

  const activities = listActivities(db, "better-sqlite3");
  assert.strictEqual(activities.length, 1);
  const act = activities[0];
  assert.strictEqual(act.type, "Telefoninterview");
  assert.strictEqual(act.application_company, "Acme");
  assert.strictEqual(act.date, "2024-02-01T09:30:00.000Z");

  const stats = getStats(db, "better-sqlite3");
  assert.strictEqual(stats.activities, 1);
});

test("updateActivity updates fields and clears date", () => {
  const db = makeFakeDb();
  const appA = createSampleApplication(db, { company: "Alpha" });
  const appB = createSampleApplication(db, { company: "Beta" });
  const activity = createActivity(db, "better-sqlite3", {
    applicationId: appA.id,
    type: "Telefon",
    date: "2024-03-01T10:00:00Z",
    notes: "Kurzgespraech",
  });

  assert.throws(() => updateActivity(db, "better-sqlite3", activity.id, { date: "invalid" }));

  const res = updateActivity(db, "better-sqlite3", activity.id, {
    type: "Onsite",
    date: "",
    notes: "Vor-Ort",
    applicationId: appB.id,
  });
  assert.ok(res.changes >= 1);

  const updated = listActivities(db, "better-sqlite3").find(a => a.id === activity.id);
  assert.strictEqual(updated.type, "Onsite");
  assert.strictEqual(updated.date, null);
  assert.strictEqual(updated.application_company, "Beta");
});

test("deleteActivity removes row", () => {
  const db = makeFakeDb();
  const app = createSampleApplication(db);
  const activity = createActivity(db, "better-sqlite3", { applicationId: app.id, type: "Follow-up" });

  const res = deleteActivity(db, "better-sqlite3", activity.id);
  assert.ok(res.changes >= 1);
  assert.strictEqual(listActivities(db, "better-sqlite3").length, 0);
  assert.strictEqual(getStats(db, "better-sqlite3").activities, 0);
});
