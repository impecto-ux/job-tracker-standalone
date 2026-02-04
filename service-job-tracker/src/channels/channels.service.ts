import { Injectable, Inject, forwardRef, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { Message } from './entities/message.entity';
import { AiService } from '../ai/ai.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { DepartmentsService } from '../departments/departments.service';
import { ChatGateway } from './chat.gateway';
import { SquadAgentsService } from '../squad-agents/squad-agents.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChannelsService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Channel)
        private channelsRepository: Repository<Channel>,
        @InjectRepository(Message)
        private messagesRepository: Repository<Message>,
        private chatGateway: ChatGateway,
        @Inject(forwardRef(() => AiService))
        private aiService: AiService,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService,
        @Inject(forwardRef(() => DepartmentsService))
        private departmentsService: DepartmentsService,
        @Inject(forwardRef(() => SquadAgentsService))
        private squadAgentsService: SquadAgentsService
    ) { }

    async onApplicationBootstrap() {
        const count = await this.channelsRepository.count();
        if (count === 0) {
            console.log("Seeding default channels...");
            const defaultChannels = ['General', 'Post-Production', 'Design', 'Development'];
            for (const name of defaultChannels) {
                await this.createChannel(name, 'department');
            }
            // Also create a private admin channel? Optional.
        }
    }

    async createChannel(name: string, type: string = 'general') {
        // Check if channel already exists with this name to avoid duplicates
        const existing = await this.channelsRepository.findOne({ where: { name } });
        if (existing) return existing;

        const channel = this.channelsRepository.create({ name, type });
        const savedChannelRaw = await this.channelsRepository.save(channel);
        const savedChannel = await this.channelsRepository.findOne({ where: { id: savedChannelRaw.id }, relations: ['targetDepartment'] });

        if (savedChannel) {
            this.chatGateway.broadcastChannelCreated(savedChannel);
        }

        return {
            id: savedChannel?.id || savedChannelRaw.id,
            name: savedChannel?.name || savedChannelRaw.name,
            type: savedChannel?.type || savedChannelRaw.type,
            targetDepartment: savedChannel?.targetDepartment ? { id: savedChannel.targetDepartment.id, name: savedChannel.targetDepartment.name } : null
        };
    }

    async createDirectMessage(userId: number, targetId: number) {
        // 1. Check for existing DM
        // We need to find a channel of type 'private' that has EXACTLY these two users.
        // This is a bit complex with TypeORM, so we'll fetch all private channels for the user and filter.
        // Optimization: In a large app, we'd use a robust QueryBuilder or a separate 'participants' table.

        const userChannels = await this.channelsRepository.find({
            where: { type: 'private' },
            relations: ['users']
        });

        const existing = userChannels.find(c =>
            c.users.length === 2 &&
            c.users.some(u => u.id === userId) &&
            c.users.some(u => u.id === targetId)
        );

        if (existing) {
            return {
                id: existing.id,
                name: existing.name,
                type: existing.type,
                users: existing.users?.map(u => ({ id: u.id, fullName: u.fullName }))
            };
        }

        // 2. Create New DM
        const user = await this.usersService.findOne(userId);
        const target = await this.usersService.findOne(targetId);

        if (!user || !target) throw new Error('User not found');

        const channel = this.channelsRepository.create({
            name: `dm-${Math.min(userId, targetId)}-${Math.max(userId, targetId)}`, // Unique stable name
            type: 'private',
            users: [user, target]
        });

        const savedChannel = await this.channelsRepository.save(channel);

        // Fetch fully populated for broadcast but return simple version
        const populated = await this.channelsRepository.findOne({
            where: { id: savedChannel.id },
            relations: ['users']
        });

        // Broadcast to BOTH users
        this.chatGateway.broadcastChannelCreated(populated);

        return {
            id: savedChannel.id,
            name: savedChannel.name,
            type: savedChannel.type,
            users: populated?.users?.map(u => ({ id: u.id, fullName: u.fullName }))
        };
    }

    async updateChannel(id: number, name: string, targetDepartmentId?: number) {
        const updateData: any = { name };

        if (targetDepartmentId) {
            const dept = await this.departmentsService.findOne(targetDepartmentId); // Ensure this method exists and returns user friendly type
            if (dept) {
                updateData.targetDepartment = dept;
            }
        } else if (targetDepartmentId === null) {
            updateData.targetDepartment = null;
        }

        await this.channelsRepository.update(id, updateData);
        const updated = await this.channelsRepository.findOne({ where: { id }, relations: ['users', 'targetDepartment'] });

        const response = {
            id: updated?.id,
            name: updated?.name,
            type: updated?.type,
            targetDepartment: updated?.targetDepartment ? { id: updated.targetDepartment.id, name: updated.targetDepartment.name } : null,
            users: updated?.users?.map(u => ({ id: u.id, fullName: u.fullName }))
        };

        this.chatGateway.broadcastChannelUpdated(response);
        return response;
    }

    async deleteChannel(id: number) {
        // 1. Manually delete messages first
        await this.messagesRepository.delete({ channel: { id } });

        // 2. Load the entity with relations to ensure TypeORM cleans up join tables (ManyToMany)
        const channel = await this.channelsRepository.findOne({
            where: { id },
            relations: ['users']
        });

        if (channel) {
            // repository.remove() handles ManyToMany cleanup if relations are loaded
            await this.channelsRepository.remove(channel);

            // Notify clients
            this.broadcastChannelDeleted(id);
            return { success: true, id };
        }

        return { success: false, message: 'Channel not found' };
    }

    broadcastChannelDeleted(channelId: number) {
        this.chatGateway.broadcastChannelDeleted(channelId);
    }

    broadcastChannelCreated(channel: any) {
        this.chatGateway.broadcastChannelCreated(channel);
    }

    async getMessageCount() {
        return this.messagesRepository.count();
    }

    async findOneBy(where: any) {
        return this.channelsRepository.findOneBy(where);
    }

    async findAll(userId?: number, userRole?: string, showAll: boolean = false) {
        console.log(`[ChannelsService] findAll(userId: ${userId}, role: ${userRole}, showAll: ${showAll})`);

        // Start QueryBuilder
        const query = this.channelsRepository.createQueryBuilder('channel')
            .leftJoinAndSelect('channel.users', 'allUsers') // Distinct alias for loading data
            .leftJoinAndSelect('channel.targetDepartment', 'targetDepartment')
            .leftJoin('groups', 'g', 'g.channel_id = channel.id');

        if (userId) {
            query.andWhere(new Brackets(qb => {
                // Check membership using a subquery logic implicitly via separate join or simpler WHERE exists
                // OR simpler: Join 'users' only for filtering
                // But TypeORM QueryBuilder is easiest with innerJoin for filtering

                // Let's use a subquery approach for membership to avoid filtering the 'allUsers' relation
                qb.where(`EXISTS (
                    SELECT 1 FROM channel_users_users cu 
                    WHERE cu."channelId" = channel.id AND cu."usersId" = :userId
                )`, { userId });

                if (showAll && userRole === 'admin') {
                    qb.orWhere('channel.type = :typeGroup', { typeGroup: 'channel_group' }); // Note: 'group' is reserved word in SQL often, channel.type values are 'group' (string)
                    qb.orWhere('channel.type = :typeGroupString', { typeGroupString: 'group' });
                }
            }));
        } else {
            // If no user context (shouldn't happen with Guard), return empty
            query.andWhere('1 = 0');
        }

        console.log(`[ChannelsService] Executing query...`);
        const results = await query.getMany();
        console.log(`[ChannelsService] Found ${results.length} channels.`);

        return results.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            targetDepartment: c.targetDepartment ? { id: c.targetDepartment.id, name: c.targetDepartment.name } : null,
            users: c.users?.map(u => ({ id: u.id, fullName: u.fullName })),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })) as any;
    }

    async findByName(name: string) {
        return this.channelsRepository.findOne({ where: { name } });
    }

    async addMember(channelId: number, userId: number) {
        const channel = await this.channelsRepository.findOne({ where: { id: channelId }, relations: ['users'] });
        const user = await this.usersService.findOne(userId);

        if (channel && user) {
            if (!channel.users) channel.users = [];
            // Check if exists
            if (!channel.users.find(u => u.id === user.id)) {
                channel.users.push(user);
                await this.channelsRepository.save(channel);
            }
        }
    }

    async removeMember(channelId: number, userId: number) {
        const channel = await this.channelsRepository.findOne({ where: { id: channelId }, relations: ['users'] });
        if (channel && channel.users) {
            channel.users = channel.users.filter(u => u.id !== userId);
            await this.channelsRepository.save(channel);
        }
    }

    async getMessages(channelId: number, limit: number = 200) {
        const messages = await this.messagesRepository.find({
            where: { channel: { id: channelId } },
            order: { createdAt: 'DESC' },
            relations: ['sender', 'replyTo', 'replyTo.sender'],
            take: limit,
        });

        // Re-sort to ASC to maintain chronological order in UI
        return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(m => ({
            id: m.id,
            content: m.content,
            sender: m.sender ? { id: m.sender.id, fullName: m.sender.fullName } : null,
            createdAt: m.createdAt,
            mediaUrl: m.mediaUrl,
            thumbnailUrl: m.thumbnailUrl,
            mediaType: m.mediaType,
            replyTo: m.replyTo ? { id: m.replyTo.id, content: m.replyTo.content, sender: m.replyTo.sender ? { id: m.replyTo.sender.id, fullName: m.replyTo.sender.fullName } : null } : null,
            linkedTaskId: m.linkedTaskId,
            metadata: m.metadata
        })) as any;
    }

    async postMessage(channelId: number, content: string, userId: number, mediaUrl?: string, mediaType?: string, replyToId?: number, thumbnailUrl?: string, metadata?: any): Promise<Message> {
        console.log(`[ChannelsService] postMessage: "${content}" @ Channel ${channelId}`);
        const channel = await this.channelsRepository.findOne({
            where: { id: channelId },
            relations: ['users', 'targetDepartment']
        });
        if (!channel) throw new Error('Channel not found');

        const user = await this.usersService.findOne(userId);
        if (!user) throw new Error('User not found');

        // SECURITY CHECK: Ensure user is a member of the channel
        // Allow if it's NOT a group/private channel (e.g. public department) OR if the user is in the list
        const isPrivate = ['group', 'private'].includes(channel.type);
        if (isPrivate) {
            const isMember = channel.users.some(u => u.id === userId);
            // Admin Override: Allow Admins to post even if not explicitly a member (implicit access)
            const isAdmin = user.role === 'admin';

            if (!isMember && !isAdmin) {
                console.warn(`[ChannelsService] Unauthorized message attempt by user ${userId} to channel ${channelId}`);
                throw new Error('You are not a member of this channel.');
            }
        }

        const messageObject: any = {
            content,
            channel,
            sender: { id: userId },
            mediaUrl,
            thumbnailUrl,
            mediaType,
            metadata
        };


        if (replyToId) {
            const replyToMessage = await this.messagesRepository.findOne({ where: { id: replyToId } });
            if (replyToMessage) {
                messageObject.replyTo = replyToMessage;
            }
        }

        const message = this.messagesRepository.create(messageObject);

        // 1. Handle Help Command Immediately
        if (content.trim().toLowerCase() === '!help') {
            const savedMessage = (await this.messagesRepository.save(message)) as unknown as Message;

            const helpText = `🤖 **JT ADVISOR HELP**

**Available Commands:**
• \`!task <request>\`: Create a new task (e.g. "!task Fix login page")
• \`/job <request>\`: Same as !task
• \`@bot <request>\`: Same as !task
• \`!help\`: Show this help message

**Tips:**
- You can attach images to your request! 📸
- Be specific for better results.`;

            await this.sendBotMessage(channelId, helpText);
            const helpMsg = await this.messagesRepository.findOneOrFail({ where: { id: savedMessage.id }, relations: ['sender', 'channel'] });
            return {
                id: helpMsg.id,
                content: helpMsg.content,
                sender: helpMsg.sender ? { id: helpMsg.sender.id, fullName: helpMsg.sender.fullName } : null,
                createdAt: helpMsg.createdAt,
                metadata: helpMsg.metadata,
                channel: { id: helpMsg.channel.id, name: helpMsg.channel.name, type: helpMsg.channel.type }
            } as any;
        }

        // 2. Save User Message
        const savedMessageRaw = (await this.messagesRepository.save(message)) as unknown as Message;

        // Fetch fully populated message for broadcast
        const savedMessage = await this.messagesRepository.findOneOrFail({
            where: { id: savedMessageRaw.id },
            relations: ['sender', 'channel', 'replyTo', 'replyTo.sender'] // Include replyTo and its sender
        });


        // BROADCAST VIA WEBSOCKET
        this.chatGateway.broadcastMessage(savedMessage);

        // 3. Trigger AI if applicable (Background)
        const triggerPrefixes = ['!task', '/job', '@bot'];
        let matchedPrefix = triggerPrefixes.find(p => content.toLowerCase().startsWith(p));

        // Dynamic Check: Mentioned a Squad Agent by name?
        if (!matchedPrefix) {
            const allAgents = await this.squadAgentsService.findAll();
            const mention = allAgents.find(a => content.toLowerCase().startsWith(a.name.toLowerCase()));
            if (mention) matchedPrefix = mention.name;
        }

        // DISALLOW AI IN PRIVATE CHANNELS (DMs)
        const isAiAllowed = channel.type !== 'private';
        const isAiRequest = !!matchedPrefix && isAiAllowed;

        if (isAiRequest) {
            console.log(`[ChannelsService] AI Requested. Prefix: "${matchedPrefix}". Content: "${content}"`);
            this.handleAiProcessing(savedMessage, content, matchedPrefix!, userId, channel)
                .catch(e => console.error('[ChannelsService] Background AI Error:', e));
        } else if (isAiAllowed) {
            // Check if ANY agent name is INCLUDED in the content (for more flexible mentions)
            const allAgents = await this.squadAgentsService.findAll();
            const mention = allAgents.find(a => content.toLowerCase().includes(a.name.toLowerCase()));
            if (mention) {
                console.log(`[ChannelsService] AI Requested (Included Mention): "${mention.name}". Content: "${content}"`);
                this.handleAiProcessing(savedMessage, content, mention.name, userId, channel)
                    .catch(e => console.error('[ChannelsService] Background AI Error (Mention):', e));
            }
        }

        return {
            id: savedMessage.id,
            content: savedMessage.content,
            sender: savedMessage.sender ? { id: savedMessage.sender.id, fullName: savedMessage.sender.fullName } : null,
            createdAt: savedMessage.createdAt,
            mediaUrl: savedMessage.mediaUrl,
            thumbnailUrl: savedMessage.thumbnailUrl,
            mediaType: savedMessage.mediaType,
            replyTo: savedMessage.replyTo ? { id: savedMessage.replyTo.id, content: savedMessage.replyTo.content } : undefined,
            linkedTaskId: savedMessage.linkedTaskId,
            metadata: savedMessage.metadata,
            channel: { id: savedMessage.channel.id, name: savedMessage.channel.name, type: savedMessage.channel.type }
        } as any;
    }

    // Background AI Processor
    private async handleAiProcessing(originalMessage: Message, content: string, prefix: string, userId: number, channel: Channel) {
        try {
            console.log('[ChannelsService] handleAiProcessing STARTED');

            // 1. Check if this is a mention of a specific squad agent
            const allAgents = await this.squadAgentsService.findAll();
            // Try to find an agent mentioned ANYWHERE in the content
            const agent = allAgents.find(a => content.toLowerCase().includes(a.name.toLowerCase()));

            if (agent) {
                console.log(`[ChannelsService] Specific Agent ${agent.name} mentioned.`);

                const cleanContent = content.replace(new RegExp(agent.name, 'gi'), '').trim();
                // If the message was ONLY the bot name, maybe they want a status update check
                const effectiveContent = cleanContent || 'Durum nedir?';

                // Signal that we are thinking
                await this.sendBotMessage(channel.id, `🔄 ${agent.name} analiz ediyor...`, agent.name);

                // Fetch context: Recent tasks for this squad
                const tasks = await this.tasksService.findAll();
                const squadTasks = tasks.filter(t => t.departmentId === agent.groupId);

                // Sort by ID descending to get most recent
                const sortedTasks = squadTasks.sort((a, b) => b.id - a.id);

                const context = `SQUAD CONTEXT (Group ID: ${agent.groupId}):
                RECENT SQUAD TASKS:
                ${sortedTasks.slice(0, 15).map(t => {
                    const created = t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A';
                    const completed = t.completedAt ? new Date(t.completedAt).toLocaleString() : (t.status === 'done' ? 'Completed (No Date)' : 'In Progress/Todo');
                    return `- [#${t.id}] "${t.title}" | Status: ${t.status} | Created: ${created} | Completed: ${completed}`;
                }).join('\n')}
                
                TOTAL TASKS IN SQUAD: ${squadTasks.length}
                COMPLETED TODAY: ${squadTasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length}
                `;

                const response = await this.aiService.generateProactiveResponse(agent, {
                    title: 'Current Status Request',
                    description: effectiveContent,
                    department: { name: channel.name },
                    owner: { fullName: 'User' }
                } as any, 'user_mention', context);

                if (response) {
                    console.log(`[ChannelsService] Sending Bot Response from ${agent.name}`);
                    await this.sendBotMessage(channel.id, response, agent.name);
                } else {
                    console.warn(`[ChannelsService] AI Generated EMPTY response for agent ${agent.name}`);
                    await this.sendBotMessage(channel.id, `Düşünüyorum... (İşlem sırasında bir hata oluştu)`, agent.name);
                }
                return;
            }

            // 2. Otherwise, standard behavior (Task Creation)
            console.log('[ChannelsService] Calling AI Service (Job Parse)...');
            const cleanContent = content.slice(prefix.length).trim();
            if (cleanContent.length < 2) return;

            const aiResult = await this.aiService.parseJobRequest(cleanContent);
            const jobData = aiResult.data;
            console.log('[ChannelsService] AI Response:', jobData);

            if (aiResult.usage > 0) {
                try {
                    await this.usersService.incrementTokenUsage(userId, aiResult.usage);
                } catch (e) { console.error('Failed to increment usage', e); }
            }

            // Priority Override
            const manualPriorityMatch = content.match(/\[(P[1-3])\]/);
            const manualPriority = manualPriorityMatch ? manualPriorityMatch[1] : null;
            const finalPriority = manualPriority || jobData.priority;

            if (jobData && ['P1', 'P2', 'P3'].includes(finalPriority)) {
                let dept;

                // FIX: Do not auto-create departments from Group names.
                // 1. Use the channel's linked target department if it exists
                if (channel.targetDepartment) {
                    dept = channel.targetDepartment;
                }
                // 2. Only if the channel ITSELF is a department channel, ensure it exists
                else if (channel.type === 'department') {
                    try {
                        dept = await this.departmentsService.findOrCreateByName(channel.name);
                    } catch (e) {
                        dept = await this.departmentsService.findOrCreateByName('General');
                    }
                }
                // 3. [FIX] If it is a GROUP channel, map it to a Department of the same name
                else if (channel.type === 'group') {
                    try {
                        dept = await this.departmentsService.findOrCreateByName(channel.name);
                    } catch (e) {
                        console.error('Failed to auto-create group dept', e);
                        dept = await this.departmentsService.findOrCreateByName('General');
                    }
                }
                // 4. Fallback to 'General' (e.g. DMs)
                else {
                    dept = await this.departmentsService.findOrCreateByName('General');
                }

                const taskDto = new CreateTaskDto();
                taskDto.title = jobData.title;
                taskDto.description = jobData.description ? jobData.description.replace(/\[P[1-3]\]/g, '').trim() : '';
                taskDto.departmentId = dept.id;
                taskDto.priority = finalPriority;
                taskDto.status = 'todo';
                taskDto.dueDate = new Date().toISOString();
                taskDto.imageUrl = originalMessage.mediaUrl;
                taskDto.metadata = { sourceMessageId: originalMessage.id, sourceChannelId: channel.id };
                taskDto.channelId = channel.id; // 🎯 Set the channel ID for bot notifications

                const task = await this.tasksService.create(taskDto, userId);
                console.log('[ChannelsService] Task Created (Async):', task.id);

                originalMessage.linkedTaskId = task.id;
                const updatedMsg = await this.messagesRepository.save(originalMessage);
                this.chatGateway.broadcastMessageUpdated(updatedMsg);

                setTimeout(async () => {
                    await this.sendBotMessage(channel.id, `✅ Task Created: #${task.id}\nTitle: ${taskDto.title}\nGroup: ${dept.name}`);
                }, 500);
            }
        } catch (e: any) {
            console.error('[ChannelsService] CRITICAL HANDLE AI ERROR:', e);
            await this.sendBotMessage(channel.id, `❌ AI Error: ${e.message}`);
        }
    }

    async sendSystemMessage(channelId: number, content: string) {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) return;

        const message = this.messagesRepository.create({
            content,
            channel,
            sender: null,
        });
        const savedMessageRaw = await this.messagesRepository.save(message);
        const savedMessage = await this.messagesRepository.findOne({ where: { id: savedMessageRaw.id }, relations: ['channel'] });
        if (savedMessage) this.chatGateway.broadcastMessage(savedMessage);
        return savedMessage;
    }

    notifyUserOfGroupAccess(userId: number, group: any) {
        this.chatGateway.notifyUserOfGroupAccess(userId, group);
    }

    notifyUserOfGroupRemoval(userId: number, groupId: number, channelId: number) {
        this.chatGateway.notifyUserOfGroupRemoval(userId, groupId, channelId);
    }

    async sendBotMessage(channelId: number, content: string, botName: string = 'JT ADVISOR', replyToId?: number) {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) return;

        // Try to find the actual system user for this bot to have real identity
        const allUsers = await this.usersService.findAll();
        const botUser = allUsers.find(u => u.fullName === botName || u.username === botName.replace('@', '').toLowerCase());

        const message = this.messagesRepository.create({
            content,
            channel,
            sender: botUser || null,
            replyTo: replyToId ? { id: replyToId } as any : null
        });

        const savedMessageRaw = await this.messagesRepository.save(message);
        const savedMessage = await this.messagesRepository.findOne({
            where: { id: savedMessageRaw.id },
            relations: ['channel', 'sender', 'replyTo', 'replyTo.sender']
        });

        if (savedMessage) {
            // Fallback for gateway if no user found
            if (!savedMessage.sender) {
                savedMessage.sender = { id: 0, fullName: botName, role: 'bot' } as any;
            }
            this.chatGateway.broadcastMessage(savedMessage);
        }
        return savedMessage;
    }

    async updateMessageMetadata(messageId: number, metadata: any) {
        const message = await this.messagesRepository.findOne({ where: { id: messageId }, relations: ['channel', 'sender', 'replyTo', 'replyTo.sender'] });
        if (message) {
            message.metadata = { ...(message.metadata || {}), ...metadata };
            const saved = await this.messagesRepository.save(message);
            this.chatGateway.broadcastMessageUpdated(saved);
        }
    }

    async deleteMessage(channelId: number, messageId: number) {
        const message = await this.messagesRepository.findOne({ where: { id: messageId, channel: { id: channelId } } });
        if (message) {
            await this.messagesRepository.remove(message);
            this.chatGateway.broadcastMessageDeleted(messageId, channelId);
        }
    }
}
