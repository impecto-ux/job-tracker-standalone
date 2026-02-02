
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Tables:', tables.map(t => t.name).join(', '));

        // Also check columns for channel_users_user (if it exists) or similar
        const joinTable = tables.find(t => t.name.includes('channel') && t.name.includes('user'))?.name;
        if (joinTable) {
            db.all(`PRAGMA table_info(${joinTable});`, (err, columns) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(`Columns in ${joinTable}:`, columns.map(c => c.name).join(', '));
            });
        }
    });
});
db.close();
