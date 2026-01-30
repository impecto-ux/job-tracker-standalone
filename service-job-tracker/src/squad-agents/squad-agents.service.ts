import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquadAgent } from './entities/squad-agent.entity';
import { AiService } from '../ai/ai.service';
import { ChannelsService } from '../channels/channels.service';
import { Task } from '../tasks/entities/task.entity';
import { CreateSquadAgentDto } from './dto/squad-agent.dto';

import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class SquadAgentsService implements OnModuleInit {
    constructor(
        @InjectRepository(SquadAgent)
        private squadAgentRepo: Repository<SquadAgent>,
        private aiService: AiService,
        @Inject(forwardRef(() => ChannelsService))
        private channelsService: ChannelsService,
        private usersService: UsersService,
        @Inject(forwardRef(() => GroupsService))
        private groupsService: GroupsService,
    ) { }

    async onModuleInit() {
        console.log('[SquadAgentsService] Syncing all agents to users...');
        const agents = await this.findAll();
        for (const agent of agents) {
            await this.syncAgentToUser(agent).catch(e => console.error(`Failed to sync agent ${agent.name}`, e));
        }
    }

    async findOneByChannelId(channelId: number): Promise<SquadAgent | null> {
        return this.squadAgentRepo.findOneBy({ channelId });
    }

    async findAll(): Promise<SquadAgent[]> {
        return this.squadAgentRepo.find();
    }

    async createOrUpdate(data: CreateSquadAgentDto): Promise<SquadAgent> {
        let agent: SquadAgent;
        const existing = await this.squadAgentRepo.findOneBy({ channelId: data.channelId });
        if (existing) {
            Object.assign(existing, data);
            agent = await this.squadAgentRepo.save(existing);
        } else {
            agent = this.squadAgentRepo.create(data);
            agent = await this.squadAgentRepo.save(agent);
        }

        // Sync with Users table so they appear in mentions
        try {
            await this.syncAgentToUser(agent);
        } catch (e) {
            console.error('[SquadAgentsService] Failed to sync agent to user:', e);
        }

        return agent;
    }

    private async syncAgentToUser(agent: SquadAgent) {
        // Find existing bot user by email or name
        const botEmail = `bot-channel-${agent.channelId}@squad.ai`;
        const allUsers = await this.usersService.findAll();
        let botUser = allUsers.find(u => u.email === botEmail || (u.fullName === agent.name && u.role === 'bot'));

        const userData = {
            email: botEmail,
            fullName: agent.name,
            username: agent.name.replace('@', '').toLowerCase().replace(/\s+/g, '_'),
            isActive: agent.isActive,
            isSystemBot: true,
            role: 'bot',
            passwordHash: 'system-bot-no-login',
            departmentId: agent.groupId, // Still used for organizational tracking if set
        };

        if (botUser) {
            // Update
            await this.usersService.update(botUser.id, userData);
        } else {
            // Create
            botUser = await this.usersService.create(userData);
        }

        // Ensure bot is a member of the group/channel
        if (agent.channelId) {
            // Check if it's a group
            const groups = await this.groupsService.findAll();
            const group = groups.find(g => g.channelId === agent.channelId);
            if (group) {
                await this.groupsService.addUsersToGroup(group.id, [botUser.id]).catch(e => {
                    // Ignore "already in group" errors
                    if (!e.message?.includes('already')) console.error(`Failed to add bot to group ${group.id}`, e);
                });
            } else {
                // It's a department or other channel type
                await this.channelsService.addMember(agent.channelId, botUser.id).catch(e => console.error(`Failed to add bot to channel ${agent.channelId}`, e));
            }
        }
    }

    async handleTaskEvent(event: string, task: Task) {
        // 1. Prioritize finding agent by specific Channel ID
        let agent: SquadAgent | null = null;

        if (task.channelId) {
            agent = await this.squadAgentRepo.findOneBy({ channelId: task.channelId, isActive: true });
        }

        // 2. Fallback to Legacy Group/Dept matching
        if (!agent && task.departmentId) {
            agent = await this.squadAgentRepo.findOneBy({ groupId: task.departmentId, isActive: true });
        }

        if (!agent) return;

        // Safety check for triggers parsing (SQLite/TypeORM edge cases)
        let triggers = agent.triggers;
        if (typeof triggers === 'string') {
            try {
                triggers = JSON.parse(triggers);
            } catch (e) {
                triggers = [];
            }
        }

        // Check if event is in agent's triggers
        if (!triggers || !Array.isArray(triggers) || !triggers.includes(event)) {
            return;
        }

        console.log(`[SquadAgentsService] Proactive trigger for agent ${agent.name} on event ${event}`);

        try {
            const comment = await this.aiService.generateProactiveResponse(agent, task, event);

            if (comment && comment.length > 5) {
                // Find target channel (Use task.channelId if present!)
                const targetChannelId = task.channelId || (await (async () => {
                    const channels = await this.channelsService.findAll();
                    return channels.find(c => c.name === task.department?.name)?.id || channels.find(c => c.name === 'General')?.id;
                })());

                if (targetChannelId) {
                    await this.channelsService.sendBotMessage(targetChannelId, comment, agent.name);
                }
            }
        } catch (error) {
            console.error('[SquadAgentsService] Proactive logic failed:', error);
        }
    }

    async disableAll(): Promise<void> {
        try {
            console.log('[SquadAgentsService] Executing bulk disable...');
            await this.squadAgentRepo
                .createQueryBuilder()
                .update(SquadAgent)
                .set({ isActive: false })
                .execute();

            const agents = await this.findAll();
            console.log(`[SquadAgentsService] Updating sync for ${agents.length} agents...`);
            for (const agent of agents) {
                await this.syncAgentToUser(agent).catch(e => console.error(`Failed to sync agent ${agent.name}`, e));
            }
        } catch (error) {
            console.error('[SquadAgentsService] Bulk disable logic failed:', error);
            throw error;
        }
    }
}
