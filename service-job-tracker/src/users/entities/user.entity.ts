import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { Group } from '../../groups/entities/group.entity';

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

    @Column({ name: 'is_system_bot', default: false })
    isSystemBot: boolean;

    @Column({ name: 'token_usage', default: 0 })
    tokenUsage: number;

    @Column({ name: 'total_points', default: 0 })
    totalPoints: number;

    @Column({ name: 'dashboard_layout', type: 'text', nullable: true })
    dashboardLayout: string;

    @ManyToOne(() => Department, (dept) => dept.users, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @ManyToMany(() => Group, (group) => group.users)
    groups: Group[];

    @ManyToMany('Team', (team: any) => team.users)
    teams: any[];

    @ManyToMany('Channel', (channel: any) => channel.users)
    channels: any[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
