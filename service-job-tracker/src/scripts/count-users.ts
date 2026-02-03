import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

async function verify() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const count = await usersRepo.count();
    console.log(`\n\n>>> FINAL USER COUNT: ${count} <<<\n\n`);
    const users = await usersRepo.find({ order: { id: 'DESC' }, take: 5 });
    console.log('Last 5 Users:', users.map(u => u.username));
    await app.close();
}
verify();
