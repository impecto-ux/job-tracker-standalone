import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Agent, Message, CreativeMemory, CreativeStyle } from './types';
import { DEFAULT_AGENTS } from './registry';

// --- V0.4 HISTORY & ASSETS ---
export interface Generation {
    id: string;
    imageUrl: string;
    prompt: string;
    timestamp: string;
    agentId: string;
    vibeId?: string;
    filename: string;
}

export interface Asset {
    id: string;
    url: string;
    name: string;
    type: 'image' | 'video' | 'model';
    addedAt: string;
}

export interface Channel {
    id: number;
    name: string;
    type: string;
    targetDepartment?: { id: number; name: string };
    users?: { id: number; fullName?: string }[];
}

export interface ChatMessage {
    id: number;
    content: string;
    sender: { id: number; fullName: string; email: string };
    createdAt: string;
    linkedTaskId?: number;
    mediaUrl?: string; // v4.1
    thumbnailUrl?: string; // v4.3 (Sharp)
    mediaType?: string; // v4.1
    replyTo?: ChatMessage; // v4.2
    taskStatus?: 'PENDING' | 'IN_PROGRESS' | 'DONE';
    priority?: string; // Mission Control
    isSystem?: boolean; // Mission Control
}

export interface ChatState {
    channels: Channel[];
    activeChannelId: number | null;
    messages: Record<number, ChatMessage[]>; // channelId -> messages
    setChannels: (channels: Channel[]) => void;
    setActiveChannel: (id: number | null) => void;
    addMessage: (channelId: number, message: ChatMessage) => void;
    setMessages: (channelId: number, messages: ChatMessage[]) => void;
    removeChannel: (id: number) => void;
    addChannel: (channel: Channel) => void;
    removeMessage: (channelId: number, messageId: number) => void;
    lastRefreshAt: number; // Global refresh trigger
    refreshChannels: () => void;
}

export interface User {
    id: number;
    fullName: string;
    email: string;
    role: string;
    totalPoints?: number;
    dashboardLayout?: string;
    department?: { id: number; name: string };
}

export interface AuthState {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    setUser: (user: User | null) => void;
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
    generations: Generation[];
    assets: Asset[];

    // Auth
    auth: AuthState;

    // Chat
    chat: ChatState;

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

    // History Actions
    logGeneration: (gen: Generation) => void;
    addAsset: (asset: Asset) => void;
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

            // Auth Implementation
            auth: {
                user: null,
                token: null,
                login: (token, user) => set((state) => ({
                    auth: { ...state.auth, token, user },
                    chat: { ...state.chat, activeChannelId: null }
                })),
                logout: () => set((state) => ({
                    auth: { ...state.auth, token: null, user: null },
                    chat: { ...state.chat, activeChannelId: null }
                })),
                setUser: (user) => set((state) => ({
                    auth: { ...state.auth, user }
                }))
            },

            // Chat Implementation
            chat: {
                channels: [],
                activeChannelId: null,
                messages: {},
                setChannels: (channels) => set((state) => ({
                    chat: { ...state.chat, channels }
                })),
                setActiveChannel: (id) => set((state) => ({
                    chat: { ...state.chat, activeChannelId: id }
                })),
                addMessage: (channelId, message) => set((state) => ({
                    chat: {
                        ...state.chat,
                        messages: {
                            ...state.chat.messages,
                            [channelId]: [...(state.chat.messages[channelId] || []), message]
                        }
                    }
                })),
                setMessages: (channelId, messages) => set((state) => ({
                    chat: {
                        ...state.chat,
                        messages: {
                            ...state.chat.messages,
                            [channelId]: messages
                        }
                    }
                })),
                removeChannel: (id) => set((state) => ({
                    chat: {
                        ...state.chat,
                        channels: state.chat.channels.filter(c => c.id !== id)
                    }
                })),
                addChannel: (channel) => set((state) => ({
                    chat: {
                        ...state.chat,
                        channels: [...state.chat.channels, channel]
                    }
                })),
                removeMessage: (channelId, messageId) => set((state) => ({
                    chat: {
                        ...state.chat,
                        messages: {
                            ...state.chat.messages,
                            [channelId]: (state.chat.messages[channelId] || []).filter(m => m.id !== messageId)
                        }
                    }
                })),
                lastRefreshAt: 0,
                refreshChannels: () => set((state) => ({
                    chat: { ...state.chat, lastRefreshAt: Date.now() }
                }))
            },

            // --- V0.4 HISTORY IMPLEMENTATION ---
            generations: [],
            assets: [],

            logGeneration: (gen) => set((state) => ({
                generations: [gen, ...state.generations]
            })),
            addAsset: (asset) => set((state) => ({
                assets: [asset, ...state.assets]
            })),

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
            })),
        }),
        {
            name: 'art-engine-memory-v5', // Bump version to clear stale state
            partialize: (state) => ({
                memory: state.memory,
                generations: state.generations,
                assets: state.assets,
                messages: [], // Don't persist AI chat history
                auth: state.auth,
                chat: {
                    ...state.chat,
                    messages: {} // Don't persist Job Tracker chat history
                }
            }),
            merge: (persistedState: any, currentState) => ({
                ...currentState,
                ...persistedState,
                // Deep merge nested slices to preserve functions
                auth: {
                    ...currentState.auth,
                    ...persistedState?.auth,
                },
                chat: {
                    ...currentState.chat,
                    ...persistedState?.chat,
                    // Ensure messages are empty on load so we fetch fresh
                    messages: {}
                },
            }),
        }
    )
);
