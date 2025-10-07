"use strict";

const { openDatabase, resolveDbPath } = require("../src/db");

function main() {
  const target = resolveDbPath(process.argv[2]);
  openDatabase({ path: target });
  console.log("Datenbank initialisiert:", target);
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exitCode = 1;
}

