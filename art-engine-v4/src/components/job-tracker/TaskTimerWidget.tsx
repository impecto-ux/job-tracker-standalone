import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle2, Timer } from 'lucide-react';

interface TaskTimerProps {
    status: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    className?: string;
}

const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    // Only show seconds if less than an hour for liveness, or always? 
    // User wants "live counting", so seconds are important for the feeling of activity.
    parts.push(`${seconds.toString().padStart(2, '0')}s`);

    return parts.join(' ');
};

const LiveTicker = ({ start, end, label, icon: Icon, colorClass, pulse = false }: { start: string, end?: string, label?: string, icon?: any, colorClass?: string, pulse?: boolean }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (end) return; // Static if end date exists
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [end]);

    const startDate = new Date(start).getTime();
    const endDate = end ? new Date(end).getTime() : now;
    const duration = endDate - startDate;

    return (
        <div className={`flex items-center gap-1.5 font-mono text-[10px] ${colorClass} ${pulse ? 'animate-pulse' : ''}`} title={`${label}: ${new Date(start).toLocaleTimeString()}`}>
            {Icon && <Icon size={10} className={pulse && !end ? 'animate-spin' : ''} />}
            {label && <span className="opacity-70 font-sans font-bold uppercase tracking-wider text-[9px]">{label}:</span>}
            <span className="font-bold tracking-tight">{formatDuration(duration)}</span>
        </div>
    );
};

export const TaskTimerWidget: React.FC<TaskTimerProps> = ({ status, createdAt, startedAt, completedAt, className = '' }) => {
    // 1. QUEUE (Waiting) state
    if (status === 'todo') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <LiveTicker
                    start={createdAt}
                    label="WAITING"
                    icon={Clock}
                    colorClass="text-zinc-500"
                />
            </div>
        );
    }

    // 2. ON AIR (In Progress) state
    if (status === 'in_progress') {
        return (
            <div className={`flex flex-col gap-0.5 ${className}`}>
                {/* Total accumulated wait time (Static) */}
                {startedAt && (
                    <LiveTicker
                        start={createdAt}
                        end={startedAt}
                        label="Waited"
                        icon={Clock}
                        colorClass="text-emerald-500/60"
                    />
                )}
                {/* Active time (Live) */}
                {startedAt && (
                    <LiveTicker
                        start={startedAt}
                        label="ON AIR"
                        icon={RefreshCw}
                        colorClass="text-blue-400"
                        pulse
                    />
                )}
            </div>
        );
    }

    // 3. DONE state
    if (status === 'done' || status === 'rejected') {
        const isRejected = status === 'rejected';
        return (
            <div className={`flex flex-col gap-0.5 ${className}`}>
                {/* Waited Time (Static) */}
                {startedAt && (
                    <LiveTicker
                        start={createdAt}
                        end={startedAt}
                        label="Waited"
                        icon={Clock}
                        colorClass="text-emerald-500/60"
                    />
                )}
                {/* Processing Time (Static) */}
                {startedAt && completedAt && (
                    <LiveTicker
                        start={startedAt}
                        end={completedAt}
                        label="Work"
                        icon={Timer}
                        colorClass={isRejected ? "text-red-400/70" : "text-emerald-500/70"}
                    />
                )}
                {/* Total Lifecycle (Static) */}
                {completedAt && (
                    <LiveTicker
                        start={createdAt}
                        end={completedAt}
                        label="Total"
                        icon={isRejected ? undefined : CheckCircle2}
                        colorClass={isRejected ? "text-red-500 font-bold" : "text-emerald-400 font-bold"}
                    />
                )}
            </div>
        );
    }

    return null;
};
