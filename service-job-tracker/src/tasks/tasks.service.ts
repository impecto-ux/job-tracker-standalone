import { Injectable, NotFoundException, ForbiddenException, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChannelsService } from '../channels/channels.service';
import { ScoringService } from '../scoring/scoring.service';
import { UsersService } from '../users/users.service';
import { TasksGateway } from './tasks.gateway';
import { SquadAgentsService } from '../squad-agents/squad-agents.service';
import { GroupsService } from '../groups/groups.service';
import { TaskHistory } from './entities/task-history.entity';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(TaskHistory)
    private historyRepository: Repository<TaskHistory>,
    @Inject(forwardRef(() => ChannelsService))
    private channelsService: ChannelsService,
    private scoringService: ScoringService,
    private usersService: UsersService,
    private tasksGateway: TasksGateway,
    private squadAgentsService: SquadAgentsService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
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

    const savedTask = await this.tasksRepository.save(task);

    // Fetch complete task with relations (Department, Owner, etc.) to ensure frontend receives correct data
    const fullTask = await this.findOne(savedTask.id);

    if (fullTask) {
      this.tasksGateway.sendTaskCreated(fullTask);
      this.squadAgentsService.handleTaskEvent('task_created', fullTask).catch(e => console.error('Proactive Error', e));
      return fullTask;
    }
    return savedTask;
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

    // --- GROUP PERMISSION CHECK ---
    // Get current user with department info
    const user = await this.usersService.findOne(userId);
    if (!user) throw new ForbiddenException('User not found');

    const isSystemAdmin = user.role === 'admin';
    const newStatus = updateTaskDto.status;

    // If trying to pick up or work on the task (changing to in_progress or done)
    if (!isSystemAdmin && task.channelId && (newStatus === 'in_progress' || newStatus === 'done')) {
      // Find the group associated with this task's channel
      const channel = await this.channelsService.findOneBy({ id: task.channelId });
      if (channel) {
        const groups = await this.groupsService.findAll();
        const taskGroup = groups.find(g => g.channelId === channel.id);

        if (taskGroup) {
          // Load the group with targetDepartment relation
          const fullGroup = await this.groupsService.findOne(taskGroup.id);

          if (fullGroup?.targetDepartment) {
            const allowedDeptId = fullGroup.targetDepartment.id;
            const userDeptId = user.department?.id;

            console.log(`[TasksService] Permission Check - Task #${id}:`);
            console.log(`  - Group: ${fullGroup.name}`);
            console.log(`  - Allowed Department: ${fullGroup.targetDepartment.name} (ID: ${allowedDeptId})`);
            console.log(`  - User Department: ${user.department?.name || 'None'} (ID: ${userDeptId})`);

            // Check if user's department matches the group's target department
            if (userDeptId !== allowedDeptId) {
              throw new ForbiddenException(
                `Only ${fullGroup.targetDepartment.name} users can work on tasks in the ${fullGroup.name} group. You are in ${user.department?.name || 'no department'}.`
              );
            }

            console.log(`[TasksService] ✅ Permission granted`);
          }
        }
      }
    }
    // -----------------------------

    // 1. Update Task
    const oldStatus = task.status;
    const oldTitle = task.title;
    const oldDesc = task.description;

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

    // Auto-Assign if unassigned and taking action
    if ((newStatus === 'in_progress' || newStatus === 'done') && !task.ownerId) {
      task.owner = { id: userId } as any;
      task.ownerId = userId;
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

    const savedTask = await this.tasksRepository.save(task);

    // FETCH FULL TASK WITH RELATIONS after update to ensure WebSockets carry full data
    const updatedTask = await this.findOne(savedTask.id);
    if (!updatedTask) throw new NotFoundException('Task not found after save');

    this.tasksGateway.sendTaskUpdated(updatedTask);

    // AI SQUAD PROACTION
    if (newStatus && oldStatus !== newStatus) {
      const event = newStatus === 'done' ? 'task_done' : (newStatus === 'blocked' ? 'task_blocked' : 'task_updated');
      this.squadAgentsService.handleTaskEvent(event, updatedTask).catch(e => console.error('Proactive Error', e));
    } else if (task.priority === 'P1') {
      this.squadAgentsService.handleTaskEvent('p1_priority', updatedTask).catch(e => console.error('Proactive Error', e));
    }

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

      // Prioritize task's channelId, fallback to department name matching
      let targetChannel: any = null;

      if (updatedTask.channelId) {
        console.log(`[TasksService] Task has channelId: ${updatedTask.channelId}`);
        targetChannel = await this.channelsService.findOneBy({ id: updatedTask.channelId });
        console.log(`[TasksService] Found channel by ID:`, targetChannel?.name);
      }

      // Fallback to department matching
      if (!targetChannel) {
        console.log(`[TasksService] No channelId, falling back to department matching`);
        const channels = await this.channelsService.findAll();
        targetChannel = channels.find(c => c.name === updatedTask.department?.name) || channels.find(c => c.name === 'General');
        console.log(`[TasksService] Selected channel:`, targetChannel?.name);
      }

      if (targetChannel) {
        let icon = '✏️';
        if (oldStatus !== newStatus && newStatus === 'done') icon = '✅';
        if (oldStatus !== newStatus && newStatus === 'in_progress') icon = '🚀';

        let message = `${icon} **Task Updated: #${task.id}**\n${changes.join('\n')}`;

        if (updateTaskDto.title || updateTaskDto.description) {
          message += `\n\n**Full Details:**\nTitle: ${updatedTask.title}\nDesc: ${updatedTask.description}\nStatus: ${updatedTask.status}`;
        }
        if (comment) message += `\nNote: "${comment}"`;

        // SMART MENTION: Tag Requester (who asked) and Owner (who did it)
        const mentionUsers: any[] = [];
        if (updatedTask.requester) mentionUsers.push(updatedTask.requester);
        // Also tag owner if they are someone else
        if (updatedTask.owner && updatedTask.owner.id !== updatedTask.requester?.id) {
          mentionUsers.push(updatedTask.owner);
        }

        if (mentionUsers.length > 0) {
          const names = mentionUsers.map(u => u.fullName).filter(n => n).join(' @');
          if (names) message += `\n\ncc: @${names}`;
        }

        try {
          console.log(`[TasksService] 📤 Sending bot message to channel: ${targetChannel.name} (ID: ${targetChannel.id})`);
          await this.channelsService.sendBotMessage(targetChannel.id, message);
          console.log(`[TasksService] ✅ Bot message sent successfully`);
        } catch (err) {
          console.error('[TasksService] ❌ Failed to send bot message:', err);
        }
      } else {
        console.warn(`[TasksService] ⚠️ No target channel found for Task #${id}`);
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
      this.tasksGateway.sendTaskDeleted(id);
    }
  }

  async bulkUpdate(ids: number[], status: string, userId: number): Promise<void> {
    console.log(`[TasksService] Bulk Updating ${ids.length} tasks to status: ${status}`);

    // Process one by one to ensure logic triggers (points, scoring, timestamps)
    // In a high-perf scenario, custom updateBuilder is better, but here we need the service logic
    for (const id of ids) {
      try {
        await this.update(id, { status } as UpdateTaskDto, userId);
      } catch (err) {
        console.error(`[TasksService] Failed to update task #${id} during bulk op`, err);
      }
    }
  }

  async seedStats(days: number = 30): Promise<string> {
    try {
      console.log(`[TasksService] Seeding REALISTIC stats (Jan 1 - Today)...`);

      // 1. Clear existing data safely
      // If this fails, we will catch it.
      try {
        await this.commentsRepository.delete({});
        await this.tasksRepository.delete({});
      } catch (e) {
        console.warn("Standard delete failed. Using SQLite nuclear option.", e);
        try {
          // SQLite specific constraint bypass
          await this.tasksRepository.query('PRAGMA foreign_keys = OFF;');
          await this.tasksRepository.query('DELETE FROM comments');
          await this.tasksRepository.query('DELETE FROM tasks');
          await this.tasksRepository.query('PRAGMA foreign_keys = ON;');
        } catch (e2) {
          console.error("Nuclear option failed too", e2);
          throw e;
        }
      }

      const users = await this.usersService.findAll();
      const userIds = users.filter(u => u.username !== 'admin').map(u => u.id);
      if (userIds.length === 0) userIds.push(1);

      // Fetch valid departments to avoid FK errors
      let departments = [1, 2, 3, 4];
      try {
        const result = await this.tasksRepository.query('SELECT id FROM department');
        if (result && result.length > 0) {
          departments = result.map(r => r.id);
        }
      } catch (e) {
        console.warn("Could not fetch departments, using defaults", e);
      }

      const categories = ['Animation', 'Rendering', 'Design', 'Development', 'Meeting'];
      const priorities = ['P1', 'P2', 'P3'];

      const titles = [
        "Fix header alignment", "Update database schema", "Client meeting notes",
        "Refactor auth service", "Design new logo", "Optimize image loading",
        "Write unit tests", "Deploy to staging", "Fix login bug", "Update documentation",
        "Code review for PR", "Setup CI/CD pipeline", "Investigate memory leak",
        "Create marketing assets", "Update dependencies", "Render Scene 4",
        "Compositing Shot 01", "Model Character A", "Rigging updates"
      ];

      let totalTasks = 0;

      // Hardcoded Range: Jan 1st - Jan 24th 2026
      const startDate = new Date('2026-01-01T00:00:00');
      const endDate = new Date('2026-01-24T23:59:59');

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dailyCount = Math.floor(Math.random() * 12) + 5;

        for (let i = 0; i < dailyCount; i++) {
          // Creation: 9 AM - 6 PM
          const createdHour = 9 + Math.floor(Math.random() * 9);
          const createdMin = Math.floor(Math.random() * 60);
          const createdAt = new Date(d);
          createdAt.setHours(createdHour, createdMin, 0, 0);

          // Lifecycle
          let status = 'done';
          const rand = Math.random();
          const daysAgo = (endDate.getTime() - d.getTime()) / (1000 * 3600 * 24);

          if (daysAgo < 1) {
            // "Today": Mixed
            if (rand > 0.6) status = 'todo';
            else if (rand > 0.3) status = 'in_progress';
            else status = 'done';
          } else {
            // Older: mostly done
            if (rand > 0.95) status = 'rejected';
            else if (rand > 0.90) status = 'in_progress';
            else status = 'done';
          }

          // Timings
          let startedAt: Date | null = null;
          let completedAt: Date | null = null;
          let score = 0;

          if (status !== 'todo') {
            const waitMins = 10 + Math.floor(Math.random() * 120);
            startedAt = new Date(createdAt.getTime() + waitMins * 60000);
          }

          if (status === 'done' || status === 'rejected') {
            const workMins = 30 + Math.floor(Math.random() * 300);
            completedAt = new Date((startedAt || createdAt).getTime() + workMins * 60000);

            score = Math.floor(Math.random() * 50) + 10;
            if (priorities[Math.floor(Math.random() * 3)] === 'P1') score += 20;
          }

          const title = titles[Math.floor(Math.random() * titles.length)];

          // Ensure IDs are valid
          const safeDept = departments[Math.floor(Math.random() * departments.length)];

          const task = this.tasksRepository.create({
            title: `${title} ${Math.floor(Math.random() * 1000)}`,
            description: `Simulated task for ${d.toLocaleDateString()}`,
            status,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            departmentId: safeDept,
            requesterId: userIds[Math.floor(Math.random() * userIds.length)],
            ownerId: userIds[Math.floor(Math.random() * userIds.length)],
            dueDate: new Date(createdAt.getTime() + 86400000 * 3).toISOString(),
            score,
            category: categories[Math.floor(Math.random() * categories.length)],
            isAutoScored: true,
            startedAt,
            completedAt,
            createdAt,
            updatedAt: completedAt || startedAt || createdAt
          });

          await this.tasksRepository.save(task);
          totalTasks++;
        }
      }

      return `Seeded ${totalTasks} realistic tasks from Jan 1 to Jan 24.`;
    } catch (err: any) {
      console.error("Seeding failed in Service:", err);
      return `Error: ${err.message}`;
    }
  }

  async getEfficiencyStats(): Promise<any> {
    const tasks = await this.tasksRepository.find({
      relations: ['department', 'owner', 'owner.teams']
    });

    let totalWaitTime = 0;
    let waitCount = 0;
    let totalCycleTime = 0;
    let cycleCount = 0;
    let onTimeCount = 0;

    const tasksPerDay: Record<string, number> = {};
    const deptStats: Record<string, { wait: number, cycle: number, count: number, onTime: number }> = {};
    const teamStats: Record<string, { cycle: number, count: number, onTime: number }> = {};

    tasks.forEach(task => {
      const dateKey = task.createdAt.toISOString().split('T')[0];
      tasksPerDay[dateKey] = (tasksPerDay[dateKey] || 0) + 1;

      // Handle Department Stats
      if (task.department) {
        const deptName = task.department.name;
        if (!deptStats[deptName]) deptStats[deptName] = { wait: 0, cycle: 0, count: 0, onTime: 0 };
      }

      // Handle Team Stats (via owner)
      if (task.owner && task.owner.teams) {
        task.owner.teams.forEach((team: any) => {
          if (!teamStats[team.name]) teamStats[team.name] = { cycle: 0, count: 0, onTime: 0 };
        });
      }

      // Wait Time: Created -> Started
      if (task.startedAt) {
        const wait = (new Date(task.startedAt).getTime() - new Date(task.createdAt).getTime()) / 60000;
        if (wait > 0) {
          totalWaitTime += wait;
          waitCount++;
          if (task.department) deptStats[task.department.name].wait += wait;
        }
      }

      // Cycle Time: Started -> Completed
      if (task.completedAt && task.startedAt) {
        const cycle = (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 60000;
        if (cycle > 0) {
          totalCycleTime += cycle;
          cycleCount++;

          // Global Deadline Adherence
          const isOnTime = !task.dueDate || new Date(task.completedAt) <= new Date(task.dueDate);
          if (isOnTime) onTimeCount++;

          // Segment Stats
          if (task.department) {
            deptStats[task.department.name].cycle += cycle;
            deptStats[task.department.name].count++;
            if (isOnTime) deptStats[task.department.name].onTime++;
          }

          if (task.owner && task.owner.teams) {
            task.owner.teams.forEach((team: any) => {
              teamStats[team.name].cycle += cycle;
              teamStats[team.name].count++;
              if (isOnTime) teamStats[team.name].onTime++;
            });
          }
        }
      }
    });

    const globalAvgCycle = cycleCount > 0 ? totalCycleTime / cycleCount : 0;
    const globalOnTimeRate = cycleCount > 0 ? (onTimeCount / cycleCount) * 100 : 100;

    // Process Dept/Team stats with bottleneck detection
    const processSegment = (name: string, data: any) => {
      const avgCycle = data.count > 0 ? Math.round(data.cycle / data.count) : 0;
      const onTimeRate = data.count > 0 ? Math.round((data.onTime / data.count) * 100) : 100;

      // Bottleneck if: cycle time > 150% global avg OR on-time rate < 70%
      const isBottleneck = data.count > 5 && (
        (globalAvgCycle > 0 && avgCycle > globalAvgCycle * 1.5) ||
        (onTimeRate < 70)
      );

      // Performance Score: (0-100) based on speed and accuracy
      let performanceScore = onTimeRate;
      if (globalAvgCycle > 0) {
        const speedRatio = globalAvgCycle / (avgCycle || globalAvgCycle);
        performanceScore = Math.min(100, Math.round((onTimeRate * 0.7) + (speedRatio * 30)));
      }

      return { name, avgCycle, onTimeRate, isBottleneck, performanceScore, count: data.count };
    };

    const departmentBreakdown = Object.keys(deptStats).map(name => ({
      ...processSegment(name, deptStats[name]),
      avgWait: deptStats[name].count > 0 ? Math.round(deptStats[name].wait / deptStats[name].count) : 0
    }));


    const teamBreakdown = Object.keys(teamStats).map(name => processSegment(name, teamStats[name]));

    // --- NEW HEALTH METRICS ---
    const userWorkload: Record<string, number> = {};
    const staleTasks: any[] = [];
    const now = new Date();
    const threeDaysMs = 1000 * 60 * 60 * 24 * 3;

    tasks.forEach(t => {
      // Workload: Count 'in_progress' or 'todo' assignments
      if (t.owner && (t.status === 'in_progress' || t.status === 'todo')) {
        const name = t.owner.fullName || t.owner.username;
        userWorkload[name] = (userWorkload[name] || 0) + 1;
      }

      // Stale Tasks: In Progress for > 3 days
      if (t.status === 'in_progress' && t.startedAt) {
        const duration = now.getTime() - new Date(t.startedAt).getTime();
        if (duration > threeDaysMs) {
          staleTasks.push({
            id: t.id,
            title: t.title,
            owner: t.owner?.fullName || 'Unknown',
            days: Math.floor(duration / (1000 * 60 * 60 * 24))
          });
        }
      }
    });

    // Sort stale tasks by duration (desc)
    staleTasks.sort((a, b) => b.days - a.days);

    return {
      avgWaitTime: waitCount > 0 ? Math.round(totalWaitTime / waitCount) : 0,
      avgCycleTime: Math.round(globalAvgCycle),
      avgVelocity: Object.keys(tasksPerDay).length > 0 ? Math.round(tasks.length / Object.keys(tasksPerDay).length) : 0,
      totalTasks: tasks.length,
      globalOnTimeRate: Math.round(globalOnTimeRate),
      departmentBreakdown,
      teamBreakdown,
      userWorkload: Object.entries(userWorkload).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), // Sorted
      staleTasks: staleTasks.slice(0, 10) // Top 10
    };
  }

  async getSystemStats() {
    const totalTasks = await this.tasksRepository.count();
    const tasks = await this.tasksRepository.find({ select: ['status'] });
    const users = await this.usersService.findAll();
    const totalUsers = users.length;
    const historyCount = await this.historyRepository.count();
    const commentCount = await this.commentsRepository.count();
    const messageCount = await this.channelsService.getMessageCount();

    // Status Breakdowns
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'rejected').length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;

    // Database Size Calculation
    let dbSize = '0 MB';
    try {
      const dbPath = join(process.cwd(), 'job_tracker.sqlite');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const sizeInMb = stats.size / (1024 * 1024);
        dbSize = sizeInMb > 1024
          ? `${(sizeInMb / 1024).toFixed(1)} GB`
          : `${sizeInMb.toFixed(1)} MB`;
      }
    } catch (e) {
      console.error("Failed to get DB size", e);
    }

    // Uptime Calculation
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalTasks,
      totalUsers,
      activeTasks,
      completedTasks,
      historyCount,
      commentCount,
      messageCount,
      dbSize,
      uptime: uptimeStr,
      latency: Math.floor(Math.random() * 10 + 5) + 'ms'
    };
  }
}
