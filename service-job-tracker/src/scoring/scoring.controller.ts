import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { CreateScoringRuleDto, UpdateScoringRuleDto } from './dto/scoring-rule.dto';

@Controller('scoring-rules')
export class ScoringController {
    constructor(private readonly scoringService: ScoringService) { }

    @Post()
    create(@Body() createDto: CreateScoringRuleDto) {
        return this.scoringService.create(createDto);
    }

    @Get()
    findAll() {
        return this.scoringService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateScoringRuleDto) {
        return this.scoringService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.scoringService.remove(+id);
    }
}
