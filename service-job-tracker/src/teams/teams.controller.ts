import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    create(@Body() createTeamDto: { name: string; description?: string; departmentId: number }) {
        return this.teamsService.create(createTeamDto);
    }

    @Get()
    findAll() {
        return this.teamsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(+id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.teamsService.delete(+id);
    }

    @Post(':id/assign')
    assign(@Param('id') id: string, @Body() body: { userIds: number[] }) {
        return this.teamsService.addUsersToTeam(+id, body.userIds);
    }

    @Delete(':id/users/:userId')
    removeUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.teamsService.removeUserFromTeam(+id, +userId);
    }
}
