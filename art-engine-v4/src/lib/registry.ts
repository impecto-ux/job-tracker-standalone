import { Agent } from './types';

export const AGENTS: Record<string, Agent> = {
    'director': {
        id: 'director',
        name: 'Creative Director',
        type: 'SUPERVISOR',
        color: 'text-rose-500',
        role: 'Supervisor',
        description: 'Manages global creative direction and memory.',
        status: 'IDLE',
        skills: ['style-enforcement', 'memory-access']
    },
    'flux-std': {
        id: 'flux-std',
        name: 'Flux Standard',
        role: 'Visual Generator',
        description: 'High-fidelity text-to-image generation.',
        color: '#06b6d4', // Cyan 500
        type: 'IMAGE_GEN',
        status: 'IDLE',
        capabilities: ['txt2img']
    },
    'flux-context': {
        id: 'flux-context',
        name: 'Flux Context',
        role: 'Image Refiner',
        description: 'Context-aware image editing and revision.',
        color: '#ec4899', // Pink 500
        type: 'IMAGE_EDIT',
        status: 'IDLE',
        capabilities: ['img2img', 'variation']
    },
    'qwen-edit': {
        id: 'qwen-edit',
        name: 'Qwen Context',
        type: 'IMAGE_EDIT',
        color: '#a78bfa',
        role: 'Multi-Ref Edit',
        description: 'Advanced editing with Qwen 2.5 and multiple image references.',
        status: 'IDLE',
        skills: [
            { id: 'multi-img', name: 'Multi-Input', type: 'IMAGE_EDIT' },
            { id: 'qwen', name: 'Qwen VL', type: 'TEXT_GEN' }
        ]
    }
};

export const DEFAULT_AGENTS = Object.values(AGENTS);
