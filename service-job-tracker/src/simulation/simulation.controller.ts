import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { Department } from '../departments/entities/department.entity';
import { TasksService } from '../tasks/tasks.service';
import * as bcrypt from 'bcrypt';

@Controller('simulation')
export class SimulationController {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Department) private deptRepo: Repository<Department>,
        private tasksService: TasksService,
    ) { }

    @Post('run')
    async runSimulation() {
        console.log("🚀 Starting Simulation...");

        // 1. Ensure Departments
        const deptNames = ['Art / Design', 'Broadcast / Edit', 'Digital / Ops', 'Motion / Branding', 'High-End 3D'];
        const depts: Record<string, Department> = {};

        for (const name of deptNames) {
            let d = await this.deptRepo.findOne({ where: { name } });
            if (!d) d = await this.deptRepo.save(this.deptRepo.create({ name }));
            depts[name] = d;
        }

        // 2. Create Graphic Team (10 Users) -> Art / Design
        // Turkish Names
        const graphicNames = [
            'Ayşe Yılmaz', 'Mehmet Demir', 'Fatma Kaya', 'Ali Çelik', 'Zeynep Şahin',
            'Mustafa Yıldız', 'Esra Öztürk', 'Burak Aydın', 'Selin Arslan', 'Cem Doğan'
        ];

        await this.createUsers(graphicNames, depts['Art / Design'], 'graphic');

        // 3. Create Editors (20 Users) -> Split Groups
        const editorNames = [
            // Group 1 (Broadcast)
            'Caner Erkin', 'Barış Özbek', 'Volkan Demirel', 'Sabri Sarıoğlu', 'Gökhan Gönül',
            // Group 2 (Digital)
            'Hakan Şükür', 'Arda Turan', 'Nihat Kahveci', 'Emre Belözoğlu', 'Tuncay Şanlı',
            // Group 3 (Motion)
            'Sergen Yalçın', 'Rıdvan Dilmen', 'Metin Tekin', 'Feyyaz Uçar', 'Ali Gültiken',
            // Group 4 (3D)
            'Hagi', 'Popescu', 'Taffarel', 'Hakan Ünsal', 'Bülent Korkmaz'
        ];

        // Split into 4 groups of 5
        const groups = [
            { users: editorNames.slice(0, 5), dept: depts['Broadcast / Edit'], taskType: 'broadcast' },
            { users: editorNames.slice(5, 10), dept: depts['Digital / Ops'], taskType: 'digital' },
            { users: editorNames.slice(10, 15), dept: depts['Motion / Branding'], taskType: 'motion' },
            { users: editorNames.slice(15, 20), dept: depts['High-End 3D'], taskType: '3d' },
        ];

        let createdTasks = 0;

        for (const group of groups) {
            const users = await this.createUsers(group.users, group.dept, 'editor');

            // Create Organic Tasks for each user
            for (const user of users) {
                await this.createOrganicTask(user, group.dept, group.taskType);
                createdTasks++;
            }
        }

        return { success: true, message: `Simulation Complete. 30 Users, ${createdTasks} Tasks Created.` };
    }

    private async createUsers(names: string[], dept: Department, rolePrefix: string): Promise<User[]> {
        const users: User[] = [];
        const passwordHash = await bcrypt.hash('1234', 10);

        for (const fullName of names) {
            // Username: namesurname (lowercased, turkish chars replaced)
            const username = fullName.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/\s+/g, '');

            let user = await this.userRepo.findOne({ where: { username } });
            if (!user) {
                const newUser = this.userRepo.create({
                    username,
                    passwordHash, // Corrected property name
                    fullName,
                    email: `${username}@nexus.agency`,
                    role: 'user',
                    department: dept,
                    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    isActive: true,
                    tokenUsage: 0
                });
                user = await this.userRepo.save(newUser);
            }
            // user is now guaranteed to be User
            if (user) users.push(user);
        }
        return users;
    }

    private async createOrganicTask(requester: User, dept: Department, type: string) {
        let title = '';
        let description = '';

        // Simulation of !task messages
        // We use keywords from Almanac to trigger auto-scoring
        if (type === 'broadcast') {
            const templates = [
                { t: 'Akşam Bülteni KJ Revizesi', d: 'Hocam akşam bülteni için alt bant KJ lerinde hata var, revize edebilir miyiz?' },
                { t: 'Teaser Kurgu Acil', d: 'Yeni dizinin fragman kurgusu yetişmedi, rough cut atıyorum montajlar mısın?' },
                { t: 'Haber Perföy Senkron', d: 'Ses ve görüntü kaymış, senkronu düzeltip export alalım.' },
                { t: 'Hava Durumu Alt Bant', d: 'Veriler değişti, lower third güncellemesi lazım.' },
                { t: 'Spor Özeti Kesme', d: 'Maç özetlerini birleştirip montaj yapar mısınız?' }
            ];
            const choice = templates[Math.floor(Math.random() * templates.length)];
            title = choice.t;
            description = choice.d;
        } else if (type === 'digital') {
            const templates = [
                { t: 'Instagram Story Boyutlandırma', d: 'Kampanya videosunu story boyutuna (9:16) convert edelim.' },
                { t: 'Web Banner Revize', d: 'Anasayfa bannerdaki logoyu biraz büyütebilir miyiz? Resize işlemi.' },
                { t: 'Sosyal Medya Post Tasarımı', d: 'Haftasonu için post çıkılacak, adaptasyon gerekiyor.' },
                { t: 'Youtube Kapak Resmi', d: 'Yeni video için thumbnail kapak tasarım.' },
                { t: 'Linkedin Görseli', d: 'Kurumsal duyuru için görsel boyutlandırma.' }
            ];
            const choice = templates[Math.floor(Math.random() * templates.length)];
            title = choice.t;
            description = choice.d;
        } else if (type === 'motion') {
            const templates = [
                { t: 'Yeni Jenerik Animasyonu', d: 'Dizinin jenerik müziği değişti, animasyonu uyduralım.' },
                { t: 'Logo Packshot Hareketli', d: 'Reklam sonuna logo animasyon (packshot) ekleyelim.' },
                { t: 'Transition Glitch', d: 'Geçiş efektinde hata var, compositing kısmına bakar mısınız?' },
                { t: 'Title Sequence', d: 'Başlıklar için motion graphics çalışması.' },
                { t: 'Opener Revize', d: 'Program açılışı (opener) çok uzun olmuş, kısaltalım.' }
            ];
            const choice = templates[Math.floor(Math.random() * templates.length)];
            title = choice.t;
            description = choice.d;
        } else if (type === '3d') {
            const templates = [
                { t: 'Karakter Modelleme V1', d: 'Maskot karakterin 3d modelleme aşaması.' },
                { t: 'Stüdyo Render', d: 'Sanal stüdyo için full cg render almamız lazım.' },
                { t: 'FX Patlama Efekti', d: 'Sahne 4 deki patlama için simülasyon (simulation) datası.' },
                { t: 'Rig Hatası', d: 'Karakterin kolu bükülmüyor, rig kontrolü.' },
                { t: 'Set Extension', d: 'Arkaplanı 3d ile genişletelim.' }
            ];
            const choice = templates[Math.floor(Math.random() * templates.length)];
            title = choice.t;
            description = choice.d;
        }

        // Call TasksService.create to ensure Auto-Scoring runs
        await this.tasksService.create({
            title,
            description,
            status: 'todo',
            priority: Math.random() > 0.7 ? 'P1' : 'P2', // Random priority
            departmentId: dept.id,
            ownerId: undefined, // Unassigned initially (was null)
            dueDate: new Date().toISOString(),
        }, requester.id);
    }
}
