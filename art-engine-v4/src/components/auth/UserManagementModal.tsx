import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Mail, Phone, Save, Search, Check, AlertCircle, Edit3, Trash2, Key } from 'lucide-react';
import api from '../../lib/api';

interface UserData {
    id: number;
    fullName: string;
    email: string;
    role: string;
    whatsappNumber?: string;
    isActive: boolean;
}

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        whatsappNumber: '',
        role: '',
        password: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            setSavingId(userId);
            await api.patch(`/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Failed to update role", error);
            alert("Failed to update role. Ensure you have admin permissions.");
        } finally {
            setSavingId(null);
        }
    };

    const handleEditStart = (user: UserData) => {
        setEditingUserId(user.id);
        setEditForm({
            fullName: user.fullName,
            email: user.email,
            whatsappNumber: user.whatsappNumber || '',
            role: user.role,
            password: ''
        });
    };

    const handleEditSave = async (userId: number) => {
        try {
            setSavingId(userId);
            const payload: any = {
                fullName: editForm.fullName,
                email: editForm.email,
                whatsappNumber: editForm.whatsappNumber || null,
                role: editForm.role
            };

            if (editForm.password) {
                payload.passwordHash = editForm.password;
            }

            await api.patch(`/users/${userId}`, payload);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...payload, whatsappNumber: editForm.whatsappNumber || undefined } : u));
            setEditingUserId(null);
        } catch (error: any) {
            console.error("Failed to update user", error);
            alert(error.response?.data?.message || "Failed to update user.");
        } finally {
            setSavingId(null);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            setSavingId(userId);
            await api.patch(`/users/${userId}`, { isActive: false }); // Soft delete
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user.");
        } finally {
            setSavingId(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-4xl max-h-[80vh] bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">User Management</h2>
                            <p className="text-xs text-zinc-500 font-medium tracking-tight">Manage accounts and authorization levels</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Sub-header / Search */}
                <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 text-white text-sm transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:border-white/10 transition-all group"
                                >
                                    {editingUserId === user.id ? (
                                        <div className="flex-1 flex flex-col gap-3 pr-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.fullName}
                                                        onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                                                    <input
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">WhatsApp Number</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.whatsappNumber}
                                                        onChange={e => setEditForm({ ...editForm, whatsappNumber: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">New Password (Leave blank to keep)</label>
                                                    <div className="relative">
                                                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                        <input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            value={editForm.password}
                                                            onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 transition-colors shrink-0">
                                                {user.fullName[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-white">{user.fullName}</h3>
                                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        user.role === 'manager' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                        <Mail size={10} /> {user.email}
                                                    </span>
                                                    {user.whatsappNumber && (
                                                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                            <Phone size={10} /> {user.whatsappNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {editingUserId === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditSave(user.id)}
                                                    disabled={savingId === user.id}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                                >
                                                    {savingId === user.id ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={user.role}
                                                    disabled={savingId === user.id}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="contributor">Contributor</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="admin">Admin</option>
                                                </select>

                                                <button
                                                    onClick={() => handleEditStart(user)}
                                                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit3 size={16} />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}

                                        {savingId === user.id && editingUserId !== user.id && (
                                            <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredUsers.length === 0 && (
                                <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-white/10">
                                    <Search className="mx-auto text-zinc-600 mb-4" size={32} />
                                    <p className="text-zinc-500 text-sm font-medium">No users found matching "{search}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        <AlertCircle size={12} />
                        Total Users: {users.length}
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default UserManagementModal;
