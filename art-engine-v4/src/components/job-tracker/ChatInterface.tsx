import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Loader, Plus, Trash2, Edit2, X, Check, GripVertical, ListTodo, ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { io } from 'socket.io-client';
import MyRequestsModal from './MyRequestsModal';


interface ChatInterfaceProps {
    notificationStats?: Record<string, { p1Count: number }>;
    pendingMessage?: string | null;
    onMessageConsumed?: () => void;
    onUnreadChange?: (total: number, counts: Record<number, number>) => void;
}

export default function ChatInterface({ notificationStats = {}, pendingMessage, onMessageConsumed, onUnreadChange }: ChatInterfaceProps) {
    const { auth, chat } = useStore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
    const [attachments, setAttachments] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
    const [isAttaching, setIsAttaching] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false); // Full screen preview state
    const [replyingTo, setReplyingTo] = useState<any | null>(null); // Reply state
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // ... (existing effects)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        const newAttachments: { url: string, type: 'image' | 'video' }[] = [];

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

    // Fetch Channels on Mount
    useEffect(() => {
        if (auth.token) {
            loadChannels();
        }
    }, [auth.token]);

    const loadChannels = () => {
        api.get('/channels').then(res => {
            let channels = res.data;
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

            chat.setChannels(channels);
            if (channels.length > 0 && !chat.activeChannelId) {
                chat.setActiveChannel(channels[0].id);
            }
        }).catch(err => console.error("Failed to load channels", err));
    };

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
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            console.log('Connected to WebSocket System');
        });

        socket.on('message', (msg: any) => {
            const currentActiveId = useStore.getState().chat.activeChannelId;
            console.log('WS Message Received:', msg);

            if (msg.channel) {
                // Safe Comparison (String/Number)
                const isCurrentChannel = currentActiveId && String(msg.channel.id) === String(currentActiveId);

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

        return () => {
            socket.disconnect();
        };
    }, []);

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

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat.messages, chat.activeChannelId]);

    // Notify parent of total unread
    useEffect(() => {
        const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
        onUnreadChange?.(total, unreadCounts);
    }, [unreadCounts, onUnreadChange]);

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

    const activeMessages = chat.activeChannelId ? (chat.messages[chat.activeChannelId] || []) : [];

    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const getSenderColor = (name: string) => {
        const colors = ['text-[#ff8a8a]', 'text-[#8aff8a]', 'text-[#8a8aff]', 'text-[#ffff8a]', 'text-[#ff8aff]', 'text-[#8affff]', 'text-orange-400', 'text-pink-400'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // ... (rest of component returns)

    const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(false);

    // ... inside component ...

    return (
        <div className="flex h-full bg-[#0b141a] border-r border-white/10 font-sans relative">
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
                    <div className="flex gap-3 text-[#aebac1]">
                        <button
                            onClick={() => setIsMyRequestsOpen(true)}
                            className="hover:text-white transition-colors"
                            title="My Requests"
                        >
                            <ListTodo size={20} />
                        </button>
                        <button onClick={() => setIsCreating(true)} className="hover:text-white transition-colors">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

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
                        {chat.channels.map((channel) => (
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
            {chat.activeChannelId ? (
                <div className={`flex-1 flex flex-col min-w-0 bg-[#0b141a] relative ${chat.activeChannelId ? 'flex w-full' : 'hidden md:flex'}`}>
                    {/* Chat Background Pattern (Simulated with CSS) */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    </div>

                    {/* Header */}
                    <div className="h-16 bg-[#202c33] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50">
                        <div className="flex items-center gap-3">
                            {/* Mobile Back Button */}
                            <button
                                onClick={() => chat.setActiveChannel(null)}
                                className="md:hidden text-[#d1d7db] -ml-2 p-1 rounded-full hover:bg-white/5 active:bg-white/10"
                            >
                                <ArrowLeft size={24} />
                            </button>

                            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                                <Hash size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[#e9edef]">
                                    {chat.channels.find(c => c.id === chat.activeChannelId)?.name}
                                </span>
                                <span className="text-xs text-[#8696a0]">click here for channel info</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 z-10 custom-scrollbar">
                        {activeMessages.map((msg, index) => {
                            const isMe = auth.user && msg.sender && (
                                String(msg.sender.id) === String(auth.user.id) ||
                                (msg.sender.email && msg.sender.email.toLowerCase() === auth.user.email?.toLowerCase())
                            );

                            // Format Time
                            const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                            // Highlight Mentions
                            // Highlight Mentions & Render
                            const renderContent = (text: string) => {
                                if (users.length === 0) return <span className="text-[#e9edef]">{text}</span>;

                                // valid names sorted by length desc to match longest first
                                const validNames = users
                                    .flatMap(u => [u.fullName, u.username])
                                    .filter(Boolean)
                                    .sort((a, b) => b.length - a.length);

                                if (validNames.length === 0) return <span className="text-[#e9edef]">{text}</span>;

                                // Escape for regex
                                const escaped = validNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                                const regex = new RegExp(`(@(?:${escaped}))`, 'gi');

                                const parts = text.split(regex);
                                return parts.map((part, i) => {
                                    if (part.startsWith('@')) {
                                        const name = part.substring(1);
                                        const isValid = validNames.some(n => n.toLowerCase() === name.toLowerCase());
                                        if (isValid) {
                                            return <span key={i} className="text-[#53bdeb] font-bold cursor-pointer hover:underline">{part}</span>;
                                        }
                                    }
                                    return <span key={i} className="text-[#e9edef]">{part}</span>;
                                });
                            };

                            const isMentioned = auth.user?.fullName && msg.content.includes(`@${auth.user.fullName}`);

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        id={`message-${msg.id}`}
                                        onDoubleClick={(e) => {
                                            e.preventDefault();
                                            setReplyingTo(msg);
                                            document.querySelector('textarea')?.focus();
                                        }}
                                        className={`max-w-[70%] rounded-lg px-2 py-1 relative shadow-sm text-sm cursor-pointer select-none active:scale-[0.99] transition-transform ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' :
                                            isMentioned ? 'bg-[#202c33] border-l-4 border-yellow-500 rounded-tl-none' : // WhatsApp style mention highlight
                                                'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                            }`}
                                    >
                                        {/* QUOTED MESSAGE */}
                                        {msg.replyTo && ( // Requires backend to populate replyTo
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    document.getElementById(`message-${msg.replyTo?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                className={`rounded-lg p-1.5 mb-1 text-xs border-l-4 cursor-pointer hover:bg-black/10 transition-colors ${isMe ? 'bg-[#025144] border-[#06cf9c]' : 'bg-[#1d272d] border-[#aebac1]'}`}
                                            >
                                                <div className={`font-bold mb-0.5 ${getSenderColor(msg.replyTo.sender?.fullName || 'System')}`}>
                                                    {msg.replyTo.sender?.fullName || 'Unknown'}
                                                </div>
                                                <div className="text-[#d1d7db]/80 truncate">
                                                    {msg.replyTo.mediaUrl ? '📷 Media' : msg.replyTo.content}
                                                </div>
                                            </div>
                                        )}
                                        {isMentioned && !isMe && (
                                            <div className="text-[9px] font-bold text-yellow-500 mb-0.5 flex items-center gap-1">
                                                <span>@</span> You were mentioned
                                            </div>
                                        )}
                                        {/* Sender Name (Group Chat) */}
                                        {!isMe ? (
                                            <div className={`text-xs font-bold mb-0.5 cursor-pointer hover:underline ${getSenderColor(msg.sender?.fullName || msg.sender?.email || 'System')}`}>
                                                {msg.sender?.fullName || msg.sender?.email || 'System'}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold mb-0.5 text-emerald-400 opacity-70">
                                                You
                                            </div>
                                        )}

                                        {/* Image/Video Attachment */}
                                        {msg.mediaUrl && (
                                            <div className="mb-1 rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxUrl(msg.mediaUrl || null)}>
                                                {msg.mediaType === 'video' ? (
                                                    <video src={msg.mediaUrl} controls className="w-full h-auto object-cover max-h-64" />
                                                ) : (
                                                    <img src={msg.mediaUrl} alt="Attachment" className="w-full h-auto object-cover max-h-64" />
                                                )}
                                            </div>
                                        )}

                                        {/* Message Content with Mentions */}
                                        <div className="whitespace-pre-wrap leading-relaxed pb-1 relative pr-16" style={{ wordBreak: 'break-word' }}>
                                            {renderContent(msg.content)}

                                            {/* Timestamp */}
                                            <span className="text-[10px] text-[#8696a0] absolute bottom-0 right-0 leading-none select-none">
                                                {time}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-[#202c33] px-4 py-3 flex items-end gap-2 shrink-0 z-10 border-t border-[#202c33]">
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

                            {/* REPLYING TO INDICATOR (Above Input) */}
                            {replyingTo && (
                                <div className="flex items-center justify-between p-2 bg-[#1d272d] border-l-4 border-[#00a884] rounded-r mb-1">
                                    <div className="flex flex-col text-xs overflow-hidden">
                                        <span className="text-[#00a884] font-bold">{replyingTo.sender?.fullName || 'System'}</span>
                                        <span className="text-[#d1d7db]/70 truncate">{replyingTo.mediaUrl ? '📷 Photo' : replyingTo.content}</span>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="text-[#aebac1] hover:text-white p-1">
                                        <X size={16} />
                                    </button>
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
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-[#e9edef] font-bold">{user.fullName}</span>
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
                </div>
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
        </div>
    );
}
