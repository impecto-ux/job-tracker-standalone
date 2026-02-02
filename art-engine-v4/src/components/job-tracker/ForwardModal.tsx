import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Circle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import api from '@/lib/api';

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (targets: { type: 'channel' | 'user', id: number, name: string }[]) => void;
}

export default function ForwardModal({ isOpen, onClose, onSend }: ForwardModalProps) {
    const { chat, auth } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedTargets, setSelectedTargets] = useState<{ type: 'channel' | 'user', id: number, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && auth.token) {
            // Load users for forwarding
            api.get('/users').then(res => setUsers(res.data)).catch(console.error);
            setSelectedTargets([]); // Reset selection
            setSearchTerm('');
        }
    }, [isOpen, auth.token]);

    const handleToggle = (target: { type: 'channel' | 'user', id: number, name: string }) => {
        setSelectedTargets(prev => {
            const exists = prev.find(t => t.type === target.type && t.id === target.id);
            if (exists) {
                return prev.filter(t => !(t.type === target.type && t.id === target.id));
            } else {
                return [...prev, target];
            }
        });
    };

    // Filter Logic
    const filteredChannels = chat.channels.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredUsers = users.filter(u =>
        (u.fullName || u.username).toLowerCase().includes(searchTerm.toLowerCase()) &&
        u.id !== auth.user?.id // Don't forward to self (optional)
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50">
                        <h2 className="text-lg font-bold text-white">Forward Message</h2>
                        <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-white/5 bg-zinc-900/30">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search channels or people..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {/* Channels Section */}
                        {filteredChannels.length > 0 && (
                            <div className="mb-4">
                                <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Channels</div>
                                {filteredChannels.map(channel => {
                                    const isSelected = selectedTargets.some(t => t.type === 'channel' && t.id === channel.id);
                                    return (
                                        <div
                                            key={`c-${channel.id}`}
                                            onClick={() => handleToggle({ type: 'channel', id: channel.id, name: channel.name })}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                                {isSelected && <CheckCircle2 size={14} className="text-black" />}
                                            </div>
                                            <span className={`text-sm ${isSelected ? 'text-emerald-500 font-bold' : 'text-zinc-300'}`}># {channel.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Users Section */}
                        {filteredUsers.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">People</div>
                                {filteredUsers.map(user => {
                                    const isSelected = selectedTargets.some(t => t.type === 'user' && t.id === user.id);
                                    return (
                                        <div
                                            key={`u-${user.id}`}
                                            onClick={() => handleToggle({ type: 'user', id: user.id, name: user.fullName || user.username })}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                                                {isSelected && <CheckCircle2 size={14} className="text-black" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm ${isSelected ? 'text-emerald-500 font-bold' : 'text-zinc-300'}`}>{user.fullName || user.username}</span>
                                                <span className="text-[10px] text-zinc-500">{user.email}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {filteredChannels.length === 0 && filteredUsers.length === 0 && (
                            <div className="mobile-search-empty text-center py-8 text-zinc-500 text-sm">
                                No results found
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
                        <div className="flex-1 flex items-center text-xs text-zinc-500">
                            {selectedTargets.length} selected
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={selectedTargets.length === 0}
                            onClick={() => onSend(selectedTargets)}
                            className="px-4 py-2 text-xs font-bold bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Send size={14} /> Send
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
