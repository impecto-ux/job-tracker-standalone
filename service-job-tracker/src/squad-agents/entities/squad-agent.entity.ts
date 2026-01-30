import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('squad_agents')
export class SquadAgent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    groupId: number; // Link to Group ID (Departments are groups too)

    @Column()
    name: string; // e.g., "@DevBot", "DesignOracle"

    @Column({ default: 'Analytical' })
    personality: string; // 'Analytical', 'Proactive', 'Creative', 'Enforcer'

    @Column({ type: 'text', nullable: true })
    systemPrompt: string; // Custom logic for the bot

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'simple-json', nullable: true })
    triggers: string[]; // ['task_done', 'task_created', 'p1_priority', 'file_upload']

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
