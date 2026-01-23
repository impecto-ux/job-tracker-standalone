import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Channel } from './channel.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @ManyToOne(() => User, { eager: true, nullable: true }) // Eager load sender, Allow null for AI
    sender: User | null;

    @ManyToOne(() => Message, { nullable: true })
    replyTo: Message;

    @ManyToOne(() => Channel, (channel) => channel.messages)
    channel: Channel;

    @Column({ nullable: true })
    linkedTaskId: number;

    @Column({ nullable: true })
    mediaUrl: string;

    @Column({ nullable: true })
    mediaType: string;

    @CreateDateColumn()
    createdAt: Date;
}
