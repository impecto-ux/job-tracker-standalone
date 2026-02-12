
import React from 'react';
import { X, GitBranch, Share2, Maximize2 } from 'lucide-react';
import TaskTree from './tree/TaskTree';

interface BlueprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: any[];
    onTaskClick: (task: any) => void;
}

export const BlueprintModal: React.FC<BlueprintModalProps> = ({ isOpen, onClose, tasks, onTaskClick }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full h-full shadow-2xl relative overflow-hidden flex flex-col">

                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                            <GitBranch size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Group Workflow Blueprint</h2>
                            <p className="text-xs text-zinc-500 font-medium">Visualizing {tasks.length} active tasks across departments</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/5">
                            <Share2 size={18} />
                        </button>
                        <div className="h-6 w-px bg-white/10" />
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg border border-white/10 transition-colors"
                        >
                            <X size={16} />
                            Close
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    <TaskTree tasks={tasks} onTaskClick={onTaskClick} />

                    <div className="absolute bottom-6 left-6 pointer-events-none z-10">
                        <div className="bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-3 shadow-xl">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">Legend</span>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-600" />
                                    <span className="text-[10px] text-zinc-300">To Do</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-900/50 border border-indigo-500" />
                                    <span className="text-[10px] text-zinc-300">In Progress</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-900/50 border border-emerald-500" />
                                    <span className="text-[10px] text-zinc-300">Done</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
