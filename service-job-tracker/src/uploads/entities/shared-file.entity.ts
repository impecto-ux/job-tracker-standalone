import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Channel } from '../../channels/entities/channel.entity';

@Entity('shared_files')
export class SharedFile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filename: string;

    @Column()
    originalname: string;

    @Column()
    path: string;

    @Column({ nullable: true })
    thumbnailPath?: string;

    @Column()
    mimetype: string;

    @Column({ type: 'integer', default: 0 })
    size: number;

    @ManyToOne(() => User, { nullable: true })
    uploader: User;

    @ManyToOne(() => Channel, { nullable: true })
    @Index()
    channel: Channel;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
