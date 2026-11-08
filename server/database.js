
const Database = require("better-sqlite3");
const path = require("path");

// Connect to the existing CalibraTrack SQLite database
const dbPath = path.join(
  __dirname,
  "../data-generator/output/calibratrack.sqlite"
);

const db = new Database(dbPath);

// Enable foreign key enforcement
db.pragma("foreign_keys = ON");

// Add instrument specification columns if missing
const instrumentTypeColumns = db
  .prepare("PRAGMA table_info(instrument_types)")
  .all()
  .map((column) => column.name);

const newInstrumentTypeColumns = {
  minRange: "REAL",
  maxRange: "REAL",
  accuracy: "TEXT"
};

for (const [column, type] of Object.entries(newInstrumentTypeColumns)) {
  if (!instrumentTypeColumns.includes(column)) {
    db.exec(
      `ALTER TABLE instrument_types ADD COLUMN "${column}" ${type}`
    );
  }
}

// Add work order assessment and maintenance columns if missing
const workOrderColumns = db
  .prepare("PRAGMA table_info(work_orders)")
  .all()
  .map((column) => column.name);

const newWorkOrderColumns = {
  assessmentDate: "TEXT",
  assessedBy: "TEXT",
  productionAffected: "TEXT",
  affectedBatches: "TEXT",
  immediateAction: "TEXT",
  assessmentNotes: "TEXT",
  maintenanceCompletionDate: "TEXT",
  maintenanceRemarks: "TEXT"
};

for (const [column, type] of Object.entries(newWorkOrderColumns)) {
  if (!workOrderColumns.includes(column)) {
    db.exec(
      `ALTER TABLE work_orders ADD COLUMN "${column}" ${type}`
    );
  }
}

console.log("SQLite database connected successfully!");
console.log("Database location:", dbPath);

// Display available database tables
const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`).all();

console.log("Available tables:");

tables.forEach((table) => {
  console.log("-", table.name);
});

console.log("Work order database columns verified.");

module.exports = db;
