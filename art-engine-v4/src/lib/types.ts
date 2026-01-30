export type AgentType = 'TEXT_GEN' | 'IMAGE_GEN' | 'IMAGE_EDIT' | 'VID_GEN' | 'SUPERVISOR';

export interface Agent {
    id: string;
    name: string;
    role: string;
    description: string;
    color: string;
    type: AgentType;
    status: 'IDLE' | 'WORKING' | 'ERROR';
    capabilities?: string[];
    skills?: (string | any)[]; // Support both simple strings and complex skill objects
}

export interface Message {
    id: string;
    sender: 'USER' | 'SYSTEM' | string; // agent name
    completedAt?: string;
    score?: number;
    category?: string;
    content: string;
    timestamp: string;
    type: 'user' | 'system' | 'error' | 'success' | 'warning' | 'info';
    attachments?: {
        id: string;
        type: 'image' | 'file';
        url: string;
        name: string;
    }[];
    metadata?: any;
    taskStatus?: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

export interface CreativeStyle {
    id: string;
    name: string;
    description: string;
    promptModifier: string;
}

export interface CreativeMemory {
    activeVibe: string | null;
    savedStyles: CreativeStyle[];
    globalDirectives: string[];
}
