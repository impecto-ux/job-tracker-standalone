import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    create(@Body() createGroupDto: { name: string; description?: string }) {
        return this.groupsService.create(createGroupDto);
    }

    @Get()
    findAll(@Query('archived') archived?: string) {
        const isArchived = archived === 'true' ? true : archived === 'false' ? false : undefined;
        return this.groupsService.findAll({ isArchived });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.groupsService.findOne(+id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGroupDto: Partial<Group>, @Request() req) {
        return this.groupsService.update(+id, updateGroupDto, req.user.id, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/toggle-admin')
    toggleAdmin(@Param('id') id: string, @Body() body: { userId: number }, @Request() req) {
        return this.groupsService.toggleAdmin(+id, body.userId, req.user.id, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/archive')
    archive(@Param('id') id: string, @Request() req) {
        return this.groupsService.archive(+id, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/restore')
    restore(@Param('id') id: string, @Body() body: { restoreUsers?: boolean }, @Request() req) {
        return this.groupsService.restore(+id, req.user.role, body.restoreUsers);
    }

    @UseGuards(JwtAuthGuard)
    @Post('cleanup-archives')
    cleanupArchives(@Request() req) {
        if (req.user.role !== 'admin') throw new Error('Unauthorized');
        return this.groupsService.cleanupOldArchives();
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.groupsService.remove(+id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/members')
    addMember(@Param('id') id: string, @Body() body: { userId: number }, @Request() req) {
        return this.groupsService.addUsersToGroup(+id, [body.userId], req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/members/:userId')
    async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
        return this.groupsService.removeUserFromGroup(+id, +userId, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/assign')
    assignMembers(@Param('id') id: string, @Body() body: { userIds: number[] }, @Request() req) {
        return this.groupsService.addUsersToGroup(+id, body.userIds, req.user.id);
    }
}
