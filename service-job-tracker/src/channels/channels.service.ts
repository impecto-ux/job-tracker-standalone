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

@Injectable()
export class ChannelsService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Channel)
        private channelsRepository: Repository<Channel>,
        @InjectRepository(Message)
        private messagesRepository: Repository<Message>,
        private chatGateway: ChatGateway,
        private aiService: AiService,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService,
        @Inject(forwardRef(() => UsersService))
        private usersService: UsersService,
        private departmentsService: DepartmentsService,
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

        this.chatGateway.broadcastChannelCreated(savedChannel);

        return savedChannel;
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
        return this.channelsRepository.findOne({ where: { id }, relations: ['users', 'targetDepartment'] });
    }

    async deleteChannel(id: number) {
        // Manually delete messages first (since we didn't set cascade in entity)
        await this.messagesRepository.delete({ channel: { id } });
        const result = await this.channelsRepository.delete(id);

        // Notify clients
        this.broadcastChannelDeleted(id);

        return result;
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
            .leftJoinAndSelect('channel.users', 'users')
            .leftJoinAndSelect('channel.targetDepartment', 'targetDepartment')
            // Join with groups table using raw table name and snake_case columns
            .leftJoin('groups', 'g', 'g.channel_id = channel.id');

        if (userId) {
            // Logic:
            // 1. User is a member of the channel (checked via join table)
            // 2. OR (Admin Only) showAll is true AND group is NOT private
            query.andWhere(new Brackets(qb => {
                qb.where('users.id = :userId', { userId });

                if (showAll && userRole === 'admin') {
                    // Include ALL groups (Public & Private) for Admins when showAll is true
                    // Note: This overrides the membership filter for admins
                    qb.orWhere('channel.type = :typeGroup', { typeGroup: 'group' });
                }
            }));
        } else {
            // If no user context (shouldn't happen with Guard), return empty
            query.andWhere('1 = 0');
        }

        console.log(`[ChannelsService] Executing query...`);
        const results = await query.getMany();
        console.log(`[ChannelsService] Found ${results.length} channels.`);
        return results;
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
        return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    async postMessage(channelId: number, content: string, userId: number, mediaUrl?: string, mediaType?: string, replyToId?: number, thumbnailUrl?: string): Promise<Message> {
        console.log(`[ChannelsService] postMessage: "${content}" @ Channel ${channelId}`);
        const channel = await this.channelsRepository.findOne({
            where: { id: channelId },
            relations: ['users']
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
            mediaType
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
            return this.messagesRepository.findOneOrFail({ where: { id: savedMessage.id }, relations: ['sender'] });
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

        const isAiRequest = !!matchedPrefix;

        if (isAiRequest) {
            console.log(`[ChannelsService] AI Requested. Prefix: "${matchedPrefix}". Content: "${content}"`);
            this.handleAiProcessing(savedMessage, content, matchedPrefix!, userId, channel)
                .catch(e => console.error('[ChannelsService] Background AI Error:', e));
        } else {
            // Check if ANY agent name is INCLUDED in the content (for more flexible mentions)
            const allAgents = await this.squadAgentsService.findAll();
            const mention = allAgents.find(a => content.toLowerCase().includes(a.name.toLowerCase()));
            if (mention) {
                console.log(`[ChannelsService] AI Requested (Included Mention): "${mention.name}". Content: "${content}"`);
                // Passing mention.name as prefix so handleAiProcessing can find them.
                // Note: content tagging might happen here in the future.
                this.handleAiProcessing(savedMessage, content, mention.name, userId, channel)
                    .catch(e => console.error('[ChannelsService] Background AI Error (Mention):', e));
            }
        }

        return savedMessage;
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
                try {
                    dept = await this.departmentsService.findOrCreateByName(channel.name);
                } catch (e) {
                    dept = { id: 1, name: 'General' } as any;
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
                await this.messagesRepository.save(originalMessage);

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

    async sendBotMessage(channelId: number, content: string, botName: string = 'JT ADVISOR') {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) return;

        // Try to find the actual system user for this bot to have real identity
        const allUsers = await this.usersService.findAll();
        const botUser = allUsers.find(u => u.fullName === botName || u.username === botName.replace('@', '').toLowerCase());

        const message = this.messagesRepository.create({
            content,
            channel,
            sender: botUser || null,
        });

        const savedMessageRaw = await this.messagesRepository.save(message);
        const savedMessage = await this.messagesRepository.findOne({
            where: { id: savedMessageRaw.id },
            relations: ['channel', 'sender']
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

    async deleteMessage(channelId: number, messageId: number) {
        const message = await this.messagesRepository.findOne({ where: { id: messageId, channel: { id: channelId } } });
        if (message) {
            await this.messagesRepository.remove(message);
            this.chatGateway.broadcastMessageDeleted(messageId, channelId);
        }
    }
}
