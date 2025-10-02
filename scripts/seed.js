"use strict";

const path = require("node:path");
const { openDatabase, seedSampleData } = require("../src/db");

function main() {
  const target = process.argv[2] || path.join(process.cwd(), "data/apptracker.sqlite");
  const db = openDatabase({ path: target });
  seedSampleData(db, "better-sqlite3");
  console.log("Seeded sample data at:", target);
  db.close && db.close();
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exitCode = 1;
}

