import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Loader, Plus, Trash2, Edit2, X, Check, GripVertical, ListTodo } from 'lucide-react';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import MyRequestsModal from './MyRequestsModal';


interface ChatInterfaceProps {
    notificationStats?: Record<string, { p1Count: number }>;
    pendingMessage?: string | null;
    onMessageConsumed?: () => void;
}

export default function ChatInterface({ notificationStats = {}, pendingMessage, onMessageConsumed }: ChatInterfaceProps) {
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
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [isAttaching, setIsAttaching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... (existing effects)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsLoading(true);
            // DIRECT UPLOAD TO BACKEND
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Backend returns: { url: '...', filename: '...', originalname: '...' }
            setAttachmentUrl(res.data.url);
            setIsAttaching(true); // Keep menu open to show preview
        } catch (error) {
            console.error('File upload failed', error);
            alert('Failed to upload file');
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

    // Fetch Messages when active channel changes
    useEffect(() => {
        if (chat.activeChannelId && auth.token) {
            const fetchMessages = () => {
                // Add timestamp to prevent caching
                api.get(`/channels/${chat.activeChannelId}/messages?t=${Date.now()}`).then(res => {
                    chat.setMessages(chat.activeChannelId!, res.data);
                }).catch(err => console.error("Failed to load messages", err));
            };

            fetchMessages(); // Initial fetch
            const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds (faster)

            return () => clearInterval(interval);
        }
    }, [chat.activeChannelId, auth.token]);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat.messages, chat.activeChannelId]);

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
        if (!input.trim() || !chat.activeChannelId) return;

        let content = input;

        // Append Priority Tag if selected
        if (selectedPriority) {
            content += ` [${selectedPriority}]`;
        }

        setInput('');
        setSelectedPriority(null); // Reset
        setIsLoading(true);

        try {
            const payload = { content, ...(attachmentUrl ? { mediaUrl: attachmentUrl, mediaType: 'image' } : {}) };
            const res = await api.post(`/channels/${chat.activeChannelId}/messages`, payload);

            // Clear Attachment
            setAttachmentUrl('');
            setIsAttaching(false);

            chat.addMessage(chat.activeChannelId, res.data);

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
            <AnimatePresence>
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
            <div className="w-80 bg-[#111b21] flex flex-col border-r border-white/5">
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
                                            {/* Timestamp Placeholder */}
                                            {/* <span className="text-[#8696a0] text-xs">Yesterday</span> */}
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
                <div className="flex-1 flex flex-col min-w-0 bg-[#0b141a] relative">
                    {/* Chat Background Pattern (Simulated with CSS) */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    </div>

                    {/* Header */}
                    <div className="h-16 bg-[#202c33] flex items-center px-4 justify-between shrink-0 z-10 border-b border-[#202c33]/50">
                        <div className="flex items-center gap-4">
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
                            const renderContent = (text: string) => {
                                // Match @Name Surname (up to 2-3 words) or @Name
                                // Pattern: @ followed by words, stopping before [ or special chars
                                const parts = text.split(/(@[\w\u00C0-\u017F]+(?: [\w\u00C0-\u017F]+)*)/g);
                                return parts.map((part, i) => {
                                    if (part.startsWith('@')) {
                                        return <span key={i} className="text-[#53bdeb] cursor-pointer hover:underline">{part}</span>;
                                    }
                                    return part;
                                });
                            };

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] rounded-lg px-2 py-1 relative shadow-sm text-sm ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}`}>
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

                                        {/* Image Attachment */}
                                        {msg.mediaUrl && (
                                            <div className="mb-1 rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxUrl(msg.mediaUrl || null)}>
                                                <img src={msg.mediaUrl} alt="Attachment" className="w-full h-auto object-cover max-h-64" />
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
                                <Plus size={24} className={`transition-transform duration-200 ${isAttaching ? 'rotate-45' : ''}`} />
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
                                            UPLOAD FILE
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#2a3942]"></div>
                                        <span className="relative bg-[#233138] px-2 text-[10px] text-[#8696a0] font-bold uppercase block text-center w-fit mx-auto">OR URL</span>
                                    </div>

                                    <input
                                        autoFocus
                                        className="bg-[#2a3942] text-white text-sm p-2 rounded outline-none border border-transparent focus:border-[#00a884] placeholder-[#8696a0]"
                                        placeholder="Paste image URL..."
                                        value={attachmentUrl}
                                        onChange={e => setAttachmentUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    />

                                    {attachmentUrl && (
                                        <div className="h-32 w-full bg-black/20 rounded-lg flex items-center justify-center overflow-hidden relative border border-white/5">
                                            <img src={attachmentUrl} className="h-full w-full object-contain" alt="Preview" />
                                            <button onClick={() => setAttachmentUrl('')} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 p-1.5 rounded-full text-white transition-colors backdrop-blur-sm">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 bg-[#2a3942] rounded-lg flex flex-col justify-center min-h-[42px] px-3 py-1 border border-transparent focus-within:border-[#00a884]/50 transition-colors relative">
                            {/* Priority Selection - Visible when typing */}
                            {input.trim().length > 0 && (
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

                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
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
                <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] text-[#e9edef] border-b-[6px] border-[#00a884]">
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
        </div >
    );
}
