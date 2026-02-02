import { Controller, Get, Post, Body, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming Auth Guard exists

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    findAll(@Request() req) {
        return this.notificationsService.findAll(req.user.id);
    }

    @Get('unread-count')
    getUnreadCount(@Request() req) {
        return this.notificationsService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(+id);
    }

    @Post('mark-all-read')
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}
