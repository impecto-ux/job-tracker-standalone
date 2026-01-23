import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Agent, Message } from './types';
import { DEFAULT_AGENTS } from './registry';

// --- V0.4 CREATIVE MEMORY ---
export interface CreativeStyle {
    id: string;
    name: string;
    description: string;
    promptModifier: string; // e.g. "in the style of cyberpunk, neon lights"
}

interface CreativeMemory {
    activeVibe: string | null; // Currently active style ID
    savedStyles: CreativeStyle[];
    globalDirectives: string[]; // e.g. "Always use 16:9", "No people"
}

interface AppState {
    // Ephemeral State
    agents: Agent[];
    messages: Message[];
    activeAgentId: string;
    sessionId: string | null;
    pendingAttachments: File[];

    // Persistent Memory (V0.4)
    memory: CreativeMemory;

    // Actions
    updateAgentStatus: (id: string, status: Agent['status']) => void;
    addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
    setActiveAgent: (id: string) => void;
    setPendingAttachments: (files: File[]) => void;

    // Memory Actions
    setVibe: (styleId: string | null) => void;
    saveStyle: (style: CreativeStyle) => void;
    addDirective: (directive: string) => void;
    clearDirectives: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            // Defaults
            agents: DEFAULT_AGENTS,
            messages: [],
            activeAgentId: DEFAULT_AGENTS[0].id,
            sessionId: null,
            pendingAttachments: [],

            memory: {
                activeVibe: null,
                savedStyles: [
                    { id: 'cinematic', name: 'Cinematic', description: 'Movie-like lighting and depth', promptModifier: 'cinematic lighting, wide angle, 4k, depth of field' },
                    { id: 'anime', name: 'Anime Studio', description: 'High quality anime art', promptModifier: 'anime style, studio ghibli, vibrant colors' },
                    { id: 'noir', name: 'Film Noir', description: 'Black and white detective style', promptModifier: 'black and white photography, film noir, high contrast' },
                    { id: 'minimalist', name: 'Minimalist (Override)', description: 'Low noise, high contrast', promptModifier: 'minimalist, high contrast, clean lines, negative space, low visual noise, sharp focus' },
                ],
                globalDirectives: []
            },

            // Actions
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
            setPendingAttachments: (files) => set({ pendingAttachments: files }),

            // Memory Implementation
            setVibe: (styleId) => set((state) => ({
                memory: { ...state.memory, activeVibe: styleId }
            })),
            saveStyle: (style) => set((state) => ({
                memory: { ...state.memory, savedStyles: [...state.memory.savedStyles, style] }
            })),
            addDirective: (directive) => set((state) => ({
                memory: { ...state.memory, globalDirectives: [...state.memory.globalDirectives, directive] }
            })),
            clearDirectives: () => set((state) => ({
                memory: { ...state.memory, globalDirectives: [] }
            }))
        }),
        {
            name: 'art-engine-memory-v4', // unique name
            partialize: (state) => ({ memory: state.memory }), // Only persist memory!
        }
    )
);
