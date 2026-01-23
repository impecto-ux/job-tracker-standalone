import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService implements OnModuleInit {
    constructor(
        @InjectRepository(Department)
        private departmentsRepository: Repository<Department>,
    ) { }

    async onModuleInit() {
        const count = await this.departmentsRepository.count();
        if (count === 0) {
            console.log("Seeding default departments...");
            await this.departmentsRepository.save([
                { name: 'General', description: 'General Tasks' },
                { name: 'Post-Production', description: 'Editing, VFX, Color' },
                { name: 'Design', description: 'Graphics, UI/UX' },
                { name: 'Development', description: 'Software Engineering' },
            ]);
        }
    }

    async findOrCreateByName(name: string): Promise<Department> {
        let dept = await this.departmentsRepository.findOneBy({ name });
        if (!dept) {
            dept = this.departmentsRepository.create({ name, description: `Tasks for ${name}` });
            await this.departmentsRepository.save(dept);
        }
        return dept;
    }

    async findByName(name: string): Promise<Department | null> {
        return this.departmentsRepository.findOneBy({ name });
    }
}
