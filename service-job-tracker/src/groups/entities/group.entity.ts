import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('groups')
export class Group {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    channelId: number;

    @Column({ type: 'simple-json', nullable: true })
    adminIds: number[];

    @Column({ type: 'varchar', default: 'active' })
    status: string;

    @Column({ default: false })
    isArchived: boolean;

    @Column({ type: 'datetime', nullable: true })
    archivedAt: Date | null;

    @ManyToMany(() => User, (user) => user.groups)
    @JoinTable({
        name: 'group_members',
        joinColumn: { name: 'group_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
    })
    users: User[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
