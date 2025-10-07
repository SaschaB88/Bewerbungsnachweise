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
  "Zurückgestellt",
];

const DEFAULT_STATE = Object.freeze({
  meta: {
    nextApplicationId: 1,
    nextContactId: 1,
    nextActivityId: 1,
    nextTagId: 1,
  },
  applications: [],
  contacts: [],
  activities: [],
  tags: [],
  applicationTags: [],
});

function deepCloneState() {
  return {
    meta: { ...DEFAULT_STATE.meta },
    applications: [],
    contacts: [],
    activities: [],
    tags: [],
    applicationTags: [],
  };
}

function resolveDbPath(preferredPath) {
  if (preferredPath) {
    const dir = path.dirname(preferredPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return preferredPath;
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "apptracker.json");
}

function loadState(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return deepCloneState();
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return deepCloneState();
    const parsed = JSON.parse(raw);
    const state = deepCloneState();
    if (parsed && typeof parsed === "object") {
      if (parsed.meta && typeof parsed.meta === "object") {
        state.meta = {
          nextApplicationId: Number(parsed.meta.nextApplicationId) > 0 ? Number(parsed.meta.nextApplicationId) : 1,
          nextContactId: Number(parsed.meta.nextContactId) > 0 ? Number(parsed.meta.nextContactId) : 1,
          nextActivityId: Number(parsed.meta.nextActivityId) > 0 ? Number(parsed.meta.nextActivityId) : 1,
          nextTagId: Number(parsed.meta.nextTagId) > 0 ? Number(parsed.meta.nextTagId) : 1,
        };
      }
      if (Array.isArray(parsed.applications)) state.applications = parsed.applications.map(normalizeApplicationRow);
      if (Array.isArray(parsed.contacts)) state.contacts = parsed.contacts.map(normalizeContactRow);
      if (Array.isArray(parsed.activities)) state.activities = parsed.activities.map(normalizeActivityRow);
      if (Array.isArray(parsed.tags)) state.tags = parsed.tags.map(normalizeTagRow);
      if (Array.isArray(parsed.applicationTags)) state.applicationTags = parsed.applicationTags.map(normalizeApplicationTagRow);
    }
    ensureSequencesCoverExistingRows(state);
    return state;
  } catch {
    return deepCloneState();
  }
}

function normalizeApplicationRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: Number(row.id) > 0 ? Number(row.id) : 0,
    company: typeof row.company === "string" ? row.company : "",
    role: typeof row.role === "string" ? row.role : null,
    status: allowedStatuses.includes(row.status) ? row.status : "Geplant",
    url: typeof row.url === "string" && row.url ? row.url : null,
    notes: typeof row.notes === "string" && row.notes ? row.notes : null,
    created_at: normalizeDate(row.created_at),
  };
}

function normalizeContactRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: Number(row.id) > 0 ? Number(row.id) : 0,
    application_id: Number(row.application_id) > 0 ? Number(row.application_id) : 0,
    name: typeof row.name === "string" ? row.name : "",
    email: typeof row.email === "string" && row.email ? row.email : null,
    phone: typeof row.phone === "string" && row.phone ? row.phone : null,
    title: typeof row.title === "string" && row.title ? row.title : null,
    linkedin: typeof row.linkedin === "string" && row.linkedin ? row.linkedin : null,
    created_at: normalizeDate(row.created_at),
  };
}

function normalizeActivityRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: Number(row.id) > 0 ? Number(row.id) : 0,
    application_id: Number(row.application_id) > 0 ? Number(row.application_id) : 0,
    type: typeof row.type === "string" ? row.type : "",
    date: normalizeDate(row.date, true),
    notes: typeof row.notes === "string" && row.notes ? row.notes : null,
    created_at: normalizeDate(row.created_at),
  };
}

function normalizeTagRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: Number(row.id) > 0 ? Number(row.id) : 0,
    name: typeof row.name === "string" ? row.name : "",
  };
}

function normalizeApplicationTagRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    application_id: Number(row.application_id) > 0 ? Number(row.application_id) : 0,
    tag_id: Number(row.tag_id) > 0 ? Number(row.tag_id) : 0,
  };
}

function normalizeDate(value, allowNull = false) {
  if (!value && allowNull) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const d = new Date(value);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
  }
  return allowNull ? null : new Date().toISOString();
}

