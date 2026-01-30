
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticker_configs')
export class TickerConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    label: string; // Display name for Admin UI, e.g. "Daily Summary"

    @Column()
    type: string; // 'preset' | 'custom'

    @Column({ nullable: true })
    presetFunction: string; // e.g., 'daily_summary', 'top_performer', 'latest_activity', 'efficiency'

    @Column({ type: 'text', nullable: true })
    customMessage: string; // e.g., "Welcome to the new dashboard!"

    @Column({ type: 'simple-json', default: '["all"]' })
    allowedRoles: string[]; // e.g. ["admin"], ["all"]

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 3 })
    duration: number; // Duration in seconds

    @Column({ default: 0 })
    order: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
