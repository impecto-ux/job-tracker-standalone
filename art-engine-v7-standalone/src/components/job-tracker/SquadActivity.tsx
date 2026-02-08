import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, MessageSquare, AlertCircle, Clock, User } from 'lucide-react';

interface Activity {
    id: string;
    type: 'completion' | 'start' | 'update' | 'revision';
    user: string;
    taskTitle: string;
    timestamp: string;
    description?: string;
}

interface SquadActivityProps {
    tasks: any[];
}

export const SquadActivity: React.FC<SquadActivityProps> = ({ tasks }) => {
    const activities = useMemo(() => {
        const list: Activity[] = [];

        // 1. Recent Completions
        tasks.filter(t => t.status === 'done' && t.completedAt).forEach(t => {
            list.push({
                id: `done-${t.id}`,
                type: 'completion',
                user: (typeof t.owner === 'object' ? t.owner?.fullName : t.owner) || 'Someone',
                taskTitle: t.title,
                timestamp: t.completedAt,
                description: `completed a task`
            });
        });

        // 2. Recent Starts (In Progress)
        tasks.filter(t => t.status === 'in_progress' && t.startedAt).forEach(t => {
            list.push({
                id: `start-${t.id}`,
                type: 'start',
                user: (typeof t.owner === 'object' ? t.owner?.fullName : t.owner) || 'Someone',
                taskTitle: t.title,
                timestamp: t.startedAt,
                description: `started working on`
            });
        });

        // 3. Revisions
        tasks.filter(t => t.status?.startsWith('revision_') && t.updatedAt).forEach(t => {
            list.push({
                id: `rev-${t.id}-${t.updatedAt}`,
                type: 'revision',
                user: t.requester?.fullName || t.requester || 'Requester',
                taskTitle: t.title,
                timestamp: t.updatedAt,
                description: `requested revision for`
            });
        });

        // Sort by timestamp
        return list
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);
    }, [tasks]);

    return (
        <div className="flex flex-col h-full bg-zinc-950/30 border-l border-white/5 w-72 shrink-0 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-500 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Squad Activity</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[9px] font-black text-amber-500 uppercase">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {activities.map((activity) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-zinc-900/40 border border-white/[0.03] p-3 rounded-xl relative group hover:border-white/10 transition-colors"
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm
                                    ${activity.type === 'completion' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                        activity.type === 'start' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                            'bg-red-500/10 border-red-500/20 text-red-500'}
                                `}>
                                    {activity.type === 'completion' ? <CheckCircle2 size={14} /> :
                                        activity.type === 'start' ? <Clock size={14} /> :
                                            <AlertCircle size={14} />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1 justify-between">
                                        <span className="text-[11px] font-bold text-zinc-200 truncate pr-2">
                                            {activity.user}
                                        </span>
                                        <span className="text-[9px] text-zinc-600 font-mono whitespace-nowrap">
                                            {formatTimeAgo(activity.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 italic mb-1">
                                        {activity.description}
                                    </p>
                                    <h4 className="text-[10px] font-black text-zinc-300 line-clamp-2 uppercase tracking-tight leading-snug">
                                        {activity.taskTitle}
                                    </h4>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {activities.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 filter grayscale">
                        <User size={32} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Recent Activity</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function formatTimeAgo(timestamp: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}
