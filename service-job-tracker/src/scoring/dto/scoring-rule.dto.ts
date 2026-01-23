export class CreateScoringRuleDto {
    keyword: string;
    score: number;
    category: string;
    matchType?: 'contains' | 'exact';
    funFact?: string;
}

export class UpdateScoringRuleDto {
    keyword?: string;
    score?: number;
    category?: string;
    matchType?: 'contains' | 'exact';
    funFact?: string;
}
