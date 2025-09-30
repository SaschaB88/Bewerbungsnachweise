"use strict";

const path = require("node:path");
const { openDatabase } = require("../src/db");

function main() {
  const target = process.argv[2] || path.join(process.cwd(), "data/apptracker.sqlite");
  const db = openDatabase({ path: target });
  console.log("Migrated schema at:", target);
  if (db.pragma) {
    db.close && db.close();
  } else {
    db.close && db.close();
  }
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exitCode = 1;
}

