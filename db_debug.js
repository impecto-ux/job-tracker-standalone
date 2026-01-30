const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    console.log("Tables:", tables);
    db.all("SELECT * FROM department", (err, depts) => {
        console.log("Departments:", depts);
        db.all("SELECT * FROM squad_agents", (err, agents) => {
            console.log("Agents:", agents);
            db.close();
        });
    });
});
