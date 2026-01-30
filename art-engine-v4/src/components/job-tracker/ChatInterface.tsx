import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Hash, Loader, Plus, Trash2, Edit2, X, Check, Bot, GripVertical, ListTodo, ArrowLeft, ArrowRight, MoreHorizontal, Shield, Terminal, Layout, Zap, AlertCircle, Copy, Reply as ReplyIcon, Forward as ForwardIcon, CheckCircle2, Minimize2, ChevronDown, CheckCheck, Globe, Search, Users, Filter } from 'lucide-react';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { io } from 'socket.io-client';

import MyRequestsModal from './MyRequestsModal';
import GroupSettingsModal from './GroupSettingsModal';
import ForwardModal from './ForwardModal';
import { getSocketUrl } from '@/lib/config';


interface ChatInterfaceProps {
    notificationStats?: Record<string, { p1Count: number }>;
    pendingMessage?: string | null;
    onMessageConsumed?: () => void;
    onUnreadChange?: (total: number, counts: Record<number, number>) => void;
    onCreateGroup?: (view?: 'groups_root') => void;
    onDiscoveryClick?: () => void;
    taskStatusMap?: Record<number, string>;
    highlightMessageId?: number | null;
    tasks?: any[]; // Authoritative Task Data
}

export default function ChatInterface({
    notificationStats = {},
    pendingMessage,
    onMessageConsumed,
    onUnreadChange,
    onCreateGroup,
    onDiscoveryClick,
    taskStatusMap = {},
    highlightMessageId,
    tasks = [] // Default empty
}: ChatInterfaceProps) {
    const auth = useStore(state => state.auth);
    const chat = useStore(state => state.chat);

    // Stable selectors for callbacks to prevent infinite loops
    const setChannels = useStore(state => state.chat.setChannels);
    const setActiveChannel = useStore(state => state.chat.setActiveChannel);
    const refreshChannels = useStore(state => state.chat.refreshChannels);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ESC to close My Tasks
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && chat.activeChannelId === -1) {
                chat.setActiveChannel(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [chat.activeChannelId]);

    // consume pending message
    useEffect(() => {
        if (pendingMessage) {
            setInput(pendingMessage);
            // focus logic if needed, but input autoFocus might not be there.
            // We can focus via ref
            fileInputRef.current?.closest('div')?.querySelector('textarea')?.focus();
            onMessageConsumed?.();
        }
    }, [pendingMessage, onMessageConsumed]);

    const [isCreating, setIsCreating] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Changed to array for multiple uploads
    const [attachments, setAttachments] = useState<{ url: string, thumbnailUrl?: string, type: 'image' | 'video' }[]>([]);
    const [isAttaching, setIsAttaching] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false); // Full screen preview state
    const [replyingTo, setReplyingTo] = useState<any | null>(null); // Reply state
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false); // NEW: Group Settings state

    // Multi-select State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sidebar Filter & Search State
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [showAllGroups, setShowAllGroups] = useState(false);
    const isAdmin = auth.user?.role === 'admin';




    // --- MENTION LOGIC START ---
    const [users, setUsers] = useState<any[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (auth.token) {
            api.get('/users').then(res => setUsers(res.data)).catch(console.error);
        }
    }, [auth.token]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Detect @
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            setMentionQuery(match[1].toLowerCase());
            // Crude position estimation (or just fixed above input)
            setMentionPosition({ top: -200, left: 0 });
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (username: string) => {
        const cursor = document.querySelector('textarea')?.selectionStart || input.length;
        const textBeforeCursor = input.slice(0, cursor);
        const textAfterCursor = input.slice(cursor);

        // Replace the partial @mention with full @username
        const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, `@${username} `);

        setInput(newTextBefore + textAfterCursor);
        setMentionQuery(null);
        document.querySelector('textarea')?.focus();
    };
    // --- MENTION LOGIC END ---

    // Utility to generate consistent colors from strings
    const generateColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 60%)`;
    };

    // ... (existing effects)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        const newAttachments: { url: string, thumbnailUrl?: string, type: 'image' | 'video' }[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);

                const res = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                newAttachments.push({
                    url: res.data.url,
                    thumbnailUrl: res.data.thumbnailUrl,
                    type: file.type.startsWith('video') ? 'video' : 'image'
                });
            }

            setAttachments(prev => [...prev, ...newAttachments]);
            setIsAttaching(false);
            setShowImagePreview(true); // Open Preview
        } catch (error) {
            console.error('File upload failed', error);
            alert('Failed to upload file(s)');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const loadChannels = useCallback((all: boolean = false) => {
        api.get(`/channels${all ? '?all=true' : ''}`).then(res => {
            const channels = res.data;

            // Apply saved order
            try {
                const savedOrder = JSON.parse(localStorage.getItem('channel_order') || '[]');
                if (Array.isArray(savedOrder) && savedOrder.length > 0) {
                    const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
                    channels.sort((a: any, b: any) => {
                        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
                        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
                        return indexA - indexB;
                    });
                }
            } catch (e) {
                console.error("Failed to parse channel order", e);
            }

            setChannels(channels);

            // Validate Active Channel Persistence
            const currentActiveId = useStore.getState().chat.activeChannelId;
            const isActiveValid = channels.some((c: any) => c.id === currentActiveId);

            if (channels.length > 0) {
                if (!currentActiveId || !isActiveValid) {
                    console.log('Active channel invalid or missing, resetting to first available.', currentActiveId);
                    setActiveChannel(channels[0].id);
                }
            }
        }).catch(err => console.error("Failed to load channels", err));
    }, [setChannels, setActiveChannel, showAllGroups]); // Now stable

    // Fetch Channels on Mount or Filter Toggle
    useEffect(() => {
        if (auth.token) {
            loadChannels(showAllGroups);
        }
    }, [auth.token, showAllGroups, loadChannels]);

    // Global Refresh Listener
    const lastRefreshAt = useStore(state => state.chat.lastRefreshAt);
    useEffect(() => {
        if (lastRefreshAt > 0) {
            console.log('[ChatInterface] Global refresh triggered', lastRefreshAt);
            loadChannels(showAllGroups);
        }
    }, [lastRefreshAt, loadChannels, showAllGroups]);

    const handleReorder = (newOrder: any[]) => {
        chat.setChannels(newOrder); // Optimistic update
        // Save order ID list
        const orderIds = newOrder.map(c => c.id);
        localStorage.setItem('channel_order', JSON.stringify(orderIds));
    };

    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [mentionCounts, setMentionCounts] = useState<Record<number, number>>({}); // Mention Badge State

    // WebSocket Connection
    useEffect(() => {
        const socket = io(getSocketUrl(), {
            query: { userId: auth.user?.id }
        });

        socket.on('connect', () => {
            console.log('Connected to WebSocket System');
        });

        // Real-time Group Updates
        socket.on('group.access_granted', (group: any) => {
            console.log('Group Access Granted, refreshing channels...', group);
            loadChannels();
        });

        socket.on('group.access_revoked', (data: any) => {
            console.log('Group Access Revoked, refreshing channels...', data);

            // OPTIMISTIC REMOVAL: Remove from state immediately
            if (data.channelId) {
                const currentChannels = useStore.getState().chat.channels;
                chat.setChannels(currentChannels.filter((c: any) => String(c.id) !== String(data.channelId)));
            }

            // UI SAFETY: If the user is looking at this group, switch them away immediately
            const currentActiveId = useStore.getState().chat.activeChannelId;
            // Use channelId from payload since that matches activeChannelId
            if (currentActiveId && String(currentActiveId) === String(data.channelId)) {
                console.log('User was viewing removed group. Redirecting...');
                chat.setActiveChannel(1); // Default to General
            }

            // Sync with server as a final step
            loadChannels();
        });

        socket.on('message', (msg: any) => {
            const currentActiveId = useStore.getState().chat.activeChannelId;
            console.log('WS Message Received:', msg);

            if (msg.channel) {
                // Safe Comparison (String/Number)
                const isCurrentChannel = currentActiveId && String(msg.channel.id) === String(currentActiveId);
                console.log('Is Current Channel:', isCurrentChannel, msg.channel.id, currentActiveId);

                if (isCurrentChannel) {
                    // Active channel: Append message
                    // Force update by ensuring we are passing the ID as a number if the store expects it
                    chat.addMessage(Number(msg.channel.id), msg);
                } else {
                    // Background channel: Increment unread ONLY if not from self
                    const currentUserId = useStore.getState().auth.user?.id;
                    const isFromMe = msg.sender && (String(msg.sender.id) === String(currentUserId));

                    if (!isFromMe) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [msg.channel.id]: (prev[msg.channel.id] || 0) + 1
                        }));

                        const currentUserFullName = useStore.getState().auth.user?.fullName || '';
                        if (currentUserFullName && msg.content.includes(`@${currentUserFullName}`)) {
                            setMentionCounts(prev => ({
                                ...prev,
                                [msg.channel.id]: (prev[msg.channel.id] || 0) + 1
                            }));
                        }
                    }
                }
            }
        });

        socket.on('message_deleted', (payload: any) => {
            console.log('Message Deleted:', payload);
            if (String(payload.channelId) === String(useStore.getState().chat.activeChannelId)) {
                chat.removeMessage(Number(payload.channelId), Number(payload.messageId));
            }
        });

        socket.on('channel_deleted', (msg: { id: number }) => {
            console.log('WS Channel Deleted:', msg);
            const currentActiveId = useStore.getState().chat.activeChannelId;

            // Refresh list
            loadChannels();

            // If active channel was deleted/archived, switch
            if (String(currentActiveId) === String(msg.id)) {
                chat.setActiveChannel(null);
            }
        });

        socket.on('channel_created', (channel: any) => {
            console.log('WS Channel Created:', channel);
            chat.addChannel(channel);
        });

        return () => {
            socket.disconnect();
        };
    }, [auth.user?.id, loadChannels]); // Added dependencies for reconnection and fresh listeners

    // Clear unread on channel select
    useEffect(() => {
        if (chat.activeChannelId) {
            setUnreadCounts(prev => ({ ...prev, [chat.activeChannelId!]: 0 }));
            setMentionCounts(prev => ({ ...prev, [chat.activeChannelId!]: 0 }));

            // Initial fetch for the active channel (still needed to get history on switch)
            api.get(`/channels/${chat.activeChannelId}/messages?t=${Date.now()}`).then(res => {
                chat.setMessages(chat.activeChannelId!, res.data);
            }).catch(err => console.error("Failed to load messages", err));
        }
    }, [chat.activeChannelId]);



    // Notify parent of total unread
    useEffect(() => {
        const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
        onUnreadChange?.(total, unreadCounts);
    }, [unreadCounts, onUnreadChange]);

    const [showSystemOnly, setShowSystemOnly] = useState(false); // Action Log Filter

    // Deduplicate messages to prevent React key errors (Optimistic + Polling race condition)
    const activeMessages = React.useMemo(() => {
        if (!chat.activeChannelId || !chat.messages[chat.activeChannelId]) return [];

        const uniqueParams = new Map();
        chat.messages[chat.activeChannelId].forEach(msg => {
            if (!uniqueParams.has(msg.id)) {
                uniqueParams.set(msg.id, msg);
            }
        });

        return Array.from(uniqueParams.values()).sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [chat.activeChannelId, chat.messages]);

    // --- Mission Control Stats (Refactored to use 'tasks' prop) ---
    const healthStats = React.useMemo(() => {
        if (!chat.activeChannelId) return { pending: 0, active: 0, done: 0, doneToday: 0, total: 0, hasUrgent: false };

        const currentChannel = chat.channels.find(c => c.id === chat.activeChannelId);
        if (!currentChannel) return { pending: 0, active: 0, done: 0, doneToday: 0, total: 0, hasUrgent: false };

        // Filter tasks related to this group/department
        // If channel is 'General', showing General tasks. If 'Development', showing Development.
        const groupTasks = tasks.filter(t => t.dept === currentChannel.name || (!t.dept && currentChannel.name === 'General'));

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        let pending = 0;
        let active = 0;
        let done = 0;
        let doneToday = 0;
        let hasUrgent = false;

        groupTasks.forEach(t => {
            if (t.status === 'done') {
                done++;
                // Check if done TODAY using completedAt (preferred) or updatedAt
                const doneDate = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
                if (doneDate >= todayStart) doneToday++;
            } else if (t.status === 'in_progress') {
                active++;
                if (t.priority === 'P1') hasUrgent = true;
            } else if (t.status !== 'rejected' && t.status !== 'archived') {
                // Todo / Pending (excluding rejected/archived)
                pending++;
                if (t.priority === 'P1') hasUrgent = true;
            }
        });

        return { pending, active, done, doneToday, total: pending + active + done, hasUrgent };
    }, [chat.activeChannelId, chat.channels, tasks]);

    // Filter Messages for Action Log
    const displayedMessages = showSystemOnly
        ? activeMessages.filter(msg => msg.linkedTaskId || msg.taskStatus || msg.content.includes('!task') || msg.isSystem)
        : activeMessages;

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) return;
        try {
            await api.post('/channels', { name: newChannelName });
            setIsCreating(false);
            setNewChannelName('');
            loadChannels();
        } catch (error: any) {
            console.error('Failed to create channel', error);
            alert(`Failed to create channel: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteChannel = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();

        const channel = chat.channels.find(c => c.id === id);
        // "group" or "department" channels are managed by User Directory
        if (channel && (channel.type === 'group' || channel.type === 'department')) {
            if (confirm(`"${channel.name}" is a synchronized Group.\nTo delete it, you must remove it from the User Directory.\n\nWould you like to open User Management now?`)) {
                if (onCreateGroup) onCreateGroup();
            }
            return;
        }

        if (!confirm('Are you sure you want to delete this channel?')) return;
        try {
            await api.delete(`/channels/${id}`);
            if (chat.activeChannelId === id) {
                chat.setActiveChannel(null);
            }
            loadChannels();
        } catch (error) {
            console.error('Failed to delete channel', error);
        }
    };

    const startEditing = (e: React.MouseEvent, channel: any) => {
        e.stopPropagation();
        setEditingChannelId(channel.id);
        setEditName(channel.name);
    };

    const handleUpdateChannel = async () => {
        if (!editName.trim() || !editingChannelId) return;
        try {
            await api.patch(`/channels/${editingChannelId}`, { name: editName });
            setEditingChannelId(null);
            setEditName('');
            loadChannels();
        } catch (error) {
            console.error('Failed to update channel', error);
        }
    };

    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);



    const handleSend = async () => {
        if ((!input.trim() && attachments.length === 0) || !chat.activeChannelId) return;

        setIsLoading(true);
        let content = input;
        if (selectedPriority) content += ` [${selectedPriority}]`;

        // --- MISSION CONTROL: STATUS PARSING ---
        // Check for "Status: DONE" patterns
        let parsedStatus: string | null = null;
        if (/status:\s*[*]*DONE[*]*/i.test(content) || content.toLowerCase().includes('!status done')) {
            parsedStatus = 'done';
        } else if (/status:\s*[*]*IN[\s_]*PROGRESS[*]*/i.test(content) || content.toLowerCase().includes('!status active')) {
            parsedStatus = 'in_progress';
        }

        // If we detected a status change, try to update the backend task
        if (parsedStatus) {
            // Logic: 
            // 1. If currently inside a specific "Task Channel" (unlikely in current architecture, usually groups)
            // 2. OR if replying to a message linked to a task (replyingTo?.linkedTaskId)
            // 3. OR if the channel ITSELF is mapped to a task? (Not yet implemented)
            // 4. FALLBACK: If we are in a 'department' or 'group' channel, we might need a specific Task ID.
            //    Currently, users say "Status: DONE" generally referring to the context.
            //    BUT without a Task ID, we can't update a record.
            //    
            //    Strategy: We will look for a "!task #123" pattern in previous messages or if this message HAS one.
            //    Better MVP: Only update if `replyingTo` has a linkedTaskId.

            if (replyingTo?.linkedTaskId) {
                try {
                    await api.patch(`/tasks/${replyingTo.linkedTaskId}`, { status: parsedStatus });
                    console.log(`[MissionControl] Auto-updated Task #${replyingTo.linkedTaskId} to ${parsedStatus}`);
                } catch (e) {
                    console.error("Failed to auto-update task status", e);
                }
            } else {
                // Try to find a Task ID in the message itself (e.g. "#123 Status: Done")
                const idMatch = content.match(/#(\d+)/);
                if (idMatch) {
                    const taskId = parseInt(idMatch[1]);
                    try {
                        await api.patch(`/tasks/${taskId}`, { status: parsedStatus });
                        console.log(`[MissionControl] Auto-updated Task #${taskId} to ${parsedStatus}`);
                    } catch (e) {
                        console.error("Failed to auto-update task status via ID", e);
                    }
                }
            }
        }

        try {
            // Scenario 1: Text Only
            if (attachments.length === 0) {
                const res = await api.post(`/channels/${chat.activeChannelId}/messages`, { content, replyToId: replyingTo?.id });
                chat.addMessage(chat.activeChannelId, res.data);
            }
            // Scenario 2: With Attachments
            else {
                // Send first attachment WITH text and REPLY
                const first = attachments[0];
                const res1 = await api.post(`/channels/${chat.activeChannelId}/messages`, {
                    content, // Attach text to first media
                    mediaUrl: first.url,
                    thumbnailUrl: first.thumbnailUrl,
                    mediaType: first.type,
                    replyToId: replyingTo?.id
                });
                chat.addMessage(chat.activeChannelId, res1.data);

                // Send remaining attachments as separate messages
                for (let i = 1; i < attachments.length; i++) {
                    const att = attachments[i];
                    const res = await api.post(`/channels/${chat.activeChannelId}/messages`, {
                        content: '', // No caption for subsequent
                        mediaUrl: att.url,
                        thumbnailUrl: att.thumbnailUrl,
                        mediaType: att.type
                    });
                    chat.addMessage(chat.activeChannelId, res.data);
                }
            }

            setInput('');
            setAttachments([]);
            setSelectedPriority(null);
            setShowImagePreview(false);
            setReplyingTo(null);

            // Polling ...
            // Adaptive Polling: Poll frequently for the next 5 seconds to catch AI response
            let attempts = 0;
            const fastPoll = setInterval(() => {
                attempts++;
                api.get(`/channels/${chat.activeChannelId}/messages?t=${Date.now()}`).then(res => {
                    chat.setMessages(chat.activeChannelId!, res.data);
                });
                if (attempts >= 10) clearInterval(fastPoll); // Stop after 5 seconds (10 * 500ms)
            }, 500);

        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (msg: any) => {
        if (!confirm('Delete this message?')) return;
        try {
            await api.delete(`/channels/${chat.activeChannelId}/messages/${msg.id}`);
            chat.removeMessage(chat.activeChannelId!, msg.id);
        } catch (e) { console.error(e); }
    };

    // --- Multi-select Handlers ---
    const handleToggleSelect = (msgId: number) => {
        if (selectedMessageIds.includes(msgId)) {
            const newSelection = selectedMessageIds.filter(id => id !== msgId);
            setSelectedMessageIds(newSelection);
            if (newSelection.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedMessageIds([...selectedMessageIds, msgId]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedMessageIds.length} messages?`)) return;
        try {
            // Parallel delete (could be optimized with a bulk endpoint but this works for now)
            await Promise.all(selectedMessageIds.map(id => api.delete(`/channels/${chat.activeChannelId}/messages/${id}`)));
            selectedMessageIds.forEach(id => chat.removeMessage(chat.activeChannelId!, id));
            setIsSelectionMode(false);
            setSelectedMessageIds([]);
        } catch (e) {
            console.error('Bulk delete failed', e);
            alert('Failed to delete some messages');
        }
    };

    const handleForward = async (targets: { type: 'channel' | 'user', id: number, name: string }[]) => {
        if (targets.length === 0) return;
        setIsForwardModalOpen(false);

        // Prepare messages to forward - Maintain order!
        const messagesToForward = activeMessages.filter(m => selectedMessageIds.includes(m.id));

        try {
            for (const target of targets) {
                // Determine target endpoint
                let endpoint = '';
                if (target.type === 'channel') {
                    endpoint = `/channels/${target.id}/messages`;
                } else {
                    // Logic for DM (if DMs are implemented as channels, we need to find/create DM channel first)
                    // For now, assume we just create a DM or post to their "personal" channel?
                    // NOTE: Existing system might not support direct DMs easily without specific logic.
                    // Fallback/Warning: If DMs are not fully ready, maybe restrict to channels or auto-create DM.
                    // Assuming standard channel post for now.
                    // TODO: DM Logic specific to this app.
                    continue; // Skip users for now if DM logic isn't explicit, or see below.
                }

                if (!endpoint) continue;

                for (const msg of messagesToForward) {
                    await api.post(endpoint, {
                        content: msg.content, // Forward content
                        mediaUrl: msg.mediaUrl,
                        thumbnailUrl: msg.thumbnailUrl,
                        mediaType: msg.mediaType
                        // We could add connection to original sender here if schema supports it
                    });
                }
            }

            // Reset selection after successful forward
            setIsSelectionMode(false);
            setSelectedMessageIds([]);
            alert('Messages forwarded!');
        } catch (e) {
            console.error('Forward failed', e);
            alert('Forwarding failed.');
        }
    };

    // Scroll Helper
    // Scroll Helper - Aggressive Manual Driver
    // Scroll Helper - DOM Logic
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (!messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior });
    };

    // Force Scroll on Message Update and Channel Switch
    // Using auto for channel switch could be better but smooth is fine for consistency
    useEffect(() => {
        if (activeMessages.length > 0) {
            scrollToBottom('smooth');
        }
    }, [activeMessages.length, chat.activeChannelId]);

    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const getSenderColor = (name: string) => {
        const colors = ['text-[#ff8a8a]', 'text-[#8aff8a]', 'text-[#8a8aff]', 'text-[#ffff8a]', 'text-[#ff8aff]', 'text-[#8affff]', 'text-orange-400', 'text-pink-400'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // ... (inside itemContent) ...

    // This part is assumed to be inside the Virtuoso's itemContent render function
    // and is added based on the instruction to keep scrollToBottom helper for images.
    // The actual Virtuoso component is not in the provided snippet, but this is where
    // the image rendering logic would typically reside.
    // Example structure where this would fit:
    /*
    <Virtuoso
        // ... other props
        followOutput="smooth" // Added this based on instruction
        itemContent={(index, msg) => (
            // ... existing message content
            {msg.mediaUrl && (
                <div className="mb-2 mt-1">
                    {msg.mediaType === 'video' ?
                        <video src={msg.mediaUrl} controls className="max-w-full rounded-lg" /> :
                        <img
                            src={msg.thumbnailUrl || msg.mediaUrl}
                            alt="Attachment"
                            className="max-w-full rounded-lg cursor-pointer"
                            onClick={() => setLightboxUrl(msg.mediaUrl || null)}
                            onLoad={() => {
                                // If this is the last message, scroll to bottom again to account for height change
                                if (index === activeMessages.length - 1) {
                                    scrollToBottom('smooth');
                                }
                            }}
                        />
                    }
                </div>
            )}
            // ... rest of message content
        )}
    />
    */


    // ... (rest of component returns)

    const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // NEW: User Menu State

    // ... inside component ...

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: any, align?: 'up' | 'down' } | null>(null);

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // ... inside component ...

    return (
        <div className="flex h-full bg-[#0b141a] border-r border-white/10 font-sans relative">
            {/* Context Menu Overlay */}
            {contextMenu && (
                <div
                    className="fixed z-[70] bg-[#233138] rounded-lg shadow-xl border border-white/5 py-1 min-w-[200px]"
                    style={{
                        top: contextMenu.align === 'up' ? undefined : contextMenu.y,
                        bottom: contextMenu.align === 'up' ? (window.innerHeight - contextMenu.y) : undefined,
                        left: contextMenu.x
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent close when clicking menu
                >
                    {/* Common Actions */}
                    <button onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); fileInputRef.current?.closest('div')?.querySelector('textarea')?.focus(); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                        <ArrowLeft size={16} /> Reply
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                        <Layout size={16} /> Copy
                    </button>

                    {/* Owner Actions */}
                    {auth.user?.id === contextMenu.msg.sender?.id && (
                        <>
                            <div className="h-px bg-white/10 my-1" />
                            <button onClick={() => { /* info */ setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                                <AlertCircle size={16} /> Info
                            </button>
                            <button onClick={() => { /* edit */ setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                                <Edit2 size={16} /> Edit
                            </button>
                            <button onClick={() => { handleDelete(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-red-400 text-sm flex items-center gap-3">
                                <Trash2 size={16} /> Delete
                            </button>
                        </>
                    )}

                    {/* Other Actions */}
                    {auth.user?.id !== contextMenu.msg.sender?.id && (
                        <>
                            <div className="h-px bg-white/10 my-1" />
                            <button onClick={() => { /* report */ setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-red-400 text-sm flex items-center gap-3">
                                <Shield size={16} /> Report
                            </button>
                        </>
                    )}
                </div>
            )}
            {/* Lightbox Overlay */}
            {/* ... */}



            {/* My Requests Modal */}
            <MyRequestsModal isOpen={isMyRequestsOpen} onClose={() => setIsMyRequestsOpen(false)} />
            {/* Lightbox Overlay */}
            <AnimatePresence>
                {/* Full Screen Image Preview (Before Sending) */}
                {showImagePreview && attachments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-[#0b141a] flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 shrink-0">
                            <button onClick={() => { setAttachments([]); setShowImagePreview(false); }} className="text-[#aebac1]">
                                <X size={24} />
                            </button>
                            <span className="text-[#e9edef] font-bold">Preview ({attachments.length})</span>
                            <div className="w-6"></div>
                        </div>

                        {/* Image Grid / Carousel */}
                        <div className="flex-1 flex flex-wrap gap-4 items-center justify-center p-8 bg-black/50 overflow-y-auto">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="relative group rounded-lg overflow-hidden shadow-2xl border border-white/10 max-h-[80%] max-w-[80%]">
                                    {att.type === 'video' ? (
                                        <video src={att.url} controls className="max-h-96 max-w-full object-contain" />
                                    ) : (
                                        <img src={att.url} alt={`Preview ${idx}`} className="max-h-96 max-w-full object-contain" />
                                    )}
                                    <button
                                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Footer / Actions */}
                        <div className="h-20 bg-[#202c33] flex items-center justify-end px-4 shrink-0 gap-4">
                            <span className="text-[#8696a0] text-sm hidden md:block">Click 'Add' to attach to your message</span>
                            <button
                                onClick={() => setShowImagePreview(false)}
                                className="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-colors"
                            >
                                <Check size={20} />
                                ADD TO CHAT
                            </button>
                        </div>
                    </motion.div>
                )}

                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxUrl(null)}
                        className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm cursor-pointer"
                    >
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            src={lightboxUrl}
                            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain border border-white/10"
                        />
                        <button className="absolute top-4 right-4 text-white/50 hover:text-white">
                            <X size={32} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar - Channels */}
            <div className={`flex flex-col border-r border-white/5 bg-[#111b21] ${chat.activeChannelId ? 'hidden md:flex' : 'flex w-full'} md:w-80`}>
                <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                            {auth.user?.fullName?.[0]?.toUpperCase() || auth.user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-[#e9edef] text-sm">Groups</span>
                    </div>
                    <div className="flex gap-3 text-[#aebac1] relative">
                        {/* Discovery Button */}
                        <button
                            onClick={onDiscoveryClick}
                            className="hover:text-emerald-400 transition-colors"
                            title="Discover Groups"
                        >
                            <Globe size={20} />
                        </button>

                        <button
                            onClick={() => onCreateGroup?.()}
                            className="hover:text-white transition-colors"
                            title="New Group"
                        >
                            <Plus size={20} />
                        </button>

                        {/* User Menu Dropdown Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={`hover:text-white transition-colors ${isUserMenuOpen ? 'text-white' : ''}`}
                                title="User Menu"
                            >
                                <MoreHorizontal size={20} />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-8 w-40 bg-[#233138] rounded-lg shadow-xl border border-white/5 overflow-hidden z-[60]"
                                    >
                                        <div className="py-1">
                                            {/* Future items can go here */}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {isUserMenuOpen && (
                            <div className="fixed inset-0 z-[55]" onClick={() => setIsUserMenuOpen(false)} />
                        )}

                        <button onClick={() => {
                            onCreateGroup ? onCreateGroup('groups_root') : setIsCreating(true);
                        }} className="hover:text-white transition-colors">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Sidebar Search & Admin Filter */}
                <div className="px-3 pb-2 pt-1 bg-[#111b21] flex flex-col gap-2">
                    <div className="relative group/search">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0] group-focus-within/search:text-emerald-500 transition-colors">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={sidebarSearch}
                            onChange={(e) => setSidebarSearch(e.target.value)}
                            className="w-full bg-[#202c33] text-[#cfd9df] pl-10 pr-3 py-1.5 rounded-lg text-sm placeholder-[#8696a0] outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        />
                        {sidebarSearch && (
                            <button
                                onClick={() => setSidebarSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="flex bg-[#202c33] rounded-lg p-1">
                            <button
                                onClick={() => setShowAllGroups(false)}
                                className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-xs font-bold transition-all ${!showAllGroups ? 'bg-[#374248] text-emerald-400 shadow-sm' : 'text-[#8696a0] hover:text-[#e9edef]'}`}
                            >
                                <Users size={14} />
                                MY GROUPS
                            </button>
                            <button
                                onClick={() => setShowAllGroups(true)}
                                className={`flex-1 flex items-center justify-center gap-2 py-1 rounded-md text-xs font-bold transition-all ${showAllGroups ? 'bg-[#374248] text-emerald-400 shadow-sm' : 'text-[#8696a0] hover:text-[#e9edef]'}`}
                            >
                                <Globe size={14} />
                                DISCOVERY
                            </button>
                        </div>
                    )}
                </div>

                {/* Header Border */}
                <div className="h-px bg-[#202c33]/50 w-full shrink-0" />
                {isCreating && (
                    <div className="p-3 bg-[#111b21] border-b border-[#2a3942]">
                        <input
                            autoFocus
                            type="text"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                            placeholder="New group name"
                            className="w-full bg-[#202c33] text-[#cfd9df] p-2 rounded-lg text-sm placeholder-[#8696a0] outline-none focus:ring-1 focus:ring-[#00a884]"
                        />
                        <div className="flex gap-3 mt-2 justify-end">
                            <button onClick={() => setIsCreating(false)} className="text-[#ef4444] text-xs font-medium hover:underline">CANCEL</button>
                            <button onClick={handleCreateChannel} className="text-[#00a884] text-xs font-bold hover:underline">CREATE</button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Reorder.Group
                        axis="y"
                        values={chat.channels}
                        onReorder={handleReorder}
                        className="flex flex-col"
                    >
                        <div
                            className={`group px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors relative mb-2 ${chat.activeChannelId === -1 ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                            onClick={() => chat.setActiveChannel(-1)}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/20 text-emerald-500 font-bold text-lg">
                                <ListTodo size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[#e9edef] font-normal text-base truncate flex items-center gap-2">My Tasks</span>
                            </div>
                        </div>

                        {chat.channels
                            .filter(c => c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
                            .map((channel) => (
                                <Reorder.Item
                                    key={channel.id}
                                    value={channel}
                                    whileDrag={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.3)" }}
                                    className={`group px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors relative ${chat.activeChannelId === channel.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                                    onClick={() => chat.setActiveChannel(channel.id)}
                                >
                                    {/* Drag Handle (Visible on hover) */}
                                    <div className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-zinc-400 -ml-1">
                                        <GripVertical size={14} />
                                    </div>

                                    {/* Avatar/Icon */}
                                    <div className="relative shrink-0">
                                        {/* ... Avatar Logic ... */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#e9edef] font-bold text-lg ${
                                            // Dynamic Color based on ID
                                            ['bg-teal-600', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-600'][channel.id % 5]
                                            }`}>
                                            {channel.name.substring(0, 1).toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    {editingChannelId === channel.id ? (
                                        <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-[#202c33] text-white text-sm px-2 py-1 rounded w-full outline-none border border-emerald-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdateChannel();
                                                    if (e.key === 'Escape') setEditingChannelId(null);
                                                }}
                                            />
                                            <button onClick={handleUpdateChannel} className="text-emerald-500 hover:text-emerald-400"><Check size={16} /></button>
                                            <button onClick={() => setEditingChannelId(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#e9edef] font-normal text-base truncate flex items-center gap-2">
                                                    {channel.name}
                                                    {/* P1 Badge */}
                                                    {(notificationStats[channel.name.toLowerCase()]?.p1Count || 0) > 0 && (
                                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse">
                                                            {notificationStats[channel.name.toLowerCase()].p1Count}
                                                        </span>
                                                    )}
                                                </span>

                                                {/* Unread Badge */}
                                                {(unreadCounts[channel.id] || 0) > 0 && (
                                                    <div className="flex gap-1">
                                                        {(mentionCounts[channel.id] || 0) > 0 && (
                                                            <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full animate-pulse">
                                                                @
                                                            </span>
                                                        )}
                                                        <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-bounce">
                                                            {unreadCounts[channel.id]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[#8696a0] text-sm truncate flex items-center justify-between group-hover:hidden">
                                                <span>Tap to chat</span>
                                            </div>
                                            {/* Hover Actions */}
                                            <div className="hidden group-hover:flex justify-end gap-3 text-[#aebac1]">
                                                <Edit2 size={16} className="hover:text-white" onClick={(e) => startEditing(e, channel)} />
                                                <Trash2 size={16} className="hover:text-red-400" onClick={(e) => handleDeleteChannel(e, channel.id)} />
                                            </div>
                                        </div>
                                    )}
                                </Reorder.Item>
                            ))}
                    </Reorder.Group>
                </div>
            </div>

            {/* Main Chat Area */}
            {chat.activeChannelId === -1 ? (
                <div className="flex-1 flex flex-col min-w-0 bg-[#0b141a] relative md:flex w-full">
                    <div className="h-16 bg-[#202c33] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => chat.setActiveChannel(null)}
                                className="md:hidden text-[#d1d7db] -ml-2 p-1 rounded-full hover:bg-white/5 active:bg-white/10"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-500">
                                <ListTodo size={20} />
                            </div>
                            <span className="font-bold text-[#e9edef]">My Tasks</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-[#8696a0] hidden md:block">Press ESC to close</span>
                            <button
                                onClick={() => chat.setActiveChannel(null)}
                                className="text-[#aebac1] hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <MyRequestsModal
                            isOpen={true}
                            onClose={() => chat.setActiveChannel(null)}
                            isEmbedded={true}
                            onNavigateToTask={(task) => {
                                // Find channel that matches the department
                                if (task.department) {
                                    const targetChannel = chat.channels.find(c => c.name === task.department.name);
                                    if (targetChannel) {
                                        chat.setActiveChannel(targetChannel.id);
                                    } else {
                                        alert(`Channel for "${task.department.name}" not found.`);
                                    }
                                } else {
                                    // Fallback to General
                                    const general = chat.channels.find(c => c.name === 'General');
                                    if (general) chat.setActiveChannel(general.id);
                                }
                            }}
                        />
                    </div>
                </div>
            ) : chat.activeChannelId ? (
                <div className={`flex-1 flex flex-col min-w-0 bg-[#0b141a] relative ${chat.activeChannelId ? 'flex w-full' : 'hidden md:flex'}`}>
                    {/* Chat Background Pattern (Simulated with CSS) */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    </div>

                    {/* Header */}
                    {isSelectionMode ? (
                        <div className="h-16 bg-[#182229] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50 text-[#e9edef] animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="font-bold text-lg">{selectedMessageIds.length} Selected</div>
                                <div className="h-6 w-px bg-white/10 mx-2" />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsForwardModalOpen(true)}
                                        disabled={selectedMessageIds.length === 0}
                                        className="p-2 text-[#e9edef] disabled:opacity-30 hover:bg-white/10 rounded-full transition-colors relative group"
                                        title="Forward"
                                    >
                                        <ForwardIcon size={20} />
                                        <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] bg-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Forward</span>
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={selectedMessageIds.length === 0}
                                        className="p-2 text-[#e9edef] disabled:opacity-30 hover:bg-white/10 rounded-full transition-colors relative group"
                                        title="Delete"
                                    >
                                        <Trash2 size={20} />
                                        <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] bg-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-16 bg-[#202c33] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div
                                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors min-w-0 shrink"
                                    onClick={() => setIsGroupSettingsOpen(true)}
                                >
                                    {/* Mobile Back Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); chat.setActiveChannel(null); }}
                                        className="md:hidden text-[#d1d7db] -ml-2 p-1 rounded-full hover:bg-white/5 active:bg-white/10 shrink-0"
                                    >
                                        <ArrowLeft size={24} />
                                    </button>

                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                                        #
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#e9edef] text-base leading-tight">
                                            {chat.channels.find(c => c.id === chat.activeChannelId)?.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-[#8696a0] truncate mt-0.5">
                                            {/* Health Stats (Active | Queue | Done Today) */}
                                            {healthStats.total >= 0 && (
                                                <div
                                                    className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded ml-1 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                                    title="Click to view Group Tasks"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        <span className="text-blue-400 font-medium">{healthStats.active} Active</span>
                                                    </div>
                                                    <span className="text-white/10">|</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                        <span className="text-orange-400 font-medium">{healthStats.pending} Queue</span>
                                                    </div>
                                                    <span className="text-white/10">|</span>
                                                    <span className="text-emerald-400 font-medium">+{healthStats.doneToday} Done Today</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-auto pr-24">
                                    <div className="h-6 w-px bg-white/10 shrink-0 mx-2 hidden sm:block" />

                                    {/* Action Log Toggle */}
                                    <button
                                        onClick={() => setShowSystemOnly(!showSystemOnly)}
                                        className={`p-2 rounded-lg transition-colors ${showSystemOnly ? 'bg-blue-500/20 text-blue-400' : 'text-[#aebac1] hover:bg-white/5 hover:text-[#e9edef]'}`}
                                        title={showSystemOnly ? "Show All Messages" : "Show Action Log Only"}
                                    >
                                        <Terminal size={18} />
                                    </button>

                                    <button
                                        onClick={() => setIsSelectionMode(true)}
                                        className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 p-2 rounded-lg hover:bg-white/5 transition-colors font-medium text-sm whitespace-nowrap"
                                        title="Select Messages"
                                    >
                                        <CheckCircle2 size={18} />
                                        <span className="hidden xl:inline">Select</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {/* Messages (Virtualized) */}
                    {/* Messages (Standard DOM - Stability Fix) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 z-10 custom-scrollbar relative">
                        {/* Visual Urgency Indicator */}
                        {healthStats.hasUrgent && (
                            <>
                                <div className="sticky top-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse z-20" />
                            </>
                        )}

                        {displayedMessages.map((msg, index) => {
                            const isMe = auth.user && msg.sender && (
                                String(msg.sender.id) === String(auth.user.id) ||
                                (msg.sender.email && msg.sender.email.toLowerCase() === auth.user.email?.toLowerCase())
                            );

                            // Format Time
                            const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                            // Render text with mentions
                            const renderContent = (text: string) => {
                                if (users.length === 0) return <span className="text-[#e9edef]">{text}</span>;
                                const validNames = users.flatMap(u => [u.fullName, u.username]).filter(Boolean).sort((a, b) => b.length - a.length);
                                if (validNames.length === 0) return <span className="text-[#e9edef]">{text}</span>;
                                const escaped = validNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                                const regex = new RegExp(`(@(?:${escaped}))`, 'gi');
                                const parts = text.split(regex);
                                return parts.map((part, i) => {
                                    if (part.startsWith('@')) {
                                        const name = part.substring(1);
                                        const isValid = validNames.some(n => n.toLowerCase() === name.toLowerCase());
                                        if (isValid) return <span key={i} className="text-[#53bdeb] font-bold cursor-pointer hover:underline">{part}</span>;
                                    }
                                    return <span key={i} className="text-[#e9edef]">{part}</span>;
                                });
                            };

                            const isMentioned = auth.user?.fullName && msg.content.includes(`@${auth.user.fullName}`);
                            const isActivityLog = !msg.sender && (msg.content.includes('added') || msg.content.includes('removed') || msg.content.includes('joined') || msg.content.includes('left')) && !msg.content.includes('TASK');

                            const isBot = msg.sender?.id === 0 || (msg.sender as any)?.role === 'bot' || !msg.sender;

                            // Enhanced P1 Check: Check logic AND Linked Task
                            let updatedP1Task = false;
                            let targetTaskId = msg.linkedTaskId;

                            // Fallback: Try to parse ID from content if not linked
                            if (!targetTaskId) {
                                const match = msg.content.match(/#(\d+)/);
                                if (match) targetTaskId = parseInt(match[1]);
                            }

                            if (targetTaskId && tasks.length > 0) {
                                const foundTask = tasks.find(t => t.id === targetTaskId);
                                if (foundTask && foundTask.priority === 'P1') updatedP1Task = true;
                            }

                            const isP1 = msg.content.includes('[P1]') || msg.content.toUpperCase().includes('URGENT') || updatedP1Task;

                            const botIdentity = { fullName: 'JT ADVISOR', email: 'system@art-engine.ai', role: 'bot', id: 0 };
                            // Get Display Name/Sender
                            const isBotCheck = msg.sender?.id === 0 || (msg.sender as any)?.role === 'bot' || !msg.sender;
                            const botIdentityRef = { fullName: 'JT ADVISOR', email: 'system@art-engine.ai', role: 'bot', id: 0 };

                            // If it's a bot but has a specific name (like a squad agent), use that name!
                            const displaySender = isBotCheck
                                ? { ...botIdentityRef, ...msg.sender }
                                : (msg.sender || { fullName: 'Unknown', email: '' });
                            const isTask = msg.linkedTaskId || msg.taskStatus || msg.content.includes('!task');

                            // Date Separator Logic
                            const prev = activeMessages[index - 1];
                            const isNewDay = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();

                            if (isActivityLog) {
                                return (
                                    <motion.div key={`sys-${msg.id || index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center w-full my-4 px-10">
                                        <div className="bg-[#182229]/80 text-[#8696a0] px-4 py-2 rounded-lg text-[10px] font-mono shadow-sm border border-white/5 flex items-center gap-3 w-full max-w-xl">
                                            <div className="flex items-center gap-1.5 shrink-0"><Terminal size={12} className="text-zinc-600" /><span className="text-zinc-700 font-bold">[SYSTEM]</span></div>
                                            <div className="h-3 w-px bg-white/5 shrink-0" />
                                            <div className="flex-1 truncate tracking-tight uppercase">{msg.content}</div>
                                            <div className="text-[9px] text-zinc-700 shrink-0">{time}</div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            if (isBot) {
                                return (
                                    <motion.div key={`bot-${msg.id || index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full my-6 px-10 relative group">
                                        <div className={`w-full max-w-xl rounded-2xl overflow-hidden border transition-all ${isP1 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-zinc-900 border-white/10 shadow-xl'}`}>
                                            <div className={`px-4 py-2 border-b flex items-center justify-between ${isP1 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-black/20 border-white/5'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${isP1 ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{isP1 ? <Zap size={14} fill="currentColor" /> : <Bot size={14} />}</div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isP1 ? 'text-rose-400' : (displaySender.fullName?.startsWith('@') ? 'text-indigo-400' : 'text-zinc-500')}`}>
                                                            {isP1 ? 'Critical Priority' : (displaySender.fullName?.startsWith('@') ? 'AI Squad Operator' : 'System Notification')}
                                                        </span>
                                                        <span className="text-xs font-bold text-white">{displaySender.fullName}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 font-mono">{time}</span>
                                            </div>
                                            <div className="p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap select-text selection:bg-rose-500/30">{renderContent(msg.content)}</div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            return (
                                <div key={`msg-${msg.id || index}`} className="space-y-1">
                                    {isNewDay && (
                                        <div className="flex justify-center my-4">
                                            <div className="bg-[#202c33] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium border border-white/5">
                                                {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2 w-full">
                                        {/* Selection Checkbox */}
                                        <AnimatePresence>
                                            {isSelectionMode && (
                                                <motion.div
                                                    initial={{ width: 0, opacity: 0 }}
                                                    animate={{ width: 30, opacity: 1 }}
                                                    exit={{ width: 0, opacity: 0 }}
                                                    className="overflow-hidden shrink-0 mb-1"
                                                >
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); handleToggleSelect(msg.id); }}
                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedMessageIds.includes(msg.id) ? 'bg-[#00a884] border-[#00a884]' : 'border-[#8696a0] hover:border-white'}`}
                                                    >
                                                        {selectedMessageIds.includes(msg.id) && <Check size={14} className="text-black font-bold" />}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            id={`msg-${msg.id}`}
                                            onClick={(e) => {
                                                if (isSelectionMode) {
                                                    e.stopPropagation();
                                                    handleToggleSelect(msg.id);
                                                }
                                            }}
                                            className={`group flex items-end gap-3 mb-1 w-full relative ${isMe ? 'justify-end' : 'justify-start'} ${isMentioned ? 'bg-yellow-500/5 -mx-4 px-4 py-1' : ''} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                                        >
                                            {/* Side Click Hitbox (Double Click to Reply) */}
                                            <div className="flex-1 self-stretch cursor-default" onDoubleClick={(e) => { if (e.target === e.currentTarget) setReplyingTo(msg); }} title="Double-Click to Reply" />

                                            {/* Bubble */}
                                            <div className="relative max-w-[70%] group">
                                                <div className={`rounded-lg px-2 py-1.5 shadow-sm relative text-sm leading-relaxed ${isTask ? (isMe ? 'bg-indigo-600/90 text-white rounded-tr-none border border-indigo-400/30' : 'bg-indigo-900/90 text-white rounded-tl-none border border-indigo-500/20') : (isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none')} ${isMentioned && !isMe ? 'border-2 border-yellow-500/50' : ''}`}>
                                                    {/* Reply Context */}
                                                    {msg.replyTo && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); /* Scroll logic could go here */ }}
                                                            className={`rounded-lg p-1.5 mb-1 text-xs border-l-4 cursor-pointer hover:bg-black/10 transition-colors ${isMe ? 'bg-[#025144] border-[#06cf9c]' : 'bg-[#1d272d] border-[#aebac1]'}`}
                                                        >
                                                            <div className="font-bold mb-0.5 opacity-80">{msg.replyTo.sender?.fullName || 'Unknown'}</div>
                                                            <div className="opacity-70 truncate">{msg.replyTo.mediaUrl ? '📷 Media' : msg.replyTo.content}</div>
                                                        </div>
                                                    )}

                                                    {/* Sender Name (Group) */}
                                                    {!isMe && !isBot && (
                                                        <div className={`text-xs font-bold mb-1 ${getSenderColor(displaySender.fullName || '?')}`}>{displaySender.fullName}</div>
                                                    )}

                                                    {/* Media */}
                                                    {msg.mediaUrl && (
                                                        <div className="mb-2 mt-1">
                                                            {msg.mediaType === 'video' ?
                                                                <video src={msg.mediaUrl} controls className="max-w-full rounded-lg" /> :
                                                                <img
                                                                    src={msg.thumbnailUrl || msg.mediaUrl}
                                                                    alt="Attachment"
                                                                    className="max-w-full rounded-lg cursor-pointer"
                                                                    onClick={() => setLightboxUrl(msg.mediaUrl || null)}
                                                                    onLoad={() => {
                                                                        // If this is the last message, scroll to bottom again to account for height change
                                                                        if (index === activeMessages.length - 1) {
                                                                            scrollToBottom('smooth');
                                                                        }
                                                                    }}
                                                                />
                                                            }
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="whitespace-pre-wrap break-words select-text pr-6">
                                                        {renderContent(msg.content)}
                                                    </div>

                                                    {/* Footer (Time + Ticks) */}
                                                    <div className="float-right ml-4 mt-1 flex items-center gap-1 select-none">
                                                        <span className="text-[10px] text-white/50">{time}</span>
                                                        {isMe && (() => {
                                                            if (!isTask) return null;

                                                            // Determine Status (Synced with Task Board)
                                                            let status = 'PENDING';

                                                            // 1. Live Task Status (Highest Priority)
                                                            if (msg.linkedTaskId && taskStatusMap[msg.linkedTaskId]) {
                                                                const liveStatus = taskStatusMap[msg.linkedTaskId];
                                                                if (liveStatus === 'done' || liveStatus === 'rejected') status = 'DONE';
                                                                else if (liveStatus === 'in_progress' || liveStatus === 'review') status = 'IN_PROGRESS';
                                                                else status = 'PENDING';
                                                            }
                                                            // 2. Message Metadata Fallback
                                                            else if (msg.taskStatus) {
                                                                status = msg.taskStatus;
                                                            }

                                                            return (
                                                                <div className="flex items-center gap-1 ml-1" title={`Status: ${status}`}>
                                                                    {/* Pending Dot */}
                                                                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${status === 'PENDING' ? 'bg-zinc-400' : 'bg-white/10'}`} />
                                                                    {/* In Progress Dot */}
                                                                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-white/10'}`} />
                                                                    {/* Done Dot */}
                                                                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${status === 'DONE' ? 'bg-green-400' : 'bg-white/10'}`} />
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Dropdown Arrow (Context Menu Trigger) */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                            const align = spaceBelow < 250 ? 'up' : 'down';
                                                            // If up, anchor to top of button. If down, anchor to bottom.
                                                            const y = align === 'down' ? rect.bottom : rect.top;
                                                            setContextMenu({ x: rect.right - 150, y, msg, align });
                                                        }}
                                                        className={`absolute top-0 right-0 m-1 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                                                        title="Message options"
                                                    >
                                                        <svg viewBox="0 0 18 18" width="14" height="14" className="fill-current"><path d="M3.3 4.6 9 10.3l5.7-5.7 1.6 1.6-7.3 7.3-7.3-7.3 1.6-1.6z"></path></svg>
                                                    </button>
                                                </div>

                                                {/* Quick Reply Button (On Hover - KEEPING THIS AS IS for now, or removing it if it conflicts) */}
                                                {/* Actually, let's keep the side reply button on the parent motion.div group hover, but this is inside bubble container now? No, outside. */}
                                            </div>

                                            {/* Quick Reply Button (On Hover) - OUTSIDE the bubble container, effectively side-click replacement visual helper if needed, 
                                            but currently we have the side hitbox. 
                                            The previous code had this button visible on group-hover of the ROW. 
                                            Let's keep it but ensure it doesn't conflict. 
                                        */}

                                            {/* Spacer Balance */}
                                            <div className="w-8 shrink-0" />
                                        </motion.div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#202c33] shrink-0 z-10 border-t border-[#202c33] flex flex-col">
                        {/* REPLYING TO INDICATOR (Top of Footer) */}
                        {replyingTo && (
                            <div className="flex items-center justify-between px-4 py-2 bg-[#1d272d] border-l-4 border-[#00a884] mx-4 mt-2 rounded-r">
                                <div className="flex flex-col text-xs overflow-hidden">
                                    <span className="text-[#00a884] font-bold">{replyingTo.sender?.fullName || 'System'}</span>
                                    <span className="text-[#d1d7db]/70 truncate">{replyingTo.mediaUrl ? '📷 Photo' : replyingTo.content}</span>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-[#aebac1] hover:text-white p-1">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="px-4 py-3 flex items-end gap-2 relative">
                            <div className="relative">
                                <button onClick={() => setIsAttaching(!isAttaching)} className={`p-2 hover:text-[#aebac1] mb-1 ${isAttaching ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                                    {/* Paperclip Icon for modern attachment feel */}
                                    <div className={`transition-transform duration-200 ${isAttaching ? 'rotate-45' : ''}`}>
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                    </div>
                                </button>

                                {/* Attachment Popup */}
                                {isAttaching && (
                                    <div className="absolute bottom-14 left-0 bg-[#233138] p-3 rounded-lg shadow-xl w-72 z-20 border border-white/5 flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 bg-[#2a3942] hover:bg-[#354552] text-[#e9edef] text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                    <Plus size={10} />
                                                </div>
                                                Photos & Videos
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                accept="image/*,video/*"
                                                multiple // Allow multiple files
                                            />
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#2a3942]"></div>
                                            <span className="relative bg-[#233138] px-2 text-[10px] text-[#8696a0] font-bold uppercase block text-center w-fit mx-auto">OR URL</span>
                                        </div>

                                        <input
                                            autoFocus
                                            className="bg-[#2a3942] text-white text-sm p-2 rounded outline-none border border-transparent focus:border-[#00a884] placeholder-[#8696a0]"
                                            placeholder="Paste image/video URL..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setAttachments(prev => [...prev, { url: e.currentTarget.value, type: 'image' }]); // Default to image for URL
                                                    e.currentTarget.value = '';
                                                    setShowImagePreview(true);
                                                    setIsAttaching(false);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 bg-[#2a3942] rounded-lg flex flex-col justify-center min-h-[42px] px-3 py-1 border border-transparent focus-within:border-[#00a884]/50 transition-colors relative">

                                {/* DRAFT THUMBNAILS (Input Area) */}
                                {attachments.length > 0 && !showImagePreview && (
                                    <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#202c33]/50 rounded mb-1 border border-white/5 custom-scrollbar">
                                        {attachments.map((att, idx) => (
                                            <div key={idx} className="flex-shrink-0 relative group">
                                                {att.type === 'video' ? (
                                                    <video src={att.url} className="h-12 w-12 object-cover rounded border border-white/10" />
                                                ) : (
                                                    <img src={att.url} className="h-12 w-12 object-cover rounded border border-white/10" />
                                                )}
                                                <button
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 text-[#aebac1] hover:text-red-400 bg-black/60 rounded-full p-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Priority Selection - Visible when typing or has attachment */}
                                {(input.trim().length > 0 || attachments.length > 0) && (
                                    <div className="flex items-center gap-2 mb-1 absolute -top-10 left-0 bg-[#202c33] p-1.5 rounded-lg shadow-xl border border-white/5 z-50">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1 select-none">Priority:</span>
                                        {['P1', 'P2', 'P3'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setSelectedPriority(p === selectedPriority ? null : p)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${selectedPriority === p
                                                    ? (p === 'P1' ? 'bg-red-500 text-white' : p === 'P2' ? 'bg-orange-500 text-black' : 'bg-blue-500 text-white')
                                                    : 'bg-[#2a3942] text-zinc-400 hover:bg-[#354552] border border-white/5'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Mentions Popup */}
                                {mentionQuery !== null && (
                                    <div className="flex flex-col gap-1 mb-1 absolute bottom-12 left-0 bg-[#233138] w-64 max-h-48 overflow-y-auto rounded-lg shadow-xl border border-white/5 z-50 p-2 custom-scrollbar">
                                        {users
                                            .filter(u => u.username?.toLowerCase().includes(mentionQuery) || u.fullName?.toLowerCase().includes(mentionQuery))
                                            .map(user => (
                                                <button
                                                    key={user.id}
                                                    // Insert Full Name
                                                    onClick={() => insertMention(user.fullName)}
                                                    className="flex items-center gap-2 p-2 hover:bg-[#2a3942] rounded-lg text-left transition-colors"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {user.fullName?.[0] || '?'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                            <span className="text-sm text-[#e9edef] font-bold truncate">{user.fullName}</span>
                                                            {user.department && (
                                                                <span
                                                                    className="text-[8px] px-1.5 py-0.5 rounded border border-current font-bold uppercase tracking-tighter shrink-0"
                                                                    style={{
                                                                        borderColor: `${generateColor(user.department.name)}40`,
                                                                        backgroundColor: `${generateColor(user.department.name)}15`,
                                                                        color: generateColor(user.department.name)
                                                                    }}
                                                                >
                                                                    {user.department.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-[#8696a0]">@{user.username}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        {users.every(u => !u.username?.toLowerCase().includes(mentionQuery) && !u.fullName?.toLowerCase().includes(mentionQuery)) && (
                                            <div className="p-2 text-xs text-[#8696a0] text-center">No users found</div>
                                        )}
                                    </div>
                                )}

                                <textarea
                                    value={input}
                                    onChange={handleInput}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (e.ctrlKey) {
                                                // Handle Ctrl+Enter -> Insert Newline
                                                // We manually append because browser default for Ctrl+Enter often isn't newline
                                                // Ideally we'd insert at cursor, but appending is safe MVP
                                                e.preventDefault();
                                                setInput(prev => prev + '\n');
                                            } else if (!e.shiftKey) {
                                                // Handle Enter -> Send
                                                e.preventDefault();
                                                handleSend();
                                            }
                                            // Shift+Enter falls through to default behavior (newline)
                                        }
                                    }}
                                    placeholder="Type a message (Ctrl+Enter for new line)"
                                    className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] text-sm outline-none resize-none custom-scrollbar min-h-[24px] max-h-32 py-1"
                                    rows={1}
                                    style={{ fieldSizing: 'content' } as any}
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className={`p-2 rounded-full mb-1 transition-all ${input.trim() ? 'bg-[#00a884] text-white shadow-md' : 'text-[#8696a0]'}`}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div >
                </div >
            ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#222e35] text-[#e9edef] border-b-[6px] border-[#00a884]">
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl font-light text-[#e9edef]">WhatsApp for Work</h1>
                        <p className="text-[#8696a0] max-w-md text-sm">Send and receive chores and keep your job organized.</p>
                        <div className="flex items-center gap-2 text-xs text-[#8696a0] mt-10">
                            <span className="w-3 h-3 rounded-full bg-[#00a884]"></span>
                            End-to-end encrypted (Simulated)
                        </div>
                    </div>
                </div>
            )
            }
            {/* Forward Modal */}
            <ForwardModal
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                onSend={handleForward}
            />
            {/* Group Settings Modal */}
            <GroupSettingsModal
                isOpen={isGroupSettingsOpen}
                onClose={() => setIsGroupSettingsOpen(false)}
                channelId={chat.activeChannelId || 0}
                stats={{
                    count: healthStats.pending,
                    active: healthStats.active,
                    day: healthStats.doneToday
                }}
            />
        </div >
    );
}
