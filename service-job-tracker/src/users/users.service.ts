import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UsersGateway } from './users.gateway';

@Injectable()
export class UsersService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private usersGateway: UsersGateway,
    ) { }

    async onModuleInit() {
        // Check if Admin exists
        const admin = await this.usersRepository.findOne({ where: [{ email: 'admin@jbtracker.com' }, { username: 'admin' }] });
        if (!admin) {
            console.log("Seeding Admin user...");
            await this.usersRepository.save({
                fullName: 'System Admin',
                email: 'admin@jbtracker.com',
                username: 'admin',
                passwordHash: 'admin123',
                role: 'admin' as any,
                tokenUsage: 0
            });
        }

        // Check if Alice exists
        const alice = await this.usersRepository.findOne({ where: [{ email: 'alice.manager@jbtracker.com' }, { username: 'alicemanager' }] });
        if (!alice) {
            console.log("Seeding default users...");
            await this.usersRepository.save([
                {
                    fullName: 'Alice Manager',
                    email: 'alice.manager@jbtracker.com',
                    username: 'alicemanager',
                    passwordHash: 'password', // Plain text for MVP
                    role: 'manager' as any,
                },
                {
                    fullName: 'Bob Creative',
                    email: 'bob.creative@jbtracker.com',
                    username: 'bobcreative',
                    passwordHash: 'password',
                    role: 'contributor' as any,
                }
            ]);
        }

        // Ensure Bot User Exists
        await this.findOrCreateBotUser();

        // Migration: Ensure all users have usernames and correct domain
        const allUsers = await this.usersRepository.find();
        for (const user of allUsers) {
            let changed = false;
            if (!user.username) {
                const baseUsername = user.fullName.toLowerCase().replace(/\s+/g, '');
                user.username = baseUsername;
                changed = true;
            }
            if (user.email && user.email.includes('@studio.com')) {
                user.email = user.email.replace('@studio.com', '@jbtracker.com');
                changed = true;
            }
            if (changed) {
                await this.usersRepository.save(user);
                console.log(`Migrated user ${user.id}: ${user.username} / ${user.email}`);
            }
        }
    }

    async create(userData: any): Promise<User> {
        const { departmentId, ...cleanData } = userData;
        const user = this.usersRepository.create(cleanData as Partial<User>);

        if (departmentId) {
            user.department = { id: Number(departmentId) } as any;
        }

        const res = await this.usersRepository.save(user);
        this.usersGateway.notifyUserUpdated();
        return res;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email }, relations: ['department', 'groups'] });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { username }, relations: ['department', 'groups'] });
    }

    async findOne(id: number): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id }, relations: ['department', 'groups'] });
    }

    async update(id: number, attrs: any) {
        const user = await this.findOne(id);
        if (!user) {
            throw new Error('User not found');
        }

        const { departmentId, ...cleanAttrs } = attrs;

        // Securely hash password if provided
        if (cleanAttrs.passwordHash) {
            cleanAttrs.passwordHash = await bcrypt.hash(cleanAttrs.passwordHash, 10);
        }

        Object.assign(user, cleanAttrs);

        if (departmentId) {
            user.department = { id: Number(departmentId) } as any;
        } else if (departmentId === null) {
            user.department = null as any;
        }

        const res = await this.usersRepository.save(user);
        this.usersGateway.notifyUserUpdated();
        return res;
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find({ relations: ['department', 'groups', 'teams'] });
    }

    async incrementTokenUsage(userId: number, tokens: number) {
        // Simple increment
        await this.usersRepository.increment({ id: userId }, 'tokenUsage', tokens);
    }

    async addPoints(userId: number, points: number) {
        await this.usersRepository.increment({ id: userId }, 'totalPoints', points);
        console.log(`[UsersService] Added ${points} points to User ${userId}`);
        this.usersGateway.notifyUserUpdated();
    }

    async remove(id: number): Promise<void> {
        await this.usersRepository.delete(id);
        this.usersGateway.notifyUserUpdated();
    }

    async findOrCreateBotUser(): Promise<User> {
        let bot = await this.usersRepository.findOne({ where: { email: 'bot@jbtracker.com' } });

        if (!bot) {
            console.log("Creating System Bot User...");
            bot = await this.usersRepository.save({
                fullName: 'JT Advisor',
                email: 'bot@jbtracker.com',
                username: 'jtadvisor',
                passwordHash: 'system_bot_secure_hash',
                role: 'admin',
                avatarUrl: 'https://ui-avatars.com/api/?name=JT+Advisor&background=8b5cf6&color=fff&bold=true',
                tokenUsage: 0,
                isSystemBot: true
            } as any);
        } else if (!bot.isSystemBot) {
            // Fix for existing bots not having the flag
            console.log("Fixing System Bot Flag...");
            bot.isSystemBot = true;
            await this.usersRepository.save(bot);
        }

        return bot!;
    }
}
