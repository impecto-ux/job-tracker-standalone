import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Users, UserPlus, UserMinus, Edit2, Check, Layout, Activity, MessageSquare, Plus, Building, Search, AlertTriangle, Globe, ArrowLeft, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

const ScrollbarHideStyle = () => (
    <style>{`
        /* The Total Nuke Approach for Windows Scrollbars */
        ::-webkit-scrollbar { 
            display: none !important; 
            width: 0 !important; 
            height: 0 !important; 
        }
        ::-webkit-scrollbar-button,
        ::-webkit-scrollbar-thumb,
        ::-webkit-scrollbar-track,
        ::-webkit-scrollbar-track-piece,
        ::-webkit-scrollbar-corner,
        ::-webkit-resizer {
            display: none !important;
            background: transparent !important;
        }

        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { 
            -ms-overflow-style: none !important; 
            scrollbar-width: none !important; 
            overflow: -moz-scrollbars-none !important;
        }
        
        /* Reach into every nook and cranny */
        [data-modal-id="group-settings"] * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
        }
        [data-modal-id="group-settings"] *::-webkit-scrollbar { 
            display: none !important;
        }
    `}</style>
);

interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: number;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    currentUserId?: number;
    stats?: { count: number; active: number; day: number };
}

interface GroupMember {
    id: number;
    fullName: string;
    email: string;
    username: string;
    avatarUrl?: string;
    role: string;
    department?: {
        id: number;
        name: string;
    };
}

interface GroupData {
    id: number;
    name: string;
    description: string;
    status: string;
    isPrivate: boolean;
    adminIds: number[];
    users: GroupMember[];
    targetDepartment?: {
        id: number;
        name: string;
    };
}

const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
};

