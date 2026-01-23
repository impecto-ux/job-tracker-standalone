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

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message]),
        AiModule,
        forwardRef(() => TasksModule),
        UsersModule,
        DepartmentsModule
    ],
    controllers: [ChannelsController],
    providers: [ChannelsService],
    exports: [ChannelsService],
})
export class ChannelsModule { }
