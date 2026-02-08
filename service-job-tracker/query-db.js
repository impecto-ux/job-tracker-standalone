const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "job_tracker.sqlite",
    synchronize: false,
    entities: [], // We'll use raw query
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("DB Connected.");

        const tasksCount = await AppDataSource.query("SELECT COUNT(*) as count FROM tasks");
        console.log("Total Tasks:", tasksCount[0].count);

        const revsCount = await AppDataSource.query("SELECT COUNT(*) as count FROM task_revisions");
        console.log("Total Revisions:", revsCount[0].count);

        const tasksWithRevs = await AppDataSource.query(`
            SELECT t.id, t.title, t.status, COUNT(r.id) as rev_count 
            FROM tasks t 
            LEFT JOIN task_revisions r ON t.id = r.task_id 
            WHERE t.status LIKE '%revision%'
            GROUP BY t.id
        `);
        console.log("Tasks in Revision state:", JSON.stringify(tasksWithRevs, null, 2));

        const revDetails = await AppDataSource.query("SELECT * FROM task_revisions LIMIT 5");
        console.log("Recent Revisions:", JSON.stringify(revDetails, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
