"use strict";

// Main process for Electron. This file is used when running via Electron.
// It won't run in our tests or fallback path.

const { app, BrowserWindow } = require("electron");
const { dashboardData, renderDashboard } = require("../src/dashboard");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "MVP Dashboard",
  });

  const html = renderDashboard(dashboardData());
  const dataUrl = "data:text/html;charset=UTF-8," + encodeURIComponent(html);
  win.loadURL(dataUrl);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

module.exports = { createWindow };

