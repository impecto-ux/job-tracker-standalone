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
    skills?: string[]; // Simplified for v0.4
}

export interface Message {
    id: string;
    sender: 'USER' | 'SYSTEM' | string; // agent name
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
}
