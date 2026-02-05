import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { MoreHorizontal, Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle2, Clock, Lock } from 'lucide-react';
import api from '@/lib/api';
import { TaskTimerWidget } from '@/components/job-tracker/TaskTimerWidget';

// Types
interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    dept: string;
    owner: string;
    requester: any; // Updated to accept object
    due: string;
    createdAt: string;
    updatedAt: string;
    imageUrl?: string;
    startedAt?: string;
    completedAt?: string;
    score: number;
    category: string;
    metadata?: any;
    group?: string;
    revisionCount?: number;
    revisions?: any[];
}

interface User {
    id: number;
    fullName: string;
    role: string;
    department?: {
        id: number;
        name: string;
    };
    firstName?: string;
    lastName?: string;
    email?: string;
}

interface KanbanBoardProps {
    tasks: Task[];
    isAuthorized: (task: Task) => boolean;
    onTaskUpdate: (taskId: number, newStatus: string) => void;
    onTaskClick: (task: Task) => void;
}

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'bg-zinc-500', icon: AlertCircle },
    { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500', icon: Clock },
    { id: 'review', label: 'Review', color: 'bg-purple-500', icon: MoreHorizontal },
    { id: 'done', label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, isAuthorized, onTaskUpdate, onTaskClick }) => {
    // Group tasks by status
    const [columns, setColumns] = useState<Record<string, Task[]>>({});

    useEffect(() => {
        const cols: Record<string, Task[]> = {
            todo: [],
            in_progress: [],
            review: [],
            done: [],
            revision_pending: [],
            revision_in_progress: [],
            revision_done: []
        };
        tasks.forEach(t => {
            const status = t.status || 'todo';
            if (cols[status]) {
                cols[status].push(t);
            } else {
                // If status is 'revision' (legacy), map to 'revision_pending' or keep in 'review'?
                // Mapped to 'review' for safety, or 'revision_pending' if we want to migrate visually
                if (status === 'revision') cols.revision_pending.push(t);
                else cols.todo.push(t);
            }
        });
        setColumns(cols);
    }, [tasks]);

    // Handle Drag logic would go here if using full DnD
    // For now, simpler UI: Click to Move or simple drag if using Reorder (but Reorder is for lists, generic DnD is complex without dnd-kit)
    // Let's implement a visual Drop Zone approach or just "Move" buttons on hover for simplicity and robustness first, 
    // OR try a custom drag implementation with Framer Motion layoutId.

    // Given requirements, let's try a "Click to Move" or quick context menu approach first for reliability, 
    // OR standard HTML5 DnD which matches the user request for "Drag and Drop".

    // Let's go with HTML5 DnD for "Real" drag and drop feeling without extra libs.

    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        e.dataTransfer.setData('taskId', taskId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const taskId = Number(e.dataTransfer.getData('taskId'));
        if (taskId) {
            onTaskUpdate(taskId, status);
        }
    };

    const MAIN_COLUMNS = [
        { id: 'todo', label: 'To Do', color: 'bg-zinc-500', icon: AlertCircle },
        { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500', icon: Clock },
        { id: 'review', label: 'Review', color: 'bg-purple-500', icon: MoreHorizontal }, // Kept for legacy/review phase
        { id: 'done', label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 },
    ];

    const REVISION_COLUMNS = [
        { id: 'revision_pending', label: 'Revision Request', color: 'bg-red-500', icon: AlertCircle },
        { id: 'revision_in_progress', label: 'On Air (Fixing)', color: 'bg-amber-500', icon: Clock },
        { id: 'revision_done', label: 'Revision Done', color: 'bg-emerald-500', icon: CheckCircle2 },
    ];

    return (
        <div className="flex flex-col h-full gap-6 p-4 overflow-y-auto">
            {/* TOP: Main Board */}
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[400px]">
                {MAIN_COLUMNS.map(col => (
                    <ColumnComponent
                        key={col.id}
                        col={col}
                        tasks={columns[col.id] || []}
                        onDragOver={handleDragOver}
                        onDrop={(e: React.DragEvent) => handleDrop(e, col.id)}
                        handleDragStart={handleDragStart}
                        onTaskClick={onTaskClick}
                        isAuthorized={isAuthorized}
                    />
                ))}
            </div>

            {/* BOTTOM: Revision Panel */}
            <div className="border-t-2 border-red-500/30 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-4 text-red-400">
                    <AlertCircle size={20} />
                    <h3 className="text-lg font-bold tracking-wider uppercase">Revision Zone</h3>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 bg-red-950/10 p-4 rounded-xl border border-red-500/10">
                    {REVISION_COLUMNS.map(col => (
                        <ColumnComponent
                            key={col.id}
                            col={col}
                            tasks={columns[col.id] || []}
                            onDragOver={handleDragOver}
                            onDrop={(e: React.DragEvent) => handleDrop(e, col.id)}
                            handleDragStart={handleDragStart}
                            onTaskClick={onTaskClick}
                            isAuthorized={isAuthorized}
                            isRevision={true}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper Component for cleaner render
const ColumnComponent = ({ col, tasks, onDragOver, onDrop, handleDragStart, onTaskClick, isAuthorized, isRevision = false }: any) => {
    return (
        <div
            className={`flex-shrink-0 w-80 flex flex-col backdrop-blur-md rounded-xl border 
                ${isRevision ? 'bg-red-900/5 border-red-500/20' : 'bg-zinc-900/50 border-white/5'}
            `}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {/* Header */}
            <div className={`p-3 border-b flex items-center justify-between sticky top-0 bg-inherit z-10 rounded-t-xl
                 ${isRevision ? 'border-red-500/20' : 'border-white/5'}
            `}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <span className="font-bold text-sm text-zinc-200">{col.label}</span>
                    <span className="text-xs text-zinc-500 font-mono ml-1">
                        {tasks.length || 0}
                    </span>
                </div>
                <button className="text-zinc-500 hover:text-white transition-colors">
                    <Plus size={16} />
                </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[500px]">
                {tasks.map((task: any) => {
                    const canEdit = isAuthorized(task);
                    return (
                        <motion.div
                            layoutId={`task-${task.id}`}
                            key={task.id}
                            draggable={canEdit}
                            onDragStart={(e) => canEdit && handleDragStart(e as any, task.id)}
                            onClick={() => onTaskClick(task)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group border p-3 rounded-lg shadow-sm relative transition-all
                                ${isRevision ? 'bg-red-500/5 border-red-500/10' : 'bg-zinc-800/40 border-white/5'}
                                ${canEdit ? 'hover:bg-zinc-800/80 hover:border-white/10 cursor-grab active:cursor-grabbing' : 'opacity-70 cursor-not-allowed'}
                            `}
                        >
                            {/* Priority Stripe */}
                            <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r ${task.priority === 'P1' ? 'bg-red-500' :
                                task.priority === 'P2' ? 'bg-amber-500' : 'bg-blue-500/50'
                                }`} />

                            {!canEdit && (
                                <div className="absolute right-2 top-2 text-zinc-600">
                                    <Lock size={12} />
                                </div>
                            )}

                            {/* Department / Group Info */}
                            {(task.department || task.group) && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-700/50 text-zinc-400">
                                    {task.department?.name || task.group || 'General'}
                                </div>
                            )}

                            <div className="pl-2 mt-4">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-zinc-200 leading-snug line-clamp-2 pr-4 relative">
                                        {task.title}
                                        {/* Recent Activity Indicator (1 hour) */}
                                        {(new Date().getTime() - new Date(task.updatedAt).getTime() < 1000 * 60 * 60) && (
                                            <span className="absolute -right-1 top-0.5 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                        )}
                                    </h4>
                                    {task.imageUrl && (
                                        <div className="w-8 h-8 rounded bg-zinc-900 flex-shrink-0 overflow-hidden">
                                            <img src={task.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                                        </div>
                                    )}
                                </div>

                                {/* LIVE TIMER WIDGET */}
                                <div className="mt-3 mb-3">
                                    <TaskTimerWidget
                                        status={task.status}
                                        createdAt={task.createdAt}
                                        startedAt={task.startedAt}
                                        completedAt={task.completedAt}
                                        variant="card"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-3">
                                    <div className="flex items-center gap-3">
                                        {/* AVATAR STACK: Requester -> Owner */}
                                        <div className="flex items-center gap-1.5" title={`Requested by: ${task.requester?.fullName || task.requester?.username || 'Unknown'}\nAssigned to: ${task.owner?.fullName || task.owner || 'Unassigned'}`}>
                                            {/* Requester Avatar */}
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10 ring-1 ring-zinc-900 shadow-sm relative z-10">
                                                {(task.requester?.fullName || task.requester?.username || task.requester || '?')[0]?.toUpperCase()}
                                            </div>

                                            {/* Arrow & Owner (only if different and owner exists) */}
                                            {task.owner && task.owner !== 'Unknown' && (task.owner?.fullName || task.owner) !== (task.requester?.fullName || task.requester?.username || task.requester) && (
                                                <>
                                                    <div className="text-zinc-600 font-bold">→</div>
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] font-bold text-indigo-400 border border-indigo-500/20 ring-1 ring-zinc-900 shadow-sm">
                                                        {(task.owner?.fullName || task.owner || '?')[0]?.toUpperCase()}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            <span>{task.due !== 'No Date' ? task.due : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* REVISION BADGE */}
                                        {(task.revisionCount || 0) > 0 && (
                                            <div className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                                Rev {task.revisionCount}
                                            </div>
                                        )}
                                        <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${task.priority === 'P1' ? 'bg-red-500/10 text-red-500' :
                                            task.priority === 'P2' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-500/10 text-zinc-500'
                                            }`}>
                                            {task.priority || 'P3'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Empty State */}
                {(!tasks || tasks.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 py-10 opacity-50 border-2 border-dashed border-zinc-800 rounded-lg">
                        <AlertCircle size={24} className="mb-2" />
                        <span className="text-xs">No Tasks</span>
                    </div>
                )}
            </div>
        </div>
    );
};
