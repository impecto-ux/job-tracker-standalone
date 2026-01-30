
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE groups ADD COLUMN target_department_id INTEGER", (err) => {
        if (err) {
            console.error("Error adding column:", err.message);
        } else {
            console.log("Successfully added column 'target_department_id' to 'groups' table.");
        }
    });
});

db.close();
