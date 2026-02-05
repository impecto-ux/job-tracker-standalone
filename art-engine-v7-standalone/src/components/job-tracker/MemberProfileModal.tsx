import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, MessageSquare, Phone, Briefcase, UserCircle, Shield } from 'lucide-react';
import api from '@/lib/api';

interface MemberProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: any; // User object
    currentUserId?: number; // To hide DM button if viewing self
    onDmCreated: (channelId: number) => void;
}

export default function MemberProfileModal({ isOpen, onClose, member, currentUserId, onDmCreated }: MemberProfileModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen || !member) return null;

    const handleSendMessage = async () => {
        setIsLoading(true);
        try {
            const res = await api.post('/channels/dm', { targetUserId: member.id });
            onDmCreated(res.data.id);
            onClose();
        } catch (error) {
            console.error("Failed to create DM", error);
            alert("Failed to start chat.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white z-10"
                >
                    <X size={24} />
                </button>

                {/* Header / Avatar Area */}
                <div className="h-32 bg-gradient-to-br from-emerald-900/50 to-zinc-900 border-b border-white/5 relative">
                    <div className="absolute -bottom-10 left-6">
                        <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-[#18181b] flex items-center justify-center overflow-hidden shadow-xl">
                            {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle size={64} className="text-zinc-600" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-12 px-6 pb-6 space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {member.fullName}
                            {member.role === 'admin' && <Shield size={16} className="text-red-400" />}
                        </h2>
                        <p className="text-zinc-500 font-mono text-sm">@{member.username || member.email.split('@')[0]}</p>
                    </div>

                    {/* Role & Dept Badges */}
                    <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${member.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                            member.role === 'manager' ? 'bg-indigo-500/20 text-indigo-400' :
                                'bg-zinc-800 text-zinc-300'
                            }`}>
                            {member.role}
                        </span>
                        {member.department && (
                            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {member.department.name}
                            </span>
                        )}
                    </div>

                    <div className="h-px bg-white/10 w-full my-4" />

                    {/* Contact Info */}
                    <div className="space-y-3">
                        {member.whatsappNumber && (
                            <div className="flex items-center gap-3 text-zinc-400 text-sm">
                                <Phone size={16} className="text-emerald-500" />
                                <span>{member.whatsappNumber}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Briefcase size={16} className="text-indigo-500" />
                            <span>{member.department?.name || 'No Department'}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6">
                        {currentUserId !== member.id && (
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                            >
                                {isLoading ? (
                                    <span className="animate-spin">⟳</span>
                                ) : (
                                    <MessageSquare size={18} />
                                )}
                                Send Message
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
