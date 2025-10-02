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
      return ["Geplant","Beworben","Vorstellungsgespräch","Angebot","Eingestellt","Abgelehnt","Zurückgestellt"];
    }
  },
  createApplication: async (payload) => {
    return await ipcRenderer.invoke("create-application", payload);
  },
  listApplications: async () => {
    try {
      return await ipcRenderer.invoke("list-applications");
    } catch {
      return [];
    }
  },
  listContacts: async () => {
    try {
      return await ipcRenderer.invoke("list-contacts");
    } catch {
      return [];
    }
  },
  createContact: async (payload) => {
    return await ipcRenderer.invoke("create-contact", payload);
  },
  updateContact: async (payload) => {
    return await ipcRenderer.invoke("update-contact", payload);
  },
  deleteContact: async (id) => {
    return await ipcRenderer.invoke("delete-contact", id);
  },
  listActivities: async () => {
    try {
      return await ipcRenderer.invoke("list-activities");
    } catch {
      return [];
    }
  },
  createActivity: async (payload) => {
    return await ipcRenderer.invoke("create-activity", payload);
  },
  updateActivity: async (payload) => {
    return await ipcRenderer.invoke("update-activity", payload);
  },
  deleteActivity: async (id) => {
    return await ipcRenderer.invoke("delete-activity", id);
  },
  deleteApplication: async (id) => {
    return await ipcRenderer.invoke("delete-application", id);
  },
  updateApplication: async (payload) => {
    return await ipcRenderer.invoke("update-application", payload);
  },
  getApplicationFull: async (id) => {
    return await ipcRenderer.invoke("get-application-full", id);
  },
  openApplicationWindow: async (id) => {
    return await ipcRenderer.invoke("open-application-window", id);
  },
  focusWindow: async () => {
    return await ipcRenderer.invoke("focus-window");
  },
});


