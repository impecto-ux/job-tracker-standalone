import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskHistory } from './entities/task-history.entity';
import { ChannelsModule } from '../channels/channels.module';
import { ScoringModule } from '../scoring/scoring.module';
import { UsersModule } from '../users/users.module'; // Assuming path
import { TasksGateway } from './tasks.gateway';
import { SquadAgentsModule } from '../squad-agents/squad-agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment]),
    forwardRef(() => ChannelsModule),
    ScoringModule,
    UsersModule,
    forwardRef(() => SquadAgentsModule),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway],
  exports: [TasksService, TasksGateway],
})
export class TasksModule { }
