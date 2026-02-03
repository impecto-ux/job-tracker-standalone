import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadsModule } from './uploads/uploads.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { AiModule } from './ai/ai.module';
import { ChannelsModule } from './channels/channels.module';
import { ScoringModule } from './scoring/scoring.module';
import { SimulationModule } from './simulation/simulation.module';
import { GroupsModule } from './groups/groups.module';
import { TeamsModule } from './teams/teams.module';
import { TickerModule } from './ticker/ticker.module';
import { SquadAgentsModule } from './squad-agents/squad-agents.module';
import { NotificationsModule } from './notifications/notifications.module';

// import { AdminModule } from '@adminjs/nestjs';
// import { Database, Resource } from '@adminjs/typeorm';
// import AdminJS from 'adminjs';

// ... (Rest of file)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: 'job_tracker.sqlite',
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    DepartmentsModule,
    AuthModule,
    TasksModule,
    AiModule,
    ChannelsModule,
    UploadsModule,
    ScoringModule,
    SimulationModule,
    GroupsModule,
    TeamsModule,
    TickerModule,
    SquadAgentsModule,
    NotificationsModule,
    // AdminModule.createAdminAsync({

    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     adminJsOptions: {
    //       rootPath: '/admin',
    //       resources: [
    //         { resource: User, options: { navigation: { name: 'Users & Access', icon: 'User' } } },
    //         { resource: Department, options: { navigation: { name: 'Organization', icon: 'Users' } } },
    //         { resource: Task, options: { navigation: { name: 'Work Management', icon: 'CheckSquare' } } },
    //         { resource: Comment, options: { navigation: { name: 'Activity', icon: 'MessageSquare' } } },
    //         { resource: StatsInsight, options: { navigation: { name: 'Analytics', icon: 'BarChart' } } },
    //       ],
    //       branding: {
    //         companyName: 'Job Tracker Admin',
    //         theme: {
    //           colors: {
    //             primary100: '#10b981', // Emerald 500
    //             primary80: '#34d399',
    //             primary60: '#6ee7b7',
    //             primary40: '#a7f3d0',
    //             primary20: '#d1fae5',
    //           }
    //         }
    //       }
    //     },
    //     sessionOptions: {
    //       resave: true,
    //       saveUninitialized: true,
    //       secret: 'super-secret-admin-key',
    //     },
    //   }),
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
