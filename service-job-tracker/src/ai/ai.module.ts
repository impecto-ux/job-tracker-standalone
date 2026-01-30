import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module'; // for token tracking if needed
import { TasksModule } from '../tasks/tasks.module';
import { StatsInsight } from './entities/stats-insight.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([StatsInsight]),
        ConfigModule,
        forwardRef(() => UsersModule),
        forwardRef(() => TasksModule),
        AuthModule
    ], // dependency cycle fix
    providers: [AiService],
    exports: [AiService],
    controllers: [AiController],
})
export class AiModule { }
