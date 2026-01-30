import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';
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

    @ManyToOne(() => Department, (dept) => dept.children, { nullable: true })
    parent: Department;

    @OneToMany(() => Department, (dept) => dept.parent)
    children: Department[];

    @OneToMany('Team', (team: any) => team.department)
    teams: any[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
