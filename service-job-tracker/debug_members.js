const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    console.log("--- USERS ---");
    db.all("SELECT id, fullName, role FROM users", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });

    console.log("--- GROUP MEMBERSHIPS ---");
    db.all("SELECT * FROM group_members", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });
});
