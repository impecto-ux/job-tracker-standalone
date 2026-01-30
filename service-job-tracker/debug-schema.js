
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    db.all("PRAGMA table_info(groups)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("Columns in 'groups' table:");
        console.log(JSON.stringify(rows, null, 2));
    });
});

db.close();
