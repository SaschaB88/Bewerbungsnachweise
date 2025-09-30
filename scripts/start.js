"use strict";

const { boot } = require("../src/boot");

boot().catch((err) => {
  console.error("Failed to boot app:", err && err.message ? err.message : err);
  process.exitCode = 1;
});

