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

// Helper for digital segment rendering
const DigitalDigit = ({ value }: { value: string | number }) => (
    <div className="relative">
        {/* Ghost Digits for '88' background effect (optional, maybe too much opacity overlap) */}
        {/* <span className="absolute inset-0 text-zinc-800 font-mono blur-[0.5px]">88</span> */}
        <span className="relative z-10 font-mono text-lg font-bold tracking-widest text-shadow-glow">
            {value}
        </span>
    </div>
);

const FancyTicker = ({ start, end, label, icon: Icon, colorClass, pulse = false, variant = 'default' }: { start: string, end?: string, label?: string, icon?: any, colorClass?: string, pulse?: boolean, variant?: 'default' | 'card' }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (end) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [end]);

    const startDate = new Date(start).getTime();
    const endDate = end ? new Date(end).getTime() : now;
    const duration = Math.max(0, endDate - startDate);

    // Parse duration
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));

    if (variant === 'card') {
        // Construct Digital String for that "Clock" feel
        // Format: DD:HH:MM:SS or just HH:MM:SS if < 24h

        return (
            <div className={`flex flex-col items-center justify-center p-2 rounded-lg border border-black/40 bg-black/40 shadow-inner ${pulse ? 'shadow-blue-900/20' : ''}`}>
                <div className={`flex items-baseline gap-1 ${colorClass || (pulse ? 'text-blue-400' : 'text-zinc-300')} drop-shadow-[0_0_3px_rgba(currentColor,0.5)]`}>
                    {days > 0 && (
                        <>
                            <DigitalDigit value={days.toString().padStart(2, '0')} />
                            <span className="font-mono text-zinc-600 animate-pulse">:</span>
                        </>
                    )}
                    <DigitalDigit value={hours.toString().padStart(2, '0')} />
                    <span className="font-mono text-zinc-600 animate-pulse">:</span>
                    <DigitalDigit value={minutes.toString().padStart(2, '0')} />
                    <span className="font-mono text-zinc-600 animate-pulse">:</span>
                    <DigitalDigit value={seconds.toString().padStart(2, '0')} />
                </div>
                {label && (
                    <div className="flex items-center gap-1 mt-1">
                        {Icon && <Icon size={8} className={pulse ? 'animate-spin' : ''} />}
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
                    </div>
                )}
            </div>
        );
    }

    // Default compact text mode
    return (
        <div className={`flex items-center gap-1.5 font-mono text-[10px] ${colorClass} ${pulse ? 'animate-pulse' : ''}`} title={`${label}: ${new Date(start).toLocaleTimeString()}`}>
            {Icon && <Icon size={10} className={pulse && !end ? 'animate-spin' : ''} />}
            {label && <span className="opacity-70 font-sans font-bold uppercase tracking-wider text-[9px]">{label}:</span>}
            <span className="font-bold tracking-tight">{formatDuration(duration)}</span>
        </div>
    );
};

export const TaskTimerWidget: React.FC<TaskTimerProps & { variant?: 'default' | 'card' }> = ({ status, createdAt, startedAt, completedAt, className = '', variant = 'default' }) => {
    // 1. QUEUE (Waiting) state
    if (status === 'todo') {
        return (
            <div className={`${className} ${variant === 'card' ? 'w-full' : 'flex items-center gap-2'}`}>
                <FancyTicker
                    start={createdAt}
                    label="WAITING"
                    icon={Clock}
                    colorClass="text-zinc-500"
                    variant={variant}
                />
            </div>
        );
    }

    // 2. ON AIR (In Progress) state
    if (status === 'in_progress') {
        return (
            <div className={`${className} ${variant === 'card' ? 'w-full space-y-1' : 'flex flex-col gap-0.5'}`}>
                {/* Active time (Live) - Show FIRST for card view clarity */}
                {startedAt && (
                    <FancyTicker
                        start={startedAt}
                        label="ON AIR"
                        icon={RefreshCw}
                        colorClass="text-blue-400"
                        pulse
                        variant={variant}
                    />
                )}
                {/* Only show wait time if significant or distinct, maybe hide for simplified card view? Keeping for now logic. */}
            </div>
        );
    }

    // 3. DONE state
    if (status === 'done' || status === 'rejected') {
        const isRejected = status === 'rejected';
        return (
            <div className={`${className} ${variant === 'card' ? 'w-full' : 'flex flex-col gap-0.5'}`}>
                {/* Just show Total Lifecycle or Work time for Card View to save space/confusion */}
                {completedAt ? (
                    <FancyTicker
                        start={startedAt || createdAt} // Prefer Work time, fall back to Total
                        end={completedAt}
                        label="TOTAL"
                        icon={isRejected ? undefined : CheckCircle2}
                        colorClass={isRejected ? "text-red-500" : "text-emerald-400"}
                        variant={variant}
                    />
                ) : null}
            </div>
        );
    }

    return null;
};
