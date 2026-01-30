
export class CreateTickerDto {
    label: string;
    type: string; // 'preset' | 'custom'
    presetFunction?: string;
    customMessage?: string;
    allowedRoles?: string[];
    isActive?: boolean;
    duration?: number;
    order?: number;
}
