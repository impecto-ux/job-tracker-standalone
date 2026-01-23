import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module'; // for token tracking if needed
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [ConfigModule, forwardRef(() => UsersModule), forwardRef(() => TasksModule)], // dependency cycle fix
    providers: [AiService],
    exports: [AiService],
    controllers: [AiController],
})
export class AiModule { }
