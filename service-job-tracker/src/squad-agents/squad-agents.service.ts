import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SquadAgent } from './entities/squad-agent.entity';
import { AiService } from '../ai/ai.service';
import { ChannelsService } from '../channels/channels.service';
import { Task } from '../tasks/entities/task.entity';
import { CreateSquadAgentDto } from './dto/squad-agent.dto';

import { UsersService } from '../users/users.service';
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
    ) { }

    async onModuleInit() {
        console.log('[SquadAgentsService] Syncing all agents to users...');
        const agents = await this.findAll();
        for (const agent of agents) {
            await this.syncAgentToUser(agent).catch(e => console.error(`Failed to sync agent ${agent.name}`, e));
        }
    }

    async findOneByGroupId(groupId: number): Promise<SquadAgent | null> {
        return this.squadAgentRepo.findOneBy({ groupId });
    }

    async findAll(): Promise<SquadAgent[]> {
        return this.squadAgentRepo.find();
    }

    async createOrUpdate(data: CreateSquadAgentDto): Promise<SquadAgent> {
        let agent: SquadAgent;
        const existing = await this.squadAgentRepo.findOneBy({ groupId: data.groupId });
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
        const botEmail = `bot-${agent.groupId}@squad.ai`;
        const allUsers = await this.usersService.findAll();
        let botUser = allUsers.find(u => u.email === botEmail || u.fullName === agent.name);

        const userData = {
            email: botEmail,
            fullName: agent.name,
            username: agent.name.replace('@', '').toLowerCase(),
            isActive: agent.isActive,
            isSystemBot: true,
            role: 'bot',
            passwordHash: 'system-bot-no-login',
            departmentId: agent.groupId,
        };

        if (botUser) {
            // Update
            await this.usersService.update(botUser.id, userData);
        } else {
            // Create
            await this.usersService.create(userData);
        }
    }

    async handleTaskEvent(event: string, task: Task) {
        // Find agent for the task's department (group)
        // If departmentId is null, check default behavior (maybe no agent)
        if (!task.departmentId) return;

        const agent: SquadAgent | null = await this.squadAgentRepo.findOne({
            where: { groupId: task.departmentId, isActive: true }
        });

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
                // Find target channel
                const channels = await this.channelsService.findAll();
                const targetChannel = channels.find(c => c.name === task.department?.name) || channels.find(c => c.name === 'General');

                if (targetChannel) {
                    await this.channelsService.sendBotMessage(targetChannel.id, comment, agent.name);
                }
            }
        } catch (error) {
            console.error('[SquadAgentsService] Proactive logic failed:', error);
        }
    }
}
