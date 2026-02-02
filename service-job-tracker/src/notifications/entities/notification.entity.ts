import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    type: string; // 'info', 'success', 'warning', 'error', 'mention', 'assignment'

    @Column()
    title: string;

    @Column()
    message: string;

    @Column({ default: false })
    read: boolean;

    @Column('simple-json', { nullable: true })
    metadata: any; // { taskId?: number, channelId?: number, etc. }

    @CreateDateColumn()
    createdAt: Date;
}
