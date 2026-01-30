
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne } from 'typeorm';
import { Message } from './message.entity';

@Entity()
export class Channel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ default: 'general' })
    type: string; // 'general', 'department', 'private'

    @OneToMany(() => Message, (message) => message.channel)
    messages: Message[];

    @ManyToMany('User', (user: any) => user.channels)
    @JoinTable()
    users: any[];

    @ManyToOne('Department', { nullable: true, eager: true }) // Eager load for permission checks
    targetDepartment: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
