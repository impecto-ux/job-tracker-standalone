import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';
import { ScoringRule } from './scoring-rule.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ScoringRule])],
    controllers: [ScoringController],
    providers: [ScoringService],
    exports: [ScoringService],
})
export class ScoringModule { }
