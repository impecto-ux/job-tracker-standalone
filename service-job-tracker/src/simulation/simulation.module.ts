import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimulationController } from './simulation.controller';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Department]),
        TasksModule,
    ],
    controllers: [SimulationController],
})
export class SimulationModule { }
