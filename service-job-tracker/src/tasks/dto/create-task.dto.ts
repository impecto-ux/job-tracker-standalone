import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsNotEmpty()
    departmentId: number;

    @IsString()
    @IsOptional()
    priority?: string;

    @IsString()
    @IsOptional()
    dueDate?: string;

    @IsNumber()
    @IsOptional()
    ownerId?: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;
}
