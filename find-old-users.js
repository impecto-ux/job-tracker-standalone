const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function checkDb(dbPath) {
    console.log(`\n--- Checking: ${dbPath} ---`);
    if (!fs.existsSync(dbPath)) {
        console.log("File does not exist.");
        return;
    }

    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, tables) => {
            if (err || tables.length === 0) {
                console.log("No 'users' table found.");
                db.close();
                resolve();
                return;
            }

            db.all("SELECT id, username, email, full_name FROM users", (err, rows) => {
                if (err) {
                    console.log("Error querying users:", err.message);
                } else {
                    console.log(`Found ${rows.length} users:`);
                    rows.forEach(r => console.log(`  [${r.id}] ${r.username} | ${r.email} | ${r.full_name}`));
                }
                db.close();
                resolve();
            });
        });
    });
}

async function main() {
    const dbs = [
        'c:/Users/genco/.gemini/antigravity/scratch/service-job-tracker/job_tracker.sqlite',
        'c:/Users/genco/.gemini/antigravity/scratch/service-job-tracker-v5/job_tracker.sqlite',
        'c:/Users/genco/.gemini/antigravity/scratch/nexus-core/job_tracker.sqlite'
    ];

    for (const db of dbs) {
        await checkDb(db);
    }
}

main();
