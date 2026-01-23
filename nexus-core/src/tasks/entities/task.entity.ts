import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Comment } from './comment.entity'; // Will be created next

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToOne(() => Department)
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @Column({ name: 'department_id' })
    departmentId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requester_id' })
    requester: User;

    @Column({ name: 'requester_id' })
    requesterId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ name: 'owner_id', nullable: true })
    ownerId: number;

    @Column({ default: 'P3' })
    priority: string;

    @Column({ default: 'todo' })
    status: string;

    @Column({ name: 'due_date', nullable: true })
    dueDate: Date;

    @Column({ name: 'image_url', nullable: true })
    imageUrl: string;

    @Column({ type: 'simple-json', default: '{}' })
    metadata: any;

    @OneToMany(() => Comment, (comment) => comment.task)
    comments: Comment[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'started_at', nullable: true, type: 'datetime' })
    startedAt: Date | null;

    @Column({ name: 'completed_at', nullable: true, type: 'datetime' })
    completedAt: Date | null;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
