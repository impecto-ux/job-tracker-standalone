import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskHistory } from './entities/task-history.entity';
import { ChannelsModule } from '../channels/channels.module';
import { UsersModule } from '../users/users.module'; // Assuming path
@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment]),
    forwardRef(() => ChannelsModule),
    UsersModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule { }
