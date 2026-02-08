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
import { TaskRevision } from './entities/task-revision.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(TaskRevision)
    private revisionsRepository: Repository<TaskRevision>,
    @InjectRepository(TaskHistory)
    private historyRepository: Repository<TaskHistory>,
    @Inject(forwardRef(() => ChannelsService))
    private channelsService: ChannelsService,
    @Inject(forwardRef(() => ScoringService))
    private scoringService: ScoringService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => TasksGateway))
    private tasksGateway: TasksGateway,
    @Inject(forwardRef(() => SquadAgentsService))
    private squadAgentsService: SquadAgentsService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
    private notificationsService: NotificationsService,
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
      .leftJoinAndSelect('task.revisions', 'revisions')
      .orderBy('task.created_at', 'DESC');

    if (filters.status) query.andWhere('task.status = :status', { status: filters.status });
    if (filters.search) {
      query.andWhere('(task.title LIKE :search OR task.description LIKE :search)', { search: `%${filters.search}%` });
    }
    if (filters.departmentId) query.andWhere('task.department_id = :deptId', { deptId: filters.departmentId });
    if (filters.ownerId) query.andWhere('task.owner_id = :ownerId', { ownerId: filters.ownerId });
    if (filters.requesterId) query.andWhere('task.requester_id = :requesterId', { requesterId: filters.requesterId });

    const tasks = await query.getMany();
    if (tasks.length > 0) {
      // Find a task with revisions to log
      const taskWithRev = tasks.find(t => t.revisions && t.revisions.length > 0);
      if (taskWithRev) {
        console.log(`[TasksService] DEBUG: Task #${taskWithRev.id} has ${taskWithRev.revisions.length} revisions.`);
      } else {
        console.log(`[TasksService] DEBUG: No tasks with revisions found in current batch of ${tasks.length}.`);
      }
    }
    return tasks;
  }

  async findOne(id: number): Promise<Task | null> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['department', 'owner', 'requester', 'comments', 'comments.user', 'revisions'],
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

    // If trying to pick up, work on, or reset the task (state change related to workflow)
    if (!isSystemAdmin && task.channelId && (newStatus === 'in_progress' || newStatus === 'done' || newStatus === 'todo')) {
      // Find the group associated with this task's channel
      const channel = await this.channelsService.findOneBy({ id: task.channelId });
      if (channel) {
        const groups = await this.groupsService.findAll({ userRole: 'admin' });
        const taskGroup = groups.find(g => g.channelId === channel.id);
        if (taskGroup) {
          // Load the group with targetDepartment relation
          const fullGroup = await this.groupsService.findOne(taskGroup.id);

          if (fullGroup?.targetDepartment) {
            const allowedDeptId = fullGroup.targetDepartment.id;
            const userDeptId = user.department?.id;

            console.log(`[TasksService] Permission Check - Task #${id}:`);
            console.log(`  - Action: ${task.status} -> ${newStatus}`);
            console.log(`  - Group: ${fullGroup.name} (Dept: ${fullGroup.targetDepartment.name})`);
            console.log(`  - User: ${user.username} (Dept ID: ${userDeptId || 'None'})`);

            const isGroupMember = fullGroup.users.some(u => u.id === userId);

            // Check if user's department matches the group's target department OR if they are an explicit member
            if (userDeptId !== allowedDeptId && !isGroupMember) {
              throw new ForbiddenException(
                `NO PERMISSION: Only members of '${fullGroup.targetDepartment.name}' or explicit group members can work on tasks in '${fullGroup.name}'.`
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

    // Strict Revision Done -> Done Check: Only Requester or Admin can approve
    if (oldStatus === 'revision_done' && newStatus === 'done') {
      const isRequester = (task.requesterId === userId);
      if (!isRequester && !isSystemAdmin) {
        throw new ForbiddenException('Only the original Requester (or Admin) can approve a completed revision.');
      }
    }

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

    // Revision Workflow Logic
    if (newStatus === 'revision' && oldStatus !== 'revision') {
      task.revisionCount = (task.revisionCount || 0) + 1;
      // Reset completedAt if it was set
      task.completedAt = null;
      console.log(`[TasksService] Task #${id} marked for Revision. Count: ${task.revisionCount}`);
    }

    if (newStatus === 'review') {
      // Just state update, implied "work done" but waiting for approval
    }

    // Award/Deduct Points based on Status Change
    if (newStatus && oldStatus !== newStatus) {
      console.log(`[TasksService] Status Change: ${oldStatus} -> ${newStatus} for Task #${id} (Owner: ${task.ownerId}, Score: ${task.score})`);

      // DONE Logic (Includes Approval)
      if (newStatus === 'done' && oldStatus !== 'done') {
        // Completed: Add Points
        if (task.ownerId) {
          console.log(`[TasksService] Awarding ${task.score} points to User ${task.ownerId}`);
          await this.usersService.addPoints(task.ownerId, task.score);
        } else {
          console.warn(`[TasksService] Cannot award points: Task #${id} has no owner.`);
        }
      }
      // REVERT Logic: If moving AWAY from done (Reopen, Revision, etc.)
      else if (oldStatus === 'done' && newStatus !== 'done') {
        // Un-completed: Revert Points
        if (task.ownerId) {
          console.log(`[TasksService] Deducting ${task.score} points from User ${task.ownerId}`);
          await this.usersService.addPoints(task.ownerId, -task.score);
        }
      }
      // REJECTED Logic
      else if (newStatus === 'rejected' && oldStatus !== 'rejected') {
        const rejectionReason = updateTaskDto.comment || comment || 'No reason provided';
        console.log(`[TasksService] Task #${id} REJECTED. Reason: ${rejectionReason}`);

        if (task.channelId) {
          // Update original message metadata if exists
          if (task.metadata?.sourceMessageId) {
            await this.channelsService.updateMessageMetadata(task.metadata.sourceMessageId, {
              rejectionReason,
              taskStatus: 'rejected'
            });
          }
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
    const note = comment || updateTaskDto.comment;
    if (note) {
      await this.addComment(id, note, userId);
    }

    // 3. Notify Channel if changes detected
    const changes: string[] = [];
    // Define note/comment earlier to check it
    // const note = comment || updateTaskDto.comment; // Redeclared


    if (newStatus && oldStatus !== newStatus) {
      changes.push(`Status: **${newStatus.toUpperCase().replace('_', ' ')}**`);
    }
    if (updateTaskDto.title && updateTaskDto.title !== oldTitle) {
      changes.push(`Title: **${updateTaskDto.title}**`);
    }
    if (updateTaskDto.description && updateTaskDto.description !== oldDesc) {
      changes.push(`Description: **${updateTaskDto.description}**`);
    }
    // FIX: Trigger notification if a comment is added, even if status didn't change (or changed in a previous immediate call)
    if (note) {
      // We don't necessarily push to 'changes' string array to avoid redundant text, 
      // but we ensure the block is entered.
      // However, to satisfy 'changes.length > 0', we can push a marker or use a separate flag.
      // Let's just push a generic "Note Added" to changes if it's the *only* change, or rely on a flag.
      // Simplest: push to changes if status didn't change, so users know why they got a ping.
      if (!changes.length) {
        changes.push(`Note Added`);
      }
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

        // Revision Icons
        if (newStatus === 'revision_pending') icon = '🔄';
        if (newStatus === 'revision_in_progress') icon = '🎬'; // On Air
        if (newStatus === 'revision_done') icon = '🆗'; // Ready for Review

        let message = `${icon} **Task Updated: #${task.id}**\n${changes.join('\n')}`;

        if (updateTaskDto.title || updateTaskDto.description) {
          message += `\n\n**Full Details:**\nTitle: ${updatedTask.title}\nDesc: ${updatedTask.description}\nStatus: ${updatedTask.status}`;
        }

        const finalComment = comment || updateTaskDto.comment;
        if (finalComment) message += `\n\n📝 **Note:** "${finalComment}"`;
        if (updateTaskDto.imageUrl) message += `\n\n📷 **Image Attached:** ${updateTaskDto.imageUrl}`;

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

          // If Revision Done, try to reply to the original task request if available
          let replyToId = undefined;
          if (newStatus === 'revision_done' && task.metadata?.sourceMessageId) {
            replyToId = task.metadata.sourceMessageId;
            // Override message for this specific case to be a direct question
            message = `@${task.requester?.username || 'user'} Revision finished! Can you check the revision?`;
          }

          await this.channelsService.sendBotMessage(targetChannel.id, message, 'JT ADVISOR', replyToId);
          console.log(`[TasksService] ✅ Bot message sent successfully`);
        } catch (err) {
          console.error('[TasksService] ❌ Failed to send bot message:', err);
        }
      } else {
        console.warn(`[TasksService] ⚠️ No target channel found for Task #${id}`);
      }
    }

    // 4. NOTIFICATIONS
    // A. Notify New Owner
    if (updateTaskDto.ownerId && updateTaskDto.ownerId !== task.ownerId) {
      this.notificationsService.create(
        updateTaskDto.ownerId,
        'assignment',
        'New Task Assigned',
        `You have been assigned to task #${id}: "${updatedTask.title}"`,
        { taskId: id }
      );
    }

    // B. Notify Requester on Completion
    if (newStatus === 'done' && oldStatus !== 'done' && updatedTask.requesterId) {
      if (updatedTask.requesterId !== userId) { // Don't notify if they completed it themselves
        this.notificationsService.create(
          updatedTask.requesterId,
          'success',
          'Task Completed',
          `Task #${id} "${updatedTask.title}" has been completed by ${user.fullName || user.username}.`,
          { taskId: id }
        );
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

  async remove(id: number, reason?: string): Promise<void> {
    const task = await this.findOne(id);
    if (task) {
      // Update original message metadata if exists
      if (task.metadata?.sourceMessageId) {
        await this.channelsService.updateMessageMetadata(task.metadata.sourceMessageId, {
          deletionReason: reason || 'Deleted by admin',
          taskStatus: 'rejected'
        });
      }

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
      console.log(`[TasksService] Seeding REALISTIC stats...`);

      // 1. Ensure a user exists (at least admin and one generic user)
      let users = await this.usersService.findAll();
      if (users.length < 2) {
        console.log("[TasksService] Not enough users. Please ensure at least 2 users exist.");
        return "Seed failed: Not enough users. Please log in first.";
      }
      const userIds = users.filter(u => u.username !== 'admin').map(u => u.id);
      if (userIds.length === 0) userIds.push(users[0].id);

      // 2. Ensure departments exist
      const deptNames = ['Graphics', 'Development', 'VFX', 'Management'];
      for (const name of deptNames) {
        const existing = await this.tasksRepository.query(`SELECT id FROM departments WHERE name = '${name}'`);
        if (!existing || existing.length === 0) {
          await this.tasksRepository.query(`INSERT INTO departments (name) VALUES ('${name}')`);
        }
      }
      const departments = (await this.tasksRepository.query('SELECT id FROM departments')).map((r: any) => r.id);

      // 3. Clear existing tasks safely
      await this.tasksRepository.query('PRAGMA foreign_keys = OFF;');
      await this.tasksRepository.query('DELETE FROM comments');
      await this.tasksRepository.query('DELETE FROM tasks');
      await this.tasksRepository.query('PRAGMA foreign_keys = ON;');

      const categories = ['Animation', 'Rendering', 'Design', 'Development', 'Meeting'];
      const priorities = ['P1', 'P2', 'P3'];
      const titles = ["Fix header alignment", "Update database schema", "Client meeting", "Render Scene 4", "VFX Shot 01"];

      let totalTasks = 0;
      const now = new Date();

      for (let i = 0; i < 50; i++) {
        const createdAt = new Date(now.getTime() - Math.random() * 86400000 * days);
        const startedAt = Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 3600000 * 2) : null;
        const completedAt = (startedAt && Math.random() > 0.4) ? new Date(startedAt.getTime() + Math.random() * 3600000 * 8) : null;

        let status = 'todo';
        if (completedAt) status = 'done';
        else if (startedAt) status = 'in_progress';

        const task = this.tasksRepository.create({
          title: titles[Math.floor(Math.random() * titles.length)],
          description: "Simulated task",
          status,
          priority: priorities[Math.floor(Math.random() * 3)],
          department: { id: departments[Math.floor(Math.random() * departments.length)] } as any,
          requester: { id: userIds[Math.floor(Math.random() * userIds.length)] } as any,
          owner: { id: userIds[Math.floor(Math.random() * userIds.length)] } as any,
          score: Math.floor(Math.random() * 100),
          category: categories[Math.floor(Math.random() * categories.length)],
          startedAt,
          completedAt,
          createdAt
        });
        await this.tasksRepository.save(task);
        totalTasks++;
      }

      return `Seeded ${totalTasks} tasks successfully.`;
    } catch (err) {
      console.error("[TasksService] Seed error:", err);
      throw err;
    }
  }

  async requestRevision(id: number, userId: number, dto: any): Promise<any> {
    const task = await this.findOne(id);
    if (!task) throw new NotFoundException();

    // Only Requester or Admin can review/request revision
    const user = await this.usersService.findOne(userId);
    const isAdmin = user?.role === 'admin';
    if (task.requesterId !== userId && !isAdmin) {
      throw new ForbiddenException('Only the requester or Admin can request a revision.');
    }

    // 1. Create Revision Record
    const revision = this.revisionsRepository.create({
      task: { id: task.id } as any, // Force explicit relation by ID to avoid TypeORM issues
      revisionNumber: (task.revisionCount || 0) + 1,
      type: dto.type || 'other',
      severity: dto.severity || 'low',
      description: dto.description || 'No description provided.',
      attachmentUrl: dto.attachmentUrl,
      requestedBy: { id: userId } as any
    });
    await this.revisionsRepository.save(revision);

    // 2. Update Task State
    task.revisionCount = revision.revisionNumber;
    task.currentVersion = revision.revisionNumber;
    task.status = 'revision_pending';
    task.completedAt = null;

    const savedTask = await this.tasksRepository.save(task);

    // Trigger Proactive Agents
    this.squadAgentsService.handleTaskEvent('critical_revision', savedTask).catch(e => console.error(e));


    // Notify Channel about Revision
    try {
      const channels = await this.channelsService.findAll();
      let targetChannel = channels.find(c => c.name === 'General');

      // Fallback: Use the task's channel or the first available channel
      if (!targetChannel && task.channelId) {
        targetChannel = channels.find(c => c.id === task.channelId);
      }
      if (!targetChannel && channels.length > 0) {
        targetChannel = channels[0];
      }

      if (targetChannel) {
        const message = `🔄 **Revision Requested for Task #${task.id}**
Title: **${task.title}**
Type: ${dto.type} | Severity: ${dto.severity}
Requested by: @${user?.fullName || 'Unknown'}

"${dto.description}"

Status set to: **REVISION**`;
        await this.channelsService.sendBotMessage(targetChannel.id, message);
      }
    } catch (e) {
      console.error('Failed to send revision notification', e);
    }


    // Notify Owner about Revision
    if (task.ownerId && task.ownerId !== userId) {
      this.notificationsService.create(
        task.ownerId,
        'warning',
        'Revision Requested',
        `A revision has been requested for task #${id}: "${task.title}".`,
        { taskId: id }
      );
    }

    const fullTask = await this.findOne(savedTask.id);
    return fullTask;
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



  async getAdvancedStats(filters: any): Promise<any> {
    console.log('getAdvancedStats called with filters:', filters); // DEBUG
    const query = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.owner', 'owner')
      .leftJoinAndSelect('task.requester', 'requester');

    // Apply Global Filters
    if (filters.range) {
      const now = new Date();
      if (filters.range === 'Today') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        query.andWhere('task.createdAt >= :start', { start });
      } else if (filters.range === '7d') {
        const start = new Date(now.setDate(now.getDate() - 7));
        query.andWhere('task.createdAt >= :start', { start });
      } else if (filters.range === '30d') {
        const start = new Date(now.setDate(now.getDate() - 30));
        query.andWhere('task.createdAt >= :start', { start });
      }
    }

    if (filters.departmentId) query.andWhere('task.departmentId = :deptId', { deptId: filters.departmentId });
    if (filters.ownerId) query.andWhere('task.ownerId = :ownerId', { ownerId: filters.ownerId });
    if (filters.priority) query.andWhere('task.priority = :priority', { priority: filters.priority });

    try {
      const tasks = await query.getMany();
      console.log(`getAdvancedStats found ${tasks.length} tasks`); // DEBUG

      const now = new Date();

      // 1. KPI Calculation
      const kpis = {
        created: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        wip: tasks.filter(t => t.status === 'in_progress' || t.status === 'review' || t.status === 'revision').length,
        completionRate: 0,
        avgTotalTime: 0,
        avgWaitTime: 0,
        avgActiveTime: 0,
        slaBreaches: 0
      };

      let totalTotalTime = 0;
      let totalWaitTime = 0;
      let totalActiveTime = 0;
      let completedWithTime = 0;

      tasks.forEach(t => {
        // SLA Thresholds (Hours)
        const thresholds: Record<string, number> = { 'P1': 2, 'P2': 8, 'P3': 24 };
        const limitHours = thresholds[t.priority] || 24;

        if (t.completedAt) {
          const totalTime = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
          totalTotalTime += totalTime;
          completedWithTime++;

          if (totalTime > limitHours) kpis.slaBreaches++;
        } else {
          const currentAge = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
          if (currentAge > limitHours) kpis.slaBreaches++;
        }

        if (t.startedAt) {
          totalWaitTime += (new Date(t.startedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
        }
        if (t.completedAt && t.startedAt) {
          totalActiveTime += (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 3600);
        }
      });

      kpis.completionRate = kpis.created > 0 ? Math.round((kpis.completed / kpis.created) * 100) : 0;
      kpis.avgTotalTime = completedWithTime > 0 ? parseFloat((totalTotalTime / completedWithTime).toFixed(1)) : 0;
      kpis.avgWaitTime = tasks.filter(t => t.startedAt).length > 0 ? parseFloat((totalWaitTime / tasks.filter(t => t.startedAt).length).toFixed(1)) : 0;
      kpis.avgActiveTime = tasks.filter(t => t.completedAt && t.startedAt).length > 0 ? parseFloat((totalActiveTime / tasks.filter(t => t.completedAt && t.startedAt).length).toFixed(1)) : 0;

      // 2. Time-Series (Created vs Completed)
      const timeSeriesMap: Record<string, { date: string, created: number, completed: number }> = {};
      tasks.forEach(t => {
        const cDate = new Date(t.createdAt).toISOString().split('T')[0];
        if (!timeSeriesMap[cDate]) timeSeriesMap[cDate] = { date: cDate, created: 0, completed: 0 };
        timeSeriesMap[cDate].created++;

        if (t.completedAt) {
          const doneDate = new Date(t.completedAt).toISOString().split('T')[0];
          if (!timeSeriesMap[doneDate]) timeSeriesMap[doneDate] = { date: doneDate, created: 0, completed: 0 };
          timeSeriesMap[doneDate].completed++;
        }
      });
      const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

      // 3. Status Distribution
      const statusMap: Record<string, number> = {};
      tasks.forEach(t => {
        statusMap[t.status] = (statusMap[t.status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // 4. Bottleneck Heatmap (Dept x Status)
      const deptStatusMap: Record<string, any> = {};
      tasks.forEach(t => {
        const dept = t.department?.name || 'Unassigned';
        if (!deptStatusMap[dept]) deptStatusMap[dept] = { name: dept, total: 0, avgAge: 0, slaRisk: 0, counts: {} };

        deptStatusMap[dept].total++;
        deptStatusMap[dept].counts[t.status] = (deptStatusMap[dept].counts[t.status] || 0) + 1;

        const age = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
        deptStatusMap[dept].avgAge += age;

        const thresholds: Record<string, number> = { 'P1': 2, 'P2': 8, 'P3': 24 };
        if (age > (thresholds[t.priority] || 24) * 0.8) deptStatusMap[dept].slaRisk++;
      });

      const bottlenecks = Object.values(deptStatusMap).map((d: any) => ({
        ...d,
        avgAge: parseFloat((d.avgAge / d.total).toFixed(1)),
        slaRiskPercent: Math.round((d.slaRisk / d.total) * 100)
      }));

      // 5. Assignee Leaderboard
      const leaderboardMap: Record<string, any> = {};
      tasks.forEach(t => {
        if (!t.owner) return;
        const name = t.owner.fullName || t.owner.username;
        if (!leaderboardMap[name]) leaderboardMap[name] = {
          name,
          completed: 0,
          totalTime: 0,
          slaBreaches: 0,
          wip: 0,
          count: 0
        };

        if (t.status === 'done') {
          leaderboardMap[name].completed++;
          if (t.completedAt) {
            leaderboardMap[name].totalTime += (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);

            const thresholds: Record<string, number> = { 'P1': 2, 'P2': 8, 'P3': 24 };
            if ((new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600) > (thresholds[t.priority] || 24)) {
              leaderboardMap[name].slaBreaches++;
            }
          }
        } else if (t.status === 'in_progress') {
          leaderboardMap[name].wip++;
        }
        leaderboardMap[name].count++;
      });

      const leaderboard = Object.values(leaderboardMap).map((u: any) => ({
        ...u,
        avgTime: u.completed > 0 ? parseFloat((u.totalTime / u.completed).toFixed(1)) : 0,
        onTimePercent: u.completed > 0 ? Math.round(((u.completed - u.slaBreaches) / u.completed) * 100) : 100
      })).sort((a, b) => b.completed - a.completed);

      // 6. Aging Tasks (Top 10)
      const agingTasks = tasks
        .filter(t => t.status !== 'done' && t.status !== 'rejected')
        .map(t => ({
          id: t.id,
          title: t.title,
          group: t.metadata?.groupName || 'Direct',
          owner: t.owner?.fullName || 'Unassigned',
          status: t.status,
          priority: t.priority,
          ageHours: Math.round((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600)),
          lastActivity: t.updatedAt
        }))
        .sort((a, b) => b.ageHours - a.ageHours)
        .slice(0, 10);

      return {
        kpis,
        timeSeries,
        statusDistribution,
        bottlenecks,
        leaderboard,
        agingTasks,
        filters: {
          total: tasks.length,
          applied: filters
        }
      };
    } catch (error) {
      console.error('getAdvancedStats ERROR:', error);
      throw error;
    }
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
