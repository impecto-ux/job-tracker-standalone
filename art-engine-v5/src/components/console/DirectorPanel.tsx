
"use client";

import React from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { BrainCircuit, Radio, Sliders, X } from 'lucide-react';

export default function DirectorPanel({ onClose }: { onClose: () => void }) {
    const { memory, setVibe, addDirective, clearDirectives } = useStore();

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-zinc-950 border-l border-white/10 flex flex-col overflow-hidden shadow-2xl z-40 relative"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2 text-rose-400">
                    <BrainCircuit size={20} />
                    <span className="font-bold font-mono tracking-wider">DIRECTOR_MODE</span>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">

                {/* 1. Global Vibe Selector */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Radio size={12} /> Active Vibe
                    </h3>
                    <div className="grid gap-2">
                        <button
                            onClick={() => setVibe(null)}
                            className={`p-3 rounded-lg border text-left transition-all ${!memory.activeVibe ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:border-white/10'}`}
                        >
                            <div className="text-sm font-medium">No Override</div>
                            <div className="text-[10px] opacity-50">Standard generation</div>
                        </button>

                        {memory.savedStyles.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setVibe(style.id)}
                                className={`p-3 rounded-lg border text-left transition-all ${memory.activeVibe === style.id ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 'border-white/5 text-zinc-400 hover:border-white/10'}`}
                            >
                                <div className="text-sm font-medium">{style.name}</div>
                                <div className="text-[10px] opacity-50">{style.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Global Directives */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Sliders size={12} /> Directives
                    </h3>

                    <div className="bg-black/50 rounded-lg p-3 border border-white/5 min-h-[100px]">
                        {memory.activeVibe ? (
                            <div className="text-xs text-rose-300 font-mono space-y-2">
                                <div className="flex gap-2">
                                    <span className="opacity-50">1.</span>
                                    <span>Applying vibe: {memory.savedStyles.find(s => s.id === memory.activeVibe)?.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="opacity-50">2.</span>
                                    <span>Injecting modifiers: "{memory.savedStyles.find(s => s.id === memory.activeVibe)?.promptModifier}"</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-600 italic text-center pt-8">
                                System is running in standard mode.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-900/50">
                <div className="text-[10px] text-zinc-600 text-center">
                    ArtEngine v0.4 Memory System
                </div>
            </div>
        </motion.div>
    );
}
