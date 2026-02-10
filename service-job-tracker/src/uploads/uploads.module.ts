import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { FilesController } from './files.controller';
import { SharedFile } from './entities/shared-file.entity';
import { ChannelsModule } from '../channels/channels.module';
import { GroupsModule } from '../groups/groups.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SharedFile]),
        forwardRef(() => ChannelsModule),
        forwardRef(() => GroupsModule),
        forwardRef(() => UsersModule)
    ],
    controllers: [UploadsController, FilesController],
    exports: [TypeOrmModule]
})
export class UploadsModule { }
