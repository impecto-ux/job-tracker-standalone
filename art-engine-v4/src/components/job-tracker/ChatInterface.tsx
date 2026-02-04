import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Plus, Trash2, Edit2, X, Check, Bot, ListTodo, ArrowLeft, ArrowRight, MoreHorizontal, Shield, Terminal, Layout, Zap, AlertCircle, Copy, Reply as ReplyIcon, Forward as ForwardIcon, CheckCircle2, Minimize2, ChevronDown, CheckCheck, Download, Users as UsersIcon } from 'lucide-react';
import { useStore, ChatMessage } from '@/lib/store';
import api from '@/lib/api';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

import MyRequestsModal from './MyRequestsModal';
import GroupSettingsModal from './GroupSettingsModal';
import ForwardModal from './ForwardModal';
import ChatSidebar from './ChatSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { getSocketUrl } from '@/lib/config';


interface ChatInterfaceProps {
    notificationStats?: Record<string, { p1Count: number }>;
    pendingMessage?: string | null;
    onMessageConsumed?: () => void;
    onUnreadChange?: (total: number, counts: Record<number, number>, mentionCounts: Record<number, number>) => void;
    onCreateGroup?: (view?: 'root' | 'groups_root' | 'departments_root') => void;
    onDiscoveryClick?: (tab?: 'groups' | 'people') => void;
    onMemberClick?: (member: Record<string, any>) => void; // Using Record<string, any> as a better alternative to 'any' for now, or import User
    taskStatusMap?: Record<number, string>;
    highlightMessageId?: number | null;
    tasks?: Record<string, any>[]; // Authoritative Task Data
    isMobileLayout?: boolean;
    isChatOnly?: boolean;
}

