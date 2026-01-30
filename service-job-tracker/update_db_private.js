const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.run("UPDATE groups SET is_private = 1 WHERE name = 'test'", function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);

    db.all("SELECT id, name, is_private FROM groups WHERE name = 'test'", (err, rows) => {
        console.log("Updated Group:");
        console.log(rows);
    });
});
