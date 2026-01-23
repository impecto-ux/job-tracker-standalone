import { Controller, Post, Body, Patch, Param, Get, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

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
    update(@Param('id') id: string, @Body() attrs: Partial<User>) {
        return this.usersService.update(+id, attrs);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/role')
    async updateRole(@Param('id') id: string, @Body() body: { role: string }, @Request() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can change roles');
        }
        return this.usersService.update(+id, { role: body.role });
    }
}
