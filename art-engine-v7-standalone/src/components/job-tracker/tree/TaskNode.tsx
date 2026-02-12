
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Calendar, User as UserIcon, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { TaskTimerWidget } from '@/components/job-tracker/TaskTimerWidget';

const StatusColors = {
    todo: 'border-zinc-500',
    in_progress: 'border-blue-500',
    done: 'border-emerald-500',
    revision_pending: 'border-red-500',
    revision_in_progress: 'border-amber-500',
    revision_done: 'border-emerald-500',
};

const StatusBadges = {
    todo: 'bg-zinc-500/20 text-zinc-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    done: 'bg-emerald-500/20 text-emerald-400',
    revision_pending: 'bg-red-500/20 text-red-400',
    revision_in_progress: 'bg-amber-500/20 text-amber-400',
    revision_done: 'bg-emerald-500/20 text-emerald-400',
};

export default memo(({ data, selected }: any) => {
    const { task } = data;
    const isRevision = task.status?.includes('revision');
    const statusColor = StatusColors[task.status as keyof typeof StatusColors] || 'border-zinc-500';

    return (
        <div className={`
            relative w-[280px] rounded-xl border-2 bg-zinc-900/90 backdrop-blur-md shadow-2xl transition-all
            ${selected ? 'ring-2 ring-white border-white' : `${statusColor} border-opacity-50 hover:border-opacity-100`}
            ${isRevision ? 'bg-red-950/20' : ''}
        `}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 !bg-zinc-400 border-2 border-zinc-900"
            />

            {/* Header Stripe */}
            <div className={`h-1.5 w-full rounded-t-sm ${task.priority === 'P1' ? 'bg-red-500' : task.priority === 'P2' ? 'bg-amber-500' : 'bg-transparent'}`} />

            <div className="p-4 space-y-3">
                {/* Title & Status */}
                <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-sm text-zinc-100 line-clamp-2 leading-tight">
                        {task.title}
                    </div>
                    {task.imageUrl && (
                        <div className="w-8 h-8 rounded bg-zinc-800 shrink-0 overflow-hidden border border-white/10">
                            <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                {/* Meta Row 1: Status & ID */}
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${StatusBadges[task.status as keyof typeof StatusBadges] || 'bg-zinc-800 text-zinc-500'}`}>
                        {task.status?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">#{task.id}</span>
                </div>

                {/* Timer Widget */}
                <div className="transform scale-90 origin-left">
                    <TaskTimerWidget
                        status={task.status}
                        createdAt={task.createdAt}
                        startedAt={task.startedAt}
                        completedAt={task.completedAt}
                        variant="card"
                    />
                </div>

                {/* Footer: Assignee & Date */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10">
                            {(task.owner?.fullName || task.owner || '?')[0]?.toUpperCase()}
                        </div>
                        <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">
                            {task.owner?.fullName || task.owner || 'Unassigned'}
                        </span>
                    </div>

                    {/* Date */}
                    {task.due && task.due !== 'No Date' && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Calendar size={10} />
                            {task.due}
                        </div>
                    )}
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 !bg-zinc-400 border-2 border-zinc-900"
            />
        </div>
    );
});
