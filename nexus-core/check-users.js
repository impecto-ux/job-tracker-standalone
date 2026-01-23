
const { DataSource, EntitySchema } = require('typeorm');
const path = require('path');

// Mock Entities
const UserSchema = new EntitySchema({
    name: "User",
    tableName: "users",
    columns: {
        id: {
            type: "int",
            generated: true
        },
        fullName: {
            type: "varchar",
            name: "full_name"
        },
        email: {
            type: "varchar"
        },
        role: {
            type: "varchar",
            default: "viewer"
        },
        username: {
            type: "varchar",
            nullable: true
        },
        whatsappNumber: {
            type: "varchar",
            name: "whatsapp_number",
            nullable: true
        }
    }
});

const DepartmentSchema = new EntitySchema({
    name: "Department",
    tableName: "departments",
    columns: {
        id: { primary: true, type: "int", generated: true },
        name: { type: "varchar" }
    }
});

const TaskSchema = new EntitySchema({
    name: "Task",
    tableName: "tasks",
    columns: {
        id: { primary: true, type: "int", generated: true },
        title: { type: "varchar" },
        requester_id: { type: "int", nullable: true }, // Check raw column
        owner_id: { type: "int", nullable: true }
    },
    relations: {
        requester: { type: "many-to-one", target: "User", joinColumn: { name: "requester_id" } }
    }
});

// SQLite Config
const AppDataSource = new DataSource({
    type: "sqlite",
    database: "job_tracker.sqlite",
    synchronize: false,
    entities: [UserSchema, DepartmentSchema, TaskSchema],
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("DB Connected.");

        const userRepository = AppDataSource.getRepository("User");
        const users = await userRepository.find();
        console.log('Users:', users.map(u => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            role: u.role,
            username: u.username,
            whatsappNumber: u.whatsappNumber,
        })));
        const depts = await AppDataSource.manager.find("Department");
        console.log("Depts:", depts);

        const tasks = await AppDataSource.manager.find("Task", { relations: ['requester'] });
        const lastTask = tasks[tasks.length - 1];
        console.log("Last Task:", JSON.stringify(lastTask, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
