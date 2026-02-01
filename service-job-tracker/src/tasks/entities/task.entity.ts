import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Comment } from './comment.entity';
import { TaskRevision } from './task-revision.entity';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @Index()
    @Column({ name: 'department_id', nullable: true })
    departmentId: number | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requester_id' })
    requester: User;

    @Column({ name: 'requester_id' })
    requesterId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Index()
    @Column({ name: 'owner_id', nullable: true })
    ownerId: number;

    @Column({ default: 'P3' })
    priority: string;

    @Index()
    @Column({ default: 'todo' })
    status: string;

    @Index()
    @Column({ name: 'due_date', nullable: true })
    dueDate: Date;

    @Index()
    @Column({ name: 'channel_id', nullable: true })
    channelId: number;

    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @Column({ name: 'revision_channel_id', nullable: true })
    revisionChannelId: number;

    @Column({ type: 'simple-json', default: '{}' })
    metadata: any;

    @OneToMany(() => Comment, (comment) => comment.task)
    comments: Comment[];

    @OneToMany(() => TaskRevision, (revision: TaskRevision) => revision.task)
    revisions: TaskRevision[];

    @Column({ name: 'current_version', default: 1 })
    currentVersion: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'score', default: 0 })
    score: number;

    @Column({ name: 'revision_count', default: 0 })
    revisionCount: number;

    @Column({ name: 'category', default: 'Uncategorized' })
    category: string;

    @Column({ name: 'is_auto_scored', default: false })
    isAutoScored: boolean;

    @Column({ name: 'started_at', nullable: true, type: 'datetime' })
    startedAt: Date | null;

    @Column({ name: 'completed_at', nullable: true, type: 'datetime' })
    completedAt: Date | null;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
