"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getStats: async () => {
    try {
      const stats = await ipcRenderer.invoke("get-stats");
      return stats;
    } catch (e) {
      return { applications: 0, contacts: 0, activities: 0 };
    }
  },
});