function ensureSequencesCoverExistingRows(state) {
  const { applications, contacts, activities, tags } = state;
  if (applications.length) {
    const maxId = Math.max(...applications.map(row => row.id || 0), 0);
    if (maxId >= state.meta.nextApplicationId) state.meta.nextApplicationId = maxId + 1;
  }
  if (contacts.length) {
    const maxId = Math.max(...contacts.map(row => row.id || 0), 0);
    if (maxId >= state.meta.nextContactId) state.meta.nextContactId = maxId + 1;
  }
  if (activities.length) {
    const maxId = Math.max(...activities.map(row => row.id || 0), 0);
    if (maxId >= state.meta.nextActivityId) state.meta.nextActivityId = maxId + 1;
  }
  if (tags.length) {
    const maxId = Math.max(...tags.map(row => row.id || 0), 0);
    if (maxId >= state.meta.nextTagId) state.meta.nextTagId = maxId + 1;
  }
}

function persist(db) {
  if (!db || db.memory) return;
  const payload = JSON.stringify(db.state, null, 2);
  fs.writeFileSync(db.path, payload, "utf8");
}

function nextId(state, key) {
  const field = `next${key}Id`;
  state.meta[field] = Number(state.meta[field]) > 0 ? Number(state.meta[field]) : 1;
  const current = state.meta[field];
  state.meta[field] = current + 1;
  return current;
}

function openDatabase(options = {}) {
  const memory = Boolean(options.memory);
  const targetPath = memory ? null : resolveDbPath(options.path);
  const state = loadState(targetPath);
  return {
    driverType: "json",
    memory,
    path: targetPath,
    state,
  };
}

function seedSampleData(db) {
  ensureJsonDb(db);
  if (db.state.applications.length > 0) return;
  const app = createApplication(db, {
    company: "OpenAI",
    role: "Software Engineer",
    status: "Beworben",
    url: "https://openai.com/careers",
    notes: "Exciting opportunity",
  });
  createContact(db, {
    applicationId: app.id,
    name: "Alex Doe",
    email: "alex@example.com",
    title: "Recruiter",
  });
  createActivity(db, {
    applicationId: app.id,
    type: "Phone Screen",
    date: new Date().toISOString(),
    notes: "Intro call",
  });
}

function getStats(db) {
  ensureJsonDb(db);
  return {
    applications: db.state.applications.length,
    contacts: db.state.contacts.length,
    activities: db.state.activities.length,
  };
}

function createApplication(db, input = {}) {
  ensureJsonDb(db);
  const company = typeof input.company === "string" ? input.company.trim() : "";
  if (!company) throw new Error("'company' is required");
  const role = typeof input.role === "string" ? input.role.trim() : "";
  const status = typeof input.status === "string" ? input.status.trim() : "Geplant";
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);
  }
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (url && !isValidHttpUrl(url)) {
    throw new Error("Invalid URL: must start with http(s) and be absolute");
  }
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const id = nextId(db.state, "Application");
  const row = {
    id,
    company,
    role: role || null,
    status,
    url: url || null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  };
  db.state.applications.push(row);
  persist(db);
  return { id };
}

