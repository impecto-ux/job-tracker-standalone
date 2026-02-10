const Database = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
    const SQL = await Database();
    const fileBuffer = fs.readFileSync(path.join(__dirname, 'job_tracker.sqlite'));
    const db = new SQL.Database(fileBuffer);

    // Dump ALL revisions raw
    console.log("=== RAW REVISIONS TABLE DUMP ===");
    const allRevs = db.exec("SELECT * FROM task_revisions ORDER BY id DESC LIMIT 10;");
    if (allRevs.length > 0) {
        console.log("Columns:", allRevs[0].columns.join(' | '));
        console.log("-".repeat(80));
        allRevs[0].values.forEach(row => {
            console.log(row.map((v, i) => `${allRevs[0].columns[i]}=${v}`).join(' | '));
        });
    } else {
        console.log("  NO REVISIONS IN TABLE!");
    }

    // Show tasks in revision status
    console.log("\n=== TASKS IN REVISION STATUS ===");
    const revTasks = db.exec("SELECT id, title, status, revision_count FROM tasks WHERE status LIKE '%revision%' ORDER BY id DESC;");
    if (revTasks.length > 0 && revTasks[0].values.length > 0) {
        revTasks[0].values.forEach(row => {
            console.log(`  Task #${row[0]}: "${row[1]}" | Status: ${row[2]} | RevCount: ${row[3]}`);
        });
    } else {
        console.log("  No tasks in revision status");
    }

    db.close();
}

main().catch(console.error);
