"use strict";

// Main process for Electron. This file is used when running via Electron.
// It won't run in our tests or fallback path.

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { dashboardData, renderDashboard } = require("../src/dashboard");
const { openDatabase, getStats, seedSampleData } = require("../src/db");

let dbHandle = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
    title: "MVP Dashboard",
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
    const userDbPath = path.join(app.getPath("userData"), "apptracker.sqlite");
    dbHandle = openDatabase({ path: userDbPath });
    seedSampleData(dbHandle, "better-sqlite3");
  } catch (err) {
    // Log; app still works without DB for this MVP
    console.error("DB init error:", err.message || err);
  }

  ipcMain.handle("get-stats", async () => {
    if (!dbHandle) return { applications: 0, contacts: 0, activities: 0 };
    const stats = await getStats(dbHandle, "better-sqlite3");
    return stats;
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
