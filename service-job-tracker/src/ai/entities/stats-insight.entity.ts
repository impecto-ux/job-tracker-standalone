import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stats_insights')
export class StatsInsight {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'period_start', nullable: true })
    periodStart: Date;

    @Column({ name: 'period_end', nullable: true })
    periodEnd: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
