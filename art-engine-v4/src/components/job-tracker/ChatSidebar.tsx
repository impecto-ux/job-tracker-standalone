import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Globe, Users, Plus, X, ListTodo, GripVertical, Edit2, Trash2, Check, MoreHorizontal, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useStore } from '@/lib/store';
import api from '@/lib/api';

interface ChatSidebarProps {
    notificationStats?: Record<string, { p1Count: number }>;
    onCreateGroup?: (view?: 'root' | 'groups_root' | 'departments_root') => void;
    onDiscoveryClick?: (tab?: 'groups' | 'people') => void;
    unreadCounts?: Record<number, number>;
    mentionCounts?: Record<number, number>;
    isMobileLayout?: boolean;
    headerActions?: React.ReactNode;
}


const ChatSidebar: React.FC<ChatSidebarProps> = ({
    notificationStats = {},
    onCreateGroup,
    onDiscoveryClick,
    unreadCounts = {},
    mentionCounts = {},
    isMobileLayout = false,
    headerActions
}) => {
    const authUser = useStore(state => state.auth.user);
    const authToken = useStore(state => state.auth.token);
    const channels = useStore(state => state.chat.channels);
    const activeChannelId = useStore(state => state.chat.activeChannelId);
    const lastRefreshAt = useStore(state => state.chat.lastRefreshAt);

    // Actions
    const setChannels = useStore(state => state.chat.setChannels);
    const setActiveChannel = useStore(state => state.chat.setActiveChannel);
    const addChannel = useStore(state => state.chat.addChannel);

    // Local State
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [showAllGroups, setShowAllGroups] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(true);
    const [isGroupsOpen, setIsGroupsOpen] = useState(true);
    const router = useRouter();

    const isAdmin = authUser?.role === 'admin';

    const loadChannels = useCallback((all: boolean = false) => {
        api.get(`/channels${all ? '?all=true' : ''}`).then(res => {
            const fetchedChannels = res.data;

            // Apply saved order
            try {
                const savedOrder = JSON.parse(localStorage.getItem('channel_order') || '[]');
                if (Array.isArray(savedOrder) && savedOrder.length > 0) {
                    const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
                    fetchedChannels.sort((a: any, b: any) => {
                        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
                        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
                        return indexA - indexB;
                    });
                }
            } catch (e) {
                console.error("Failed to parse channel order", e);
            }

            setChannels(fetchedChannels);

            // Validate Active Channel Persistence
            const currentActiveId = useStore.getState().chat.activeChannelId;
            const isActiveValid = fetchedChannels.some((c: any) => c.id === currentActiveId);

            if (fetchedChannels.length > 0) {
                if (!currentActiveId || !isActiveValid) {
                    // Logic handled in parent or here? 
                    // Keeping it here for consistency with original ChatInterface.tsx
                    if (currentActiveId !== -1) { // Don't override My Tasks
                        setActiveChannel(fetchedChannels[0].id);
                    }
                }
            }
        }).catch(err => console.error("Failed to load channels", err));
    }, [setChannels, setActiveChannel]);

    // Initial load and filter change
    useEffect(() => {
        if (authToken) {
            loadChannels(showAllGroups);
        }
    }, [authToken, showAllGroups, loadChannels]);

    // Global Refresh Listener
    useEffect(() => {
        if (lastRefreshAt > 0) {
            loadChannels(showAllGroups);
        }
    }, [lastRefreshAt, loadChannels, showAllGroups]);

    const handleReorder = (newOrder: any[]) => {
        setChannels(newOrder); // Optimistic update
        const orderIds = newOrder.map(c => c.id);
        localStorage.setItem('channel_order', JSON.stringify(orderIds));
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) return;
        try {
            const res = await api.post('/channels', { name: newChannelName });
            setIsCreating(false);
            setNewChannelName('');
            addChannel(res.data); // Optimistic or just re-load
            loadChannels(showAllGroups);
        } catch (error: any) {
            console.error('Failed to create channel', error);
            alert(`Failed to create channel: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteChannel = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const channel = channels.find(c => c.id === id);
        if (channel && (channel.type === 'group' || channel.type === 'department')) {
            if (confirm(`"${channel.name}" is a synchronized Group.\nTo delete it, you must remove it from the User Directory.\n\nWould you like to open User Management now?`)) {
                if (onCreateGroup) onCreateGroup();
            }
            return;
        }

        const isDM = (channel?.type === 'private') || (channel?.name?.startsWith?.('dm-'));
        const confirmMsg = isDM
            ? 'Bu sohbeti silmek istediğinize emin misiniz?'
            : 'Bu kanalı silmek istediğinize emin misiniz?';

        if (!confirm(confirmMsg)) return;
        try {
            await api.delete(`/channels/${id}`);
            if (activeChannelId === id) {
                setActiveChannel(null);
            }
            loadChannels(showAllGroups);
        } catch (error) {
            console.error('Failed to delete chat/channel', error);
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
            loadChannels(showAllGroups);
        } catch (error) {
            console.error('Failed to update channel', error);
        }
    };

    return (
        <div className="flex flex-col border-r border-white/5 bg-[#111b21] w-full h-full">
            <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                        {authUser?.fullName?.[0]?.toUpperCase() || authUser?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-bold text-[#e9edef] text-sm">Groups</span>
                </div>
                <div className="flex gap-2 text-[#aebac1] relative items-center">
                    {/* Injected Actions (Collapse/Expand) */}
                    {headerActions && (
                        <>
                            {headerActions}
                            <div className="h-4 w-px bg-white/10 mx-1" />
                        </>
                    )}

                    <div className="flex gap-3 items-center">
                        <button onClick={(e) => { e.stopPropagation(); if (onDiscoveryClick) onDiscoveryClick('groups'); }} className="hover:text-emerald-400 transition-colors" title="Discover Groups">
                            <Globe size={20} />
                        </button>
                        <div className="relative">
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`hover:text-white transition-colors ${isUserMenuOpen ? 'text-white' : ''}`} title="User Menu">
                                <MoreHorizontal size={20} />
                            </button>
                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-48 bg-[#233138] rounded-lg shadow-xl border border-white/5 overflow-hidden z-[60]"
                                    >
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setIsUserMenuOpen(false); router.push('/settings'); }}
                                                className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                                                    <Edit2 size={12} className="text-zinc-400" />
                                                </div>
                                                Profile Settings
                                            </button>

                                            {(isAdmin || authUser?.role === 'manager') && (
                                                <>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => { setIsUserMenuOpen(false); router.push('/admin'); }}
                                                            className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                                <Shield size={12} className="text-indigo-400" />
                                                            </div>
                                                            Admin Dashboard
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setIsUserMenuOpen(false); onCreateGroup ? onCreateGroup('root') : router.push('/admin/users'); }}
                                                        className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                            <Users size={12} className="text-emerald-400" />
                                                        </div>
                                                        User & Group Management
                                                    </button>
                                                </>
                                            )}

                                            <div className="h-px bg-white/5 my-1" />
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    useStore.getState().auth.logout();
                                                    router.push('/login');
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-red-400 text-sm flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                                                    <Trash2 size={12} className="text-red-400" />
                                                </div>
                                                Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {isUserMenuOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsUserMenuOpen(false)} />}
                        {(isAdmin || authUser?.role === 'manager') && (
                            <button onClick={() => { onCreateGroup ? onCreateGroup('groups_root') : setIsCreating(true); }} className="hover:text-white transition-colors" title="New Group">
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search & Admin Filter */}
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
                        <button onClick={() => setSidebarSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-white">
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
                <Reorder.Group axis="y" values={channels} onReorder={handleReorder} className="flex flex-col">
                    <div
                        className={`group px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors relative mb-2 ${activeChannelId === -1 ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                        onClick={() => setActiveChannel(-1)}
                    >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/20 text-emerald-500 font-bold text-lg">
                            <ListTodo size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[#e9edef] font-normal text-base truncate flex items-center gap-2">My Tasks</span>
                        </div>
                    </div>

                    {/* DIRECT MESSAGES SECTION */}
                    {true && (
                        <>
                            <div
                                className="px-4 py-2 text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center justify-between group/dm-header cursor-pointer hover:text-[#cfd9df] transition-colors"
                                onClick={() => setIsDirectMessagesOpen(!isDirectMessagesOpen)}
                            >
                                <div className="flex items-center gap-1">
                                    {isDirectMessagesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <span>Direct Messages</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (onDiscoveryClick) onDiscoveryClick('people'); }}
                                    className="p-1 hover:bg-[#202c33] rounded text-[#8696a0] hover:text-white transition-colors opacity-100"
                                    title="New Chat"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {isDirectMessagesOpen && (
                                <>
                                    {channels
                                        .filter(c => (c.type === 'private' || c.name.startsWith('dm-')) && c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
                                        .map((channel) => {
                                            const otherUser = channel.users?.find((u: any) => u.id !== authUser?.id);
                                            let dmName = otherUser?.fullName;

                                            if (!dmName && channel.name.startsWith('dm-')) {
                                                const parts = channel.name.split('-');
                                                if (parts.length === 3) {
                                                    const u1 = parseInt(parts[1]);
                                                    const u2 = parseInt(parts[2]);
                                                    if (!isNaN(u1) && !isNaN(u2)) {
                                                        const targetId = u1 === authUser?.id ? u2 : u1;
                                                        dmName = `User #${targetId}`;
                                                    }
                                                }
                                            }

                                            dmName = dmName || 'Unknown User';
                                            const initial = dmName[0]?.toUpperCase() || '?';

                                            return (
                                                <div
                                                    key={channel.id}
                                                    className={`group px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors relative ${activeChannelId === channel.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                                                    onClick={() => setActiveChannel(channel.id)}
                                                >
                                                    <div className="w-[14px] -ml-1" />
                                                    <div className="relative shrink-0">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-sm font-bold">
                                                            {initial}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#e9edef] font-normal text-base truncate flex items-center gap-2">
                                                                {dmName}
                                                                {(notificationStats[channel.name.toLowerCase()]?.p1Count || 0) > 0 && (
                                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse">
                                                                        {notificationStats[channel.name.toLowerCase()].p1Count}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {/* Badges */}
                                                            <div className="flex gap-1 items-center">
                                                                {(mentionCounts[channel.id] || 0) > 0 && (
                                                                    <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full animate-pulse">@</span>
                                                                )}
                                                                {(unreadCounts[channel.id] || 0) > 0 && (
                                                                    <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-bounce">
                                                                        {unreadCounts[channel.id]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="hidden group-hover:flex justify-end gap-3 text-[#aebac1]">
                                                            <Trash2 size={16} className="hover:text-red-400" onClick={(e) => handleDeleteChannel(e, channel.id)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {channels.filter(c => (c.type === 'private' || c.name.startsWith('dm-'))).length === 0 && (
                                        <div className="px-4 py-2 text-xs text-zinc-500 italic">
                                            No direct messages yet.
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="h-4" />
                        </>
                    )}

                    {/* GROUPS SECTION */}
                    <div
                        className="px-4 py-2 text-xs font-bold text-[#8696a0] uppercase tracking-wider flex justify-between items-center cursor-pointer hover:text-[#cfd9df] transition-colors"
                        onClick={() => setIsGroupsOpen(!isGroupsOpen)}
                    >
                        <div className="flex items-center gap-1">
                            {isGroupsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>Groups</span>
                        </div>
                    </div>

                    {isGroupsOpen && channels
                        .filter(c => (c.type !== 'private' && !c.name.startsWith('dm-')) && c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
                        .map((channel) => (
                            <Reorder.Item
                                key={channel.id}
                                value={channel}
                                whileDrag={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.3)" }}
                                className={`group px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors relative ${activeChannelId === channel.id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
                                onClick={() => setActiveChannel(channel.id)}
                            >
                                <div className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-zinc-400 -ml-1">
                                    <GripVertical size={14} />
                                </div>
                                <div className="relative shrink-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#e9edef] font-bold text-lg ${['bg-teal-600', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-600'][channel.id % 5]
                                        }`}>
                                        {channel.name.substring(0, 1).toUpperCase()}
                                    </div>
                                </div>

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
                                                {(notificationStats[channel.name.toLowerCase()]?.p1Count || 0) > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse">
                                                        {notificationStats[channel.name.toLowerCase()].p1Count}
                                                    </span>
                                                )}
                                            </span>
                                            {/* Badges */}
                                            <div className="flex gap-1 items-center">
                                                {/* JOINED Badge (Discovery Mode) */}
                                                {showAllGroups && channel.users?.some((u: any) => u.id === authUser?.id) && (
                                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Check size={10} strokeWidth={4} /> JOINED
                                                    </span>
                                                )}

                                                {(mentionCounts[channel.id] || 0) > 0 && (
                                                    <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold w-[18px] h-[18px] flex items-center justify-center rounded-full animate-pulse">@</span>
                                                )}
                                                {(unreadCounts[channel.id] || 0) > 0 && (
                                                    <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-bounce">
                                                        {unreadCounts[channel.id]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[#8696a0] text-sm truncate flex items-center justify-between group-hover:hidden">
                                            <span>Tap to chat</span>
                                        </div>
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
    );
};

export default React.memo(ChatSidebar);
