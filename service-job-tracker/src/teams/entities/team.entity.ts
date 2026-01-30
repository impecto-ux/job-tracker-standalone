import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Team {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => Department, (dept) => dept.teams, { onDelete: 'SET NULL', nullable: true })
    department: Department;

    @ManyToMany(() => User, (user) => user.teams)
    @JoinTable()
    users: User[];
}
