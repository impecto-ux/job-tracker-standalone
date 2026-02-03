import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { DepartmentsService } from '../departments/departments.service';

const TURKISH_NAMES = [
    'Ahmet', 'Mehmet', 'Mustafa', 'Ayşe', 'Fatma', 'Zeynep', 'Emre', 'Can', 'Burak', 'Elif',
    'Selin', 'Cem', 'Deniz', 'Gökhan', 'Hakan', 'Seda', 'Esra', 'Gizem', 'Murat', 'Oğuz',
    'Volkan', 'Sinan', 'Ece', 'Pelin', 'Gamze', 'Derya', 'Onur', 'Mert', 'Kerem', 'Umut',
    'Ozan', 'Tolga', 'Serkan', 'Barış', 'Arda', 'Bora', 'Kaan', 'Ege', 'Yiğit', 'Berk',
    'Sarp', 'Alp', 'Eren', 'Tuna', 'Rüzgar', 'Çınar', 'Toprak', 'Kuzey', 'Güney', 'Doğu'
];

const TURKISH_SURNAMES = [
    'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
    'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
    'Polat', 'Kurtuluş', 'Sarı', 'Korkmaz', 'Bulut', 'Uçar', 'Gül', 'Erdoğan', 'Yavuz', 'Can',
    'Acar', 'Şen', 'Aksoy', 'Güler', 'Uysal', 'Tekin', 'Aktaş', 'Güneş', 'Bozkurt', 'Sönmez'
];

function generateTurkishName(index: number, department: string): { fullName: string, username: string, email: string } {
    const nameIndex = (index + (department === 'Grafik' ? 20 : 0)) % TURKISH_NAMES.length;
    const surnameIndex = (index + (department === 'Grafik' ? 10 : 0)) % TURKISH_SURNAMES.length;

    const firstName = TURKISH_NAMES[nameIndex];
    const lastName = TURKISH_SURNAMES[surnameIndex];
    const fullName = `${firstName} ${lastName}`;

    const englishMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', ' ': ''
    };

    let baseUsername = fullName.toLowerCase().split('').map(c => englishMap[c] || c).join('');
    const username = `${baseUsername}${index}`; // Collision avoidance
    const email = `${username}@jbtracker.com`;

    return { fullName, username, email };
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const departmentsService = app.get(DepartmentsService);
    // Get Repository directly to bypass Gateway/Socket dependency in UsersService
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

    console.log('Starting seed...');

    const kurguDept = await departmentsService.findOrCreateByName('Kurgu');
    console.log(`Department 'Kurgu' ready: ${kurguDept.id}`);

    const grafikDept = await departmentsService.findOrCreateByName('Grafik');
    console.log(`Department 'Grafik' ready: ${grafikDept.id}`);

    // Create Kurgu Users
    console.log('Seeding 40 Kurgu users...');
    for (let i = 1; i <= 40; i++) {
        const { fullName, username, email } = generateTurkishName(i, 'Kurgu');

        const existing = await usersRepository.findOne({ where: { username } });
        if (!existing) {
            const newUser = usersRepository.create({
                fullName,
                email,
                username,
                passwordHash: 'password', // Matching UsersService default, can use bcrypt if needed but MVP ok
                role: 'contributor',
                tokenUsage: 0,
                totalPoints: 0,
                department: { id: kurguDept.id } as any
            });
            await usersRepository.save(newUser);
        }
    }
    console.log('Kurgu users seeded.');

    // Create Grafik Users
    console.log('Seeding 15 Grafik users...');
    for (let i = 1; i <= 15; i++) {
        const { fullName, username, email } = generateTurkishName(i, 'Grafik');

        const existing = await usersRepository.findOne({ where: { username } });
        if (!existing) {
            const newUser = usersRepository.create({
                fullName,
                email,
                username,
                passwordHash: 'password',
                role: 'contributor',
                tokenUsage: 0,
                totalPoints: 0,
                department: { id: grafikDept.id } as any
            });
            await usersRepository.save(newUser);
        }
    }
    console.log('Grafik users seeded.');

    await app.close();
    console.log('Done.');
}

bootstrap();
