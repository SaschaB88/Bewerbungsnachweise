"use strict";

const test = require("node:test");
const assert = require("node:assert");

const {
  openDatabase,
  createApplication,
  listApplications,
  updateApplication,
  deleteApplication,
  getStats,
  createContact,
  listContacts,
  updateContact,
  deleteContact,
  createActivity,
  listActivities,
  updateActivity,
  deleteActivity,
  getApplicationFull,
  allowedStatuses,
} = require("../src/db");

function makeDb() {
  return openDatabase({ memory: true });
}

function expectThrow(fn, pattern) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof Error);
    assert.match(err.message, pattern);
    return true;
  });
}

test("createApplication stores rows and listApplications sorts by created_at", () => {
  const db = makeDb();
  const first = createApplication(db, { company: "Acme", status: allowedStatuses[0] });
  const second = createApplication(db, { company: "Beta", status: allowedStatuses[1] });
  assert.ok(first.id > 0);
  assert.ok(second.id > first.id);
  const rows = listApplications(db);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].id, second.id);
  assert.strictEqual(rows[1].id, first.id);
});

test("createApplication validates input", () => {
  const db = makeDb();
  expectThrow(() => createApplication(db, { company: "" }), /'company' is required/);
  expectThrow(() => createApplication(db, { company: "Acme", status: "Nope" }), /Invalid status/);
  expectThrow(() => createApplication(db, { company: "Acme", url: "notaurl" }), /Invalid URL/);
});

test("updateApplication updates fields and enforces rules", () => {
  const db = makeDb();
  const app = createApplication(db, { company: "Acme" });
  const res = updateApplication(db, app.id, { role: "Engineer", status: allowedStatuses[1] });
  assert.strictEqual(res.changes, 1);
  const rows = listApplications(db);
  assert.strictEqual(rows[0].role, "Engineer");
  assert.strictEqual(rows[0].status, allowedStatuses[1]);
  expectThrow(() => updateApplication(db, app.id, { status: "Foo" }), /Invalid status/);
  expectThrow(() => updateApplication(db, app.id, { url: "ftp://example.com" }), /Invalid URL/);
});

test("deleteApplication cascades to contacts and activities", () => {
  const db = makeDb();
  const app = createApplication(db, { company: "Acme" });
  createContact(db, { applicationId: app.id, name: "Max" });
  createActivity(db, { applicationId: app.id, type: "Call" });
  const statsBefore = getStats(db);
  assert.deepStrictEqual(statsBefore, { applications: 1, contacts: 1, activities: 1 });
  const res = deleteApplication(db, app.id);
  assert.strictEqual(res.changes, 1);
  const statsAfter = getStats(db);
  assert.deepStrictEqual(statsAfter, { applications: 0, contacts: 0, activities: 0 });
});

test("contact lifecycle with validation", () => {
  const db = makeDb();
  const app = createApplication(db, { company: "Acme" });
  expectThrow(() => createContact(db, { applicationId: 999, name: "Max" }), /Application not found/);
  expectThrow(() => createContact(db, { applicationId: app.id, name: "", linkedin: "https://ok" }), /'name' is required/);
  expectThrow(() => createContact(db, { applicationId: app.id, name: "Max", linkedin: "notaurl" }), /LinkedIn must be/);
  const created = createContact(db, { applicationId: app.id, name: "Max", email: "max@example.com" });
  assert.ok(created.id);
  let contacts = listContacts(db);
  assert.strictEqual(contacts.length, 1);
  assert.strictEqual(contacts[0].application_company, "Acme");
  const updateRes = updateContact(db, created.id, { email: "max@foo.com" });
  assert.strictEqual(updateRes.changes, 1);
  contacts = listContacts(db);
  assert.strictEqual(contacts[0].email, "max@foo.com");
  const delRes = deleteContact(db, created.id);
  assert.strictEqual(delRes.changes, 1);
  contacts = listContacts(db);
  assert.strictEqual(contacts.length, 0);
});

test("activity lifecycle with validation", () => {
  const db = makeDb();
  const app = createApplication(db, { company: "Acme" });
  expectThrow(() => createActivity(db, { applicationId: 999, type: "Call" }), /Application not found/);
  expectThrow(() => createActivity(db, { applicationId: app.id, type: "", date: "2024-01-01" }), /'type' is required/);
  expectThrow(() => createActivity(db, { applicationId: app.id, type: "Call", date: "bad" }), /Invalid date/);
  const created = createActivity(db, { applicationId: app.id, type: "Call", notes: "Initial" });
  assert.ok(created.id);
  let activities = listActivities(db);
  assert.strictEqual(activities.length, 1);
  assert.strictEqual(activities[0].application_company, "Acme");
  const updateRes = updateActivity(db, created.id, { notes: "Updated", date: "2024-01-01T10:00:00Z" });
  assert.strictEqual(updateRes.changes, 1);
  activities = listActivities(db);
  assert.strictEqual(activities[0].notes, "Updated");
  const delRes = deleteActivity(db, created.id);
  assert.strictEqual(delRes.changes, 1);
  activities = listActivities(db);
  assert.strictEqual(activities.length, 0);
});

test("getApplicationFull returns related data", () => {
  const db = makeDb();
  const app = createApplication(db, { company: "Acme" });
  const contact = createContact(db, { applicationId: app.id, name: "Max" });
  const activity = createActivity(db, { applicationId: app.id, type: "Call" });
  const result = getApplicationFull(db, app.id);
  assert.ok(result);
  assert.strictEqual(result.application.company, "Acme");
  assert.strictEqual(result.contacts.length, 1);
  assert.strictEqual(result.contacts[0].id, contact.id);
  assert.strictEqual(result.activities.length, 1);
  assert.strictEqual(result.activities[0].id, activity.id);
});
