import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(identifier: string, pass: string): Promise<any> {
        if (!identifier) return null;
        const idLower = identifier.toLowerCase();
        console.log(`[Auth] Validating: ${idLower}`);

        // Try email first, then username
        let user = await this.usersService.findByEmail(idLower);
        if (!user) {
            console.log(`[Auth] No user found by email, checking username...`);
            user = await this.usersService.findByUsername(idLower);
        }

        if (user) {
            console.log(`[Auth] User found: ${user.email} (ID: ${user.id})`);
            // Check if it's a hashed password or plain (for legacy/seed users)
            const isMatch = await bcrypt.compare(pass, user.passwordHash).catch(() => false);
            console.log(`[Auth] Bcrypt match: ${isMatch}`);

            // Fallback for seed users if bcrypt fails (plain text check)
            if (isMatch || user.passwordHash === pass) {
                console.log(`[Auth] Validation SUCCESS`);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { passwordHash, ...result } = user;
                return result;
            }
            console.log(`[Auth] Password mismatch. Stored: ${user.passwordHash.substring(0, 5)}... Input: ${pass.substring(0, 2)}...`);
        } else {
            console.log(`[Auth] No user found for: ${idLower}`);
        }
        return null;
    }

    async register(userData: { email: string, password: string, fullName: string, whatsappNumber?: string, username?: string, avatarUrl?: string, role?: string, departmentId?: string | number }) {
        const emailLower = userData.email.toLowerCase();
        const existingByEmail = await this.usersService.findByEmail(emailLower);
        if (existingByEmail) {
            throw new ConflictException('Email already exists');
        }

        // Use provided username or generate one
        let username = userData.username;
        if (!username) {
            const baseUsername = userData.fullName.toLowerCase().replace(/\s+/g, '');
            username = baseUsername;
            // Simple collision check (optional but recommended)
            const existingByUsername = await this.usersService.findByUsername(username);
            if (existingByUsername) {
                // Add a random number if collision
                username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
            }
        } else {
            // Check provided username for collision
            const existingByUsername = await this.usersService.findByUsername(username);
            if (existingByUsername) {
                throw new ConflictException('Username already taken');
            }
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        try {
            const user = await this.usersService.create({
                email: emailLower,
                username: username,
                passwordHash: hashedPassword,
                fullName: userData.fullName,
                whatsappNumber: userData.whatsappNumber?.trim() || undefined,
                role: userData.role || 'contributor',
                avatarUrl: userData.avatarUrl,
                departmentId: userData.departmentId
            } as any);

            return this.login(user);
        } catch (err: any) {
            if (err.message?.includes('UNIQUE constraint failed') || err.code === 'SQLITE_CONSTRAINT') {
                if (err.message?.includes('whatsapp_number')) {
                    throw new ConflictException('WhatsApp number is already in use by another account');
                }
                throw new ConflictException('Email or identification is already in use');
            }
            throw err;
        }
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        };
    }
}
