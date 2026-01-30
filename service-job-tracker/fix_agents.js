const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('job_tracker.sqlite');

async function runFix() {
    console.log('--- STARTING MASS ACTIVATION ---');

    // 1. Get all groups with channel IDs
    db.all('SELECT id, name, channel_id FROM groups WHERE channel_id IS NOT NULL', [], async (err, groups) => {
        if (err) {
            console.error('Failed to fetch groups:', err);
            return;
        }

        console.log(`Found ${groups.length} groups to process.`);

        for (const group of groups) {
            const agentName = `@${group.name.replace(/\s+/g, '')}AI`;

            // Check if agent exists
            db.get('SELECT id FROM squad_agents WHERE channelId = ?', [group.channel_id], (err, existing) => {
                if (err) {
                    console.error(`Error checking agent for ${group.name}:`, err);
                    return;
                }

                if (existing) {
                    console.log(`Updating agent for ${group.name} (ID: ${existing.id})...`);
                    db.run('UPDATE squad_agents SET isActive = 1 WHERE id = ?', [existing.id]);
                } else {
                    console.log(`Creating agent for ${group.name}...`);
                    db.run(
                        'INSERT INTO squad_agents (name, channelId, isActive, personality, triggers) VALUES (?, ?, 1, ?, ?)',
                        [agentName, group.channel_id, 'Proactive', '["task_created", "task_done"]'],
                        (err) => {
                            if (err) console.error(`Failed to create agent for ${group.name}:`, err.message);
                        }
                    );
                }
            });
        }

        // Also fix the legacy one (channelId is null)
        db.run('UPDATE squad_agents SET isActive = 1 WHERE channelId IS NULL');

        console.log('--- MASS ACTIVATION SCRIPT FINISHED (processing async) ---');
    });
}

runFix();
