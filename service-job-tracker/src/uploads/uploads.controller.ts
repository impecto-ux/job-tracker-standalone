import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadsController {
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
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        let thumbnailUrl: string | null = null;

        // Image Processing (Thumbnail)
        if (file.mimetype.startsWith('image/')) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const sharp = require('sharp');
                const fs = require('fs');

                const thumbFilename = `thumb_${file.filename}`;
                const thumbPath = `./uploads/${thumbFilename}`;

                await sharp(file.path)
                    .resize(300, 300, { fit: 'inside' })
                    .toFile(thumbPath);

                thumbnailUrl = `/api/uploads/${thumbFilename}`;
            } catch (e) {
                console.error('Thumbnail generation failed:', e);
            }
        }

        return {
            url: `/api/uploads/${file.filename}`,
            thumbnailUrl,
            filename: file.filename,
            originalname: file.originalname,
        };
    }
}
