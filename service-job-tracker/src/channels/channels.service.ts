import { Injectable, Inject, forwardRef, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { Message } from './entities/message.entity';
import { AiService } from '../ai/ai.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { DepartmentsService } from '../departments/departments.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChannelsService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Channel)
        private channelsRepository: Repository<Channel>,
        @InjectRepository(Message)
        private messagesRepository: Repository<Message>,
        private aiService: AiService,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService,
        private usersService: UsersService,
        private departmentsService: DepartmentsService,
        private chatGateway: ChatGateway,
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
        const channel = this.channelsRepository.create({ name, type });
        return this.channelsRepository.save(channel);
    }

    async updateChannel(id: number, name: string) {
        await this.channelsRepository.update(id, { name });
        return this.channelsRepository.findOneBy({ id });
    }

    async deleteChannel(id: number) {
        // Manually delete messages first (since we didn't set cascade in entity)
        await this.messagesRepository.delete({ channel: { id } });
        return this.channelsRepository.delete(id);
    }

    async findAll() {
        return this.channelsRepository.find();
    }

    async getMessages(channelId: number) {
        return this.messagesRepository.find({
            where: { channel: { id: channelId } },
            order: { createdAt: 'ASC' },
            relations: ['sender', 'replyTo', 'replyTo.sender'],
        });
    }

    async postMessage(channelId: number, content: string, userId: number, mediaUrl?: string, mediaType?: string, replyToId?: number): Promise<Message> {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) throw new Error('Channel not found');

        const user = await this.usersService.findOne(userId);
        if (!user) throw new Error('User not found');

        const messageObject: any = {
            content,
            channel,
            sender: { id: userId },
            mediaUrl,
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

            await this.sendSystemMessage(channelId, helpText);
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
        const matchedPrefix = triggerPrefixes.find(p => content.toLowerCase().startsWith(p));
        const isJobRequest = !!matchedPrefix;

        if (isJobRequest) {
            console.log('[ChannelsService] Triggering AI for content:', content);
            this.handleAiProcessing(savedMessage, content, matchedPrefix!, userId, channel)
                .catch(e => console.error('[ChannelsService] Background AI Error:', e));
        } else {
            // Debug log
            // console.log('[ChannelsService] Not a job request');
        }

        return savedMessage;
    }

    // Background AI Processor
    private async handleAiProcessing(originalMessage: Message, content: string, prefix: string, userId: number, channel: Channel) {
        try {
            // Remove prefix
            const cleanContent = content.slice(prefix.length).trim();
            if (cleanContent.length < 5) return;

            console.log('[ChannelsService] Calling AI Service (Background)...');
            const aiResult = await this.aiService.parseJobRequest(cleanContent);
            const jobData = aiResult.data;
            console.log('[ChannelsService] AI Response:', jobData);

            if (aiResult.usage > 0) {
                await this.usersService.incrementTokenUsage(userId, aiResult.usage);
            }

            // DEBUG MSG
            if (content.includes('DEBUG')) {
                const debugMsg = this.messagesRepository.create({
                    content: `[SYSTEM DEBUG]\nAI Response: ${JSON.stringify(jobData, null, 2)}`,
                    channel,
                    sender: { id: userId } as any,
                });
                await this.messagesRepository.save(debugMsg);
            }

            // Priority Override
            const manualPriorityMatch = content.match(/\[(P[1-3])\]/);
            const manualPriority = manualPriorityMatch ? manualPriorityMatch[1] : null;
            const finalPriority = manualPriority || jobData.priority;

            if (jobData && ['P1', 'P2', 'P3'].includes(finalPriority)) {
                const dept = await this.departmentsService.findOrCreateByName(channel.name);

                const taskDto = new CreateTaskDto();
                taskDto.title = jobData.title;
                taskDto.description = jobData.description.replace(/\[P[1-3]\]/g, '').trim();
                taskDto.departmentId = dept.id;
                taskDto.ownerId = userId;
                taskDto.priority = finalPriority;
                taskDto.status = 'todo';
                taskDto.dueDate = new Date().toISOString();
                taskDto.imageUrl = originalMessage.mediaUrl;

                const task = await this.tasksService.create(taskDto, userId);
                console.log('[ChannelsService] Task Created (Async):', task.id);

                // Update original message with link
                originalMessage.linkedTaskId = task.id;
                await this.messagesRepository.save(originalMessage);

                // Send Confirmation
                const successMsg = this.messagesRepository.create({
                    content: `✅ Task Created: #${task.id}\nTitle: ${taskDto.title}\nGroup: ${dept.name}`,
                    channel,
                    sender: null,
                });
                // Slight delay to ensure it comes after user message in polling
                setTimeout(async () => {
                    const savedSuccessRaw = await this.messagesRepository.save(successMsg);
                    const savedSuccess = await this.messagesRepository.findOne({ where: { id: savedSuccessRaw.id }, relations: ['channel'] });
                    if (savedSuccess) this.chatGateway.broadcastMessage(savedSuccess);
                }, 500);
            }
        } catch (e: any) {
            console.error("[ChannelsService] Failed to auto-create task", e);
            const errorMsg = this.messagesRepository.create({
                content: `❌ AI Error: ${e.message}`,
                channel,
                sender: null,
            });
            const savedErrorRaw = await this.messagesRepository.save(errorMsg);
            const savedError = await this.messagesRepository.findOne({ where: { id: savedErrorRaw.id }, relations: ['channel'] });
            if (savedError) this.chatGateway.broadcastMessage(savedError);
        }
    }

    async sendSystemMessage(channelId: number, content: string) {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) return;

        const message = this.messagesRepository.create({
            content,
            channel,
            sender: null, // System message
        });
        const savedMessageRaw = await this.messagesRepository.save(message);
        const savedMessage = await this.messagesRepository.findOne({ where: { id: savedMessageRaw.id }, relations: ['channel'] });
        if (savedMessage) this.chatGateway.broadcastMessage(savedMessage);
        return savedMessage;
    }
}

