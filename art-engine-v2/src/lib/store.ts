import { create } from 'zustand';
import { Agent, Message } from './types';

interface AppState {
    agents: Agent[];
    messages: Message[];
    activeAgentId: string | null;
    activeQuote: { id: string, url: string, filename: string } | null;

    // Actions
    addAgent: (agent: Agent) => void;
    updateAgentStatus: (id: string, status: Agent['status']) => void;
    addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
    setActiveAgent: (id: string | null) => void;
    setQuote: (quote: { id: string, url: string, filename: string } | null) => void;
}

const DEFAULT_AGENTS: Agent[] = [
    {
        id: '1',
        name: 'Neo',
        role: 'Creative Director',
        description: 'Master strategist and visual architect',
        color: '#10b981', // Emerald 500
        skills: [{ id: 's1', type: 'TEXT_GEN', name: 'Strategy' }],
        status: 'IDLE'
    },
    {
        id: '2',
        name: 'Flux',
        role: 'Image Specialist',
        description: 'Generates high-fidelity visual assets',
        color: '#8b5cf6', // Violet 500
        skills: [{ id: 's2', type: 'IMAGE_GEN', name: 'ComfyUI' }],
        status: 'IDLE'
    }
];

export const useStore = create<AppState>((set) => ({
    agents: DEFAULT_AGENTS,
    messages: [],
    activeAgentId: null,
    activeQuote: null,

    addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),

    updateAgentStatus: (id, status) => set((state) => ({
        agents: state.agents.map(a => a.id === id ? { ...a, status } : a)
    })),

    addMessage: (msg) => set((state) => ({
        messages: [
            ...state.messages,
            {
                ...msg,
                id: Math.random().toString(36).substring(7),
                timestamp: new Date().toLocaleTimeString()
            }
        ]
    })),

    setActiveAgent: (id) => set({ activeAgentId: id }),
    setQuote: (quote) => set({ activeQuote: quote })
}));
