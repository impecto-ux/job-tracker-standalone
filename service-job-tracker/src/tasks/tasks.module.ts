import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskHistory } from './entities/task-history.entity';
import { TaskRevision } from './entities/task-revision.entity';
import { ChannelsModule } from '../channels/channels.module';
import { ScoringModule } from '../scoring/scoring.module';
import { UsersModule } from '../users/users.module';
import { TasksGateway } from './tasks.gateway';
import { SquadAgentsModule } from '../squad-agents/squad-agents.module';
import { GroupsModule } from '../groups/groups.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment, TaskHistory, TaskRevision]),
    forwardRef(() => ChannelsModule),
    ScoringModule,
    forwardRef(() => UsersModule),
    forwardRef(() => SquadAgentsModule),
    forwardRef(() => GroupsModule),
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway],
  exports: [TasksService, TasksGateway],
})
export class TasksModule { }
