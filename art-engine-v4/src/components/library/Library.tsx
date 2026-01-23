
"use client";

import React from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Calendar, Download, ImageIcon } from 'lucide-react';

export default function Library() {
    const { generations } = useStore();

    return (
        <div className="h-full w-full bg-zinc-950 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <ImageIcon className="text-indigo-500" />
                            Creative Library
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            {generations.length} items logged in persistence vault.
                        </p>
                    </div>
                </header>

                {generations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-zinc-600 border border-dashed border-white/10 rounded-xl">
                        <ImageIcon size={48} className="mb-4 opacity-50" />
                        <p>No History Found</p>
                        <span className="text-xs mt-2 mb-6">Generate something in the terminal to see it here.</span>

                        {/* Debug Action */}
                        <button
                            onClick={() => {
                                const mockGen = {
                                    id: 'mock-' + Math.random(),
                                    imageUrl: 'https://picsum.photos/seed/' + Math.random() + '/512/512',
                                    prompt: 'Debug: Random Mock Image for Testing Library Grid Layout',
                                    timestamp: new Date().toISOString(),
                                    agentId: 'debug-agent',
                                    filename: 'mock.png'
                                };
                                useStore.getState().logGeneration(mockGen);
                            }}
                            className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-3 py-1 rounded border border-white/5"
                        >
                            + Load Mock Image
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {generations.map((gen) => (
                            <motion.div
                                key={gen.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all"
                            >
                                <img
                                    src={gen.imageUrl}
                                    alt={gen.prompt}
                                    className="w-full h-full object-cover"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-white text-xs font-medium line-clamp-2 mb-1">{gen.prompt}</p>
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(gen.timestamp).toLocaleDateString()}
                                        </span>
                                        <span className="uppercase tracking-wider">{gen.agentId}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
