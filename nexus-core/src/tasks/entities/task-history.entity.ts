import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('task_history')
export class TaskHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Task, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: Task;

    @Column({ name: 'task_id' })
    taskId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @Column({ name: 'action_type' })
    actionType: string;

    @Column({ type: 'simple-json', nullable: true, name: 'previous_value' })
    previousValue: any;

    @Column({ type: 'simple-json', nullable: true, name: 'new_value' })
    newValue: any;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
