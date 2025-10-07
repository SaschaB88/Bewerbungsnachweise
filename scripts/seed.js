"use strict";

const path = require("node:path");
const { openDatabase, seedSampleData } = require("../src/db");

function main() {
  const target = process.argv[2] || path.join(process.cwd(), "data/apptracker.json");
  const db = openDatabase({ path: target });
  seedSampleData(db);
  console.log("Seeded sample data at:", target);
}

try {
  main();
} catch (e) {
  console.error(e && e.message ? e.message : e);
  process.exitCode = 1;
}

