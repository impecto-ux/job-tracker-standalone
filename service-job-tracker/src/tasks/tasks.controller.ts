import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post('seed-stats')
  seedStats(@Body() body: { days: number }) {
    return this.tasksService.seedStats(body.days || 30);
  }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('dept') deptId?: number,
    @Query('owner') ownerId?: number,
    @Query('requesterId') requesterId?: number,
  ) {
    return this.tasksService.findAll({ status, departmentId: deptId, ownerId, requesterId });
  }

  @Get('stats/system')
  getSystemStats() {
    return this.tasksService.getSystemStats();
  }

  @Get('stats/efficiency')
  getEfficiencyStats() {
    return this.tasksService.getEfficiencyStats();
  }

  @Get('stats/advanced')
  getAdvancedStats(@Query() filters: any) {
    return this.tasksService.getAdvancedStats(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTaskDto & { comment?: string }, @Request() req) {
    const userId = req.user.userId;
    console.log(`[TasksController] Update Task #${id} payload:`, JSON.stringify(body));
    return this.tasksService.update(+id, body, userId, body.comment);
  }

  @Post('bulk-status')
  bulkUpdateStatus(@Body() body: { ids: number[]; status: string }, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.bulkUpdate(body.ids, body.status, userId);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { content: string; mediaUrl?: string; mediaType?: string }, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.addComment(+id, body.content, userId, body.mediaUrl, body.mediaType);
  }

  @Post(':id/request-revision')
  requestRevision(@Param('id') id: string, @Body() body: any, @Request() req) {
    const userId = req.user.userId;
    return this.tasksService.requestRevision(+id, userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('reason') reason?: string) {
    return this.tasksService.remove(+id, reason);
  }
}
