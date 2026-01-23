import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringRule } from './scoring-rule.entity';
import { CreateScoringRuleDto, UpdateScoringRuleDto } from './dto/scoring-rule.dto';

@Injectable()
export class ScoringService implements OnApplicationBootstrap {
    private ruleCache: ScoringRule[] = [];

    constructor(
        @InjectRepository(ScoringRule)
        private rulesRepository: Repository<ScoringRule>,
    ) { }

    async onApplicationBootstrap() {
        await this.ensureDefaults();
        await this.refreshCache();
    }

    async create(createDto: CreateScoringRuleDto): Promise<ScoringRule> {
        const rule = this.rulesRepository.create(createDto);
        const saved = await this.rulesRepository.save(rule);
        await this.refreshCache();
        return saved;
    }

    async findAll(): Promise<ScoringRule[]> {
        return this.rulesRepository.find({ order: { category: 'ASC', score: 'ASC' } });
    }

    async update(id: number, updateDto: UpdateScoringRuleDto): Promise<ScoringRule | null> {
        await this.rulesRepository.update(id, updateDto);
        await this.refreshCache();
        return this.rulesRepository.findOne({ where: { id } });
    }

    async remove(id: number): Promise<void> {
        await this.rulesRepository.delete(id);
        await this.refreshCache();
    }

    // High-performance matching using memory cache
    predict(text: string): { score: number; category: string } | null {
        const normalized = text.toLowerCase();

        // Sort by score descending to match highest value first (e.g. "3D Animation" > "Animation")
        // Or specific logic: usually longer matches or higher scores take precedence.
        // Let's rely on the cache being sorted by Priority if we add that later.
        // For now, let's find the Highest Score match.

        const matches = this.ruleCache.filter(rule => {
            if (rule.matchType === 'exact') {
                return normalized === rule.keyword.toLowerCase();
            } else {
                return normalized.includes(rule.keyword.toLowerCase());
            }
        });

        if (matches.length === 0) return null;

        // Return the match with the highest score
        return matches.sort((a, b) => b.score - a.score)[0];
    }

    private async refreshCache() {
        this.ruleCache = await this.rulesRepository.find();
        console.log(`[ScoringService] Cache Refreshed. ${this.ruleCache.length} rules loaded.`);
    }

    private async ensureDefaults() {
        const count = await this.rulesRepository.count();
        if (count > 0) return;

        console.log('[ScoringService] Seeding default rules...');
        const defaults = [
            // Digital / Ops (100)
            ...['banner', 'story', 'post', 'sosyal', 'resize', 'revize', 'ingest', 'export', 'convert', 'adaptasyon', 'boyut']
                .map(k => ({ keyword: k, score: 100, category: 'Digital / Ops' })),

            // Broadcast (200)
            ...['kj', 'alt bant', 'lower third', 'kurgu', 'montaj', 'kesme', 'senkron', 'fragman', 'teaser', 'reels', 'rough']
                .map(k => ({ keyword: k, score: 200, category: 'Broadcast / Edit' })),

            // Art (300)
            ...['poster', 'afiş', 'billboard', 'logo', 'kapak', 'key art', 'konsept', 'kurumsal', 'arayüz', 'tasarım']
                .map(k => ({ keyword: k, score: 300, category: 'Art / Design' })),

            // Motion (400)
            ...['jenerik', 'opener', 'id', 'ident', 'packshot', 'animasyon', 'motion', 'compositing', 'silme', 'vfx', 'title']
                .map(k => ({ keyword: k, score: 400, category: 'Motion / Branding' })),

            // 3D (500)
            ...['3d', 'modelleme', 'simulation', 'fx', 'cgi', 'karakter', 'rig', 'set extension', 'full cg', 'render']
                .map(k => ({ keyword: k, score: 500, category: 'High-End 3D' })),
        ];

        await this.rulesRepository.save(defaults);
    }
}
