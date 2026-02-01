import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Tag, Calendar, AlertCircle, CheckCircle2, Zap, MessageSquare, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface StatsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: any; // Task object from the stats drill-down
}

export function StatsDrawer({ isOpen, onClose, task }: StatsDrawerProps) {
    if (!task) return null;

    const priorityColor = {
        'P1': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        'P2': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        'P3': 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    }[task.priority as 'P1' | 'P2' | 'P3'] || 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-950 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className={cn("px-2 py-0.5 rounded border text-[10px] font-black tracking-tighter uppercase", priorityColor)}>
                                    {task.priority}
                                </div>
                                <span className="text-xs font-mono text-zinc-500">#{task.id}</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Title & Status */}
                            <section>
                                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                                    {task.title}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                                        <div className={cn("w-2 h-2 rounded-full animate-pulse",
                                            task.status === 'done' ? 'bg-emerald-500' :
                                                task.status === 'in_progress' ? 'bg-blue-500' : 'bg-zinc-500'
                                        )} />
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                                            {task.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Clock size={14} />
                                        Age: {task.ageHours}h
                                    </span>
                                </div>
                            </section>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-2xl">
                                    <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest block mb-2">Assignee</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                            {task.owner?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-sm text-zinc-200 font-medium">{task.owner || 'Unassigned'}</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-2xl">
                                    <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest block mb-2">Group</span>
                                    <div className="flex items-center gap-2 text-zinc-200">
                                        <Tag size={14} className="text-zinc-500" />
                                        <span className="text-sm font-medium">{task.group || 'Direct'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Nexus Timeline */}
                            <section>
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <History size={14} />
                                    Execution Timeline
                                </h3>
                                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
                                    {[
                                        { label: 'Created', time: task.createdAt, icon: <Calendar size={12} />, color: 'zinc' },
                                        { label: 'Started', time: task.startedAt, icon: <Zap size={12} />, color: 'blue' },
                                        { label: 'Last Activity', time: task.lastActivity, icon: <Clock size={12} />, color: 'purple' },
                                        { label: 'Completed', time: task.completedAt, icon: <CheckCircle2 size={12} />, color: 'emerald' },
                                    ].filter(e => e.time).map((event, i) => (
                                        <div key={i} className="flex gap-4 relative">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 z-10 bg-zinc-950",
                                                event.color === 'emerald' ? 'border-emerald-500/30 text-emerald-500' :
                                                    event.color === 'blue' ? 'border-blue-500/30 text-blue-500' :
                                                        event.color === 'purple' ? 'border-purple-500/30 text-purple-500' : 'border-white/10 text-zinc-500'
                                            )}>
                                                {event.icon}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-zinc-200">{event.label}</span>
                                                <span className="text-[10px] font-mono text-zinc-500">
                                                    {new Date(event.time).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Description Placeholder */}
                            <section className="p-4 bg-zinc-900/30 border border-white/5 rounded-2xl">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Context</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed italic">
                                    Technical data points and system logs for this task have been aggregated into the executive summary.
                                </p>
                            </section>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all"
                            >
                                Close Details
                            </button>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/20">
                                View Full Task
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
