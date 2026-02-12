import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Save, Lock, Phone, Briefcase, UserCircle } from 'lucide-react';
import api from '@/lib/api';
import { ThemeSelector } from '@/components/ThemeSelector';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    onUpdate: () => void;
}

export default function UserProfileModal({ isOpen, onClose, currentUser, onUpdate }: UserProfileModalProps) {
    const [fullName, setFullName] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.fullName || '');
            setWhatsappNumber(currentUser.whatsappNumber || '');
            setPassword(''); // Don't show current password
        }
    }, [currentUser, isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const payload: any = { fullName, whatsappNumber };
            if (password) payload.password = password;

            await api.patch(`/users/${currentUser.id}`, payload);
            onUpdate(); // Refresh parent data
            onClose();
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !currentUser) return null;

    return (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <UserCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">My Profile</h2>
                            <p className="text-xs text-zinc-500 font-mono">{currentUser.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">

                    {/* Role Badge */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-bold text-zinc-500 uppercase">Role:</span>
                        <span className={`px-2 py-0.5 rounded textxs font-bold uppercase ${currentUser.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                            currentUser.role === 'manager' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                            {currentUser.role}
                        </span>
                        <span className="text-xs font-bold text-zinc-500 uppercase ml-4">Dept:</span>
                        <span className="text-zinc-300 text-xs font-bold">{currentUser.department?.name || 'Unassigned'}</span>
                    </div>

                    {/* Appearance */}
                    <div className="space-y-2 pb-4 border-b border-white/5">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">Appearance</label>
                        <ThemeSelector />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><User size={12} /> Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Phone size={12} /> WhatsApp Number</label>
                        <input
                            type="text"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value)}
                            placeholder="+1234567890"
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Lock size={12} /> New Password (Optional)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        {isLoading ? <span className="animate-spin">⟳</span> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
