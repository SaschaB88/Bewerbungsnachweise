"use strict";

const { dashboardData, renderDashboard } = require("./dashboard");
const { spawn } = require("child_process");

// Boots the app. If Electron is installed, tries to launch it.
// Otherwise, falls back to printing the dashboard HTML to the console.
// Options: { forceFallback?: boolean }
function boot(options = {}) {
  const { forceFallback = false } = options;

  if (forceFallback) {
    const html = renderDashboard(dashboardData());
    console.log(html);
    return Promise.resolve({ mode: "fallback" });
  }

  let electronPath;
  try {
    // In a plain Node process, require('electron') resolves to the binary path.
    electronPath = require("electron");
  } catch {
    electronPath = null;
  }

  if (typeof electronPath === "string" && electronPath.length > 0) {
    return new Promise((resolve, reject) => {
      const child = spawn(electronPath, ["."], {
        stdio: "inherit",
        env: process.env,
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve({ mode: "electron", code });
        else reject(new Error(`Electron exited with code ${code}`));
      });
    });
  }

  // Fallback: no Electron available
  const html = renderDashboard(dashboardData());
  console.log(html);
  return Promise.resolve({ mode: "fallback" });
}

module.exports = { boot };

