import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('groups')
export class Group {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'channel_id', nullable: true })
    channelId: number;

    @Column({ name: 'admin_ids', type: 'simple-json', nullable: true })
    adminIds: number[];

    @Column({ type: 'varchar', default: 'active' })
    status: string;

    @Column({ name: 'is_archived', default: false })
    isArchived: boolean;

    @Column({ name: 'is_private', default: false })
    isPrivate: boolean;

    @Column({ name: 'archived_at', type: 'datetime', nullable: true })
    archivedAt: Date | null;

    @ManyToMany(() => User, (user) => user.groups)
    @JoinTable({
        name: 'group_members',
        joinColumn: { name: 'group_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
    })
    users: User[];

    @ManyToOne(() => Department)
    @JoinColumn({ name: 'target_department_id' })
    targetDepartment: Department;



    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
