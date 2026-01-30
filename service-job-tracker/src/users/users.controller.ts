import { Controller, Post, Body, Patch, Param, Get, Delete, UseGuards, Request, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    create(@Body() userData: Partial<User>) {
        return this.usersService.create(userData);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(@Request() req) {
        // Allow all authenticated users to see user list (for mentions/assigning)
        return this.usersService.findAll();
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = './uploads/avatars';
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                cb(null, `${randomName}${extname(file.originalname)}`);
            },
        }),
    }))
    update(@Param('id') id: string, @Body() body: any, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            body.avatarUrl = `/uploads/avatars/${file.filename}`;
        }
        if (body.password) {
            // UsersService expects plain text in passwordHash to hash it
            body.passwordHash = body.password;
            delete body.password;
        }
        return this.usersService.update(+id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/role')
    async updateRole(@Param('id') id: string, @Body() body: { role: string }, @Request() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can change roles');
        }
        return this.usersService.update(+id, { role: body.role });
    }


    @UseGuards(JwtAuthGuard)
    @Patch(':id/department')
    async updateDepartment(@Param('id') id: string, @Body() body: { departmentId: number }) {
        // Assuming we will need this
        // For now using update
        return this.usersService.update(+id, { department: { id: body.departmentId } } as any);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(+id);
    }
}
