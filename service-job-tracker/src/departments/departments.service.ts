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

    async findAll(): Promise<Department[]> {
        return this.departmentsRepository.find({ relations: ['users', 'parent', 'children'] });
    }

    async findOne(id: number): Promise<Department | null> {
        return this.departmentsRepository.findOne({ where: { id }, relations: ['users'] });
    }

    async create(data: Partial<Department>): Promise<Department> {
        const dept = this.departmentsRepository.create(data);
        return this.departmentsRepository.save(dept);
    }

    async update(id: number, data: any): Promise<Department> {
        const dept = await this.findOne(id);
        if (!dept) throw new Error('Department not found');

        const { parentId, ...cleanData } = data;

        if (parentId !== undefined) {
            dept.parent = parentId ? ({ id: Number(parentId) } as any) : null;
        }

        Object.assign(dept, cleanData);
        return this.departmentsRepository.save(dept);
    }

    async remove(id: number): Promise<void> {
        await this.departmentsRepository.delete(id);
    }

    async isAncestor(ancestorId: number, descendantId: number): Promise<boolean> {
        if (ancestorId === descendantId) return true;

        const descendant = await this.departmentsRepository.findOne({
            where: { id: descendantId },
            relations: ['parent']
        });

        if (!descendant || !descendant.parent) return false;

        return this.isAncestor(ancestorId, descendant.parent.id);
    }

    async getAllDescendants(id: number): Promise<number[]> {
        const dept = await this.departmentsRepository.findOne({
            where: { id },
            relations: ['children']
        });
        if (!dept) return [];

        let ids = [id];
        if (dept.children && dept.children.length > 0) {
            for (const child of dept.children) {
                ids = ids.concat(await this.getAllDescendants(child.id));
            }
        }
        return ids;
    }

    async assignUsers(departmentId: number, userIds: number[]): Promise<void> {
        if (!userIds || userIds.length === 0) return;

        // Use the EntityManager to access User repository without circular dependency injection
        await this.departmentsRepository.manager.getRepository('User').update(
            userIds, // TypeORM update accepts array of IDs directly if primary key
            { department: { id: departmentId } }
        );
    }
}
