import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
// @UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    const userId = req.user?.userId || 1;
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTaskDto & { comment?: string }, @Request() req) {
    const userId = req.user?.userId || 1;
    return this.tasksService.update(+id, body, userId, body.comment);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { content: string; mediaUrl?: string; mediaType?: string }, @Request() req) {
    const userId = req.user?.userId || 1;
    return this.tasksService.addComment(+id, body.content, userId, body.mediaUrl, body.mediaType);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
