const { DataSource } = require('typeorm');
// Import entities - minimal definition to avoid import issues
const EntitySchema = require('typeorm').EntitySchema;

const TaskSchema = new EntitySchema({
    name: "Task",
    tableName: "tasks",
    columns: {
        id: { primary: true, type: "int", generated: true },
        title: { type: "varchar" },
        status: { type: "varchar" }
    },
    relations: {
        revisions: {
            type: "one-to-many",
            target: "TaskRevision",
            inverseSide: "task"
        }
    }
});

const RevisionSchema = new EntitySchema({
    name: "TaskRevision",
    tableName: "task_revisions",
    columns: {
        id: { primary: true, type: "int", generated: true },
        description: { type: "text" },
        taskId: { type: "int", name: "task_id" }
    },
    relations: {
        task: {
            type: "many-to-one",
            target: "Task",
            joinColumn: { name: "task_id" },
            inverseSide: "revisions"
        }
    }
});

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "job_tracker.sqlite", // Verify this path!
    entities: [TaskSchema, RevisionSchema],
    synchronize: false,
    logging: false,
});

async function check() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected.");

        const allRevisions = await AppDataSource.query("SELECT * FROM task_revisions");
        console.log("Raw Revisions Dump:", allRevisions);

        const allTasks = await AppDataSource.query("SELECT id, title, status FROM tasks");
        console.log(`Raw Tasks Count: ${allTasks.length}`);
        const task33 = allTasks.find(t => t.id === 33);
        console.log("Task #33 raw:", task33);

        // Also check raw table count
        const revCount = await AppDataSource.query("SELECT COUNT(*) as count FROM task_revisions");
        console.log("Raw revision count:", revCount);

        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

check();
