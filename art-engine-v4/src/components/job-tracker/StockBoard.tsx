import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface StockBoardProps {
    tasks: any[];
    onClose: () => void;
}

export const StockBoard: React.FC<StockBoardProps> = ({ tasks, onClose }) => {
    // Sort buy "newest completion" or "newest update" to show activity at top
    const marketData = useMemo(() => {
        return [...tasks]
            .filter(t => t.status !== 'todo') // Only active/done matter for "market"
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 25); // Show top 25 movers
    }, [tasks]);

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed bottom-0 left-0 right-0 h-[60vh] bg-black border-t-4 border-emerald-900 z-[100] font-mono flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.8)]"
        >
            {/* TERMINAL HEADER */}
            <div className="bg-emerald-950/20 border-b border-emerald-900/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                        <span className="text-emerald-500 font-bold tracking-widest text-sm uppercase">MARKET OPEN</span>
                    </div>
                    <div className="h-4 w-px bg-emerald-900/50" />
                    <span className="text-emerald-700 text-xs">JOBS_EXCHANGE_v1.0</span>
                </div>

                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-emerald-800 hover:text-emerald-400 transition-colors uppercase text-xs font-bold tracking-wider"
                >
                    [ CLOSE TERMINAL ] <X size={16} />
                </button>
            </div>

            {/* TICKER HEADER ROW */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-emerald-900/30 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <div className="col-span-2">SYMBOL</div>
                <div className="col-span-4">PROJECT / TASK</div>
                <div className="col-span-2 text-right">PRICE (XP)</div>
                <div className="col-span-2 text-right">CHG%</div>
                <div className="col-span-2 text-right">VOL (DEPT)</div>
            </div>

            {/* DATA GRID */}
            <div className="flex-1 overflow-y-auto p-0 relative custom-scrollbar bg-black/90">
                {/* GRID LINES BACKGROUND */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                <div className="relative z-10">
                    <AnimatePresence>
                        {marketData.map((task, index) => (
                            <MarketRow key={task.id} task={task} index={index} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* FOOTER */}
            <div className="bg-black border-t border-emerald-900/50 p-1 text-center text-[10px] text-emerald-900 uppercase">
                SYSTEM_READY // CONNECTION_SECURE // {new Date().toLocaleTimeString()}
            </div>
        </motion.div>
    );
};

const MarketRow = ({ task, index }: { task: any, index: number }) => {
    // Determine color based on status
    const isDone = task.status === 'done';
    const isRejected = task.status === 'rejected';
    const isActive = task.status === 'in_progress';

    const colorClass = isDone ? 'text-emerald-400' : isRejected ? 'text-red-500' : 'text-blue-400';
    const bgHover = isDone ? 'hover:bg-emerald-900/20' : isRejected ? 'hover:bg-red-900/20' : 'hover:bg-blue-900/20';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 text-xs font-medium cursor-default transition-colors ${bgHover} group`}
        >
            <div className={`col-span-2 font-bold ${colorClass}`}>
                {task.priority === 'P1' ? '🔥 ' : ''}TSK-{task.id}
            </div>
            <div className="col-span-4 text-emerald-100/70 truncate group-hover:text-emerald-100">
                {task.title}
            </div>
            <div className="col-span-2 text-right font-mono text-emerald-200">
                {task.score.toFixed(2)}
            </div>
            <div className={`col-span-2 text-right flex justify-end items-center gap-1 ${colorClass}`}>
                {isDone ? <TrendingUp size={12} /> : isRejected ? <TrendingDown size={12} /> : <Activity size={12} />}
                {isDone ? '+100%' : isRejected ? '-100%' : '0.00%'}
            </div>
            <div className="col-span-2 text-right text-emerald-600 uppercase">
                {task.dept || 'GEN'}
            </div>
        </motion.div>
    );
};
