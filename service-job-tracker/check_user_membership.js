
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

const userId = 4;

db.all(`
    SELECT g.id, g.name, g.is_private 
    FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
`, [userId], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Groups for User ${userId}:`);
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
