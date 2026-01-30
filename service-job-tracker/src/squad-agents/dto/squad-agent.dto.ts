export class CreateSquadAgentDto {
    groupId: number;
    name: string;
    personality?: string;
    systemPrompt?: string;
    isActive?: boolean;
    triggers?: string[];
}

import { PartialType } from '@nestjs/mapped-types';
export class UpdateSquadAgentDto extends PartialType(CreateSquadAgentDto) { }
