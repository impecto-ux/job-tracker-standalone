import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('departments')
export class Department {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => User, (user) => user.department)
    users: User[];

    @OneToMany('Team', (team: any) => team.department)
    teams: any[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
