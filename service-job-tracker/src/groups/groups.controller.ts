import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    create(@Body() createGroupDto: { name: string; description?: string; isPrivate?: boolean; targetDepartmentId?: number }, @Request() req) {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            throw new Error('Only Admins and Managers can create groups.');
        }
        return this.groupsService.create(createGroupDto, Number(req.user.userId || req.user.id));
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Query('archived') archived: string, @Request() req) {
        const isArchived = archived === 'true' ? true : archived === 'false' ? false : undefined;
        return this.groupsService.findAll({
            isArchived,
            userId: req.user?.userId || req.user?.id,
            userRole: req.user?.role
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('public')
    findPublic(@Request() req) {
        console.log('[GroupsController] GET /public called by:', req.user);
        return this.groupsService.findPublicGroups(Number(req.user.userId), req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/join')
    joinGroup(@Param('id') id: string, @Request() req) {
        return this.groupsService.joinPublicGroup(+id, Number(req.user.userId), req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/leave')
    leaveGroup(@Param('id') id: string, @Request() req) {
        return this.groupsService.leavePublicGroup(+id, Number(req.user.userId));
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.groupsService.findOne(+id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @Request() req) {
        try {
            console.log('[GroupsController] Update called', { id, user: req.user, dto: updateGroupDto });
            require('fs').appendFileSync('debug_error.log', `[${new Date().toISOString()}] Controller Update: id=${id}, user=${JSON.stringify(req.user)}, dto=${JSON.stringify(updateGroupDto)}\n`);

            if (!req.user) throw new Error('req.user is undefined in Controller');

            return await this.groupsService.update(+id, updateGroupDto, Number(req.user.userId || req.user.id), req.user.role);
        } catch (error) {
            console.error('[GroupsController] Error', error);
            require('fs').appendFileSync('debug_error.log', `[${new Date().toISOString()}] Controller Error: ${error.message}\n${error.stack}\n`);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/toggle-admin')
    toggleAdmin(@Param('id') id: string, @Body() body: { userId: number }, @Request() req) {
        return this.groupsService.toggleAdmin(+id, body.userId, Number(req.user.userId || req.user.id), req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/archive')
    archive(@Param('id') id: string, @Request() req) {
        return this.groupsService.archive(+id, Number(req.user.userId || req.user.id), req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/restore')
    restore(@Param('id') id: string, @Body() body: { restoreUsers?: boolean }, @Request() req) {
        return this.groupsService.restore(+id, Number(req.user.userId || req.user.id), req.user.role, body.restoreUsers);
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
        return this.groupsService.addUsersToGroup(+id, [body.userId], Number(req.user.userId || req.user.id));
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/members/:userId')
    async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
        return this.groupsService.removeUserFromGroup(+id, +userId, Number(req.user.userId || req.user.id));
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/assign')
    assignMembers(@Param('id') id: string, @Body() body: { userIds: number[] }, @Request() req) {
        return this.groupsService.addUsersToGroup(+id, body.userIds, Number(req.user.userId || req.user.id));
    }
}