function listApplications(db) {
  ensureJsonDb(db);
  return db.state.applications
    .slice()
    .sort((a, b) => {
      if (a.created_at === b.created_at) return b.id - a.id;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .map(row => ({ ...row }));
}

function deleteApplication(db, id) {
  ensureJsonDb(db);
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid id");
  const before = db.state.applications.length;
  db.state.applications = db.state.applications.filter(row => row.id !== appId);
  if (before === db.state.applications.length) {
    return { changes: 0 };
  }
  db.state.contacts = db.state.contacts.filter(row => row.application_id !== appId);
  db.state.activities = db.state.activities.filter(row => row.application_id !== appId);
  db.state.applicationTags = db.state.applicationTags.filter(row => row.application_id !== appId);
  persist(db);
  return { changes: 1 };
}

function updateApplication(db, id, patch = {}) {
  ensureJsonDb(db);
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid id");
  const app = db.state.applications.find(row => row.id === appId);
  if (!app) return { changes: 0 };
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(patch, "company")) {
    const company = typeof patch.company === "string" ? patch.company.trim() : "";
    if (!company) throw new Error("'company' cannot be empty");
    if (company !== app.company) {
      app.company = company;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "role")) {
    const role = typeof patch.role === "string" ? patch.role.trim() : "";
    const next = role || null;
    if (next !== app.role) {
      app.role = next;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    const status = typeof patch.status === "string" ? patch.status.trim() : "";
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'. Allowed: ${allowedStatuses.join(", ")}`);
    }
    if (status !== app.status) {
      app.status = status;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "url")) {
    const url = typeof patch.url === "string" ? patch.url.trim() : "";
    if (url && !isValidHttpUrl(url)) {
      throw new Error("Invalid URL: must start with http(s) and be absolute");
    }
    const next = url || null;
    if (next !== app.url) {
      app.url = next;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
    const notes = typeof patch.notes === "string" ? patch.notes.trim() : "";
    const next = notes || null;
    if (next !== app.notes) {
      app.notes = next;
      changed = true;
    }
  }
  if (!changed) return { changes: 0 };
  persist(db);
  return { changes: 1 };
}

function listContacts(db) {
  ensureJsonDb(db);
  return db.state.contacts
    .slice()
    .sort((a, b) => {
      if (a.created_at === b.created_at) return b.id - a.id;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .map(contact => {
      const application = db.state.applications.find(app => app.id === contact.application_id);
      return {
        ...contact,
        application_company: application ? application.company : null,
        application_role: application ? application.role : null,
      };
    });
}

function createContact(db, input = {}) {
  ensureJsonDb(db);
  const applicationId = toPositiveNumber(input.applicationId ?? input.application_id);
  if (!applicationId) throw new Error("'applicationId' is required");
  const application = db.state.applications.find(app => app.id === applicationId);
  if (!application) throw new Error("Application not found");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new Error("'name' is required");
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const linkedin = typeof input.linkedin === "string" ? input.linkedin.trim() : "";
  if (linkedin && !isValidHttpUrl(linkedin)) {
    throw new Error("LinkedIn must be a valid http(s) URL");
  }
  const id = nextId(db.state, "Contact");
  db.state.contacts.push({
    id,
    application_id: applicationId,
    name,
    email: email || null,
    phone: phone || null,
    title: title || null,
    linkedin: linkedin || null,
    created_at: new Date().toISOString(),
  });
  persist(db);
  return { id, changes: 1 };
}

function updateContact(db, id, patch = {}) {
  ensureJsonDb(db);
  const contactId = Number(id);
  if (!Number.isFinite(contactId) || contactId <= 0) throw new Error("Invalid id");
  const contact = db.state.contacts.find(row => row.id === contactId);
  if (!contact) return { changes: 0 };
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(patch, "applicationId") || Object.prototype.hasOwnProperty.call(patch, "application_id")) {
    const raw = patch.applicationId ?? patch.application_id;
    const applicationId = toPositiveNumber(raw);
    if (!applicationId) throw new Error("Invalid applicationId");
    const application = db.state.applications.find(app => app.id === applicationId);
    if (!application) throw new Error("Application not found");
    if (applicationId !== contact.application_id) {
      contact.application_id = applicationId;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    const name = typeof patch.name === "string" ? patch.name.trim() : "";
    if (!name) throw new Error("'name' cannot be empty");
    if (name !== contact.name) {
      contact.name = name;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "email")) {
    const email = typeof patch.email === "string" ? patch.email.trim() : "";
    const next = email || null;
    if (next !== contact.email) {
      contact.email = next;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "phone")) {
    const phone = typeof patch.phone === "string" ? patch.phone.trim() : "";
    const next = phone || null;
    if (next !== contact.phone) {
      contact.phone = next;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "title")) {
    const title = typeof patch.title === "string" ? patch.title.trim() : "";
    const next = title || null;
    if (next !== contact.title) {
      contact.title = next;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "linkedin")) {
    const linkedin = typeof patch.linkedin === "string" ? patch.linkedin.trim() : "";
    if (linkedin && !isValidHttpUrl(linkedin)) {
      throw new Error("LinkedIn must be a valid http(s) URL");
    }
    const next = linkedin || null;
    if (next !== contact.linkedin) {
      contact.linkedin = next;
      changed = true;
    }
  }
  if (!changed) return { changes: 0 };
  persist(db);
  return { changes: 1 };
}

function deleteContact(db, id) {
  ensureJsonDb(db);
  const contactId = Number(id);
  if (!Number.isFinite(contactId) || contactId <= 0) throw new Error("Invalid id");
  const before = db.state.contacts.length;
  db.state.contacts = db.state.contacts.filter(row => row.id !== contactId);
  if (before === db.state.contacts.length) {
    return { changes: 0 };
  }
  persist(db);
  return { changes: 1 };
}

function listActivities(db) {
  ensureJsonDb(db);
  return db.state.activities
    .slice()
    .sort((a, b) => {
      if (a.date === b.date) return b.id - a.id;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    })
    .map(activity => {
      const application = db.state.applications.find(app => app.id === activity.application_id);
      return {
        ...activity,
        application_company: application ? application.company : null,
      };
    });
}

function createActivity(db, input = {}) {
  ensureJsonDb(db);
  const applicationId = toPositiveNumber(input.applicationId ?? input.application_id);
  if (!applicationId) throw new Error("'applicationId' is required");
  const application = db.state.applications.find(app => app.id === applicationId);
  if (!application) throw new Error("Application not found");
  const type = typeof input.type === "string" ? input.type.trim() : "";
  if (!type) throw new Error("'type' is required");
  const dateRaw = typeof input.date === "string" ? input.date.trim() : "";
  if (dateRaw) {
    const parsed = new Date(dateRaw);
    if (Number.isNaN(parsed.valueOf())) throw new Error("Invalid date");
  }
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const id = nextId(db.state, "Activity");
  db.state.activities.push({
    id,
    application_id: applicationId,
    type,
    date: dateRaw ? new Date(dateRaw).toISOString() : null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  });
  persist(db);
  return { id, changes: 1 };
}

function updateActivity(db, id, patch = {}) {
  ensureJsonDb(db);
  const activityId = Number(id);
  if (!Number.isFinite(activityId) || activityId <= 0) throw new Error("Invalid id");
  const activity = db.state.activities.find(row => row.id === activityId);
  if (!activity) return { changes: 0 };
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(patch, "applicationId") || Object.prototype.hasOwnProperty.call(patch, "application_id")) {
    const raw = patch.applicationId ?? patch.application_id;
    const applicationId = toPositiveNumber(raw);
    if (!applicationId) throw new Error("Invalid applicationId");
    const application = db.state.applications.find(app => app.id === applicationId);
    if (!application) throw new Error("Application not found");
    if (applicationId !== activity.application_id) {
      activity.application_id = applicationId;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "type")) {
    const type = typeof patch.type === "string" ? patch.type.trim() : "";
    if (!type) throw new Error("'type' cannot be empty");
    if (type !== activity.type) {
      activity.type = type;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "date")) {
    const dateRaw = typeof patch.date === "string" ? patch.date.trim() : "";
    if (dateRaw) {
      const parsed = new Date(dateRaw);
      if (Number.isNaN(parsed.valueOf())) throw new Error("Invalid date");
      const iso = parsed.toISOString();
      if (iso !== activity.date) {
        activity.date = iso;
        changed = true;
      }
    } else {
      if (activity.date !== null) {
        activity.date = null;
        changed = true;
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
    const notes = typeof patch.notes === "string" ? patch.notes.trim() : "";
    const next = notes || null;
    if (next !== activity.notes) {
      activity.notes = next;
      changed = true;
    }
  }
  if (!changed) return { changes: 0 };
  persist(db);
  return { changes: 1 };
}

function deleteActivity(db, id) {
  ensureJsonDb(db);
  const activityId = Number(id);
  if (!Number.isFinite(activityId) || activityId <= 0) throw new Error("Invalid id");
  const before = db.state.activities.length;
  db.state.activities = db.state.activities.filter(row => row.id !== activityId);
  if (before === db.state.activities.length) {
    return { changes: 0 };
  }
  persist(db);
  return { changes: 1 };
}

function getApplicationFull(db, id) {
  ensureJsonDb(db);
  const appId = Number(id);
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid id");
  const application = db.state.applications.find(row => row.id === appId);
  if (!application) return null;
  const contacts = db.state.contacts
    .filter(row => row.application_id === appId)
    .sort((a, b) => a.id - b.id)
    .map(row => ({ ...row }));
  const activities = db.state.activities
    .filter(row => row.application_id === appId)
    .sort((a, b) => {
      if (a.date === b.date) return b.id - a.id;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    })
    .map(row => ({ ...row }));
  const tags = db.state.applicationTags
    .filter(row => row.application_id === appId)
    .map(row => db.state.tags.find(tag => tag.id === row.tag_id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(row => ({ ...row }));
  return {
    application: { ...application },
    contacts,
    activities,
    tags,
  };
}

function toPositiveNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.trunc(num);
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ensureJsonDb(db) {
  if (!db || db.driverType !== "json" || !db.state) {
    throw new Error("JSON database driver not initialised");
  }
}

module.exports = {
  allowedStatuses,
  resolveDbPath,
  openDatabase,
  seedSampleData,
  getStats,
  createApplication,
  listApplications,
  deleteApplication,
  updateApplication,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getApplicationFull,
};
