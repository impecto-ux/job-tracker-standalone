import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { Channel } from './entities/channel.entity';
import { Message } from './entities/message.entity';
import { AiModule } from '../ai/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { SquadAgentsModule } from '../squad-agents/squad-agents.module';

import { ChatGateway } from './chat.gateway';

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message]),
        forwardRef(() => AiModule),
        forwardRef(() => TasksModule),
        forwardRef(() => UsersModule),
        forwardRef(() => DepartmentsModule),
        forwardRef(() => SquadAgentsModule),
    ],
    controllers: [ChannelsController],
    providers: [ChannelsService, ChatGateway],
    exports: [ChannelsService, ChatGateway],
})
export class ChannelsModule { }
