
export type SkillType = 'IMAGE_GEN' | 'TEXT_GEN' | 'CODE_GEN' | 'VISION';

export interface Skill {
    id: string;
    type: SkillType;
    name: string;
    config?: Record<string, any>; // e.g., model name, endpoint
}

export interface Agent {
    id: string;
    name: string;
    role: string;
    description: string;
    avatar?: string;
    color: string; // Tailwind color class or hex
    skills: Skill[];
    systemPrompt?: string;
    status: 'IDLE' | 'THINKING' | 'WORKING' | 'DONE' | 'ERROR';
}

export interface Attachment {
    id: string;
    type: 'image' | 'video' | 'file';
    url: string;
    name: string;
}

export interface Message {
    id: string;
    agentId?: string; // If undefined, it's a System or User message
    sender: string; // 'USER' | 'SYSTEM' | Agent Name
    content: string;
    timestamp: string;
    attachments?: Attachment[];
    type: 'info' | 'success' | 'warning' | 'error' | 'user';
}
