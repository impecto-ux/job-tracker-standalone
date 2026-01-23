import { Injectable, NotFoundException, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChannelsService } from '../channels/channels.service';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @Inject(forwardRef(() => ChannelsService))
    private channelsService: ChannelsService,
  ) { }

  async onApplicationBootstrap() {
    // ... (rest of bootstrap untouched)
    const count = await this.tasksRepository.count();
    if (count === 0) {
      console.log("Seeding default tasks...");
      const tasks = [
        { title: 'Fix Lower Thirds overlap', description: 'Graphics glitch in scene 4', status: 'in_progress', priority: 'P1', departmentId: 2, ownerId: 1, dueDate: new Date().toISOString() },
        { title: 'Export final 4K render', description: 'Deliver to client', status: 'todo', priority: 'P2', departmentId: 2, ownerId: 1, dueDate: new Date().toISOString() },
        { title: 'Update Brand Guidelines', description: 'Check new pantone colors', status: 'done', priority: 'P3', departmentId: 3, ownerId: 2, dueDate: new Date().toISOString() },
        { title: 'Audit Log API', description: 'Security review', status: 'blocked', priority: 'P2', departmentId: 4, ownerId: 2, dueDate: new Date().toISOString() },
      ];

      for (const t of tasks) {
        const dto = new CreateTaskDto();
        Object.assign(dto, t);
        await this.create(dto, t.ownerId);
      }
    }
  }

  async create(createTaskDto: CreateTaskDto, requesterId: number): Promise<Task> {
    const task = this.tasksRepository.create({ ...createTaskDto, requesterId });
    return this.tasksRepository.save(task);
  }

  async findAll(filters: any = {}): Promise<Task[]> {
    const query = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.owner', 'owner')
      .leftJoinAndSelect('task.requester', 'requester')
      .orderBy('task.created_at', 'DESC');

    if (filters.status) query.andWhere('task.status = :status', { status: filters.status });
    if (filters.departmentId) query.andWhere('task.department_id = :deptId', { deptId: filters.departmentId });
    if (filters.ownerId) query.andWhere('task.owner_id = :ownerId', { ownerId: filters.ownerId });
    if (filters.requesterId) query.andWhere('task.requester_id = :requesterId', { requesterId: filters.requesterId });

    return query.getMany();
  }

  async findOne(id: number): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['department', 'owner', 'requester', 'comments', 'comments.user'],
    });
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, userId: number, comment?: string): Promise<Task> {
    const task = await this.findOne(id);
    if (!task) throw new NotFoundException();

    // 1. Update Task
    const oldStatus = task.status;
    const oldTitle = task.title;
    const oldDesc = task.description;

    const newStatus = updateTaskDto.status;

    // Timestamp Logic
    if (newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (newStatus === 'done' && !task.completedAt) {
      task.completedAt = new Date();
    }
    // Optional: Reset if moving back? Let's keep it simple for now, maybe reset completedAt if moved out of done?
    if (oldStatus === 'done' && newStatus !== 'done') {
      task.completedAt = null; // Clear completion time if moved back
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.tasksRepository.save(task);

    // 2. Add Comment if provided
    if (comment) {
      await this.addComment(id, comment, userId);
    }

    // 3. Notify Channel if status changed
    // 3. Notify Channel if changes detected
    const changes: string[] = [];
    if (newStatus && oldStatus !== newStatus) {
      changes.push(`Status: **${newStatus.toUpperCase().replace('_', ' ')}**`);
    }
    if (updateTaskDto.title && updateTaskDto.title !== oldTitle) {
      changes.push(`Title: **${updateTaskDto.title}**`);
    }
    if (updateTaskDto.description && updateTaskDto.description !== oldDesc) {
      changes.push(`Description: **${updateTaskDto.description}**`);
    }

    if (changes.length > 0) {
      console.log(`[TasksService] Changes Detected for Task #${id}:`, changes);

      const channels = await this.channelsService.findAll();
      console.log('[TasksService] Available Channels:', channels.map(c => c.name));
      const targetChannel = channels.find(c => c.name === updatedTask.department?.name) || channels.find(c => c.name === 'General');
      console.log('[TasksService] Target Channel:', targetChannel?.name);

      if (targetChannel) {
        let icon = '✏️';
        if (oldStatus !== newStatus && newStatus === 'done') icon = '✅';
        if (oldStatus !== newStatus && newStatus === 'in_progress') icon = '🚀';

        let message = `${icon} **Task Updated: #${task.id}**\n${changes.join('\n')}`;

        // Append full task details for context if meaningful changes occurred
        if (updateTaskDto.title || updateTaskDto.description) {
          message += `\n\n**Full Details:**\nTitle: ${updatedTask.title}\nDesc: ${updatedTask.description}\nStatus: ${updatedTask.status}`;
        }

        if (comment) message += `\nNote: "${comment}"`;

        try {
          await this.channelsService.sendSystemMessage(targetChannel.id, message);
          console.log('[TasksService] System Message Sent!');
        } catch (err) {
          console.error('[TasksService] Failed to send system message:', err);
        }
      } else {
        console.warn('[TasksService] No target channel found for notification');
      }
    }

    return updatedTask;
  }

  async addComment(taskId: number, content: string, userId: number, mediaUrl?: string, mediaType?: string): Promise<Comment> {
    const task = await this.findOne(taskId);
    if (!task) throw new NotFoundException();

    const comment = this.commentsRepository.create({
      content,
      taskId,
      userId,
      source: 'web',
      mediaUrl,
      mediaType
    });
    return this.commentsRepository.save(comment);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    if (task) {
      await this.tasksRepository.remove(task);
    }
  }
}
