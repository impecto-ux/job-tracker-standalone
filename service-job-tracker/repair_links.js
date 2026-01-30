const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.serialize(() => {
    // 1. Get all groups
    db.all("SELECT id, name FROM groups", (err, groups) => {
        if (err) {
            console.error(err);
            return;
        }

        console.log(`Found ${groups.length} groups. Searching for matching channels...`);

        groups.forEach(group => {
            // 2. Find matching channel by name
            db.get("SELECT id FROM channel WHERE name = ?", [group.name], (err, channel) => {
                if (err) {
                    console.error(`Error finding channel for ${group.name}`, err);
                    return;
                }

                if (channel) {
                    console.log(`Linking Group "${group.name}" (ID: ${group.id}) to Channel ID: ${channel.id}`);
                    // 3. Update group
                    db.run("UPDATE groups SET channel_id = ? WHERE id = ?", [channel.id, group.id], (err) => {
                        if (err) console.error(`Error updating group ${group.id}`, err);
                    });
                } else {
                    console.warn(`No channel found for Group "${group.name}"`);
                }
            });
        });
    });
});
