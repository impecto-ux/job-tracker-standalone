const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.all('SELECT id, full_name, is_system_bot FROM users', (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('All Users:', rows);
    }
    db.close();
});
