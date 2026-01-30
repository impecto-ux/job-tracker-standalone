const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

const newGroups = [
    { name: "Coffee Break ☕", description: "Casual chats and memes." },
    { name: "IT Helpdesk 💻", description: "Community support for tech issues." },
    { name: "Music Society 🎵", description: "Sharing playlists and vibes." }
];

db.serialize(() => {
    // Cleanup first
    newGroups.forEach(g => {
        db.run("DELETE FROM groups WHERE name = ?", [g.name]);
        db.run("DELETE FROM channel WHERE name = ?", [g.name]);
    });

    const stmt = db.prepare("INSERT INTO groups (name, description, is_private, created_at, status) VALUES (?, ?, 0, datetime('now'), 'active')");

    newGroups.forEach(g => {
        stmt.run(g.name, g.description, function (err) {
            if (err) console.error(err);
            else {
                const groupId = this.lastID;
                console.log(`Created group: ${g.name} (ID: ${groupId})`);

                // Create Channel
                db.run("INSERT INTO channel (name, type) VALUES (?, 'group')", [g.name], function (err) {
                    if (err) console.error(err);
                    else {
                        const channelId = this.lastID;
                        console.log(`Created channel for ${g.name} (ID: ${channelId})`);
                        // Link group to channel
                        db.run("UPDATE groups SET channel_id = ? WHERE id = ?", [channelId, groupId]);
                    }
                });
            }
        });
    });
    stmt.finalize();
});
