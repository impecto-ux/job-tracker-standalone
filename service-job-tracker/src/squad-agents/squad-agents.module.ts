import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SquadAgent } from './entities/squad-agent.entity';
import { SquadAgentsService } from './squad-agents.service';
import { SquadAgentsController } from './squad-agents.controller';
import { AiModule } from '../ai/ai.module';
import { ChannelsModule } from '../channels/channels.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SquadAgent]),
        AiModule,
        forwardRef(() => ChannelsModule),
        UsersModule,
        forwardRef(() => TasksModule),
        forwardRef(() => GroupsModule),
    ],
    providers: [SquadAgentsService],
    controllers: [SquadAgentsController],
    exports: [SquadAgentsService],
})
export class SquadAgentsModule { }