export default function ChatInterface({
    notificationStats = {},
    pendingMessage,
    onMessageConsumed,
    onUnreadChange,
    onCreateGroup,
    onDiscoveryClick,
    onMemberClick,
    taskStatusMap = {},
    highlightMessageId,
    tasks = [], // Default empty
    isMobileLayout = false,
    isChatOnly = false
}: ChatInterfaceProps) {
    const auth = useStore(state => state.auth);
    const chat = useStore(state => state.chat);

    // Stable selectors for callbacks to prevent infinite loops
    const setChannels = useStore(state => state.chat.setChannels);
    const setActiveChannel = useStore(state => state.chat.setActiveChannel);
    const refreshChannels = useStore(state => state.chat.refreshChannels);
    const [isLoading, setIsLoading] = useState(false);



    // consume pending message (Now handled by MessageInput prop, just clearing local ref logic if any)
    // Actually we keep the prop passing, removing local effect that sets input.
    // Ideally we clear the pending message from store once mounted/consumed.
    // But since MessageInput handles it, we can just rely on the prop.

    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null); // Reply state
    const [isTyping, setIsTyping] = useState(false);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false); // NEW: Group Settings state

    // Multi-select State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [forwardingMessages, setForwardingMessages] = useState<ChatMessage[]>([]); // Messages currently being forwarded
    const isInitialScrollRef = useRef(true); // Track if it's the first render/switch

    // ESC Handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedMessageIds([]);
                } else if (chat.activeChannelId === -1) {
                    chat.setActiveChannel(null);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [chat.activeChannelId, isSelectionMode]);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Still used for something? Maybe forward modal or misc? If unused lint will say.
    // Actually fileInputRef was for the input area. Removing it.

    // --- MENTION LOGIC START ---
    const [users, setUsers] = useState<any[]>([]);
    // mentionQuery moved to MessageInput

    useEffect(() => {
        if (auth.token) {
            api.get('/users').then(res => setUsers(res.data)).catch(console.error);
        }
    }, [auth.token]);



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

    const [socketInstance, setSocketInstance] = useState<Socket | null>(null); // Ref to hold socket

    const handleUpload = async (file: File) => {
        const formData = new FormData();
        if (chat.activeChannelId) formData.append('channelId', chat.activeChannelId.toString());
        if (auth.user?.id) formData.append('userId', auth.user.id.toString());
        formData.append('file', file);

        const res = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return {
            url: res.data.url,
            thumbnailUrl: res.data.thumbnailUrl,
            type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video'
        };
    };

    useEffect(() => {
        if (auth.token && !chat.activeChannelId && chat.channels.length === 0) {
            refreshChannels();
        }
    }, [auth.token, chat.activeChannelId, chat.channels.length, refreshChannels]);

    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [mentionCounts, setMentionCounts] = useState<Record<number, number>>({}); // Mention Badge State

    // Stable ref for message handling to avoid listener re-binding
    const handleMessage = useCallback((msg: any) => {
        const currentActiveId = useStore.getState().chat.activeChannelId;
        console.log('WS Message Received:', msg);

        if (msg && msg.channel) {
            const msgChannelId = Number(msg.channel.id);
            const activeId = currentActiveId !== null ? Number(currentActiveId) : null;
            const isCurrentChannel = activeId !== null && msgChannelId === activeId;

            console.log(`[Socket] Channel check: msg=${msgChannelId}, active=${activeId}, match=${isCurrentChannel}`);

            if (isCurrentChannel) {
                useStore.getState().chat.addMessage(msgChannelId, msg);
            } else {
                const currentUserId = useStore.getState().auth.user?.id;
                const isFromMe = msg.sender && (Number(msg.sender.id) === Number(currentUserId));

                if (!isFromMe) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [msgChannelId]: (prev[msgChannelId] || 0) + 1
                    }));

                    const currentUserFullName = useStore.getState().auth.user?.fullName || '';
                    if (currentUserFullName && msg.content && msg.content.includes(`@${currentUserFullName}`)) {
                        setMentionCounts(prev => ({
                            ...prev,
                            [msgChannelId]: (prev[msgChannelId] || 0) + 1
                        }));
                    }
                }
            }
        }
    }, [auth.user?.id]);

    // Socket Connection
    useEffect(() => {
        if (!auth.user?.id) return;

        console.log('[Socket] Initializing connection for user:', auth.user.id);
        const socket = io(getSocketUrl(), {
            query: { userId: auth.user.id },
            transports: ['websocket', 'polling'] // Prefer websocket
        });
        setSocketInstance(socket);

        socket.on('connect', () => {
            console.log('Connected to WebSocket System');
        });

        // Real-time Group Updates
        socket.on('group.access_granted', (group: Record<string, any>) => {
            console.log('Group Access Granted, refreshing channels...', group);
            refreshChannels();
        });

        socket.on('group.access_revoked', (data: Record<string, any>) => {
            console.log('Group Access Revoked, refreshing channels...', data);

            // OPTIMISTIC REMOVAL: Remove from state immediately
            if (data.channelId) {
                const currentChannels = useStore.getState().chat.channels;
                chat.setChannels(currentChannels.filter((c: Record<string, any>) => String(c.id) !== String(data.channelId)));
            }

            // UI SAFETY: If the user is looking at this group, switch them away immediately
            const currentActiveId = useStore.getState().chat.activeChannelId;
            // Use channelId from payload since that matches activeChannelId
            if (currentActiveId && String(currentActiveId) === String(data.channelId)) {
                console.log('User was viewing removed group. Redirecting...');
                chat.setActiveChannel(1); // Default to General
            }

            // Sync with server as a final step
            refreshChannels();
        });

        socket.on('message', handleMessage);

        socket.on('message_deleted', (payload: Record<string, any>) => {
            console.log('Message Deleted:', payload);
            if (String(payload.channelId) === String(useStore.getState().chat.activeChannelId)) {
                chat.removeMessage(Number(payload.channelId), Number(payload.messageId));
            }
        });

        socket.on('message', (msg: ChatMessage) => {
            console.log('[DEBUG] Socket received message:', msg);
            handleMessage(msg); // Call the existing handler
        });

        socket.on('message_updated', (msg: ChatMessage | Record<string, any>) => {
            console.log('WS Message Updated:', msg);
            if ((msg as any).channel && (msg as any).channel.id) {
                chat.updateMessage(Number((msg as any).channel.id), msg as ChatMessage);
            }
        });

        socket.on('channel_deleted', (msg: { id: number }) => {
            console.log('WS Channel Deleted:', msg);
            const currentActiveId = useStore.getState().chat.activeChannelId;

            // Refresh list
            refreshChannels();

            // If active channel was deleted/archived, switch
            if (String(currentActiveId) === String(msg.id)) {
                chat.setActiveChannel(null);
            }
        });

        socket.on('channel_created', (channel: Record<string, any>) => {
            console.log('WS Channel Created:', channel);
            refreshChannels();
        });

        return () => {
            console.log('[Socket] Disconnecting...');
            socket.disconnect();
        };
    }, [auth.user?.id, handleMessage]); // Stable dependencies

    // Clear unread on channel select
    useEffect(() => {
        if (chat.activeChannelId) {
            setUnreadCounts(prev => ({ ...prev, [chat.activeChannelId!]: 0 }));
            setMentionCounts(prev => ({ ...prev, [chat.activeChannelId!]: 0 }));

            // Reset initial scroll flag on channel switch
            isInitialScrollRef.current = true;

            // Background fetch for the active channel
            const hasExistingMessages = chat.messages[chat.activeChannelId!]?.length > 0;
            if (!hasExistingMessages) setIsLoading(true);

            api.get(`/channels/${chat.activeChannelId}/messages?limit=200&t=${Date.now()}`).then(res => {
                console.log(`[DEBUG] Loaded ${res.data.length} messages for channel ${chat.activeChannelId}. Sample metadata:`, res.data[res.data.length - 1]?.metadata);
                chat.setMessages(chat.activeChannelId!, res.data);
            }).catch(err => console.error("Failed to load messages", err))
                .finally(() => setIsLoading(false));
        }
    }, [chat.activeChannelId]);



    // Notify parent of total unread
    useEffect(() => {
        const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
        onUnreadChange?.(total, unreadCounts, mentionCounts);
    }, [unreadCounts, mentionCounts, onUnreadChange]);

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



    const handleSend = async (content: string, attachments: { url: string, thumbnailUrl?: string, type: 'image' | 'video' }[], priority: string | null) => {
        if (!content.trim() && attachments.length === 0) return;
        if (!chat.activeChannelId || !auth.user) return;

        setIsLoading(true); // Restore Loading State

        // --- MISSION CONTROL: STATUS PARSING ---
        // 1. Check for "Status: DONE" patterns
        let parsedStatus: string | null = null;
        if (/status:\s*[*]*DONE[*]*/i.test(content) || content.toLowerCase().includes('!status done')) {
            parsedStatus = 'done';
        } else if (/status:\s*[*]*IN[\s_]*PROGRESS[*]*/i.test(content) || content.toLowerCase().includes('!status active')) {
            parsedStatus = 'in_progress';
        }

        if (parsedStatus) {
            if (replyingTo?.linkedTaskId) {
                // Update Linked Task
                try {
                    await api.patch(`/tasks/${replyingTo.linkedTaskId}`, { status: parsedStatus });
                    console.log(`[MissionControl] Auto-updated Task #${replyingTo.linkedTaskId} to ${parsedStatus}`);
                } catch (e: unknown) {
                    if ((e as any).response?.status === 403) {
                        alert((e as any).response?.data?.message || 'Bu işlem için yetkiniz yok.');
                    }
                    console.error(e);
                }
            } else {
                // Try Regex Match
                const idMatch = content.match(/#(\d+)/);
                if (idMatch) {
                    const taskId = parseInt(idMatch[1]);
                    try {
                        await api.patch(`/tasks/${taskId}`, { status: parsedStatus });
                    } catch (e: unknown) {
                        if ((e as any).response?.status === 403) {
                            alert((e as any).response?.data?.message || 'Bu işlem için yetkiniz yok.');
                        }
                        console.error(e);
                    }
                }
            }
        }

        // 2. Prepare Message Data
        const msgData = {
            channelId: chat.activeChannelId,
            content: content,
            senderId: auth.user.id,
            attachments: attachments,
            replyToId: replyingTo?.id,
            priority: priority // 'P1', 'P2', 'P3'
        };

        // 3. Optimistic Update
        const tempId = Date.now();
        const optimisticMsg = {
            ...msgData,
            id: tempId,
            sender: auth.user,
            createdAt: new Date().toISOString(),
            mediaUrl: attachments[0]?.url,
            mediaType: attachments[0]?.type,
            thumbnailUrl: attachments[0]?.thumbnailUrl,
            replyTo: replyingTo || undefined,
            priority: priority || undefined
        };

        if (chat.activeChannelId) {
            chat.addMessage(chat.activeChannelId, optimisticMsg);
        }
        setTimeout(() => scrollToBottom('smooth'), 100);

        try {
            // 4. PERSISTENCE (API Call)
            // Scenario A: Text Only (or text + attachments if API handles it, but simplified here)
            // Previous logic split attachments, but for now we trust `api.post` handles it or we iterate.
            // Wait, previous logic iterated attachments if > 0.

            if (attachments.length === 0) {
                const res = await api.post(`/channels/${chat.activeChannelId}/messages`, {
                    content,
                    replyToId: replyingTo?.id,
                    priority
                });
                // Replace Optimistic with Real
                chat.removeMessage(chat.activeChannelId, tempId);
                chat.addMessage(chat.activeChannelId, res.data);
            } else {
                // Scenario B: With Attachments
                // Send first attachment WITH text
                const first = attachments[0];
                const res1 = await api.post(`/channels/${chat.activeChannelId}/messages`, {
                    content, // Attach text to first media
                    mediaUrl: first.url,
                    thumbnailUrl: first.thumbnailUrl,
                    mediaType: first.type,
                    replyToId: replyingTo?.id,
                    priority
                });
                chat.removeMessage(chat.activeChannelId, tempId);
                chat.addMessage(chat.activeChannelId, res1.data);

                // Send remaining
                for (let i = 1; i < attachments.length; i++) {
                    const att = attachments[i];
                    const res = await api.post(`/channels/${chat.activeChannelId}/messages`, {
                        content: '',
                        mediaUrl: att.url,
                        thumbnailUrl: att.thumbnailUrl,
                        mediaType: att.type
                    });
                    chat.addMessage(chat.activeChannelId, res.data);
                }
            }

            setReplyingTo(null);
            if (priority === 'P1') {
                // Should we force refresh? Assuming socket handles update.
            }

        } catch (error) {
            console.error('Failed to send message', error);
            // Revert optimistic?
            chat.removeMessage(chat.activeChannelId, tempId);
            alert('Failed to send message. Please match the user!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (msg: ChatMessage) => {
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

    const handleOpenForward = (msg?: ChatMessage) => {
        if (msg) {
            setForwardingMessages([msg]);
        } else {
            const selected = activeMessages.filter(m => selectedMessageIds.includes(m.id));
            setForwardingMessages(selected);
        }
        setIsForwardModalOpen(true);
    };

    const handleForward = async (targets: { type: 'channel' | 'user', id: number, name: string }[]) => {
        if (targets.length === 0 || forwardingMessages.length === 0) return;
        setIsForwardModalOpen(false);

        // Get current channel name for attribution
        const fromChannel = chat.channels.find(c => String(c.id) === String(chat.activeChannelId));
        const fromChannelName = fromChannel?.name || 'Unknown';

        console.log('[DEBUG] Forwarding messages from:', fromChannelName, forwardingMessages);

        // Prepare messages to forward - Maintain order!
        const messagesToForward = [...forwardingMessages];

        try {
            for (const target of targets) {
                // Determine target endpoint
                let endpoint = '';
                if (target.type === 'channel') {
                    endpoint = `/channels/${target.id}/messages`;
                } else {
                    // Logic for DM: Create/Retrieve DM channel first
                    try {
                        const dmRes = await api.post('/channels/dm', { targetUserId: target.id });
                        const channelId = dmRes.data.id;
                        endpoint = `/channels/${channelId}/messages`;
                    } catch (dmErr) {
                        console.error('Failed to create DM channel for forward', dmErr);
                        continue;
                    }
                }

                if (!endpoint) continue;

                for (const msg of messagesToForward) {
                    const res = await api.post(endpoint, {
                        content: msg.content, // Forward content
                        mediaUrl: msg.mediaUrl,
                        thumbnailUrl: msg.thumbnailUrl,
                        mediaType: msg.mediaType,
                        metadata: {
                            isForwarded: true,
                            fromChannelName: fromChannelName
                        }
                    });
                    console.log('[DEBUG] Forward API Response:', res.status, res.data);
                }
            }

            // Reset selection after successful forward
            setIsSelectionMode(false);
            setSelectedMessageIds([]);
            setForwardingMessages([]);
            alert('Messages forwarded!');
        } catch (error) {
            console.error('Forwarding failed', error);
            alert('Forwarding failed.');
        }
    };

    // Scroll Helper
    // Scroll Helper - Aggressive Manual Driver
    // Scroll Helper - DOM Logic
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (!messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    };

    // Force Scroll on Message Update and Channel Switch
    useEffect(() => {
        if (activeMessages.length > 0) {
            if (isInitialScrollRef.current) {
                // Jump instantly on first load
                scrollToBottom('auto');
                isInitialScrollRef.current = false;
            } else {
                // Smooth scroll for new messages if already at bottom (roughly)
                scrollToBottom('smooth');
            }
        }
    }, [activeMessages.length, chat.activeChannelId]);

    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);


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
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: ChatMessage, align?: 'up' | 'down' } | null>(null);

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // ... inside component ...

    return (
        <div className="flex h-full w-full bg-[#0b141a] border-r border-white/10 font-sans relative">
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

                    {/* Download Attachment */}
                    {contextMenu.msg.mediaUrl && (
                        <button onClick={() => {
                            const link = document.createElement('a');
                            link.href = contextMenu.msg.mediaUrl || '';
                            link.target = '_blank';
                            link.download = contextMenu.msg.mediaUrl?.split('/').pop() || 'download';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setContextMenu(null);
                        }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                            <Download size={16} /> Download
                        </button>
                    )}

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
            {!isChatOnly && (
                <ChatSidebar
                    notificationStats={notificationStats}
                    onCreateGroup={onCreateGroup}
                    onDiscoveryClick={onDiscoveryClick}
                    unreadCounts={unreadCounts}
                    mentionCounts={mentionCounts}
                    isMobileLayout={isMobileLayout}
                />
            )}

            {/* Main Chat Area */}
            {chat.activeChannelId === -1 ? (
                <div className={`flex-1 flex flex-col min-w-0 bg-[#0b141a] relative ${isChatOnly ? 'flex w-full' : 'md:flex w-full'}`}>
                    <div className="h-16 bg-[#202c33] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => chat.setActiveChannel(null)}
                                className={`${(isMobileLayout || isChatOnly) ? '' : 'md:hidden'} text-[#d1d7db] -ml-2 p-1 rounded-full hover:bg-white/5 active:bg-white/10`}
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
            ) : (chat.activeChannelId !== null && chat.channels.some(c => String(c.id) === String(chat.activeChannelId))) ? (
                <div className={`flex-1 flex flex-col min-w-0 bg-[#0b141a] relative ${isChatOnly ? 'flex w-full' : (chat.activeChannelId ? 'flex w-full' : (isMobileLayout ? 'hidden' : 'hidden md:flex'))}`}>
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
                                        onClick={() => handleOpenForward()}
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
                                        className={`${isMobileLayout ? '' : 'md:hidden'} text-[#d1d7db] -ml-2 p-1 rounded-full hover:bg-white/5 active:bg-white/10 shrink-0`}
                                    >
                                        <ArrowLeft size={24} />
                                    </button>

                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                                        {chat.channels.find(c => String(c.id) === String(chat.activeChannelId))?.type === 'private' ? (
                                            <UsersIcon size={20} />
                                        ) : (
                                            '#'
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#e9edef] text-base leading-tight">
                                            {(() => {
                                                const channel = chat.channels.find(c => String(c.id) === String(chat.activeChannelId));
                                                if (channel?.type === 'private') {
                                                    const otherUser = channel.users?.find(u => String(u.id) !== String(auth.user?.id));
                                                    if (otherUser?.fullName) return otherUser.fullName;

                                                    // Fallback to name parsing if users not populated
                                                    if (channel.name.startsWith('dm-')) {
                                                        const parts = channel.name.split('-');
                                                        const u1 = parseInt(parts[1]);
                                                        const u2 = parseInt(parts[2]);
                                                        const otherId = u1 === auth.user?.id ? u2 : u1;
                                                        return `User #${otherId}`;
                                                    }
                                                }
                                                return channel?.name;
                                            })()}
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
                                <div className="flex items-center gap-2 ml-auto shrink-0">
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
                    <MessageList
                        messages={displayedMessages}
                        currentUser={auth.user}
                        users={users}
                        tasks={tasks}
                        taskStatusMap={taskStatusMap}
                        isSelectionMode={isSelectionMode}
                        selectedMessageIds={selectedMessageIds}
                        onToggleSelect={handleToggleSelect}
                        onReply={(msg) => {
                            setReplyingTo(msg);
                            fileInputRef.current?.closest('div')?.querySelector('textarea')?.focus();
                        }}
                        onDelete={handleDelete}
                        onForward={handleOpenForward}
                        onLightbox={setLightboxUrl}
                        messagesEndRef={messagesEndRef}
                        onMemberClick={onMemberClick}
                        channelType={chat.channels.find(c => String(c.id) === String(chat.activeChannelId))?.type}
                    />

                    {/* Input Area */}
                    <MessageInput
                        users={users}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        onSend={handleSend}
                        onUpload={handleUpload}
                        onTyping={() => {
                            if (!isTyping) {
                                setIsTyping(true);
                                socketInstance?.emit('typing', { channelId: chat.activeChannelId, userId: auth.user?.id });
                                setTimeout(() => setIsTyping(false), 3000);
                            }
                        }}
                        pendingMessage={pendingMessage || undefined}
                    />
                </div >
            ) : (
                <div className={`flex-1 flex-col items-center justify-center bg-[#222e35] text-[#e9edef] border-b-[6px] border-[#00a884] ${isChatOnly ? 'flex w-full' : (isMobileLayout ? 'hidden' : 'hidden md:flex')}`}>
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
