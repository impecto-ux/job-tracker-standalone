import { Injectable, Inject, forwardRef } from '@nestjs/common';
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

@Injectable()
export class ChannelsService {
    constructor(
        @InjectRepository(Channel)
        private channelsRepository: Repository<Channel>,
        @InjectRepository(Message)
        private messagesRepository: Repository<Message>,
        private aiService: AiService,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService,
        private usersService: UsersService,
        private departmentsService: DepartmentsService, // Inject Dept Service
    ) { }

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
            relations: ['sender'],
        });
    }

    async postMessage(channelId: number, content: string, userId: number, mediaUrl?: string, mediaType?: string): Promise<Message> {
        const channel = await this.channelsRepository.findOneBy({ id: channelId });
        if (!channel) throw new Error('Channel not found');

        // Simplified check for user existence
        const user = await this.usersService.findOne(userId);
        if (!user) throw new Error('User not found');

        const message = this.messagesRepository.create({
            content,
            channel,
            sender: { id: userId } as any,
            mediaUrl,
            mediaType
        });

        // Help Command
        if (content.trim().toLowerCase() === '!help') {
            const savedMessage = await this.messagesRepository.save(message); // Save user's message first

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

            return this.messagesRepository.findOneOrFail({
                where: { id: savedMessage.id },
                relations: ['sender']
            });
        }

        // AI Processing - Triggered by specific prefixes to save tokens
        const triggerPrefixes = ['!task', '/job', '@bot'];
        const matchedPrefix = triggerPrefixes.find(p => content.toLowerCase().startsWith(p));
        const isJobRequest = !!matchedPrefix;

        // Save USER message first (Optimistic for Backend)
        const savedMessage = await this.messagesRepository.save(message);

        if (isJobRequest) {
            // Process AI in background (Fire and Forget)
            this.handleAiProcessing(savedMessage, content, matchedPrefix!, userId, channel)
                .catch(e => console.error('[ChannelsService] Background AI Error:', e));
        } else if (content.trim().toLowerCase() === '!help') {
            // Handle Help Command separately or integrated? 
            // Existing logic was doing it before saving. Let's keep help simple.
            // Actually, help is fast, but let's just leave it as is or move it?
            // The previous code handled help *before* saving. 
            // Let's keep help logic inside postMessage or move it too if complex.
            // For now, let's stick to the AI split.
        }

        // Help command logic (re-inserted for context, assuming previous check logic was preserved or we move it)
        // ... (Actually, the replaced block overlaps with help. I need to be careful).

        return this.messagesRepository.findOneOrFail({
            where: { id: savedMessage.id },
            relations: ['sender']
        });
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
                setTimeout(() => this.messagesRepository.save(successMsg), 500);
            }
        } catch (e: any) {
            console.error("[ChannelsService] Failed to auto-create task", e);
            const errorMsg = this.messagesRepository.create({
                content: `❌ AI Error: ${e.message}`,
                channel,
                sender: null,
            });
            await this.messagesRepository.save(errorMsg);
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
        return this.messagesRepository.save(message);
    }
}
