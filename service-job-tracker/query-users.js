const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "job_tracker.sqlite",
    synchronize: false,
    entities: [],
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("DB Connected.");

        const users = await AppDataSource.query("SELECT id, username, email, full_name, password_hash, role FROM users LIMIT 10");
        console.log("Users:", JSON.stringify(users, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
