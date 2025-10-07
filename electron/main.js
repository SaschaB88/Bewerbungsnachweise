"use strict";

// Main process for Electron. This file is used when running via Electron.
// It won't run in our tests or fallback path.

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { dashboardData, renderDashboard } = require("../src/dashboard");
const { openDatabase, getStats, seedSampleData, createApplication, listApplications, deleteApplication, updateApplication, listContacts, createContact, updateContact, deleteContact, listActivities, createActivity, updateActivity, deleteActivity, getApplicationFull, allowedStatuses } = require("../src/db");

let dbHandle = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    center: true,
    show: true,
    backgroundColor: "#0f1115",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
    title: "Application Tracker",
  });

  // If React build exists, load it; otherwise use fallback HTML
  const distIndex = path.resolve(__dirname, "../dist/index.html");
  try {
    require("node:fs").accessSync(distIndex);
    win.loadFile(distIndex);
  } catch {
    const html = renderDashboard(dashboardData());
    const dataUrl = "data:text/html;charset=UTF-8," + encodeURIComponent(html);
    win.loadURL(dataUrl);
  }
}

app.whenReady().then(() => {
  // Init DB under Electron userData
  try {
    const userDbPath = path.join(app.getPath("userData"), "apptracker.json");
    dbHandle = openDatabase({ path: userDbPath });
    seedSampleData(dbHandle);
  } catch (err) {
    // Log; app still works without DB for this MVP
    console.error("DB init error:", err.message || err);
  }

  ipcMain.handle("get-stats", async () => {
    if (!dbHandle) return { applications: 0, contacts: 0, activities: 0 };
    const stats = await getStats(dbHandle);
    return stats;
  });

  ipcMain.handle("create-application", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await createApplication(dbHandle, payload || {});
    return res;
  });

  ipcMain.handle("get-allowed-statuses", async () => allowedStatuses);

  ipcMain.handle("list-applications", async () => {
    if (!dbHandle) return [];
    const rows = await listApplications(dbHandle);
    return rows;
  });

  ipcMain.handle("list-contacts", async () => {
    if (!dbHandle) return [];
    return await listContacts(dbHandle);
  });

  ipcMain.handle("create-contact", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await createContact(dbHandle, payload || {});
    return res;
  });

  ipcMain.handle("update-contact", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    if (!payload || typeof payload.id === "undefined") throw new Error("Missing id");
    const { id, ...patch } = payload;
    const res = await updateContact(dbHandle, id, patch);
    return res;
  });

  ipcMain.handle("delete-contact", async (_evt, id) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await deleteContact(dbHandle, id);
    return res;
  });

  ipcMain.handle("list-activities", async () => {
    if (!dbHandle) return [];
    return await listActivities(dbHandle);
  });

  ipcMain.handle("create-activity", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await createActivity(dbHandle, payload || {});
    return res;
  });

  ipcMain.handle("update-activity", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    if (!payload || typeof payload.id === "undefined") throw new Error("Missing id");
    const { id, ...patch } = payload;
    const res = await updateActivity(dbHandle, id, patch);
    return res;
  });

  ipcMain.handle("delete-activity", async (_evt, id) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await deleteActivity(dbHandle, id);
    return res;
  });

  ipcMain.handle("delete-application", async (_evt, id) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await deleteApplication(dbHandle, id);
    return res;
  });

  ipcMain.handle("update-application", async (_evt, payload) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    if (!payload || typeof payload.id === 'undefined') throw new Error("Missing id");
    const { id, ...patch } = payload;
    const res = await updateApplication(dbHandle, id, patch);
    return res;
  });

  ipcMain.handle("get-application-full", async (_evt, id) => {
    if (!dbHandle) throw new Error("Datenbank nicht initialisiert");
    const res = await getApplicationFull(dbHandle, id);
    return res;
  });

  ipcMain.handle("open-application-window", async (_evt, id) => {
    createApplicationDetailWindow(Number(id));
    return { ok: true };
  });

  ipcMain.handle("focus-window", async (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender);
      if (win) {
        win.focus();
        win.webContents.focus();
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

module.exports = { createWindow };

function createApplicationDetailWindow(appId) {
  const win = new BrowserWindow({
    width: 920,
    height: 820,
    minWidth: 720,
    minHeight: 640,
    center: true,
    backgroundColor: "#0f1115",
    title: `Application #${appId}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  const style = `:root{--bg:#0f1115;--bg2:#131722;--surface:rgba(255,255,255,0.06);--surface-strong:rgba(255,255,255,0.12);--text:#e6e9ef;--muted:#9aa4b2;--border:rgba(255,255,255,0.12);--accent:#6ea8fe;--accent-2:#9b8cff;--success:#45d483}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);background:radial-gradient(1200px 800px at 10% -10%, #1a2031 0%, transparent 60%),radial-gradient(1000px 700px at 100% 0%, #1a1f2b 0%, transparent 55%),linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)}.container{max-width:900px;margin:0 auto;padding:24px}header{margin-bottom:16px}h1{font-size:24px;margin:0 0 6px}p{color:var(--muted);margin:0}.panel{border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,0.03);box-shadow:0 10px 24px rgba(0,0,0,0.25);padding:16px;margin-top:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.grid .full{grid-column:1 / -1}.label{color:var(--muted);font-size:13px}.value{font-weight:600}.badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;border:1px solid var(--border);background:var(--surface)}.btn{position:fixed;right:20px;bottom:20px;padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:linear-gradient(135deg, var(--accent), var(--accent-2));color:#0b1020;font-weight:700;cursor:pointer}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid var(--border);padding:8px 10px;text-align:left}th{background:rgba(255,255,255,0.04);color:var(--muted)}.prewrap{white-space:pre-wrap}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Application ${appId}</title><style>${style}</style></head><body><div class="container"><header><h1>Application Details</h1><p>Full details for #${appId}.</p></header><div id="content" class="panel"><p>Loading…</p></div><button class="btn" id="closeBtn">Close</button></div><script>const APP_ID=${JSON.stringify(appId)};const el=document.getElementById('content');function esc(s){return String(s||'')}function render(d){if(!d||!d.application){el.innerHTML='<p>Not found.</p>';return}const a=d.application;const contacts=d.contacts||[];const acts=d.activities||[];const tags=(d.tags||[]).map(t=>t.name).join(', ');el.innerHTML=\`<div class="grid"><div><div class="label">Company</div><div class="value">\${esc(a.company)}</div></div><div><div class="label">Role</div><div class="value">\${esc(a.role)}</div></div><div><div class="label">Status</div><div class="value"><span class="badge">\${esc(a.status)}</span></div></div><div><div class="label">URL</div><div class="value">\${a.url?'<a style=\"color:#6ea8fe\" href=\"'+a.url+'\" target=\"_blank\" rel=\"noreferrer\">link</a>':''}</div></div><div class="full"><div class="label">Notes</div><div class="value">\${esc(a.notes)}</div></div><div class="full"><div class="label">Tags</div><div class="value">\${esc(tags)}</div></div></div>\n<div class="panel"><div class="label">Contacts</div>\n\${contacts.length?'<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Title</th><th>LinkedIn</th></tr></thead><tbody>'+contacts.map(c=>\`<tr><td>\${esc(c.name)}</td><td>\${esc(c.email)}</td><td>\${esc(c.phone)}</td><td>\${esc(c.title)}</td><td>\${c.linkedin?'<a style=\\"color:#6ea8fe\\" href=\\"'+c.linkedin+'\\" target=\\"_blank\\" rel=\\"noreferrer\\">link</a>':''}</td></tr>\`).join('')+'</tbody></table>':'<p>No contacts.</p>'}</div>\n<div class="panel"><div class="label">Activities</div>\n\${acts.length?'<table><thead><tr><th>Type</th><th>Date</th><th>Notes</th></tr></thead><tbody>'+acts.map(ac=>\`<tr><td>\${esc(ac.type)}</td><td>\${ac.date?new Date(ac.date).toLocaleString():''}</td><td>\${esc(ac.notes)}</td></tr>\`).join('')+'</tbody></table>':'<p>No activities.</p>'}</div>\n\`;}
document.getElementById('closeBtn').addEventListener('click',()=>window.close());window.api.getApplicationFull(APP_ID).then(render).catch(()=>{el.innerHTML='<p>Error loading.</p>'});</script></body></html>`;

  const dataUrl = "data:text/html;charset=UTF-8," + encodeURIComponent(html);
  win.loadURL(dataUrl);
}



