import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res, Query, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedFile } from './entities/shared-file.entity';

@Controller('upload')
export class UploadsController {
    constructor(
        @InjectRepository(SharedFile)
        private sharedFilesRepository: Repository<SharedFile>,
    ) { }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Request() req
    ) {
        const body = req.body;
        console.log('[Upload Debug] Req Body:', body);
        const { channelId, userId } = body;
        let thumbnailUrl: string | null = null;
        let thumbPath: string | undefined = undefined;

        // Image Processing (Thumbnail)
        if (file.mimetype.startsWith('image/')) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const sharp = require('sharp');

                const thumbFilename = `thumb_${file.filename}`;
                thumbPath = `./uploads/${thumbFilename}`;

                await sharp(file.path)
                    .resize(300, 300, { fit: 'inside' })
                    .toFile(thumbPath);

                thumbnailUrl = `/api/uploads/${thumbFilename}`;
            } catch (e) {
                console.error('Thumbnail generation failed:', e);
            }
        }

        // --- PERSIST TO DATABASE ---
        try {
            const sharedFile = this.sharedFilesRepository.create({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                thumbnailPath: thumbPath,
                mimetype: file.mimetype,
                size: file.size,
                uploader: userId ? { id: parseInt(userId) } as any : null,
                channel: channelId ? { id: parseInt(channelId) } as any : null
            });
            await this.sharedFilesRepository.save(sharedFile);
        } catch (dbError) {
            console.error('Failed to save SharedFile to DB:', dbError);
        }

        return {
            url: `/api/uploads/${file.filename}`,
            thumbnailUrl,
            filename: file.filename,
            originalname: file.originalname,
        };
    }
}
