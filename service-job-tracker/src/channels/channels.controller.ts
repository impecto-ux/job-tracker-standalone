import { Controller, Get, Post, Body, Param, Request, UseGuards, Patch, Delete } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
    constructor(private readonly channelsService: ChannelsService) { }

    @Get()
    findAll() {
        return this.channelsService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; type?: string }) {
        return this.channelsService.createChannel(body.name, body.type);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: { name: string; targetDepartmentId?: number }) {
        return this.channelsService.updateChannel(+id, body.name, body.targetDepartmentId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.channelsService.deleteChannel(+id);
    }

    @Get(':id/messages')
    getMessages(@Param('id') id: string) {
        return this.channelsService.getMessages(+id);
    }

    @Post(':id/messages')
    postMessage(@Param('id') id: string, @Body() body: { content: string; mediaUrl?: string; mediaType?: string; replyToId?: number; thumbnailUrl?: string }, @Request() req) {
        return this.channelsService.postMessage(+id, body.content, req.user.userId, body.mediaUrl, body.mediaType, body.replyToId, body.thumbnailUrl);
    }

    @Post(':id/members/:userId')
    addMember(@Param('id') id: string, @Param('userId') userId: string) {
        return this.channelsService.addMember(+id, +userId);
    }
    @Delete(':id/messages/:msgId')
    removeMessage(@Param('id') id: string, @Param('msgId') msgId: string) {
        return this.channelsService.deleteMessage(+id, +msgId);
    }
}
