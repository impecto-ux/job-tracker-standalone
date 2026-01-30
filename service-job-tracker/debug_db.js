const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

db.all('SELECT id, name, channel_id FROM groups', [], (err, groupRows) => {
    if (err) console.error(err);
    console.log('--- GROUPS (' + groupRows.length + ') ---');
    console.log(JSON.stringify(groupRows, null, 2));

    db.all('SELECT id, name, channelId, isActive FROM squad_agents', [], (err, agentRows) => {
        if (err) console.error(err);
        console.log('\n--- SQUAD AGENTS (' + agentRows.length + ') ---');
        console.log(JSON.stringify(agentRows, null, 2));
        db.close();
    });
});
