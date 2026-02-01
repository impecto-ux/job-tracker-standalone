import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_revisions')
export class TaskRevision {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ name: 'revision_number' })
    revisionNumber: number;

    @Column({ type: 'varchar', length: 50 })
    type: string; // 'visual', 'logic', 'content', 'bug', 'other'

    @Column({ type: 'varchar', length: 20 })
    severity: string; // 'low', 'medium', 'high', 'critical'

    @Column({ type: 'text' })
    description: string;

    @Column({ name: 'attachment_url', nullable: true })
    attachmentUrl: string;

    @ManyToOne(() => Task, (task) => task.revisions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: Task;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requested_by' })
    requestedBy: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
