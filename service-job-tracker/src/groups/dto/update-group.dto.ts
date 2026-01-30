
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateGroupDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    targetDepartmentId?: number | null;

    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;
}
