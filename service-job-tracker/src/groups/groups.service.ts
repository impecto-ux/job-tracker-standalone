import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Group } from './entities/group.entity';
import { UsersService } from '../users/users.service';
import { ChannelsService } from '../channels/channels.service';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private groupsRepository: Repository<Group>,
        private usersService: UsersService,
        @Inject(forwardRef(() => ChannelsService))
        private channelsService: ChannelsService,
    ) { }

    async create(createGroupDto: { name: string; description?: string }) {
        // Auto-create channel for the group
        let channelId: number | undefined = undefined;
        try {
            const channel = await this.channelsService.createChannel(createGroupDto.name, 'group');
            channelId = channel.id;
        } catch (e) {
            console.error("Failed to create channel for group", e);
        }

        const group = this.groupsRepository.create({
            ...createGroupDto,
            channelId: channelId
        });
        return this.groupsRepository.save(group);
    }

    async findAll(options?: { isArchived?: boolean }) {
        return this.groupsRepository.find({
            where: options?.isArchived !== undefined ? { isArchived: options.isArchived } : {},
            relations: ['users']
        });
    }

    async findOne(id: number) {
        return this.groupsRepository.findOne({ where: { id }, relations: ['users', 'users.department'] });
    }

    async update(id: number, updateGroupDto: Partial<Group>, requesterId?: number, requesterRole?: string) {
        const group = await this.findOne(id);
        if (!group) throw new Error('Group not found');

        // Permission check: System Admin OR Group Admin
        if (requesterId && requesterRole) {
            const isSystemAdmin = requesterRole === 'admin';
            const isGroupAdmin = group.adminIds?.includes(requesterId);
            if (!isSystemAdmin && !isGroupAdmin) {
                throw new Error('Unauthorized to update group settings');
            }
        }

        await this.groupsRepository.update(id, updateGroupDto);
        return this.findOne(id);
    }

    async toggleAdmin(groupId: number, userId: number, requesterId?: number, requesterRole?: string) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        const isSystemAdmin = requesterRole === 'admin';
        const isGroupAdmin = group.adminIds?.includes(requesterId || 0);

        if (!isSystemAdmin && !isGroupAdmin) {
            throw new Error('Only system admins or group admins can promote/demote group admins');
        }

        if (!group.adminIds) group.adminIds = [];

        if (group.adminIds.includes(userId)) {
            group.adminIds = group.adminIds.filter(id => id !== userId);
        } else {
            group.adminIds.push(userId);
        }

        return this.groupsRepository.save(group);
    }

    async archive(id: number, requesterRole?: string) {
        if (requesterRole !== 'admin') {
            throw new Error('Only system admins can archive groups');
        }
        const group = await this.findOne(id);
        if (!group) throw new Error('Group not found');

        group.isArchived = true;
        group.archivedAt = new Date();
        const savedGroup = await this.groupsRepository.save(group);

        // Broadcast removal to chat clients
        if (savedGroup.channelId) {
            this.channelsService.broadcastChannelDeleted(savedGroup.channelId);
        }

        return savedGroup;
    }

    async restore(id: number, requesterRole?: string, restoreUsers: boolean = true) {
        if (requesterRole !== 'admin') {
            throw new Error('Only system admins can restore groups');
        }
        const group = await this.findOne(id);
        if (!group) throw new Error('Group not found');

        group.isArchived = false;
        group.archivedAt = null;

        if (!restoreUsers) {
            group.users = [];
        }

        const savedGroup = await this.groupsRepository.save(group);

        // Broadcast creation/restoration to chat clients
        if (savedGroup.channelId) {
            const channel = await this.channelsService.findOneBy({ id: savedGroup.channelId });
            if (channel) {
                this.channelsService.broadcastChannelCreated(channel);
            }
        }

        return savedGroup;
    }

    // This can be called by a scheduled task
    async cleanupOldArchives() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const oldGroups = await this.groupsRepository.find({
            where: {
                isArchived: true,
                archivedAt: LessThan(sixMonthsAgo)
            }
        });

        for (const group of oldGroups) {
            await this.remove(group.id);
        }

        return { deletedCount: oldGroups.length };
    }

    async remove(id: number) {
        console.log(`[GroupsService] Removing group ${id}...`);
        const group = await this.findOne(id);

        if (group) {
            console.log(`[GroupsService] Found group: ${group.name}, channelId: ${group.channelId}`);
            let targetChannelId = group.channelId;

            // Fallback: If no channelId, try to find by name
            if (!targetChannelId) {
                console.log(`[GroupsService] ChannelId missing. Searching channel by name: ${group.name}`);
                const channel = await this.channelsService.findByName(group.name);
                if (channel) {
                    console.log(`[GroupsService] Found channel by name. ID: ${channel.id}`);
                    targetChannelId = channel.id;
                }
            }

            if (targetChannelId) {
                try {
                    console.log(`[GroupsService] Deleting channel ${targetChannelId}`);
                    await this.channelsService.deleteChannel(targetChannelId);
                } catch (e) {
                    console.error(`Failed to delete channel for group ${id}`, e);
                }
            } else {
                console.log(`[GroupsService] No corresponding channel found to delete.`);
            }
        } else {
            console.warn(`[GroupsService] Group ${id} not found!`);
        }

        return this.groupsRepository.delete(id);
    }

    async delete(id: number) {
        return this.remove(id);
    }

    async addUsersToGroup(groupId: number, userIds: number[], requesterId?: number) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        const adder = requesterId ? await this.usersService.findOne(requesterId) : null;
        if (!group.users) group.users = [];

        for (const uid of userIds) {
            const u = await this.usersService.findOne(uid);
            if (u && !group.users.find(existing => existing.id === u.id)) {
                group.users.push(u);

                // Sync to Channel
                if (group.channelId) {
                    await this.channelsService.addMember(group.channelId, uid);

                    // Send notification message like WhatsApp
                    const message = adder
                        ? `🛡️ **${adder.fullName}** added **${u.fullName}** to the group`
                        : `🛡️ **${u.fullName}** joined the group`;
                    await this.channelsService.sendSystemMessage(group.channelId, message);
                }
            }
        }
        return this.groupsRepository.save(group);
    }

    async removeUserFromGroup(groupId: number, userId: number, requesterId?: number) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        const remover = requesterId ? await this.usersService.findOne(requesterId) : null;
        const targetUser = await this.usersService.findOne(userId);

        group.users = group.users.filter(u => u.id !== userId);

        // Sync to Channel
        if (group.channelId) {
            await this.channelsService.removeMember(group.channelId, userId);

            if (targetUser) {
                const message = remover && remover.id !== userId
                    ? `🚪 **${remover.fullName}** removed **${targetUser.fullName}** from the group`
                    : `🚪 **${targetUser.fullName}** left the group`;
                await this.channelsService.sendSystemMessage(group.channelId, message);
            }
        }

        return this.groupsRepository.save(group);
    }
}
