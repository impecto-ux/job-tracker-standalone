import { Controller, Get, Query, UseGuards, Request, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { SharedFile } from './entities/shared-file.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';
import { GroupsService } from '../groups/groups.service';
import { UsersService } from '../users/users.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
    constructor(
        @InjectRepository(SharedFile)
        private sharedFilesRepository: Repository<SharedFile>,
        @Inject(forwardRef(() => ChannelsService))
        private channelsService: ChannelsService,
        @Inject(forwardRef(() => GroupsService))
        private groupsService: GroupsService,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService
    ) { }

    @Get()
    async getFiles(
        @Request() req,
        @Query('channelId') channelId?: string,
        @Query('type') type?: string,
        @Query('search') search?: string
    ) {
        const userId = req.user.userId;
        const userRole = req.user.role;

        // 0. Fetch Full User (need Department)
        const user = await this.usersService.findOne(userId);
        if (!user) return [];

        // 1. Get user's accessible channels
        const channels = await this.channelsService.findAll(userId, userRole, true);
        const accessibleChannelIds = channels.map(c => c.id);

        if (accessibleChannelIds.length === 0) return [];

        // 2. Permission Logic: Separate Full Access vs Limited Access
        let fullAccessChannelIds: number[] = [];
        let limitedAccessChannelIds: number[] = [];

        if (userRole === 'admin') {
            fullAccessChannelIds = accessibleChannelIds;
        } else {
            // Fetch Groups for these channels to check target departments
            const groups = await this.groupsService.findByChannelIds(accessibleChannelIds);

            // Map channelId -> Group
            const channelGroupMap = new Map();
            groups.forEach(g => {
                if (g.channelId) channelGroupMap.set(g.channelId, g);
            });

            accessibleChannelIds.forEach(cId => {
                const group = channelGroupMap.get(cId);
                if (group && group.targetDepartment) {
                    // Check if user is in this department
                    if (user.department && user.department.id === group.targetDepartment.id) {
                        fullAccessChannelIds.push(cId);
                    } else {
                        // User is NOT in authorized dept -> See ONLY own uploads
                        limitedAccessChannelIds.push(cId);
                    }
                } else {
                    // No group or no target department -> Default to Full Access (Standard Channel)
                    fullAccessChannelIds.push(cId);
                }
            });
        }

        // 3. Build Query
        const query = this.sharedFilesRepository.createQueryBuilder('file')
            .leftJoinAndSelect('file.channel', 'channel')
            .leftJoinAndSelect('file.uploader', 'uploader')
            // .leftJoinAndSelect('file.channel.group', 'group') // Not standard relation, avoided
            .where(new Brackets(qb => {
                // CLAUSE A: Channels with Full Access
                if (fullAccessChannelIds.length > 0) {
                    qb.where('channel.id IN (:...fullIds)', { fullIds: fullAccessChannelIds });
                } else {
                    // Ensure constraints if no full access
                    qb.where('1=0');
                }

                // CLAUSE B: Channels with Limited Access (Own Uploads Only)
                if (limitedAccessChannelIds.length > 0) {
                    qb.orWhere(new Brackets(subQb => {
                        subQb.where('channel.id IN (:...limitedIds)', { limitedIds: limitedAccessChannelIds })
                            .andWhere('uploader.id = :uid', { uid: userId });
                    }));
                }
            }));

        // 4. Filters
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
