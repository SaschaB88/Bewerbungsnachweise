"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { boot } = require("../src/boot");

test("boot fallback prints dashboard HTML", async () => {
  let out = "";
  const origLog = console.log;
  try {
    console.log = (msg) => { out += String(msg); };
    const result = await boot({ forceFallback: true });
    assert.strictEqual(result.mode, "fallback");
    assert.ok(out.includes("<!doctype html>"));
    assert.ok(out.toLowerCase().includes("dashboard"));
  } finally {
    console.log = origLog;
  }
});

