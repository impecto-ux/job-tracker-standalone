import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: 'web' })
    source: string;

    @Column({ nullable: true })
    mediaUrl: string;

    @Column({ nullable: true })
    mediaType: string;

    @ManyToOne(() => Task, (task) => task.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: Task;

    @Column({ name: 'task_id' })
    taskId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ type: 'float', nullable: true })
    timestamp: number;

    @Column({ type: 'simple-json', nullable: true })
    context: any;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
