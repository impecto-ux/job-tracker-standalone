import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    CONTRIBUTOR = 'contributor',
    VIEWER = 'viewer',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true, nullable: true })
    username: string;

    @Column({ name: 'password_hash' })
    passwordHash: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ type: 'varchar', default: 'viewer' })
    role: string;

    @Column({ name: 'whatsapp_number', nullable: true, unique: true })
    whatsappNumber: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'token_usage', default: 0 })
    tokenUsage: number;

    @ManyToOne(() => Department, (dept) => dept.users, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
