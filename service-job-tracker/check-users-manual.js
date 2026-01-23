const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    console.log("--- USERS (users table) ---");
    // Use actual column names from the Entity definition
    const query = "SELECT id, email, username, password_hash, role, full_name FROM users";

    db.each(query, (err, row) => {
        if (err) {
            console.log("Query Error:", err.message);
        }
        else {
            console.log(`[${row.id}] ${row.username} (${row.email})`);
            console.log(`    Role: ${row.role}`);
            console.log(`    Hash: ${row.password_hash}`);
        }
    });
});

db.close();
