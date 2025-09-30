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
  getAllowedStatuses: async () => {
    try {
      return await ipcRenderer.invoke("get-allowed-statuses");
    } catch {
      return ["Planned","Applied","Interviewing","Offer","Hired","Rejected","On Hold"];
    }
  },
  createApplication: async (payload) => {
    return await ipcRenderer.invoke("create-application", payload);
  },
});
