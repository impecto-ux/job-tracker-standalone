import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { SquadAgentsService } from './squad-agents.service';
import { CreateSquadAgentDto, UpdateSquadAgentDto } from './dto/squad-agent.dto';

@Controller('squad-agents')
export class SquadAgentsController {
    constructor(private readonly squadAgentsService: SquadAgentsService) { }

    @Get()
    findAll() {
        return this.squadAgentsService.findAll();
    }

    @Post()
    create(@Body() dto: CreateSquadAgentDto) {
        return this.squadAgentsService.createOrUpdate(dto);
    }
}
