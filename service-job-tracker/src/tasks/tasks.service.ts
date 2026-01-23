import { Injectable, NotFoundException, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChannelsService } from '../channels/channels.service';
import { ScoringService } from '../scoring/scoring.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @Inject(forwardRef(() => ChannelsService))
    private channelsService: ChannelsService,
    private scoringService: ScoringService,
    private usersService: UsersService,
  ) { }

  async onApplicationBootstrap() {
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

    // Auto-Score on Creation
    const prediction = this.scoringService.predict(task.title + ' ' + task.description);
    if (prediction) {
      task.score = prediction.score;
      task.category = prediction.category;
      task.isAutoScored = true;
    } else {
      task.category = 'Special / Uncategorized';
      task.score = 0;
    }

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
    if (oldStatus === 'done' && newStatus !== 'done') {
      task.completedAt = null;
    }

    Object.assign(task, updateTaskDto);

    // Re-Score if content changed significantly
    if (updateTaskDto.title || updateTaskDto.description) {
      // Only update if it was previously auto-scored (don't overwrite manual overrides)
      if (task.isAutoScored) {
        const prediction = this.scoringService.predict(task.title + ' ' + task.description);
        if (prediction) {
          task.score = prediction.score;
          task.category = prediction.category;
        }
      }
    }

    // EDGE CASE: If task has no score (old task) and is being marked DONE, calculate it now
    if (newStatus === 'done' && task.score === 0) {
      const prediction = this.scoringService.predict(task.title + ' ' + task.description);
      if (prediction) {
        task.score = prediction.score;
        task.category = prediction.category;
        console.log(`[TasksService] Late-Restored Score for Task #${id}: ${task.score}`);
      }
    }

    // Award/Deduct Points based on Status Change
    if (newStatus && oldStatus !== newStatus) {
      console.log(`[TasksService] Status Change: ${oldStatus} -> ${newStatus} for Task #${id} (Owner: ${task.ownerId}, Score: ${task.score})`);

      if (newStatus === 'done' && oldStatus !== 'done') {
        // Completed: Add Points
        if (task.ownerId) {
          console.log(`[TasksService] Awarding ${task.score} points to User ${task.ownerId}`);
          await this.usersService.addPoints(task.ownerId, task.score);
        } else {
          console.warn(`[TasksService] Cannot award points: Task #${id} has no owner.`);
        }
      } else if (oldStatus === 'done' && newStatus !== 'done') {
        // Un-completed: Revert Points
        if (task.ownerId) {
          console.log(`[TasksService] Deducting ${task.score} points from User ${task.ownerId}`);
          await this.usersService.addPoints(task.ownerId, -task.score);
        }
      }
    }

    const updatedTask = await this.tasksRepository.save(task);

    // 2. Add Comment if provided
    if (comment) {
      await this.addComment(id, comment, userId);
    }

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
      const targetChannel = channels.find(c => c.name === updatedTask.department?.name) || channels.find(c => c.name === 'General');

      if (targetChannel) {
        let icon = '✏️';
        if (oldStatus !== newStatus && newStatus === 'done') icon = '✅';
        if (oldStatus !== newStatus && newStatus === 'in_progress') icon = '🚀';

        let message = `${icon} **Task Updated: #${task.id}**\n${changes.join('\n')}`;

        if (updateTaskDto.title || updateTaskDto.description) {
          message += `\n\n**Full Details:**\nTitle: ${updatedTask.title}\nDesc: ${updatedTask.description}\nStatus: ${updatedTask.status}`;
        }
        if (comment) message += `\nNote: "${comment}"`;

        try {
          await this.channelsService.sendSystemMessage(targetChannel.id, message);
        } catch (err) {
          console.error('[TasksService] Failed to send system message:', err);
        }
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
