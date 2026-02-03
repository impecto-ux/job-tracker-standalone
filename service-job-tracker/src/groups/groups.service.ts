import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Brackets } from 'typeorm';
import { Group } from './entities/group.entity';
import { UsersService } from '../users/users.service';
import { ChannelsService } from '../channels/channels.service';
import { DepartmentsService } from '../departments/departments.service';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private groupsRepository: Repository<Group>,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService,
        @Inject(forwardRef(() => ChannelsService))
        private channelsService: ChannelsService,
        @Inject(forwardRef(() => DepartmentsService))
        private departmentsService: DepartmentsService,
    ) { }

    async create(createGroupDto: { name: string; description?: string; isPrivate?: boolean }, creatorId?: number) {
        // Auto-create channel for the group
        let channelId: number | undefined = undefined;
        try {
            const channel = await this.channelsService.createChannel(createGroupDto.name, 'group');
            channelId = channel?.id;
            console.log(`[GroupsService] create: Channel found/created with ID: ${channelId} for group: ${createGroupDto.name}`);
        } catch (e) {
            console.error("Failed to create channel for group", e);
        }

        console.log(`[GroupsService] create: Saving group with channelId: ${channelId}, isPrivate: ${createGroupDto.isPrivate}`);

        let targetDepartment: any = undefined;
        let creatorUser: any = undefined;

        // Add creator as member and admin automatically
        if (creatorId) {
            creatorUser = await this.usersService.findOne(creatorId);
            if (creatorUser && creatorUser.role === 'manager' && creatorUser.department) {
                targetDepartment = creatorUser.department;
                console.log(`[GroupsService] create: Manager detected. Linking group to department: ${targetDepartment.name}`);
            }
        }

        const group = this.groupsRepository.create({
            ...createGroupDto,
            channelId: channelId,
            isPrivate: createGroupDto.isPrivate || false,
            targetDepartment: (createGroupDto as any).targetDepartmentId ? { id: (createGroupDto as any).targetDepartmentId } : (targetDepartment || undefined)
        });

        if (creatorUser) {
            group.users = [creatorUser];
            group.adminIds = [creatorId!];

            // Sync to Channel immediately
            if (channelId) {
                try {
                    await this.channelsService.addMember(channelId, creatorId!);
                } catch (e) {
                    console.error("Failed to add creator to channel", e);
                }
            }
        }

        return this.groupsRepository.save(group);
    }

    async findAll(options?: { isArchived?: boolean, userId?: number, userRole?: string }) {
        console.log(`[GroupsService] findAll(userId: ${options?.userId}, role: ${options?.userRole})`);
        const query = this.groupsRepository.createQueryBuilder('group')
            .leftJoinAndSelect('group.users', 'users')
            .leftJoinAndSelect('group.targetDepartment', 'targetDepartment');

        if (options?.isArchived !== undefined) {
            query.andWhere('group.isArchived = :isArchived', { isArchived: options.isArchived });
        }

        // If system admin, show everything (skip privacy filter)
        if (options?.userRole === 'admin') {
            const results = await query.getMany();
            console.log(`[GroupsService] Admin user, found ${results.length} groups.`);
            return results;
        }

        if (options?.userId) {
            // Manager Context: Fetch managed department hierarchy IDs
            let managedDeptIds: number[] = [];
            if (options.userRole === 'manager') {
                const manager = await this.usersService.findOne(options.userId);
                if (manager && manager.department) {
                    managedDeptIds = await this.departmentsService.getAllDescendants(manager.department.id);
                }
            }

            // (isPrivate = false) OR (user is a member) OR (Manager responsible for department)
            query.andWhere(new Brackets(qb => {
                qb.where('group.isPrivate = :isNotPrivate', { isNotPrivate: 0 })
                    .orWhere('users.id = :userId', { userId: options.userId });

                if (managedDeptIds.length > 0) {
                    qb.orWhere('targetDepartment.id IN (:...managedDeptIds)', { managedDeptIds });
                }
            }));
        }

        console.log(`[GroupsService] Executing query...`);
        const results = await query.getMany();
        return results;
    }



    async findOne(id: number) {
        return this.groupsRepository.findOne({ where: { id }, relations: ['users', 'users.department', 'targetDepartment'] });
    }

    async findOneByChannelId(channelId: number) {
        return this.groupsRepository.findOne({ where: { channelId }, relations: ['targetDepartment'] });
    }

    async update(id: number, updateGroupDto: any, requesterId?: number, requesterRole?: string) {
        try {
            console.log(`[GroupsService] update called for id: ${id}`, JSON.stringify(updateGroupDto));
            const group = await this.findOne(id);
            if (!group) throw new Error('Group not found');

            // Permission check: System Admin OR Group Admin OR Manager who is a Member
            // OR Manager who is responsible for the group's department
            if (requesterId && requesterRole) {
                const isSystemAdmin = requesterRole === 'admin';
                const isGroupAdmin = group.adminIds?.includes(requesterId);
                const isManagerMember = requesterRole === 'manager' && group.users.some(u => u.id === requesterId);

                let isDepartmentManager = false;
                if (requesterRole === 'manager' && group.targetDepartment) {
                    const manager = await this.usersService.findOne(requesterId);
                    if (manager && manager.department) {
                        isDepartmentManager = await this.departmentsService.isAncestor(manager.department.id, group.targetDepartment.id);
                    }
                }

                if (!isSystemAdmin && !isGroupAdmin && !isManagerMember && !isDepartmentManager) {
                    throw new Error('Unauthorized to update group settings');
                }
            }

            // Handle targetDepartmentId separately using raw SQL for direct column update
            if ('targetDepartmentId' in updateGroupDto) {
                const deptId = (updateGroupDto as any).targetDepartmentId;
                await this.groupsRepository.query(
                    'UPDATE groups SET target_department_id = ? WHERE id = ?',
                    [deptId, id]
                );
                delete (updateGroupDto as any).targetDepartmentId;
            }

            // Update other fields normally
            if (Object.keys(updateGroupDto).length > 0) {
                await this.groupsRepository.update(id, updateGroupDto);

                // SYNC NAME TO CHANNEL IF CHANGED
                if (updateGroupDto.name && group.channelId) {
                    try {
                        await this.channelsService.updateChannel(group.channelId, updateGroupDto.name);
                        console.log(`[GroupsService] Synced group name change to channel ${group.channelId}`);
                    } catch (e) {
                        console.error(`[GroupsService] Failed to sync group name to channel`, e);
                    }
                }
            }

            return this.findOne(id);
        } catch (error) {
            console.error(`[GroupsService] Failed to update group ${id}`, error);
            try {
                require('fs').appendFileSync('debug_error.log', `[${new Date().toISOString()}] Error updating group ${id}: ${error.message}\n${error.stack}\n`);
            } catch (e) { console.error("Log error", e) }
            throw error;
        }
    }

    async toggleAdmin(groupId: number, userId: number, requesterId?: number, requesterRole?: string) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        const isSystemAdmin = requesterRole === 'admin';
        const isGroupAdmin = group.adminIds?.includes(requesterId || 0);
        // Allow Managers who are MEMBERS of the group to also toggle admins
        const isManagerMember = requesterRole === 'manager' && group.users.some(u => u.id === requesterId);

        let isDepartmentManager = false;
        if (requesterRole === 'manager' && group.targetDepartment && requesterId) {
            const manager = await this.usersService.findOne(requesterId);
            if (manager && manager.department) {
                isDepartmentManager = await this.departmentsService.isAncestor(manager.department.id, group.targetDepartment.id);
            }
        }

        if (!isSystemAdmin && !isGroupAdmin && !isManagerMember && !isDepartmentManager) {
            throw new Error('Only system admins, group admins, or responsible managers can promote/demote group admins');
        }

        if (!group.adminIds) group.adminIds = [];

        if (group.adminIds.includes(userId)) {
            group.adminIds = group.adminIds.filter(id => id !== userId);
        } else {
            group.adminIds.push(userId);
        }

        return this.groupsRepository.save(group);
    }

    async archive(id: number, requesterId?: number, requesterRole?: string) {
        const group = await this.findOne(id);
        if (!group) throw new Error('Group not found');

        let canArchive = requesterRole === 'admin';
        if (!canArchive && requesterRole === 'manager' && requesterId && group.targetDepartment) {
            const manager = await this.usersService.findOne(requesterId);
            if (manager && manager.department) {
                canArchive = await this.departmentsService.isAncestor(manager.department.id, group.targetDepartment.id);
            }
        }

        if (!canArchive) {
            throw new Error('Only system admins or department managers can archive groups');
        }

        group.isArchived = true;
        group.archivedAt = new Date();
        const savedGroup = await this.groupsRepository.save(group);

        // Broadcast removal to chat clients
        if (savedGroup.channelId) {
            this.channelsService.broadcastChannelDeleted(savedGroup.channelId);
        }

        return savedGroup;
    }

    async restore(id: number, requesterId?: number, requesterRole?: string, restoreUsers: boolean = true) {
        const group = await this.findOne(id);
        if (!group) throw new Error('Group not found');

        let canRestore = requesterRole === 'admin';
        if (!canRestore && requesterRole === 'manager' && requesterId && group.targetDepartment) {
            const manager = await this.usersService.findOne(requesterId);
            if (manager && manager.department) {
                canRestore = await this.departmentsService.isAncestor(manager.department.id, group.targetDepartment.id);
            }
        }

        if (!canRestore) {
            throw new Error('Only system admins or department managers can restore groups');
        }

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

        // Permission Check for Adding Users
        if (requesterId) {
            const adder = await this.usersService.findOne(requesterId);
            if (adder) {
                const isSystemAdmin = adder.role === 'admin';
                const isGroupAdmin = group.adminIds?.includes(requesterId);
                const isManagerMember = adder.role === 'manager' && group.users.some(u => u.id === requesterId);

                let isDepartmentManager = false;
                if (adder.role === 'manager' && group.targetDepartment && adder.department) {
                    isDepartmentManager = await this.departmentsService.isAncestor(adder.department.id, group.targetDepartment.id);
                }

                if (!isSystemAdmin && !isGroupAdmin && !isManagerMember && !isDepartmentManager) {
                    throw new Error('Unauthorized to add members to this group');
                }
            }
        }

        const adder = requesterId ? await this.usersService.findOne(requesterId) : null;
        if (!group.users) group.users = [];

        const addedUsers: any[] = [];
        for (const uid of userIds) {
            const u = await this.usersService.findOne(uid);
            if (u && !group.users.find(existing => existing.id === u.id)) {
                group.users.push(u);
                addedUsers.push(u);
            }
        }

        const savedGroup = await this.groupsRepository.save(group);

        // Sync to Channel and Notify (after save to ensure consistency)
        if (savedGroup.channelId) {
            for (const u of addedUsers) {
                // Add to channel members
                await this.channelsService.addMember(savedGroup.channelId, u.id);

                // Send notification message like WhatsApp
                const message = adder
                    ? `🛡️ **${adder.fullName}** added **${u.fullName}** to the group`
                    : `🛡️ **${u.fullName}** joined the group`;
                await this.channelsService.sendSystemMessage(savedGroup.channelId, message);

                // Real-time update for the user
                this.channelsService.notifyUserOfGroupAccess(u.id, savedGroup);
            }
        }
        return savedGroup;
    }

    async removeUserFromGroup(groupId: number, userId: number, requesterId?: number) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        const remover = requesterId ? await this.usersService.findOne(requesterId) : null;

        // Permission Check for Removing Users
        if (requesterId && requesterId !== userId) { // Self-leave is always allowed
            if (remover) {
                const isSystemAdmin = remover.role === 'admin';
                const isGroupAdmin = group.adminIds?.includes(requesterId);
                const isManagerMember = remover.role === 'manager' && group.users.some(u => u.id === requesterId);

                let isDepartmentManager = false;
                if (remover.role === 'manager' && group.targetDepartment && remover.department) {
                    isDepartmentManager = await this.departmentsService.isAncestor(remover.department.id, group.targetDepartment.id);
                }

                if (!isSystemAdmin && !isGroupAdmin && !isManagerMember && !isDepartmentManager) {
                    throw new Error('Unauthorized to remove members from this group');
                }
            }
        }

        const targetUser = await this.usersService.findOne(userId);

        group.users = group.users.filter(u => u.id !== userId);
        const savedGroup = await this.groupsRepository.save(group);

        // Sync to Channel
        if (savedGroup.channelId) {
            await this.channelsService.removeMember(savedGroup.channelId, userId);

            // Real-time access revocation
            this.channelsService.notifyUserOfGroupRemoval(userId, savedGroup.id, savedGroup.channelId);

            if (targetUser) {
                const message = remover && remover.id !== userId
                    ? `🚪 **${remover.fullName}** removed **${targetUser.fullName}** from the group`
                    : `🚪 **${targetUser.fullName}** left the group`;
                await this.channelsService.sendSystemMessage(savedGroup.channelId, message);
            }
        }

        return savedGroup;
    }

    // --- DISCOVERY & PUBLIC GROUPS ---

    async findPublicGroups(userId: number, userRole?: string) {
        console.log(`[GroupsService] findPublicGroups called. userId: ${userId}, userRole: '${userRole}'`);

        // If Admin, show ALL groups. If User, show only PUBLIC groups.
        const whereCondition = userRole === 'admin' ? {} : { isPrivate: false };
        console.log(`[GroupsService] Query condition:`, JSON.stringify(whereCondition));

        const allGroups = await this.groupsRepository.find({
            where: whereCondition,
            relations: ['users']
        });

        // Map over each group and add an 'isMember' property
        const groupsWithStatus = allGroups.map(g => {
            const isMember = g.users?.some(u => Number(u.id) === Number(userId));
            // Create a plain object to return with isMember flag
            const { users, ...groupData } = g;
            return {
                ...groupData,
                isMember,
                memberCount: users?.length || 0,
                // Add explicit private flag for UI to potentially show/hide icons
                isPrivate: g.isPrivate
            };
        });

        console.log(`[GroupsService] Returning ${groupsWithStatus.length} groups for discovery (Role: ${userRole}).`);
        return groupsWithStatus;
    }

    async joinPublicGroup(groupId: number, userId: number, userRole?: string) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        // Admin override: Admins can join any group (including private ones) via discovery
        if (group.isPrivate && userRole !== 'admin') {
            throw new Error('Cannot join private group without invitation.');
        }

        return this.addUsersToGroup(groupId, [userId], undefined); // No adder = self join
    }

    async leavePublicGroup(groupId: number, userId: number) {
        const group = await this.findOne(groupId);
        if (!group) throw new Error('Group not found');

        // Allow leaving any group (even private ones if they are in it)
        return this.removeUserFromGroup(groupId, userId, userId); // Remover = Self
    }
    async findMyGroups(userId: number) {
        const groups = await this.groupsRepository.createQueryBuilder('group')
            .innerJoin('group.users', 'currentUser', 'currentUser.id = :userId', { userId })
            .leftJoinAndSelect('group.users', 'users')
            .getMany();

        return groups.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            isMember: true,
            memberCount: g.users?.length || 0,
            isPrivate: g.isPrivate
        }));
    }
}
