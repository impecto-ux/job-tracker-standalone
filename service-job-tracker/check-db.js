const Database = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
    const SQL = await Database();
    const fileBuffer = fs.readFileSync(path.join(__dirname, 'job_tracker.sqlite'));
    const db = new SQL.Database(fileBuffer);

    // Get table schema
    const schema = db.exec("PRAGMA table_info(tasks);");
    console.log("=== TASKS TABLE COLUMNS ===");
    if (schema.length > 0) {
        schema[0].values.forEach(row => {
            console.log(`  ${row[1]} (${row[2]})`);
        });
    }

    // Check for resolution_note specifically
    const hasResolutionNote = schema.length > 0 && schema[0].values.some(row => row[1] === 'resolution_note');
    console.log(`\n=== resolution_note column exists: ${hasResolutionNote} ===`);

    // Get a sample task with status done
    const doneTasks = db.exec("SELECT id, title, status, resolution_note FROM tasks WHERE status = 'done' LIMIT 3;");
    console.log("\n=== SAMPLE DONE TASKS ===");
    if (doneTasks.length > 0 && doneTasks[0].values.length > 0) {
        doneTasks[0].values.forEach(row => {
            console.log(`  Task #${row[0]}: "${row[1]}" | Status: ${row[2]} | Note: ${row[3] || 'NULL'}`);
        });
    } else {
        console.log("  No done tasks found");
    }

    db.close();
}

main().catch(console.error);
