import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { FilesController } from './files.controller';
import { SharedFile } from './entities/shared-file.entity';
import { ChannelsModule } from '../channels/channels.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SharedFile]),
        forwardRef(() => ChannelsModule)
    ],
    controllers: [UploadsController, FilesController],
    exports: [TypeOrmModule]
})
export class UploadsModule { }
