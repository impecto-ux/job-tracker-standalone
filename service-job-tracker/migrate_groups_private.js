const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    db.run(`
        UPDATE groups 
        SET is_private = 1 
        WHERE name != 'General'
    `, function (err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Migration Complete: ${this.changes} groups updated to Private.`);
    });

    // Verify
    db.all("SELECT id, name, is_private FROM groups", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
        db.close();
    });
});
