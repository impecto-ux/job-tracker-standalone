
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

function query(sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function run() {
    try {
        const tables = await query("SELECT name FROM sqlite_master WHERE type='table';");
        const tableNames = tables.map(t => t.name);
        console.log('--- ALL TABLES ---');
        console.log(tableNames.join('\n'));
        console.log('------------------');

        for (const tableName of tableNames) {
            if (tableName.includes('channel') || tableName.includes('user')) {
                const columns = await query(`PRAGMA table_info(${tableName});`);
                console.log(`\nColumns in ${tableName}:`);
                console.log(columns.map(c => `${c.name} (${c.type})`).join(', '));
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        db.close();
    }
}

run();
