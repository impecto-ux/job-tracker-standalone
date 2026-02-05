import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Briefcase, Plus, Search, Trash2, Edit2, Check, X, User as UserIcon, Building, ArrowRight, Folder, ChevronRight, ChevronDown, Hash, MoreVertical, Eye, EyeOff, Archive, RotateCcw, Globe } from 'lucide-react';
import api from '@/lib/api';
import { io } from 'socket.io-client';
import { getApiUrl } from '@/lib/config';
import { useStore } from '@/lib/store';

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 flex items-center justify-between cursor-pointer hover:border-white/20 transition-colors"
                title={placeholder}
            >
                <div className="flex items-center gap-2">
                    {options.find(o => o.value === value)?.label || <span className="text-zinc-500">{placeholder || 'Select...'}</span>}
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[300]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-[301] max-h-48 overflow-y-auto"
                        >
                            {options.map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${opt.value === value ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                                >
                                    {opt.label}
                                    {opt.value === value && <Check size={12} />}
                                </div>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

interface UserManagementPanelProps {
    onClose: () => void;
    initialView?: 'root' | 'groups_root' | 'departments_root' | 'archives_root';
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ onClose, initialView = 'root' }) => {
    // Tree Selection State
    type NodeType = 'root' | 'dept' | 'team' | 'group' | 'departments_root' | 'groups_root' | 'archives_root' | 'bots_root';
    interface SelectedNode { type: NodeType; id?: number; data?: any }

    const { auth } = useStore();
    const [selectedNode, setSelectedNode] = useState<SelectedNode>({ type: initialView as NodeType });
    const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (initialView) {
            setSelectedNode({ type: initialView as NodeType });
        }
    }, [initialView]);

    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [archivedGroups, setArchivedGroups] = useState<any[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingUser, setViewingUser] = useState<any | null>(null);

    // Modals
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'viewer', departmentId: '', username: '' });
    const [newUserFile, setNewUserFile] = useState<File | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [editUserFile, setEditUserFile] = useState<File | null>(null);

    const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [newDept, setNewDept] = useState({ name: '', description: '' });

    const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', description: '', departmentId: '' });

    const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
    const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [newGroup, setNewGroup] = useState({ name: '', description: '', isPrivate: false });

    const [addToGroupSearchQuery, setAddToGroupSearchQuery] = useState('');
    const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
    const [isAddToDeptModalOpen, setIsAddToDeptModalOpen] = useState(false);
    const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Set<number>>(new Set());
    const [addToGroupDeptFilter, setAddToGroupDeptFilter] = useState<number | 'all'>('all');
    const [archiveSearchQuery, setArchiveSearchQuery] = useState('');

    // Bulk Actions State
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [isBulkGroupActionOpen, setIsBulkGroupActionOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'add' | 'remove'>('add');

    // Filtering & Sorting State
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('name-asc');

    useEffect(() => {
        fetchData();
        const socket = io(getApiUrl());
        socket.on('connect', () => console.log("TreePanel: Connected to socket"));
        socket.on('presence:update', (data: any) => {
            if (data && Array.isArray(data.onlineUsers)) {
                setOnlineUserIds(new Set(data.onlineUsers));
            }
        });
        return () => { socket.disconnect(); };
    }, []);

    // Esc Handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Priority: Modals -> Search -> Selection -> Close
                if (isAddUserOpen) { setIsAddUserOpen(false); return; }
                if (isEditUserOpen) { setIsEditUserOpen(false); return; }
                if (isAddDeptOpen) { setIsAddDeptOpen(false); return; }
                if (isEditDeptOpen) { setIsEditDeptOpen(false); return; }
                if (isAddTeamOpen) { setIsAddTeamOpen(false); return; }
                if (isAddGroupOpen) { setIsAddGroupOpen(false); return; }
                if (isEditGroupOpen) { setIsEditGroupOpen(false); return; }
                if (isAddToGroupModalOpen) { setIsAddToGroupModalOpen(false); return; }
                if (isAddToDeptModalOpen) { setIsAddToDeptModalOpen(false); return; }
                if (isBulkGroupActionOpen) { setIsBulkGroupActionOpen(false); return; }

                if (viewingUser) { setViewingUser(null); return; }

                if (searchQuery) { setSearchQuery(''); return; }

                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isAddUserOpen, isEditUserOpen, isAddDeptOpen, isEditDeptOpen, isAddTeamOpen, isAddGroupOpen, isEditGroupOpen, isAddToGroupModalOpen, isAddToDeptModalOpen, viewingUser, searchQuery, onClose]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [uRes, dRes, gRes, tRes, agRes] = await Promise.all([
                api.get('/users'),
                api.get('/departments'),
                api.get('/groups?archived=false'),
                api.get('/teams'),
                api.get('/groups?archived=true')
            ]);
            setUsers(uRes.data);
            setDepartments(dRes.data);
            setGroups(gRes.data);
            setTeams(tRes.data);
            setArchivedGroups(agRes.data);

            // Sync selectedNode.data if something is selected
            if (selectedNode.id) {
                let latestData = null;
                if (selectedNode.type === 'dept') latestData = dRes.data.find((d: any) => d.id === selectedNode.id);
                else if (selectedNode.type === 'team') latestData = tRes.data.find((t: any) => t.id === selectedNode.id);
                else if (selectedNode.type === 'group') latestData = gRes.data.find((g: any) => g.id === selectedNode.id);

                if (latestData) {
                    setSelectedNode(prev => ({ ...prev, data: latestData }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getDeptTeams = (deptId: number) => teams.filter(t => t.department?.id === deptId);

    // -- Bulk Handlers --
    const toggleSelectUser = (e: React.MouseEvent, userId: number) => {
        e.stopPropagation();
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedUserIds(newSet);
    };

    const handleSelectAll = () => {
        const displayedIds = displayUsers.map(u => u.id);
        const allSelected = displayedIds.every(id => selectedUserIds.has(id));

        if (allSelected) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(displayedIds));
        }
    };

    const handleBulkAddToGroup = async (groupId: number) => {
        if (selectedUserIds.size === 0) return;
        try {
            await api.post(`/groups/${groupId}/assign`, { userIds: Array.from(selectedUserIds) });
            alert(`Successfully added ${selectedUserIds.size} users to group.`);
            fetchData();
            setIsBulkGroupActionOpen(false);
            setSelectedUserIds(new Set());
        } catch (e) {
            console.error(e);
            alert('Failed to add users to group');
        }
    };

    const handleBulkRemoveFromGroup = async (groupId: number) => {
        if (selectedUserIds.size === 0) return;
        if (!confirm(`Remove ${selectedUserIds.size} users from this group?`)) return;

        try {
            // Concurrent deletion
            await Promise.all(Array.from(selectedUserIds).map(userId =>
                api.delete(`/groups/${groupId}/members/${userId}`).catch(e => console.error(`Failed to remove user ${userId}`, e))
            ));
            alert('Batch removal complete.');
            fetchData();
            setIsBulkGroupActionOpen(false);
            setSelectedUserIds(new Set());
        } catch (e) {
            alert('Error during bulk removal');
        }
    };

    const handleBulkRemoveFromDept = async () => {
        if (selectedUserIds.size === 0) return;
        if (!confirm(`Remove ${selectedUserIds.size} users from their current department?`)) return;

        try {
            await Promise.all(Array.from(selectedUserIds).map(userId =>
                api.patch(`/users/${userId}`, { department: null }).catch(e => console.error(`Failed to unassign user ${userId}`, e))
            ));
            alert('Batch department removal complete.');
            fetchData();
            setSelectedUserIds(new Set());
        } catch (e) {
            alert('Error during bulk department removal');
        }
    };

    // -- Handlers --
    const handleAddUsersToGroup = async () => {
        if (!selectedNode.type || selectedNode.type !== 'group' || !selectedNode.data) return;
        try {
            await api.post(`/groups/${selectedNode.data.id}/assign`, { userIds: Array.from(selectedUsersToAdd) });
            fetchData();
            setIsAddToGroupModalOpen(false);
            setSelectedUsersToAdd(new Set());
        } catch (e) {
            alert('Failed to add users to group');
        }
    };

    const handleAddUsersToDept = async () => {
        if (!selectedNode.type || !selectedNode.data) return;
        const isTeam = selectedNode.type === 'team';
        const isDept = selectedNode.type === 'dept';
        if (!isTeam && !isDept) return;

        try {
            if (isTeam) {
                // Use the dedicated team-assign endpoint
                await api.post(`/teams/${selectedNode.data.id}/assign`, { userIds: Array.from(selectedUsersToAdd) });
            } else {
                // Use the individual user update for department assignments
                await Promise.all(Array.from(selectedUsersToAdd).map(userId =>
                    api.patch(`/users/${userId}`, { department: { id: selectedNode.data.id } })
                ));
            }
            fetchData();
            setIsAddToDeptModalOpen(false);
            setSelectedUsersToAdd(new Set());
        } catch (e) {
            alert(`Failed to add users to ${isTeam ? 'team' : 'department'}`);
        }
    };

    const toggleSelectUserToAdd = (userId: number) => {
        const newSet = new Set(selectedUsersToAdd);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedUsersToAdd(newSet);
    };

    const handleCreateUser = async () => {
        try {
            const formData = new FormData();
            formData.append('email', newUser.email);
            formData.append('password', newUser.password);
            formData.append('fullName', newUser.fullName);
            formData.append('role', newUser.role);
            if (newUser.username) formData.append('username', newUser.username);
            if (newUser.departmentId) formData.append('departmentId', newUser.departmentId);
            if (newUserFile) formData.append('file', newUserFile);

            await api.post('/auth/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchData();
            setIsAddUserOpen(false);
            setNewUser({ email: '', password: '', fullName: '', role: 'viewer', departmentId: '', username: '' });
            setNewUserFile(null);
        } catch (e) { alert('Failed to create user'); }
    };

    const handleUpdateUserRole = async (userId: number, role: string) => {
        try {
            await api.patch(`/users/${userId}/role`, { role });
            fetchData();
        } catch (e) { alert('Failed to update role'); }
    };

    const handleEditUser = async () => {
        if (!editingUser) return;
        if (editingUser.role === 'manager' && !editingUser.departmentId && !editingUser.department?.id) {
            return alert('Managers must be assigned to a department');
        }

        try {
            const formData = new FormData();
            formData.append('fullName', editingUser.fullName);
            formData.append('email', editingUser.email);
            if (editingUser.username) formData.append('username', editingUser.username);

            // Handle password only if provided
            if (editingUser.password) {
                formData.append('password', editingUser.password);
            }

            formData.append('role', editingUser.role);

            // Department ID might be in .departmentId or .department.id depending on where it came from
            const deptId = editingUser.departmentId || editingUser.department?.id;
            if (deptId) {
                formData.append('departmentId', deptId.toString());
            }

            if (editUserFile) {
                formData.append('file', editUserFile);
            }

            const res = await api.patch(`/users/${editingUser.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchData();
            setIsEditUserOpen(false);

            // Update viewing user if open
            if (viewingUser && viewingUser.id === editingUser.id) {
                setViewingUser(res.data);
            }

            setEditingUser(null);
            setEditUserFile(null);
            setShowPassword(false);
        } catch (e) {
            console.error(e);
            alert('Failed to update user');
        }
    };


    const handleRemoveFromGroup = async (userId: number) => {
        if (!selectedNode.data?.id) return;
        if (!confirm(`Remove this user from ${selectedNode.data.name}?`)) return;
        try {
            await api.delete(`/groups/${selectedNode.data.id}/members/${userId}`);
            fetchData();
        } catch (e) {
            alert('Failed to remove user from group');
        }
    };

    const handleRemoveFromDept = async (userId: number) => {
        if (!selectedNode.data?.id) return;
        if (!confirm(`Remove this user from department ${selectedNode.data.name}?`)) return;
        try {
            await api.patch(`/users/${userId}`, { department: null });
            fetchData();
        } catch (e) {
            alert('Failed to remove user from department');
        }
    };

    const handleRemoveFromTeam = async (userId: number) => {
        if (!selectedNode.data?.id) return;
        if (!confirm(`Remove this user from team ${selectedNode.data.name}?`)) return;
        try {
            await api.delete(`/teams/${selectedNode.data.id}/users/${userId}`);
            fetchData();
        } catch (e) {
            alert('Failed to remove user from team');
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Delete user globally? This cannot be undone.')) return;
        try { await api.delete(`/users/${id}`); fetchData(); } catch (e) { alert('Failed to delete user'); }
    };

    const handleAddDept = async () => {
        try { await api.post('/departments', newDept); fetchData(); setIsAddDeptOpen(false); setNewDept({ name: '', description: '' }); } catch (e) { alert('Failed'); }
    };

    const handleEditDept = async () => {
        if (!editingDept) return;
        try { await api.patch(`/departments/${editingDept.id}`, { name: editingDept.name, description: editingDept.description }); fetchData(); setIsEditDeptOpen(false); } catch (e) { alert('Failed'); }
    };

    const handleDeleteDept = async (id: number) => {
        if (!confirm('Delete Dept?')) return;
        try { await api.delete(`/departments/${id}`); fetchData(); setSelectedNode({ type: 'root' }); } catch (e) { alert('Failed'); }
    }

    const handleAddTeam = async () => {
        try { await api.post('/teams', newTeam); fetchData(); setIsAddTeamOpen(false); setNewTeam({ name: '', description: '', departmentId: '' }); } catch (e) { alert('Failed'); }
    };

    const handleAddGroup = async () => {
        try { await api.post('/groups', newGroup); fetchData(); setIsAddGroupOpen(false); setNewGroup({ name: '', description: '', isPrivate: false }); } catch (e) { alert('Failed'); }
    };

    const handleEditGroup = async () => {
        if (!editingGroup) return;
        try { await api.patch(`/groups/${editingGroup.id}`, { name: editingGroup.name, description: editingGroup.description, isPrivate: editingGroup.isPrivate }); fetchData(); setIsEditGroupOpen(false); setEditingGroup(null); } catch (e) { alert('Failed'); }
    };

    const handleDeleteGroup = async (id: number) => {
        if (!confirm('Delete Group?')) return;
        try { await api.delete(`/groups/${id}`); fetchData(); setSelectedNode({ type: 'root' }); } catch (e) { alert('Failed'); }
    }

    const handleArchiveGroup = async (id: number) => {
        if (!confirm('Archive this group? It will be hidden from chat but kept for 6 months.')) return;
        try {
            await api.patch(`/groups/${id}/archive`);
            fetchData();
            setSelectedNode({ type: 'groups_root' });
        } catch (e) { alert('Failed to archive group'); }
    };

    const handleRestoreGroup = async (id: number) => {
        if (!confirm('Restore this group?')) return;

        const restoreUsers = confirm('Do you want to restore the previous members as well?\n\nOK: Restore with members\nCancel: Restore as empty group');

        try {
            await api.patch(`/groups/${id}/restore`, { restoreUsers });
            fetchData();
            setSelectedNode({ type: 'groups_root' });
        } catch (e) { alert('Failed to restore group'); }
    };

    const handleToggleGroupAdmin = async (userId: number) => {
        if (selectedNode.type !== 'group') return;
        try {
            await api.patch(`/groups/${selectedNode.id}/toggle-admin`, { userId });
            fetchData();
        } catch (e) { alert('Failed to toggle group admin'); }
    };

    const toggleExpandDept = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const newSet = new Set(expandedDepts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedDepts(newSet);
    };

    // Utility to generate consistent colors from strings
    const generateColor = (str: string) => {
        if (!str) return '#6b7280'; // Default gray
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 60%)`; // Visible but not too bright for dark mode
    };

    const getFilteredUsers = () => {
        let filtered = users;
        // 1. Scope Filter (Tree Selection)
        if (selectedNode.type === 'dept') {
            filtered = users.filter(u => u.department?.id === selectedNode.id);
        } else if (selectedNode.type === 'team') {
            filtered = users.filter(u => u.teams?.some((t: any) => t.id === selectedNode.id));
        } else if (selectedNode.type === 'group') {
            filtered = users.filter(u => u.groups?.some((g: any) => g.id === selectedNode.id));
        } else if (selectedNode.type === 'bots_root') {
            filtered = users.filter(u => u.isSystemBot);
        }

        // 2. Search Filter
        if (searchQuery) {
            filtered = filtered.filter(u =>
                (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // 3. Role Filter
        if (filterRole !== 'all') {
            filtered = filtered.filter(u => u.role === filterRole);
        }

        // 4. Status Filter
        if (filterStatus === 'online') {
            filtered = filtered.filter(u => onlineUserIds.has(u.id));
        } else if (filterStatus === 'offline') {
            filtered = filtered.filter(u => !onlineUserIds.has(u.id));
        }

        // 5. Sorting
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'name-asc') return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
            if (sortBy === 'name-desc') return b.fullName.localeCompare(a.fullName, undefined, { sensitivity: 'base' });
            if (sortBy === 'role') return a.role.localeCompare(b.role, undefined, { sensitivity: 'base' });
            if (sortBy === 'dept') {
                const deptA = a.department?.name || '';
                const deptB = b.department?.name || '';
                const comparison = deptA.localeCompare(deptB, undefined, { sensitivity: 'base' });
                // Secondary sort by name if departments are same
                if (comparison === 0) {
                    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
                }
                return comparison;
            }
            return 0;
        });

        return filtered;
    };

    const displayUsers = getFilteredUsers();

    // Components
    const renderSidebar = () => (
        <div className="w-64 bg-black/40 border-r border-white/5 flex flex-col h-full select-none">
            <div className="p-4 border-b border-white/5">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Organization</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* ROOT */}
                <div
                    onClick={() => setSelectedNode({ type: 'root' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedNode.type === 'root' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <Users size={16} />
                    <span className="text-sm font-medium">All Users</span>
                    <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-zinc-500">{users.length}</span>
                </div>

                {/* DEPARTMENTS - CLICKABLE */}
                <div
                    onClick={() => setSelectedNode({ type: 'departments_root' })}
                    className={`mt-4 px-3 flex items-center justify-between group/header cursor-pointer rounded-lg hover:bg-white/5 py-1 ${selectedNode.type === 'departments_root' ? 'bg-white/5' : ''}`}
                >
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase transition-colors ${selectedNode.type === 'departments_root' ? 'text-white' : 'text-zinc-600 group-hover/header:text-zinc-400'}`}>Departments</span>
                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full text-zinc-500">{departments.length}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setIsAddDeptOpen(true); }} className="opacity-0 group-hover/header:opacity-100 text-zinc-500 hover:text-white"><Plus size={10} /></button>
                </div>

                {departments.map((dept) => {
                    const deptColor = generateColor(dept.name);
                    const isSelected = selectedNode.type === 'dept' && selectedNode.id === dept.id;
                    const memberCount = users.filter(u => u.department?.id === dept.id).length;

                    return (
                        <div key={dept.id}>
                            <div
                                onClick={() => setSelectedNode({ type: 'dept', id: dept.id, data: dept })}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors group relative hover:bg-white/5`}
                                style={{
                                    backgroundColor: isSelected ? `${deptColor}20` : undefined, // 20 = ~12% opacity hex 
                                    color: isSelected ? deptColor : undefined
                                }}
                            >
                                <button onClick={(e) => toggleExpandDept(e, dept.id)} className={`p-0.5 hover:bg-white/10 rounded ${!isSelected && 'text-zinc-400'}`}>
                                    {expandedDepts.has(dept.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </button>
                                <Folder size={14} style={{ fill: isSelected ? `${deptColor}30` : 'none', color: isSelected ? deptColor : undefined }} className={!isSelected ? "text-zinc-400" : ""} />
                                <span className={`text-sm truncate flex-1 ${!isSelected && 'text-zinc-400'}`}>{dept.name}</span>
                                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-zinc-500">{memberCount}</span>
                            </div>
                            {/* TEAMS */}
                            <AnimatePresence>
                                {expandedDepts.has(dept.id) && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-6 border-l border-white/10 pl-2">
                                        {getDeptTeams(dept.id).map(team => (
                                            <div
                                                key={team.id}
                                                onClick={() => setSelectedNode({ type: 'team', id: team.id, data: team })}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-xs mt-0.5 ${selectedNode.type === 'team' && selectedNode.id === team.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                                {team.name}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setNewTeam({ ...newTeam, departmentId: dept.id.toString() });
                                                setIsAddTeamOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 mt-1 w-full text-left"
                                        >
                                            <Plus size={10} /> Add Team
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {/* GROUPS - CLICKABLE */}
                <div
                    onClick={() => setSelectedNode({ type: 'groups_root' })}
                    className={`mt-4 px-3 flex items-center justify-between group/header cursor-pointer rounded-lg hover:bg-white/5 py-1 ${selectedNode.type === 'groups_root' ? 'bg-white/5' : ''}`}
                >
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase transition-colors ${selectedNode.type === 'groups_root' ? 'text-white' : 'text-zinc-600 group-hover/header:text-zinc-400'}`}>Groups</span>
                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full text-zinc-500">{groups.length}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setIsAddGroupOpen(true); }} className="opacity-0 group-hover/header:opacity-100 text-zinc-500 hover:text-white"><Plus size={10} /></button>
                </div>
                {groups.map(group => {
                    const memberCount = users.filter(u => u.groups?.some((g: any) => g.id === group.id)).length;
                    return (
                        <div
                            key={group.id}
                            onClick={() => setSelectedNode({ type: 'group', id: group.id, data: group })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors group/groupitem ${selectedNode.type === 'group' && selectedNode.id === group.id ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-400 hover:bg-white/5'}`}
                        >
                            <Hash size={14} />
                            <span className="text-sm truncate flex-1">{group.name}</span>
                            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-zinc-500">{memberCount}</span>
                            <div className="opacity-0 group-hover/groupitem:opacity-100 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleArchiveGroup(group.id); }} className="hover:text-amber-400" title="Archive"><Archive size={12} /></button>
                            </div>
                        </div>
                    );
                })}

                {/* ARCHIVES - CLICKABLE */}
                <div
                    onClick={() => setSelectedNode({ type: 'archives_root' })}
                    className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedNode.type === 'archives_root' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <Archive size={16} />
                    <span className="text-sm font-medium">Archives</span>
                    <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full">{archivedGroups.length}</span>
                </div>

                {/* SYSTEM BOTS - SECTION HEADER STYLE */}
                <div
                    onClick={() => setSelectedNode({ type: 'bots_root' })}
                    className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedNode.type === 'bots_root' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                    <Users size={16} />
                    <span className="text-sm font-medium">System Bots</span>
                    <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full">{users.filter(u => u.isSystemBot).length}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#09090b] border border-white/10 w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex"
            >
                {renderSidebar()}

                <div className="flex-1 flex flex-col h-full bg-black/20 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>

                    {/* HEADER */}
                    <div className="h-20 border-b border-white/5 flex items-center px-8 bg-zinc-900/50">
                        {selectedNode.type === 'root' && (
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">All Users</h1>
                                <p className="text-sm text-zinc-500">Directory of all registered members</p>
                            </div>
                        )}
                        {(selectedNode.type === 'dept' || selectedNode.type === 'team') && selectedNode.data && (
                            <div className="flex items-center gap-4 w-full pr-12">
                                <div
                                    className={`p-3 rounded-xl`}
                                    style={{
                                        backgroundColor: selectedNode.type === 'dept' ? `${generateColor(selectedNode.data.name)}20` : 'rgba(16, 185, 129, 0.2)',
                                        color: selectedNode.type === 'dept' ? generateColor(selectedNode.data.name) : '#34d399'
                                    }}
                                >
                                    {selectedNode.type === 'dept' ? <Building size={24} /> : <Users size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-bold text-white tracking-tight">{selectedNode.data.name}</h1>
                                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                            {selectedNode.type === 'dept' ? 'Department' : 'Team'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            <Users size={12} />
                                            <span>{displayUsers.length} Members</span>
                                        </div>
                                        <p className="text-sm text-zinc-500 truncate max-w-md">{selectedNode.data.description}</p>
                                    </div>
                                </div>
                                {auth.user?.role === 'admin' && selectedNode.type === 'dept' && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditingDept(selectedNode.data); setIsEditDeptOpen(true) }} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDeleteDept(selectedNode.data.id)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedNode.type === 'group' && selectedNode.data && (
                            <div className="flex items-center gap-4 w-full pr-12">
                                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Hash size={24} /></div>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-white tracking-tight">{selectedNode.data.name}</h1>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                            <Users size={12} />
                                            <span>{displayUsers.length} Members</span>
                                        </div>
                                        <p className="text-sm text-zinc-500 truncate max-w-md">{selectedNode.data.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditingGroup(selectedNode.data); setIsEditGroupOpen(true) }} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors" title="Edit Group"><Edit2 size={18} /></button>
                                    <button onClick={() => handleArchiveGroup(selectedNode.data.id)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-amber-400 transition-colors" title="Archive Group"><Archive size={18} /></button>
                                    <button onClick={() => handleDeleteGroup(selectedNode.data.id)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400 transition-colors" title="Delete Group"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        )}
                        {selectedNode.type === 'departments_root' && (
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Manage Departments</h1>
                                <p className="text-sm text-zinc-500">View and manage organization structure</p>
                            </div>
                        )}
                        {selectedNode.type === 'groups_root' && (
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">Manage Groups</h1>
                                <p className="text-sm text-zinc-500">View and manage custom user groups</p>
                            </div>
                        )}
                        {selectedNode.type === 'bots_root' && (
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">System Bots</h1>
                                <p className="text-sm text-zinc-500">Manage automated agents and helpers</p>
                            </div>
                        )}
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="flex gap-4 mb-6">
                            {(selectedNode.type !== 'archives_root') && (
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder={
                                            selectedNode.type === 'departments_root' ? "Search departments..." :
                                                selectedNode.type === 'groups_root' ? "Search groups..." :
                                                    selectedNode.type === 'bots_root' ? "Search bots..." :
                                                        "Search users..."
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            )}

                            {/* FILTERS & SORTING TOOLBAR */}
                            <div className="flex items-center gap-2">
                                <CustomSelect
                                    value={filterRole}
                                    onChange={setFilterRole}
                                    options={[
                                        { value: 'all', label: 'All Roles' },
                                        { value: 'admin', label: 'Admins' },
                                        { value: 'manager', label: 'Managers' },
                                        { value: 'contributor', label: 'Contributors' },
                                        { value: 'viewer', label: 'Viewers' },
                                    ]}
                                    placeholder="Role"
                                />
                                <CustomSelect
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                    options={[
                                        { value: 'all', label: 'All Status' },
                                        { value: 'online', label: 'Online' },
                                        { value: 'offline', label: 'Offline' },
                                    ]}
                                    placeholder="Status"
                                />
                                <CustomSelect
                                    value={sortBy}
                                    onChange={setSortBy}
                                    options={[
                                        { value: 'name-asc', label: 'Name (A-Z)' },
                                        { value: 'name-desc', label: 'Name (Z-A)' },
                                        { value: 'role', label: 'Role' },
                                        { value: 'dept', label: 'Department' },
                                    ]}
                                    placeholder="Sort By"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4 justify-end">


                            {selectedNode.type === 'group' ? (
                                <button onClick={() => setIsAddToGroupModalOpen(true)} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                    <Plus size={14} /> Add Member
                                </button>
                            ) : (auth.user?.role === 'admin' || auth.user?.role === 'manager') && (selectedNode.type === 'dept' || selectedNode.type === 'team') ? (
                                <button onClick={() => setIsAddToDeptModalOpen(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                    <Plus size={14} /> Add Member
                                </button>
                            ) : auth.user?.role === 'admin' && selectedNode.type === 'bots_root' ? (
                                <button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                    <Plus size={14} /> Add Bot
                                </button>
                            ) : auth.user?.role === 'admin' && selectedNode.type === 'root' ? (
                                <button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                                    <Plus size={14} /> Add User
                                </button>
                            ) : null}
                        </div>



                        {/* BULK SELECTION HEADER ACTIONS */}
                        {(selectedNode.type === 'dept' || selectedNode.type === 'team' || selectedNode.type === 'group' || selectedNode.type === 'root') && (
                            <div className="flex items-center gap-2 mb-4">
                                <button
                                    onClick={handleSelectAll}
                                    className="px-3 py-1.5 text-xs font-bold rounded bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors border border-white/5"
                                >
                                    {displayUsers.length > 0 && displayUsers.every(u => selectedUserIds.has(u.id)) ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedUserIds.size > 0 && (
                                    <span className="text-xs text-emerald-400 font-bold ml-2 animate-pulse">{selectedUserIds.size} users selected</span>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {/* DEPARTMENTS MANAGEMENT VIEW */}
                            {selectedNode.type === 'departments_root' ? (
                                <>
                                    <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Departments</div>
                                            <div className="text-3xl font-black text-white">{departments.length}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Building size={10} /> Structure nodes</div>
                                        </div>
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Members</div>
                                            <div className="text-3xl font-black text-emerald-400">{users.filter(u => u.department).length}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Users size={10} /> Assigned to depts</div>
                                        </div>
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Active Teams</div>
                                            <div className="text-3xl font-black text-indigo-400">{teams.length}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Folder size={10} /> Functional units</div>
                                        </div>
                                    </div>
                                    {auth.user?.role === 'admin' && (
                                        <button onClick={() => setIsAddDeptOpen(true)} className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-white/10 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all gap-2 group">
                                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-emerald-500/20"><Plus size={24} /></div>
                                            <span className="font-bold text-sm">Create Department</span>
                                        </button>
                                    )}
                                    {departments
                                        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(dept => (
                                            <div key={dept.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:border-white/10 transition-colors flex flex-col group relative">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${generateColor(dept.name)}20`, color: generateColor(dept.name) }}>
                                                            <Building size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-200">{dept.name}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Department</div>
                                                        </div>
                                                    </div>
                                                    {auth.user?.role === 'admin' && (
                                                        <div className="flex gap-1 relative z-10">
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingDept(dept); setIsEditDeptOpen(true); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDept(dept.id); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-400 line-clamp-2 flex-1">{dept.description || 'No description provided.'}</p>
                                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                                                    <div className="flex items-center gap-1"><Users size={12} /> {users.filter(u => u.department?.id === dept.id).length} Members</div>
                                                    <div className="flex items-center gap-1"><Folder size={12} /> {getDeptTeams(dept.id).length} Teams</div>
                                                </div>
                                                <button onClick={() => setSelectedNode({ type: 'dept', id: dept.id, data: dept })} className="absolute inset-0 z-0" />
                                            </div>
                                        ))}
                                </>
                            ) : selectedNode.type === 'groups_root' ? (
                                <>
                                    <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Active Groups</div>
                                            <div className="text-3xl font-black text-blue-400">{groups.length}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Hash size={10} /> Live conversations</div>
                                        </div>
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Archived</div>
                                            <div className="text-3xl font-black text-amber-500">{archivedGroups.length}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Archive size={10} /> Retired groups</div>
                                        </div>
                                        <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Memberships</div>
                                            <div className="text-3xl font-black text-white">{groups.reduce((acc, g) => acc + (users.filter(u => u.groups?.some((ug: any) => ug.id === g.id)).length), 0)}</div>
                                            <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Users size={10} /> Direct group roles</div>
                                        </div>
                                    </div>
                                    <div className="col-span-full mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                                <Hash size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold">Active Groups</h2>
                                                <p className="text-xs text-zinc-500">Manage your active conversation groups</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedNode({ type: 'archives_root' })}
                                                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-lg text-sm font-bold hover:bg-amber-500/20 transition-all border border-amber-500/20"
                                            >
                                                <Archive size={14} /> View Archives
                                            </button>
                                            {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                                                <button
                                                    onClick={() => setIsAddGroupOpen(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    <Plus size={14} /> Create Group
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {groups.length === 0 && (
                                        <div className="col-span-full text-center py-20 text-zinc-600 italic border border-dashed border-white/5 rounded-xl">
                                            <Hash size={40} className="mx-auto mb-4 opacity-10" />
                                            No groups found.
                                        </div>
                                    )}

                                    {groups
                                        .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(group => (
                                            <div key={group.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:border-white/10 transition-colors flex flex-col group relative">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                                            <Hash size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-200">{group.name}</div>
                                                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Group</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 relative z-10">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setIsEditGroupOpen(true); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleArchiveGroup(group.id); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-amber-400" title="Archive Group"><Archive size={14} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-400 line-clamp-2 flex-1">{group.description || 'No description provided.'}</p>
                                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                                                    <div className="flex items-center gap-1"><Users size={12} /> {users.filter(u => u.groups?.some((g: any) => g.id === group.id)).length} Members</div>
                                                </div>
                                                <button onClick={() => setSelectedNode({ type: 'group', id: group.id, data: group })} className="absolute inset-0 z-0" />
                                            </div>
                                        ))}
                                </>
                            ) : selectedNode.type === 'archives_root' ? (
                                <>
                                    <div className="col-span-full mb-6 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                                    <Archive size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold">Group Archives</h2>
                                                    <p className="text-xs text-zinc-500">Restore or permanently delete archived groups</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedNode({ type: 'groups_root' })}
                                                className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
                                            >
                                                <ArrowRight size={12} className="rotate-180" /> BACK TO GROUPS
                                            </button>
                                        </div>

                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search archived groups..."
                                                value={archiveSearchQuery}
                                                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                                                className="w-full bg-[#111b21] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {archivedGroups
                                        .filter(g => g.name.toLowerCase().includes(archiveSearchQuery.toLowerCase()))
                                        .map(group => (
                                            <div key={group.id} className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl flex flex-col group relative border-amber-500/10 hover:border-amber-500/30 transition-all">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                                            <Archive size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-200">{group.name}</div>
                                                            <div className="text-[10px] text-amber-500/80 uppercase font-bold tracking-wider">Archived</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 relative z-10">
                                                        <button onClick={(e) => { e.stopPropagation(); handleRestoreGroup(group.id); }} className="p-1.5 hover:bg-white/10 rounded text-emerald-500" title="Restore Group"><RotateCcw size={14} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="p-1.5 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400" title="Delete Permanently"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-1 italic">
                                                    Archived on: {group.archivedAt ? new Date(group.archivedAt).toLocaleDateString() : 'Unknown'}
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">Conversations are kept for 6 months from archive date.</p>
                                            </div>
                                        ))}
                                    {archivedGroups.filter(g => g.name.toLowerCase().includes(archiveSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="col-span-full text-center py-20 text-zinc-600 italic border border-dashed border-white/5 rounded-xl">
                                            <Archive size={40} className="mx-auto mb-4 opacity-10" />
                                            {archiveSearchQuery ? `No archived groups matching "${archiveSearchQuery}"` : "No archived groups found."}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* USER GRID (DEFAULT) */
                                <>
                                    {selectedNode.type === 'root' && (
                                        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                                            <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl shadow-xl shadow-black/20">
                                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total Directory</div>
                                                <div className="text-4xl font-black text-white">{users.length}</div>
                                                <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Users size={10} /> Registered accounts</div>
                                            </div>
                                            <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Online Now</div>
                                                <div className="text-4xl font-black text-emerald-400">{onlineUserIds.size}</div>
                                                <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active sessions</div>
                                            </div>
                                            <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-2xl">
                                                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Admins</div>
                                                <div className="text-4xl font-black text-indigo-400">{users.filter(u => u.role === 'admin').length}</div>
                                                <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Shield size={10} /> Full permissions</div>
                                            </div>
                                        </div>
                                    )}

                                    {displayUsers.map(user => (
                                        <motion.div
                                            key={user.id} layout
                                            onClick={() => setViewingUser(user)}
                                            className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer relative group"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                                style={{
                                                    background: user.department
                                                        ? `linear-gradient(135deg, ${generateColor(user.department.name)}, ${generateColor(user.department.name)}dd)`
                                                        : 'linear-gradient(135deg, #6366f1, #a855f7)'
                                                }}
                                            >
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${getApiUrl()}${user.avatarUrl}`} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    user.username.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            {(selectedNode.type === 'dept' || selectedNode.type === 'team' || selectedNode.type === 'group' || selectedNode.type === 'root') && (
                                                <div
                                                    className={`absolute top-4 right-4 z-20 transition-all ${selectedUserIds.has(user.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100'}`}
                                                    onClick={(e) => toggleSelectUser(e, user.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedUserIds.has(user.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-black/40 border-zinc-500 hover:border-white'}`}>
                                                        {selectedUserIds.has(user.id) && <Check size={12} strokeWidth={4} />}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="font-bold text-zinc-200 truncate pr-6">{user.fullName || user.username}</div>
                                                    {user.department && (
                                                        <span
                                                            className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0"
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
                                                <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 capitalize">{user.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className={`w-2 h-2 rounded-full ${onlineUserIds.has(user.id) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                                                {selectedNode.type === 'group' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleGroupAdmin(user.id); }}
                                                        className={`p-1.5 rounded-lg border transition-all ${selectedNode.data?.adminIds?.includes(user.id)
                                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                            : 'bg-white/5 text-zinc-600 border-white/5 hover:text-zinc-400'}`}
                                                        title={selectedNode.data?.adminIds?.includes(user.id) ? "Remove Group Admin" : "Make Group Admin"}
                                                    >
                                                        <Shield size={14} fill={selectedNode.data?.adminIds?.includes(user.id) ? "currentColor" : "none"} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {displayUsers.length === 0 && (
                                        <div className="col-span-full text-center py-12 text-zinc-600 italic">No users found in this view.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </motion.div >

            {/* FLOATING BULK ACTION BAR */}
            <AnimatePresence>
                {
                    selectedUserIds.size > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#18181b] border border-white/10 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4"
                        >
                            <div className="flex items-center gap-2 text-sm font-bold border-r border-white/10 pr-4 mr-0">
                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs">
                                    {selectedUserIds.size}
                                </div>
                                <span className="text-zinc-300">Selected</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setBulkActionType('add'); setIsBulkGroupActionOpen(true); }}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                    <Plus size={14} /> Add to Group
                                </button>

                                {selectedNode.type === 'group' && (
                                    <button
                                        onClick={() => handleBulkRemoveFromGroup(selectedNode.id!)}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-red-500/20"
                                    >
                                        <Trash2 size={14} /> Remove from Group
                                    </button>
                                )}

                                {selectedNode.type === 'dept' && (
                                    <button
                                        onClick={handleBulkRemoveFromDept}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-red-500/20"
                                    >
                                        <Trash2 size={14} /> Remove from Dept
                                    </button>
                                )}

                                <button
                                    onClick={() => setSelectedUserIds(new Set())}
                                    className="ml-2 p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* USER DETAIL MODAL */}
            <AnimatePresence>
                {
                    viewingUser && (
                        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingUser(null)}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col"
                            >
                                {/* HEADER BACKGROUND & ACTIONS */}
                                <div className="h-32 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 relative">
                                    <button
                                        onClick={() => setViewingUser(null)}
                                        className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
                                    >
                                        <ArrowRight size={16} className="rotate-180" />
                                    </button>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {auth.user?.role === 'admin' && (
                                            <>
                                                <button onClick={() => { setEditingUser(viewingUser); setIsEditUserOpen(true); }} className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-zinc-300 hover:text-white transition-colors backdrop-blur-md"><Edit2 size={16} /></button>
                                                <button
                                                    onClick={() => {
                                                        if (selectedNode.type === 'group') handleRemoveFromGroup(viewingUser.id);
                                                        else if (selectedNode.type === 'team') handleRemoveFromTeam(viewingUser.id);
                                                        else if (selectedNode.type === 'dept') handleRemoveFromDept(viewingUser.id);
                                                        else handleDeleteUser(viewingUser.id);
                                                        setViewingUser(null);
                                                    }}
                                                    className="p-2 bg-black/20 hover:bg-red-500/20 rounded-full text-zinc-300 hover:text-red-400 transition-colors backdrop-blur-md"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* AVATAR & BASIC INFO */}
                                <div className="px-6 -mt-12 mb-4 flex items-end justify-between">
                                    <div className="w-24 h-24 rounded-3xl bg-[#09090b] p-1 shadow-2xl">
                                        <div
                                            className="w-full h-full rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-inner relative overflow-hidden"
                                            style={{
                                                background: viewingUser.department
                                                    ? `linear-gradient(135deg, ${generateColor(viewingUser.department.name)}, ${generateColor(viewingUser.department.name)}dd)`
                                                    : 'linear-gradient(135deg, #6366f1, #a855f7)'
                                            }}
                                        >
                                            {viewingUser.avatarUrl ? (
                                                <img src={viewingUser.avatarUrl.startsWith('http') ? viewingUser.avatarUrl : `${getApiUrl()}${viewingUser.avatarUrl}`} alt={viewingUser.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                viewingUser.username?.substring(0, 2).toUpperCase()
                                            )}
                                            {/* Status Dot */}
                                            <div className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-[#09090b] ${onlineUserIds.has(viewingUser.id) ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                                        </div>
                                    </div>
                                    <div className="mb-2 text-right">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${viewingUser.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            viewingUser.role === 'manager' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                'bg-zinc-800 text-zinc-400 border-zinc-700'
                                            }`}>
                                            {viewingUser.role}
                                        </span>
                                    </div>
                                </div>

                                {/* BODY */}
                                <div className="px-6 pb-8 flex-1 flex flex-col gap-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white leading-tight">{viewingUser.fullName}</h3>
                                        <p className="text-sm text-zinc-500">{viewingUser.email}</p>
                                        {viewingUser.whatsappNumber && (
                                            <p className="text-xs text-emerald-500/80 mt-1 flex items-center gap-1">WS: {viewingUser.whatsappNumber}</p>
                                        )}
                                    </div>

                                    {/* Dept & Teams */}
                                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                        {viewingUser.department ? (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-white/5 text-zinc-400"><Briefcase size={16} /></div>
                                                <div>
                                                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Department</div>
                                                    <div className="text-sm text-zinc-200 font-medium">{viewingUser.department.name}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-zinc-500 italic">No department assigned</div>
                                        )}

                                        {viewingUser.teams && viewingUser.teams.length > 0 && (
                                            <div className="pt-3 border-t border-white/5">
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Teams</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {viewingUser.teams.map((t: any) => (
                                                        <span key={t.id} className="text-xs bg-black/40 border border-white/10 px-2 py-1 rounded text-zinc-300">{t.name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Groups */}
                                    <div>
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Hash size={12} /> Groups
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {viewingUser.groups && viewingUser.groups.length > 0 ? (
                                                viewingUser.groups.map((g: any) => (
                                                    <span key={g.id} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">
                                                        {g.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-zinc-700 italic">No groups</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Placeholder Stats Area */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Activity</div>
                                            <div className="text-xl font-bold text-emerald-400 mt-1">--</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* MODALS */}

            {/* Create User Modal */}
            <AnimatePresence>
                {isAddUserOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">Create New User</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {newUserFile ? (
                                            <img src={URL.createObjectURL(newUserFile as Blob)} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={32} className="text-zinc-600" />
                                        )}
                                    </div>
                                    <label className="block flex-1 cursor-pointer">
                                        <div className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-xs hover:bg-zinc-700 transition-colors text-center text-zinc-300 font-medium">
                                            {newUserFile ? 'Change Photo' : 'Upload Photo'}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setNewUserFile(e.target.files ? e.target.files[0] : null)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Full Name (Name Surname)"
                                    value={newUser.fullName}
                                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                />
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Username (optional)"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                />
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="px-3 py-2 bg-zinc-800 border border-white/10 rounded hover:bg-zinc-700 text-zinc-400"
                                        title={showPassword ? "Hide Password" : "Show Password"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const randomPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                                            setNewUser({ ...newUser, password: randomPass });
                                        }}
                                        className="px-3 py-2 bg-zinc-800 border border-white/10 rounded hover:bg-zinc-700 text-zinc-400"
                                        title="Generate Password"
                                    >
                                        <Hash size={16} />
                                    </button>
                                </div>
                                <CustomSelect
                                    value={newUser.role}
                                    onChange={(val) => setNewUser({ ...newUser, role: val })}
                                    options={[
                                        { value: 'viewer', label: 'Viewer' },
                                        { value: 'contributor', label: 'Contributor' },
                                        { value: 'manager', label: 'Manager' },
                                        { value: 'admin', label: 'Admin' }
                                    ]}
                                />
                                {newUser.role === 'manager' && (
                                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <p className="text-[10px] text-purple-400 font-bold uppercase mb-2 flex items-center gap-1"><Building size={12} /> Authorized Department</p>
                                        <CustomSelect
                                            value={newUser.departmentId}
                                            onChange={(val) => setNewUser({ ...newUser, departmentId: val })}
                                            options={departments.map(d => ({ value: d.id.toString(), label: d.name }))}
                                            placeholder="Select Department..."
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsAddUserOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleCreateUser} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded">Create User</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {isEditUserOpen && editingUser && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">Edit User</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {editUserFile ? (
                                            <img src={URL.createObjectURL(editUserFile as Blob)} alt="Preview" className="w-full h-full object-cover" />
                                        ) : editingUser.avatarUrl ? (
                                            <img src={editingUser.avatarUrl.startsWith('http') ? editingUser.avatarUrl : `${getApiUrl()}${editingUser.avatarUrl}`} alt="Current" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={32} className="text-zinc-600" />
                                        )}
                                    </div>
                                    <label className="block flex-1 cursor-pointer">
                                        <div className="px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-xs hover:bg-zinc-700 transition-colors text-center text-zinc-300 font-medium">
                                            {editUserFile ? 'Change Photo' : 'Upload New Photo'}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setEditUserFile(e.target.files ? e.target.files[0] : null)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Full Name (Name Surname)"
                                    value={editingUser.fullName}
                                    onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                                    title="Full Name"
                                />
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Username"
                                    value={editingUser.username || ''}
                                    onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                                    title="Username"
                                />
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Email"
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    title="Email"
                                />
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="New Password (leave empty to keep)"
                                        value={editingUser.password || ''} // Handle undefined
                                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="px-3 py-2 bg-zinc-800 border border-white/10 rounded hover:bg-zinc-700 text-zinc-400"
                                        title={showPassword ? "Hide Password" : "Show Password"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const randomPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                                            setEditingUser({ ...editingUser, password: randomPass });
                                        }}
                                        className="px-3 py-2 bg-zinc-800 border border-white/10 rounded hover:bg-zinc-700 text-zinc-400"
                                        title="Generate Password"
                                    >
                                        <Hash size={16} />
                                    </button>
                                </div>

                                <CustomSelect
                                    value={editingUser.role}
                                    onChange={(val) => setEditingUser({ ...editingUser, role: val })}
                                    options={[
                                        { value: 'viewer', label: 'Viewer' },
                                        { value: 'contributor', label: 'Contributor' },
                                        { value: 'manager', label: 'Manager' },
                                        { value: 'admin', label: 'Admin' }
                                    ]}
                                />
                                {editingUser.role === 'manager' && (
                                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <p className="text-[10px] text-purple-400 font-bold uppercase mb-2 flex items-center gap-1"><Building size={12} /> Authorized Department</p>
                                        <CustomSelect
                                            value={editingUser.departmentId ? editingUser.departmentId.toString() : editingUser.department?.id ? editingUser.department.id.toString() : ''}
                                            onChange={(val) => setEditingUser({ ...editingUser, departmentId: val })}
                                            options={departments.map(d => ({ value: d.id.toString(), label: d.name }))}
                                            placeholder="Select Department..."
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => { setIsEditUserOpen(false); setEditingUser(null); setEditUserFile(null); setShowPassword(false); }} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleEditUser} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Department Modal */}
            <AnimatePresence>
                {isEditDeptOpen && editingDept && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">Edit Department</h2>
                            <div className="space-y-3">
                                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Department Name" value={editingDept.name} onChange={e => setEditingDept({ ...editingDept, name: e.target.value })} />
                                <textarea className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Description" rows={3} value={editingDept.description} onChange={e => setEditingDept({ ...editingDept, description: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsEditDeptOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleEditDept} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Dept Modal */}
            <AnimatePresence>
                {isAddDeptOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">New Department</h2>
                            <div className="space-y-3">
                                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Department Name" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} />
                                <textarea className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Description" rows={3} value={newDept.description} onChange={e => setNewDept({ ...newDept, description: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsAddDeptOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleAddDept} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded">Create Department</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Team Modal */}
            <AnimatePresence>
                {isAddTeamOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">Add Team</h2>
                            <div className="space-y-3">
                                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Team Name" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} />
                                <textarea className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Description" rows={3} value={newTeam.description} onChange={e => setNewTeam({ ...newTeam, description: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsAddTeamOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleAddTeam} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded">Create Team</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Group Modal */}
            <AnimatePresence>
                {isAddGroupOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">New Group</h2>
                            <div className="space-y-3">
                                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Group Name" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                                <textarea className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" placeholder="Description" rows={3} value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} />
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Privacy Mode</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setNewGroup({ ...newGroup, isPrivate: false })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${!newGroup.isPrivate ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/5 text-zinc-500'}`}
                                        >
                                            <Globe size={14} /> Public
                                        </button>
                                        <button
                                            onClick={() => setNewGroup({ ...newGroup, isPrivate: true })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${newGroup.isPrivate ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-black/40 border-white/5 text-zinc-500'}`}
                                        >
                                            <Shield size={14} /> Private
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-zinc-500">
                                        {newGroup.isPrivate
                                            ? "Invite Only: Only members can find and join."
                                            : "Public: Visible in Discovery Portal for everyone."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsAddGroupOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleAddGroup} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded">Create Group</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Group Modal */}
            <AnimatePresence>
                {isEditGroupOpen && editingGroup && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">Edit Group</h2>
                            <div className="space-y-3">
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Group Name"
                                    value={editingGroup.name}
                                    onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                />
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                    placeholder="Description"
                                    rows={3}
                                    value={editingGroup.description}
                                    onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })}
                                />
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Privacy Mode</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingGroup({ ...editingGroup, isPrivate: false })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${!editingGroup.isPrivate ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/5 text-zinc-500'}`}
                                        >
                                            <Globe size={14} /> Public
                                        </button>
                                        <button
                                            onClick={() => setEditingGroup({ ...editingGroup, isPrivate: true })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-xs font-bold ${editingGroup.isPrivate ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-black/40 border-white/5 text-zinc-500'}`}
                                        >
                                            <Shield size={14} /> Private
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-zinc-500">
                                        {editingGroup.isPrivate
                                            ? "Invite Only: Only members can find and join."
                                            : "Public: Visible in Discovery Portal for everyone."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsEditGroupOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button onClick={handleEditGroup} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* BULK GROUP ACTION MODAL */}
            <AnimatePresence>
                {isBulkGroupActionOpen && (
                    <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-96 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-4">
                                {bulkActionType === 'add' ? 'Add Users to Group' : 'Remove form Group'}
                            </h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                Select the target group for {selectedUserIds.size} users.
                            </p>
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                                {groups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => handleBulkAddToGroup(group.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-black/40 hover:bg-white/5 border border-white/5 rounded-lg text-sm text-zinc-300 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-blue-500" />
                                            {group.name}
                                        </div>
                                        <Plus size={14} className="opacity-0 group-hover:opacity-100 text-zinc-400" />
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsBulkGroupActionOpen(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* ADD MEMBERS TO GROUP MODAL */}
            <AnimatePresence>
                {isAddToGroupModalOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 w-[800px] h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Add Members to Group</h2>
                                    <p className="text-xs text-zinc-500">Select users to add to <span className="text-indigo-400 font-bold">{selectedNode.data?.name}</span></p>
                                </div>
                                <button onClick={() => setIsAddToGroupModalOpen(false)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* LEFT: FILTERS */}
                                <div className="w-48 bg-black/20 border-r border-white/10 p-2 overflow-y-auto">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2 px-2">Filter by Department</div>
                                    <button
                                        onClick={() => setAddToGroupDeptFilter('all')}
                                        className={`w-full text-left px-3 py-2 rounded text-xs mb-1 ${addToGroupDeptFilter === 'all' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5'}`}
                                    >
                                        All Departments
                                    </button>
                                    {departments.map(dept => (
                                        <button
                                            key={dept.id}
                                            onClick={() => setAddToGroupDeptFilter(dept.id)}
                                            className={`w-full text-left px-3 py-2 rounded text-xs mb-1 truncate ${addToGroupDeptFilter === dept.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5'}`}
                                        >
                                            {dept.name}
                                        </button>
                                    ))}
                                </div>

                                {/* RIGHT: USER LIST */}
                                <div className="flex-1 p-4 overflow-y-auto flex flex-col">
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search users by name..."
                                                value={addToGroupSearchQuery}
                                                onChange={(e) => setAddToGroupSearchQuery(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500/50 focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const filtered = users
                                                    .filter(u => !u.groups?.some((g: any) => g.id === selectedNode.data?.id))
                                                    .filter(u => addToGroupDeptFilter === 'all' || u.department?.id === addToGroupDeptFilter)
                                                    .filter(u =>
                                                        (u.fullName && u.fullName.toLowerCase().includes(addToGroupSearchQuery.toLowerCase())) ||
                                                        (u.username && u.username.toLowerCase().includes(addToGroupSearchQuery.toLowerCase()))
                                                    );
                                                const allIds = filtered.map(u => u.id);
                                                const isAllSelected = allIds.length > 0 && allIds.every(id => selectedUsersToAdd.has(id));

                                                if (isAllSelected) {
                                                    setSelectedUsersToAdd(new Set());
                                                } else {
                                                    setSelectedUsersToAdd(new Set(allIds));
                                                }
                                            }}
                                            className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {users
                                            .filter(u => !u.groups?.some((g: any) => g.id === selectedNode.data?.id)) // Exclude existing
                                            .filter(u => addToGroupDeptFilter === 'all' || u.department?.id === addToGroupDeptFilter)
                                            .filter(u =>
                                                (u.fullName && u.fullName.toLowerCase().includes(addToGroupSearchQuery.toLowerCase())) ||
                                                (u.username && u.username.toLowerCase().includes(addToGroupSearchQuery.toLowerCase()))
                                            )
                                            .map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleSelectUserToAdd(user.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedUsersToAdd.has(user.id) ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'}`}
                                                >
                                                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${selectedUsersToAdd.has(user.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-600 bg-transparent'}`}>
                                                        {selectedUsersToAdd.has(user.id) && <Check size={12} />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-bold">
                                                        {user.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                            <div className="text-sm font-bold text-zinc-200 truncate">{user.fullName || user.username}</div>
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
                                                        <div className="text-[10px] text-zinc-500 truncate">@{user.username}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        {users.filter(u => !u.groups?.some((g: any) => g.id === selectedNode.data?.id)).length === 0 && (
                                            <div className="col-span-2 text-center text-zinc-500 py-8 italic">All users are already in this group.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                                <span className="text-xs text-zinc-500">{selectedUsersToAdd.size} users selected</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsAddToGroupModalOpen(false)} className="px-4 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                    <button
                                        onClick={handleAddUsersToGroup}
                                        disabled={selectedUsersToAdd.size === 0}
                                        className="px-6 py-2 rounded bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                                    >
                                        Add Selected Users
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD MEMBERS TO DEPT/TEAM MODAL */}
            <AnimatePresence>
                {isAddToDeptModalOpen && (
                    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 border border-white/10 w-[800px] h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Add Members to {selectedNode.type === 'team' ? 'Team' : 'Department'}</h2>
                                    <p className="text-xs text-zinc-500">Select users to add to <span className={`${selectedNode.type === 'team' ? 'text-indigo-400' : 'text-emerald-400'} font-bold`}>{selectedNode.data?.name}</span></p>
                                </div>
                                <button onClick={() => setIsAddToDeptModalOpen(false)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* LEFT: FILTERS */}
                                <div className="w-48 bg-black/20 border-r border-white/10 p-2 overflow-y-auto">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2 px-2 text-center">Filter Selection</div>
                                    <button
                                        onClick={() => setAddToGroupDeptFilter('all')}
                                        className={`w-full text-left px-3 py-2 rounded text-xs mb-1 ${addToGroupDeptFilter === 'all' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-white/5'}`}
                                    >
                                        All Departments
                                    </button>
                                    {departments.map(dept => (
                                        <button
                                            key={dept.id}
                                            onClick={() => setAddToGroupDeptFilter(dept.id)}
                                            className={`w-full text-left px-3 py-2 rounded text-xs mb-1 truncate ${addToGroupDeptFilter === dept.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:bg-white/5'}`}
                                        >
                                            {dept.name}
                                        </button>
                                    ))}
                                </div>

                                {/* RIGHT: USER LIST */}
                                <div className="flex-1 p-4 overflow-y-auto flex flex-col">
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search users by name..."
                                                value={addToGroupSearchQuery}
                                                onChange={(e) => setAddToGroupSearchQuery(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const filtered = users
                                                    .filter(u => {
                                                        if (selectedNode.type === 'team') {
                                                            return !u.teams?.some((t: any) => t.id === selectedNode.data?.id);
                                                        } else {
                                                            return u.department?.id !== selectedNode.data?.id;
                                                        }
                                                    })
                                                    .filter(u => addToGroupDeptFilter === 'all' || u.department?.id === addToGroupDeptFilter)
                                                    .filter(u =>
                                                        (u.fullName && u.fullName.toLowerCase().includes(addToGroupSearchQuery.toLowerCase())) ||
                                                        (u.username && u.username.toLowerCase().includes(addToGroupSearchQuery.toLowerCase()))
                                                    );
                                                const allIds = filtered.map(u => u.id);
                                                const isAllSelected = allIds.length > 0 && allIds.every(id => selectedUsersToAdd.has(id));

                                                if (isAllSelected) {
                                                    setSelectedUsersToAdd(new Set());
                                                } else {
                                                    setSelectedUsersToAdd(new Set(allIds));
                                                }
                                            }}
                                            className={`px-3 py-2 ${selectedNode.type === 'team' ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'} border rounded-lg text-xs font-bold whitespace-nowrap transition-colors`}
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {users
                                            .filter(u => {
                                                if (selectedNode.type === 'team') {
                                                    // For teams, check the membership relationship
                                                    return !u.teams?.some((t: any) => t.id === selectedNode.data?.id);
                                                } else {
                                                    // For departments, check the direct relationship
                                                    return u.department?.id !== selectedNode.data?.id;
                                                }
                                            })
                                            .filter(u => addToGroupDeptFilter === 'all' || u.department?.id === addToGroupDeptFilter)
                                            .filter(u =>
                                                (u.fullName && u.fullName.toLowerCase().includes(addToGroupSearchQuery.toLowerCase())) ||
                                                (u.username && u.username.toLowerCase().includes(addToGroupSearchQuery.toLowerCase()))
                                            )
                                            .map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleSelectUserToAdd(user.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedUsersToAdd.has(user.id) ? (selectedNode.type === 'team' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-emerald-500/10 border-emerald-500/50') : 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800'}`}
                                                >
                                                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${selectedUsersToAdd.has(user.id) ? (selectedNode.type === 'team' ? 'bg-indigo-500 border-indigo-500' : 'bg-emerald-500 border-emerald-500') + ' text-white' : 'border-zinc-600 bg-transparent'}`}>
                                                        {selectedUsersToAdd.has(user.id) && <Check size={12} />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-bold">
                                                        {user.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                            <div className="text-sm font-bold text-zinc-200 truncate">{user.fullName || user.username}</div>
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
                                                        <div className="text-[10px] text-zinc-500 truncate">@{user.username}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        {users.filter(u => u.department?.id !== selectedNode.data?.id).length === 0 && (
                                            <div className="col-span-2 text-center text-zinc-500 py-8 italic">All users are already in this department.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
                                <span className="text-xs text-zinc-500">{selectedUsersToAdd.size} users selected</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsAddToDeptModalOpen(false)} className="px-4 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                                    <button
                                        onClick={handleAddUsersToDept}
                                        disabled={selectedUsersToAdd.size === 0}
                                        className={`px-6 py-2 rounded ${selectedNode.type === 'team' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors`}
                                    >
                                        Add Selected Users
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

