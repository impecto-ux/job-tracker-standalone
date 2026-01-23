import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('scoring_rules')
export class ScoringRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    keyword: string;

    @Column({ default: 'contains' })
    matchType: 'contains' | 'exact';

    @Column()
    score: number;

    @Column()
    category: string;

    @Column({ nullable: true })
    funFact: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
