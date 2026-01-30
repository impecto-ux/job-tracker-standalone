import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { DepartmentsService } from '../departments/departments.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TeamsService {
    constructor(
        @InjectRepository(Team)
        private teamsRepository: Repository<Team>,
        private departmentsService: DepartmentsService,
        private usersService: UsersService,
    ) { }

    async create(createTeamDto: { name: string; description?: string; departmentId: number }) {
        const dept = await this.departmentsService.findOne(createTeamDto.departmentId);
        if (!dept) throw new Error('Department not found');

        const team = this.teamsRepository.create({
            name: createTeamDto.name,
            description: createTeamDto.description,
            department: dept,
        });
        return this.teamsRepository.save(team);
    }

    async findAll() {
        return this.teamsRepository.find({ relations: ['department', 'users'] });
    }

    async findOne(id: number) {
        return this.teamsRepository.findOne({ where: { id }, relations: ['department', 'users'] });
    }

    async delete(id: number) {
        return this.teamsRepository.delete(id);
    }

    async addUsersToTeam(teamId: number, userIds: number[]) {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        if (!team.users) team.users = [];

        for (const uid of userIds) {
            const u = await this.usersService.findOne(uid);
            if (u && !team.users.find(existing => existing.id === u.id)) {
                team.users.push(u);
            }
        }
        return this.teamsRepository.save(team);
    }

    async removeUserFromTeam(teamId: number, userId: number) {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        team.users = team.users.filter(u => u.id !== userId);
        return this.teamsRepository.save(team);
    }
}
