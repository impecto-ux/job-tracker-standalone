import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @IsString()
    @IsOptional()
    status?: string;

    @IsNumber()
    @IsOptional()
    ownerId?: number;

    @IsString()
    @IsOptional()
    comment?: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;
}
