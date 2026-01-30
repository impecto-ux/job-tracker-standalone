
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('daily-report')
    async getDailyReport(@Request() req) {
        return this.aiService.generateDailyReport(req.user.userId);
    }

    @Post('stats-summary')
    async generateStatsSummary(@Body() body: any) {
        return this.aiService.generateStatsSummary(body, body.range);
    }

    @Get('stats-history')
    async getStatsHistory() {
        return this.aiService.getStatsHistory();
    }
}
