import { Controller, Get, Query, UseGuards, Request, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedFile } from './entities/shared-file.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
    constructor(
        @InjectRepository(SharedFile)
        private sharedFilesRepository: Repository<SharedFile>,
        @Inject(forwardRef(() => ChannelsService))
        private channelsService: ChannelsService
    ) { }

    @Get()
    async getFiles(
        @Request() req,
        @Query('channelId') channelId?: string,
        @Query('type') type?: string,
        @Query('search') search?: string
    ) {
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Get user's accessible channels
        const channels = await this.channelsService.findAll(userId, userRole, true);
        const channelIds = channels.map(c => c.id);

        if (channelIds.length === 0) return [];

        // 2. Build Query
        const query = this.sharedFilesRepository.createQueryBuilder('file')
            .leftJoinAndSelect('file.channel', 'channel')
            .leftJoinAndSelect('file.uploader', 'uploader')
            .where('channel.id IN (:...channelIds)', { channelIds });

        // 3. Filters
        if (channelId) {
            query.andWhere('channel.id = :channelId', { channelId: parseInt(channelId) });
        }

        if (type) {
            if (type === 'image') {
                query.andWhere('file.mimetype LIKE :mime', { mime: 'image/%' });
            } else if (type === 'video') {
                query.andWhere('file.mimetype LIKE :mime', { mime: 'video/%' });
            } else if (type === 'document') {
                query.andWhere('file.mimetype NOT LIKE :img AND file.mimetype NOT LIKE :vid', {
                    img: 'image/%',
                    vid: 'video/%'
                });
            }
        }

        if (search) {
            query.andWhere('(file.originalname LIKE :search OR channel.name LIKE :search)', { search: `%${search}%` });
        }

        query.orderBy('file.createdAt', 'DESC');

        return query.getMany();
    }
}
