import React, { useState, useEffect } from 'react';
import { Search, Globe, LogIn, X, Users, Lock, CheckCircle, MessageSquare } from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

interface GroupDiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: (channelId?: number) => void; // Callback to refresh main list
    initialTab?: 'groups' | 'people';
}

interface PublicGroup {
    id: number;
    name: string;
    description: string;
    isMember: boolean; // Added
    memberCount: number; // Added
    isPrivate?: boolean;
}

interface UserResult {
    id: number;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string;
    department?: { name: string };
    isOnline?: boolean;
}

export const GroupDiscoveryModal: React.FC<GroupDiscoveryModalProps> = ({ isOpen, onClose, onJoined, initialTab = 'groups' }) => {
    const refreshChannels = useStore(state => state.chat.refreshChannels);
    const [activeTab, setActiveTab] = useState<'groups' | 'people'>(initialTab);
    const [groups, setGroups] = useState<PublicGroup[]>([]);
    const [users, setUsers] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setSearch('');
            if (initialTab === 'groups') fetchGroups();
            else fetchUsers();
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'groups') fetchGroups();
            else fetchUsers();
        }
    }, [activeTab]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/groups/public');
            setGroups(res.data);
        } catch (error) {
            console.error('Failed to load public groups', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (id: number) => {
        try {
            const res = await api.post(`/groups/${id}/join`);
            const joinedGroup = res.data;
            setGroups(prev => prev.map(g => g.id === id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
            onJoined(joinedGroup.channelId);
        } catch (error) {
            console.error('Failed to join group', error);
            alert('Failed to join group.');
        }
    };

    const handleLeave = async (id: number) => {
        try {
            await api.post(`/groups/${id}/leave`);
            refreshChannels(); // Force sidebar sync
            setGroups(prev => prev.map(g => g.id === id ? { ...g, isMember: false, memberCount: g.memberCount - 1 } : g));
            onJoined();
        } catch (error) {
            console.error('Failed to leave group', error);
            alert('Failed to leave group.');
        }
    };

    const handleMessageUser = async (userId: number) => {
        try {
            const res = await api.post('/channels/dm', { targetUserId: userId });
            refreshChannels();
            onJoined(res.data.id);
            onClose();
        } catch (error) {
            console.error('Failed to start chat', error);
            alert('Failed to start chat.');
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.name.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] w-[800px] max-h-[80vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Directory</h2>
                            <p className="text-sm text-gray-400">Discover groups and people</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 flex gap-4 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'groups' ? 'border-emerald-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Public Groups
                    </button>
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`pb-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'people' ? 'border-emerald-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        People
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 bg-black/20">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#111] text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto min-h-[400px] max-h-[600px] custom-scrollbar">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-gray-500">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {activeTab === 'groups' ? (
                                filteredGroups.length === 0 ? (
                                    <div className="col-span-2 flex flex-col items-center justify-center h-full text-zinc-500 py-12">
                                        <Globe size={48} className="mb-4 opacity-20" />
                                        <p>No new public groups found.</p>
                                    </div>
                                ) : (
                                    filteredGroups.map(group => (
                                        <div key={group.id} className={`group bg-white/5 hover:bg-white/10 border ${group.isMember ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/30'} rounded-xl p-5 transition-all mb-4 relative`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                        {group.name}
                                                        {group.isPrivate && (
                                                            <Lock size={14} className="text-zinc-500" />
                                                        )}
                                                        {group.isMember && (
                                                            <div className="flex items-center gap-1 text-[11px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold shadow-lg shadow-emerald-500/20">
                                                                <CheckCircle size={12} fill="black" className="text-emerald-500" />
                                                                JOINED
                                                            </div>
                                                        )}
                                                    </h3>
                                                </div>
                                                <span className="text-xs bg-black/40 px-2 py-1 rounded-full text-gray-400 flex items-center gap-1">
                                                    <Users size={12} />
                                                    {group.memberCount}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-6 line-clamp-2 h-10">
                                                {group.description || 'No description provided.'}
                                            </p>
                                            {group.isMember ? (
                                                <button
                                                    onClick={() => handleLeave(group.id)}
                                                    className="w-full bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-red-500/50"
                                                >
                                                    <LogIn size={16} className="rotate-180" />
                                                    Leave Group
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleJoin(group.id)}
                                                    className="w-full bg-white/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-emerald-500/50"
                                                >
                                                    <LogIn size={16} />
                                                    Join Group
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )
                            ) : (
                                filteredUsers.length === 0 ? (
                                    <div className="col-span-2 flex flex-col items-center justify-center h-full text-zinc-500 py-12">
                                        <Users size={48} className="mb-4 opacity-20" />
                                        <p>No users found matching "{search}".</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(user => (
                                        <div key={user.id} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 rounded-xl p-4 transition-all mb-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-gray-400">{user.fullName[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                                                    {user.fullName}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span className={`px-1.5 py-0.5 rounded uppercase ${user.role === 'admin' ? 'bg-red-900/30 text-red-400' : 'bg-white/5'}`}>{user.role}</span>
                                                    {user.department && <span className="truncate">• {user.department.name}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleMessageUser(user.id)}
                                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-lg transition-colors"
                                                title="Send Message"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
