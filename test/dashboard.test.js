"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { dashboardData, renderDashboard } = require("../src/dashboard");

test("dashboardData returns sane defaults", () => {
  const data = dashboardData();
  assert.strictEqual(typeof data.title, "string");
  assert.ok(data.title.toLowerCase().includes("dashboard"));
  assert.ok(Number.isFinite(data.stats.users));
  assert.ok(Number.isFinite(data.stats.sessions));
  assert.ok(Number.isFinite(data.stats.uptimeHours));
  assert.ok(/\d{4}-\d{2}-\d{2}t/i.test(data.generatedAt));
});

test("renderDashboard returns complete HTML document", () => {
  const html = renderDashboard(dashboardData());
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("<html"));
  assert.ok(html.includes("<head>"));
  assert.ok(html.includes("<body>"));
  assert.ok(html.includes("MVP Dashboard"));
  assert.ok(html.includes("Active Users"));
});

