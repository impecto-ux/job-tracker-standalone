import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        // Check if Admin exists
        const admin = await this.usersRepository.findOneBy({ email: 'admin@studio.com' });
        if (!admin) {
            console.log("Seeding Admin user...");
            await this.usersRepository.save({
                fullName: 'Admin',
                email: 'admin@studio.com',
                username: 'admin',
                passwordHash: 'admin123',
                role: 'admin' as any,
                tokenUsage: 0
            });
        }

        // Check if Alice exists
        const alice = await this.usersRepository.findOneBy({ email: 'alice@studio.com' });
        if (!alice) {
            console.log("Seeding default users...");
            await this.usersRepository.save([
                {
                    fullName: 'Alice Manager',
                    email: 'alice@studio.com',
                    username: 'alicemanager',
                    passwordHash: 'password', // Plain text for MVP
                    role: 'manager' as any,
                },
                {
                    fullName: 'Bob Creative',
                    email: 'bob@studio.com',
                    username: 'bobcreative',
                    passwordHash: 'password',
                    role: 'contributor' as any,
                }
            ]);
        }

        // Migration: Ensure all users have usernames
        const allUsers = await this.usersRepository.find();
        for (const user of allUsers) {
            if (!user.username) {
                const baseUsername = user.fullName.toLowerCase().replace(/\s+/g, '');
                user.username = baseUsername;
                await this.usersRepository.save(user);
                console.log(`Migrated user ${user.id}: username = ${user.username}`);
            }
        }
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email }, relations: ['department'] });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { username }, relations: ['department'] });
    }

    async findOne(id: number): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id }, relations: ['department'] });
    }

    async update(id: number, attrs: Partial<User>) {
        const user = await this.findOne(id);
        if (!user) {
            throw new Error('User not found');
        }

        // Securely hash password if provided
        if (attrs.passwordHash) {
            attrs.passwordHash = await bcrypt.hash(attrs.passwordHash, 10);
        }

        Object.assign(user, attrs);
        return this.usersRepository.save(user);
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find({ relations: ['department'] });
    }

    async incrementTokenUsage(userId: number, tokens: number) {
        // Simple increment
        await this.usersRepository.increment({ id: userId }, 'tokenUsage', tokens);
    }

    async addPoints(userId: number, points: number) {
        await this.usersRepository.increment({ id: userId }, 'totalPoints', points);
        console.log(`[UsersService] Added ${points} points to User ${userId}`);
    }
}
