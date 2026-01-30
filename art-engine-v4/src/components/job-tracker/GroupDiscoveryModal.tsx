import React, { useState, useEffect } from 'react';
import { Search, Globe, LogIn, X, Users, Lock, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

interface GroupDiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: (channelId?: number) => void; // Callback to refresh main list
}

interface PublicGroup {
    id: number;
    name: string;
    description: string;
    isMember: boolean; // Added
    memberCount: number; // Added
    isPrivate?: boolean;
}

export const GroupDiscoveryModal: React.FC<GroupDiscoveryModalProps> = ({ isOpen, onClose, onJoined }) => {
    const refreshChannels = useStore(state => state.chat.refreshChannels);
    const [groups, setGroups] = useState<PublicGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchGroups();
        }
    }, [isOpen]);

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

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] w-[800px] max-h-[80vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Group Discovery</h2>
                            <p className="text-sm text-gray-400">Browse and join public communities</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 bg-black/20">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search for groups..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#111] text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-gray-500">Loading discovery...</div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <Globe size={48} className="mb-4 opacity-20" />
                            <p>No new public groups found.</p>
                            <p className="text-sm">You might have joined them all!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredGroups.map(group => (
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
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
