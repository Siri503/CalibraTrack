
const db = require("./database");

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all();

console.log("\n========== DATABASE SCHEMA ==========");

for (const table of tables) {
    console.log(`\n--- ${table.name} ---`);

    const columns = db.prepare(
        `PRAGMA table_info("${table.name}")`
    ).all();

    columns.forEach((column) => {
        console.log(`${column.name} (${column.type})`);
    });
}

console.log("\n========== SCHEMA INSPECTION COMPLETE ==========");
