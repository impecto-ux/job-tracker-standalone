import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

    async create(userId: number, type: string, title: string, message: string, metadata?: any) {
        const notification = this.notificationsRepository.create({
            userId,
            type,
            title,
            message,
            metadata,
        });
        return this.notificationsRepository.save(notification);
    }

    async findAll(userId: number) {
        return this.notificationsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 50, // Limit to last 50 notifications
        });
    }

    async getUnreadCount(userId: number) {
        return this.notificationsRepository.count({
            where: { userId, read: false },
        });
    }

    async markAsRead(id: number) {
        return this.notificationsRepository.update(id, { read: true });
    }

    async markAllAsRead(userId: number) {
        return this.notificationsRepository.update({ userId, read: false }, { read: true });
    }
}
