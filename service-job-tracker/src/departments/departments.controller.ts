import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Department } from './entities/department.entity';

@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) { }

    @Get()
    findAll() {
        return this.departmentsService.findAll();
    }



    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.departmentsService.findOne(+id);
    }

    @Post()
    create(@Body() body: Partial<Department>) {
        return this.departmentsService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Partial<Department>) {
        return this.departmentsService.update(+id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.departmentsService.remove(+id);
    }

    @Post(':id/assign')
    assignUsers(@Param('id') id: string, @Body() body: { userIds: number[] }) {
        return this.departmentsService.assignUsers(+id, body.userIds);
    }
}
