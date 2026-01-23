import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
    async register(@Body() body: any) {
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
