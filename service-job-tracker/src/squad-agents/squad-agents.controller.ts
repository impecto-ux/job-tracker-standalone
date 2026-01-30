import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { SquadAgentsService } from './squad-agents.service';
import { CreateSquadAgentDto, UpdateSquadAgentDto } from './dto/squad-agent.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('squad-agents')
export class SquadAgentsController {
    constructor(private readonly squadAgentsService: SquadAgentsService) { }

    @Get()
    findAll() {
        return this.squadAgentsService.findAll();
    }

    @Get('test-route')
    testRoute() {
        return { ok: true, timestamp: new Date().toISOString() };
    }

    @Post()
    create(@Body() createSquadAgentDto: CreateSquadAgentDto) {
        console.log('[SquadAgentsController] Create/Update Agent:', createSquadAgentDto);
        return this.squadAgentsService.createOrUpdate(createSquadAgentDto);
    }

    @Post('disable-all')
    async disableAll() {
        try {
            console.log('[SquadAgentsController] Processing disable-all request');
            fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] Received disable-all request\n`);
            return await this.squadAgentsService.disableAll();
        } catch (e) {
            console.error('[SquadAgentsController] Bulk disable failed:', e);
            fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] Bulk disable failed: ${e.stack}\n`);
            throw e;
        }
    }
}