export default function GroupSettingsModal({ isOpen, onClose, channelId, stats }: GroupSettingsModalProps) {
    const { auth } = useStore();
    const [groupDetails, setGroupDetails] = useState<GroupData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', description: '', status: '', isPrivate: false });
    const [allUsers, setAllUsers] = useState<GroupMember[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState<number | 'all'>('all');
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [activeSection, setActiveSection] = useState<'members' | 'board' | 'settings'>('members');
    const [sortMode, setSortMode] = useState<'alphabetical' | 'department'>('alphabetical');

    const fetchGroupData = async () => {
        if (!channelId) return;
        setIsLoading(true);
        try {
            console.log('[GroupSettingsModal] Fetching groups for channelId:', channelId);
            const groupsRes = await api.get('/groups');
            // Check both camelCase and snake_case, and ensure number comparison
            const foundGroup = groupsRes.data.find((g: any) =>
                (g.channelId == channelId) || (g.channel_id == channelId)
            );

            if (foundGroup) {
                console.log('[GroupSettingsModal] Found group:', foundGroup.id);
                const detailRes = await api.get(`/groups/${foundGroup.id}`);
                setGroupDetails(detailRes.data);
                setEditData({
                    name: detailRes.data.name,
                    description: detailRes.data.description || '',
                    status: detailRes.data.status || 'active',
                    isPrivate: detailRes.data.isPrivate ?? false
                });
            } else {
                console.warn('[GroupSettingsModal] No group found for channelId:', channelId, 'in', groupsRes.data.length, 'groups');
            }
        } catch (error) {
            console.error('Failed to fetch group data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/users');
            setAllUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error('Failed to fetch departments', error);
        }
    };

    useEffect(() => {
        if (isOpen && channelId) {
            fetchGroupData();
            fetchAllUsers();
            fetchDepartments();
        }
    }, [isOpen, channelId]);

    // Handle Esc Key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showAddMember) {
                    setShowAddMember(false);
                } else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, showAddMember, onClose]);

    if (!isOpen) return null;

    const isSystemAdmin = auth.user?.role === 'admin';
    const isGroupAdmin = groupDetails?.adminIds?.includes(auth.user?.id || 0);
    const canManage = isSystemAdmin || isGroupAdmin;
    const isAdmin = auth.user?.role === 'admin';

    const handleUpdateGroup = async () => {
        if (!groupDetails) return;
        try {
            await api.patch(`/groups/${groupDetails.id}`, editData);
            setIsEditing(false);
            fetchGroupData();
        } catch (error) {
            console.error('Update failed', error);
        }
    };

    const handleToggleAdmin = async (userId: number) => {
        if (!groupDetails || !canManage) return;
        try {
            await api.patch(`/groups/${groupDetails.id}/toggle-admin`, { userId });
            fetchGroupData();
        } catch (error) {
            console.error('Admin toggle failed', error);
        }
    };

    const handleAddMember = async (userId: number) => {
        if (!groupDetails?.id) return;
        try {
            await api.post(`/groups/${groupDetails.id}/members`, { userId });
            await fetchGroupData();
            setShowAddMember(false);
        } catch (e) {
            console.error("Failed to add member", e);
        }
    };

    const handleAddSelectedMembers = async () => {
        if (!groupDetails?.id || selectedUserIds.length === 0) return;
        try {
            await api.post(`/groups/${groupDetails.id}/assign`, { userIds: selectedUserIds });
            await fetchGroupData();
            setShowAddMember(false);
            setSelectedUserIds([]);
        } catch (e) {
            console.error("Failed to add members", e);
        }
    };

    const toggleUserSelection = (userId: number) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleRemoveMember = async (userId: number) => {
        if (!groupDetails) return;
        if (!confirm('Are you sure you want to remove this user from the group?')) return;
        try {
            await api.delete(`/groups/${groupDetails.id}/members/${userId}`);
            fetchGroupData();
        } catch (error) {
            console.error('Remove member failed', error);
        }
    };

    const filteredUsersToAdd = allUsers.filter(u =>
        !groupDetails?.users.some(mu => mu.id === u.id) &&
        (deptFilter === 'all' || u.department?.id === deptFilter) &&
        (u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Utility to generate consistent colors from strings
    const generateColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 60%)`;
    };

    return (
        <>
            <ScrollbarHideStyle />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    data-modal-id="group-settings"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#222e35] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] no-scrollbar transition-all duration-300 ease-in-out"
                >
                    <AnimatePresence mode="wait">
                        {showAddMember ? (
                            <motion.div
                                key="add-member"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                <div className="h-16 px-6 bg-[#202c33] border-b border-white/5 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => { setShowAddMember(false); setSelectedUserIds([]); }} className="text-[#aebac1] hover:text-white mr-1 transition-colors">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <UserPlus size={20} className="text-emerald-500" />
                                        <span className="text-white font-bold">Add New Member</span>
                                    </div>
                                    <button onClick={() => { setShowAddMember(false); setSelectedUserIds([]); }} className="text-[#aebac1] hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="px-4 py-4 border-b border-white/5 bg-[#111b21] flex flex-col gap-4 shrink-0">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50" size={16} />
                                        <input
                                            autoFocus
                                            placeholder="Search users..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-[#202c33] text-white pl-10 pr-4 py-2.5 rounded-xl outline-none border border-white/5 focus:border-emerald-500/50 focus:bg-[#2a3942] transition-all text-sm shadow-inner"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        <button
                                            onClick={() => setDeptFilter('all')}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${deptFilter === 'all' ? 'bg-emerald-500 border-emerald-500 text-[#111b21]' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                                        >
                                            All
                                        </button>
                                        {departments.map(dept => (
                                            <button
                                                key={dept.id}
                                                onClick={() => setDeptFilter(dept.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${deptFilter === dept.id ? 'bg-emerald-500 border-emerald-500 text-[#111b21]' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                                            >
                                                {dept.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar custom-scrollbar pb-24">
                                    {filteredUsersToAdd.map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-[#111b21] rounded-xl hover:bg-[#202c33] transition-colors cursor-pointer group" onClick={() => toggleUserSelection(user.id)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-white font-bold overflow-hidden">
                                                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.fullName[0]}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                        <div className="text-sm font-bold text-white truncate">{user.fullName}</div>
                                                        {user.department && (
                                                            <span
                                                                className="text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter shrink-0"
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
                                                    <div className="text-xs text-[#8696a0]">@{user.username || user.role}</div>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedUserIds.includes(user.id)
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'border-zinc-600 bg-transparent group-hover:border-emerald-500'
                                                }`}>
                                                {selectedUserIds.includes(user.id) && (
                                                    <Check size={14} className="text-white" strokeWidth={3} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredUsersToAdd.length === 0 && (
                                        <div className="text-center py-20 text-[#8696a0]">
                                            <Users size={40} className="mx-auto mb-4 opacity-10" />
                                            <div className="text-sm">No users found to add</div>
                                        </div>
                                    )}
                                </div>

                                {/* Floating Action Button */}
                                {selectedUserIds.length > 0 && (
                                    <motion.div
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 100, opacity: 0 }}
                                        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#222e35] via-[#222e35] to-transparent"
                                    >
                                        <button
                                            onClick={handleAddSelectedMembers}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-105"
                                        >
                                            <UserPlus size={20} />
                                            Add {selectedUserIds.length} Member{selectedUserIds.length > 1 ? 's' : ''}
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="main-settings"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full overflow-hidden"
                            >
                                {/* Header */}
                                <div className="h-16 px-6 bg-[#202c33] border-b border-white/5 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-white font-bold text-lg leading-none">Group Settings</h2>
                                            <p className="text-[#8696a0] text-xs mt-1">Manage members and admin permissions</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-[#aebac1] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Navigation Tabs */}
                                <div className="flex items-center gap-1 border-b border-white/5 px-6 no-scrollbar overflow-x-auto shrink-0">
                                    <button
                                        onClick={() => setActiveSection('members')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeSection === 'members' ? 'text-white border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                                    >
                                        Members
                                    </button>
                                    {canManage && (
                                        <button
                                            onClick={() => setActiveSection('board')}
                                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${activeSection === 'board' ? 'text-white border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                                        >
                                            <Layout size={14} /> Permissions
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => setActiveSection('settings')}
                                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeSection === 'settings' ? 'text-white border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                                        >
                                            Settings
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                    {isLoading ? (
                                        <div className="h-40 flex items-center justify-center text-[#8696a0] gap-3">
                                            <Activity size={20} className="animate-spin text-emerald-500" />
                                            <span>Loading group data...</span>
                                        </div>
                                    ) : groupDetails ? (
                                        <div>
                                            {/* Members List */}
                                            {activeSection === 'members' && (
                                                <section className="space-y-4">
                                                    <div className="flex items-center justify-between px-2">
                                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                                            <Users size={14} />
                                                            <span>Members ({groupDetails.users.length})</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-[#111b21] p-1 rounded-lg border border-white/5">
                                                            <button
                                                                onClick={() => setSortMode('alphabetical')}
                                                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${sortMode === 'alphabetical' ? 'bg-emerald-500 text-[#111b21]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            >
                                                                A-Z
                                                            </button>
                                                            <button
                                                                onClick={() => setSortMode('department')}
                                                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${sortMode === 'department' ? 'bg-emerald-500 text-[#111b21]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            >
                                                                By Dept
                                                            </button>
                                                        </div>
                                                        {canManage && (
                                                            <button
                                                                onClick={() => setShowAddMember(true)}
                                                                className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all hover:scale-105"
                                                            >
                                                                <UserPlus size={16} />
                                                                Add
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`Are you sure you want to leave "${groupDetails.name}"?`)) return;
                                                                try {
                                                                    await api.delete(`/groups/${groupDetails.id}/members/${auth.user!.id}`);
                                                                    onClose();
                                                                    // Refresh channels list without full page reload
                                                                    const channelsRes = await api.get('/channels');
                                                                    useStore.getState().chat.setChannels(channelsRes.data);
                                                                    // Reset active channel if we just left it
                                                                    if (useStore.getState().chat.activeChannelId === channelId) {
                                                                        useStore.getState().chat.setActiveChannel(null);
                                                                    }
                                                                } catch (e) {
                                                                    console.error("Failed to leave group", e);
                                                                    alert("Failed to leave group.");
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all hover:scale-105"
                                                        >
                                                            <LogOut size={16} />
                                                            Leave Group
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2">
                                                        {[...(groupDetails?.users || [])].sort((a, b) => {
                                                            if (sortMode === 'alphabetical') {
                                                                return a.fullName.localeCompare(b.fullName);
                                                            } else {
                                                                // Sort by department name first, then by full name
                                                                const deptA = a.department?.name || 'Z-Unassigned';
                                                                const deptB = b.department?.name || 'Z-Unassigned';
                                                                if (deptA !== deptB) return deptA.localeCompare(deptB);
                                                                return a.fullName.localeCompare(b.fullName);
                                                            }
                                                        }).map(user => {
                                                            const isUserGroupAdmin = groupDetails.adminIds?.includes(user.id);
                                                            return (
                                                                <div key={user.id} className="group/item flex items-center justify-between p-3 bg-[#111b21] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-emerald-500 font-bold overflow-hidden shadow-inner">
                                                                            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.fullName[0]}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-bold text-white">{user.fullName}</span>
                                                                                {isUserGroupAdmin && (
                                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase tracking-tighter" title="Group Admin">
                                                                                        <Shield size={10} fill="currentColor" /> ADMIN
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                                                                                <span className="text-[10px] text-zinc-500 font-medium truncate">@{user.username || user.role}</span>
                                                                                <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                                                                                <span className="text-[10px] text-zinc-600 truncate">{user.email}</span>
                                                                            </div>
                                                                            {user.department && (
                                                                                <div className="mt-1.5 flex">
                                                                                    <span
                                                                                        className="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider"
                                                                                        style={{
                                                                                            borderColor: `${generateColor(user.department.name)}40`,
                                                                                            backgroundColor: `${generateColor(user.department.name)}15`,
                                                                                            color: generateColor(user.department.name)
                                                                                        }}
                                                                                    >
                                                                                        {user.department.name}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {canManage && user.id !== auth.user?.id && (
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => handleToggleAdmin(user.id)}
                                                                                className={`p-2 rounded-lg transition-colors ${isUserGroupAdmin ? 'text-blue-400 hover:bg-blue-500/10' : 'text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
                                                                                title={isUserGroupAdmin ? "Revoke Admin" : "Make Admin"}
                                                                            >
                                                                                <Shield size={16} fill={isUserGroupAdmin ? "currentColor" : "none"} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRemoveMember(user.id)}
                                                                                className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                                title="Remove Member"
                                                                            >
                                                                                <UserMinus size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            )}

                                            {activeSection === 'board' && (
                                                <div className="p-6">
                                                    <div className="mb-6">
                                                        <h3 className="text-sm font-bold text-white mb-2">Responsible Department (Worker Role)</h3>
                                                        <p className="text-xs text-zinc-400 mb-4">
                                                            Members of this department will have <strong>Worker</strong> permissions (can start/finish tasks).
                                                            Everyone else will be a <strong>Requester</strong>.
                                                        </p>

                                                        <div className="bg-zinc-900 border border-white/10 rounded-lg p-1">
                                                            <select
                                                                value={groupDetails?.targetDepartment?.id || ''}
                                                                onChange={async (e) => {
                                                                    const deptId = e.target.value ? parseInt(e.target.value) : null;
                                                                    // Optimistic update
                                                                    setGroupDetails(prev => prev ? {
                                                                        ...prev,
                                                                        targetDepartment: deptId ? departments.find(d => d.id === deptId) : undefined
                                                                    } : null);

                                                                    try {
                                                                        await api.patch(`/groups/${groupDetails.id}`, { targetDepartmentId: deptId });
                                                                    } catch (err) {
                                                                        console.error("Failed to update target department", err);
                                                                        // Revert on failure
                                                                        fetchGroupData();
                                                                    }
                                                                }}
                                                                className="w-full bg-transparent text-sm text-white p-2 outline-none [&>option]:bg-[#202c33] [&>option]:text-white"
                                                            >
                                                                <option value="" className="bg-[#202c33] text-white">-- No Specific Department (Everyone is Worker) --</option>
                                                                {departments.map(dept => (
                                                                    <option key={dept.id} value={dept.id} className="bg-[#202c33] text-white">{dept.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/5 p-3 rounded border border-yellow-500/10">
                                                            <AlertTriangle size={14} />
                                                            <span>Changing this will immediately affect who can work on tasks in this group.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSection === 'settings' && (
                                                <section className="bg-[#111b21] rounded-xl border border-white/5 overflow-hidden">
                                                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                                            <Layout size={14} />
                                                            <span>General Information</span>
                                                        </div>
                                                        {canManage && !isEditing && (
                                                            <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-white transition-colors">
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        {isEditing ? (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Group Name</label>
                                                                    <input
                                                                        value={editData.name}
                                                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                                                        className="w-full bg-[#202c33] border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-emerald-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Status / Global Message</label>
                                                                    <input
                                                                        value={editData.status}
                                                                        onChange={e => setEditData({ ...editData, status: e.target.value })}
                                                                        placeholder="e.g. Critical, Busy, Active..."
                                                                        className="w-full bg-[#202c33] border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-emerald-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Privacy Mode</label>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setEditData({ ...editData, isPrivate: false })}
                                                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${!editData.isPrivate ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#202c33] border-white/5 text-zinc-500'}`}
                                                                        >
                                                                            <Globe size={14} /> Public
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditData({ ...editData, isPrivate: true })}
                                                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${editData.isPrivate ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#202c33] border-white/5 text-zinc-500'}`}
                                                                        >
                                                                            <Shield size={14} /> Private
                                                                        </button>
                                                                    </div>
                                                                    <p className="mt-1.5 text-[10px] text-zinc-500">
                                                                        {editData.isPrivate
                                                                            ? "Only invited members can find and join."
                                                                            : "Visible in Discovery Portal. Anyone can join."}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Description</label>
                                                                    <textarea
                                                                        value={editData.description}
                                                                        onChange={e => setEditData({ ...editData, description: e.target.value })}
                                                                        className="w-full bg-[#202c33] border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-emerald-500 h-24 resize-none"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-end gap-3 mt-2">
                                                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                                                    <button onClick={handleUpdateGroup} className="px-6 py-2 bg-emerald-500 text-[#111b21] rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2">
                                                                        <Check size={16} /> Save Changes
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h3 className="text-xl font-bold text-white mb-1">{groupDetails.name}</h3>
                                                                    <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                                                                        {groupDetails.description || 'No description provided.'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-4">
                                                                    <div className="bg-[#202c33] rounded-lg p-3 border border-white/5 flex-1">
                                                                        <span className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Status</span>
                                                                        <span className="text-sm text-emerald-400 font-medium">{groupDetails.status || 'Active'}</span>
                                                                    </div>
                                                                    <div className="bg-[#202c33] rounded-lg p-3 border border-white/5 flex-1">
                                                                        <span className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Visibility</span>
                                                                        <div className="flex items-center gap-2 text-sm text-white">
                                                                            {groupDetails.isPrivate ? <Shield size={14} className="text-red-400" /> : <Globe size={14} className="text-emerald-400" />}
                                                                            <span>{groupDetails.isPrivate ? 'Private' : 'Public'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Group Stats */}
                                                                {stats && (
                                                                    <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-white/5 w-fit">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                            <span className="text-blue-400 font-medium text-xs">{stats.active} Active</span>
                                                                        </div>
                                                                        <span className="text-white/10 text-xs">|</span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                                            <span className="text-orange-400 font-medium text-xs">{stats.count} Tasks</span>
                                                                        </div>
                                                                        <span className="text-white/10 text-xs">|</span>
                                                                        <span className="text-emerald-400 font-medium text-xs">+{stats.day} Done Today</span>
                                                                    </div>
                                                                )}


                                                            </div>
                                                        )}
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-60 flex flex-col items-center justify-center text-[#8696a0] space-y-4">
                                            <AlertTriangle size={48} className="opacity-10 text-yellow-500" />
                                            <div className="text-center">
                                                <p className="font-bold text-white">Group not found</p>
                                                <p className="text-xs">This channel might not be linked to a group or you don't have access.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

        </>
    );
}
