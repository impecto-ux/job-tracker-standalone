import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService
    ) { }

    @Post('login')
    async login(@Body() req: { identifier: string; password: string }) {
        console.log('Login attempt:', req.identifier);
        const user = await this.authService.validateUser(req.identifier, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user); // Returns JWT + user info
    }

    @Post('register')
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
    async register(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            body.avatarUrl = `/uploads/avatars/${file.filename}`;
        }
        return this.authService.register(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async getProfile(@Request() req) {
        // req.user is populated by JwtStrategy (contains userId, username)
        // We fetch full details (including tokenUsage) from DB
        return this.usersService.findOne(req.user.userId);
    }
}
