import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, Trash2, Edit2, PlayCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

interface MyRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
    onNavigateToTask?: (task: Task) => void;
}

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    department: { name: string };
    createdAt: string;
}

export default function MyRequestsModal({ isOpen, onClose, isEmbedded = false, onNavigateToTask }: MyRequestsModalProps) {
    const { auth } = useStore();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [editData, setEditData] = useState({ title: '', description: '' });

    const loadMyRequests = async () => {
        if (!auth.user) return;
        setIsLoading(true);
        try {
            const res = await api.get(`/tasks?requesterId=${auth.user.id}&_t=${Date.now()}`);
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to load my requests", error);
            // Don't crash, just valid empty state or connection error handling could go here
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadMyRequests();
        }
    }, [isOpen]);

    const handleEdit = (task: Task) => {
        setIsEditing(task.id);
        setEditData({ title: task.title, description: task.description });
    };

    const handleSave = async (id: number) => {
        try {
            await api.patch(`/tasks/${id}`, editData);
            setIsEditing(null);
            loadMyRequests(); // Refresh
        } catch (error: any) {
            console.error("Failed to update task", error);
            if (error.response?.status === 403) {
                alert(error.response?.data?.message || "Bu işlem için yetkiniz yok.");
            } else {
                alert("Failed to update task.");
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to cancel (delete) this request?")) return;
        try {
            await api.delete(`/tasks/${id}`);
            loadMyRequests(); // Refresh
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("Failed to delete task.");
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'in_progress': return <PlayCircle size={16} className="text-blue-500" />;
            case 'blocked': return <AlertCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-zinc-500" />;
        }
    };

    if (!isOpen) return null;

    const Content = (
        <div className={`bg-[#121214] border border-white/10 ${isEmbedded ? 'h-full border-0' : 'rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl'} flex flex-col overflow-hidden`}>
            {/* Header */}
            {!isEmbedded && (
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">My Requests</h2>
                        <p className="text-sm text-zinc-500">Manage tasks you've requested</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'p-4' : 'p-6'} space-y-4 custom-scrollbar`}>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="text-emerald-500 animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        No requests found. Create tasks using the chat!
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group">
                            {isEditing === task.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editData.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                        placeholder="Task Title"
                                    />
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[80px]"
                                        placeholder="Description..."
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsEditing(null)}
                                            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded hover:bg-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleSave(task.id)}
                                            className="px-3 py-1.5 text-xs bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-zinc-800/50 rounded-lg shrink-0 mt-1">
                                        {getStatusIcon(task.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                                                #{task.id}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${task.priority === 'P1' ? 'bg-red-500/10 text-red-500' :
                                                task.priority === 'P2' ? 'bg-amber-500/10 text-amber-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {task.priority}
                                            </span>
                                            <span className="text-[10px] text-zinc-600 truncate">
                                                {new Date(task.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-white mb-1 truncate">{task.title}</h3>
                                        <p className="text-xs text-zinc-400 line-clamp-2">{task.description}</p>
                                        <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-2">
                                            <span>Dept: {task.department?.name || 'General'}</span>
                                            <span>•</span>
                                            <span className={`capitalize px-1.5 py-0.5 rounded font-bold ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                                                        task.status === 'blocked' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-zinc-500/10 text-zinc-500'
                                                }`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            {onNavigateToTask && (
                                                <>
                                                    <span>•</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToTask(task); }}
                                                        className="text-emerald-500 hover:underline font-bold cursor-pointer"
                                                    >
                                                        Go to Chat
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(task)}
                                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Cancel Request"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (isEmbedded) {
        return Content;
    }

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
                    className="w-full max-w-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {Content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
