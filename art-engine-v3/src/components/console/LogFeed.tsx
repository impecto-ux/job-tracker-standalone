"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { X, ExternalLink, ZoomIn, Download, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LogFeed() {
    const { messages, setActiveAgent, agents } = useStore();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<{ url: string, filename: string } | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
            {messages.map((msg) => (
                <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex flex-col gap-2 max-w-[90%] ${msg.type === 'user' ? 'ml-auto items-end' : ''}`}
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 px-2">
                        <span className={`text-[10px] font-mono tracking-wider opacity-50 ${msg.type === 'user' ? 'text-indigo-300' : 'text-emerald-300'}`}>
                            {msg.sender.toUpperCase()}
                        </span>
                        <span className="text-[10px] opacity-20 font-mono">{msg.timestamp}</span>
                    </div>

                    {/* Content */}
                    <div className={`
             rounded-2xl px-5 py-3 text-sm leading-relaxed backdrop-blur-sm
             ${msg.type === 'user'
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                            : 'bg-white/5 border border-white/5 text-zinc-300 rounded-tl-sm'}
          `}>
                        {msg.content}
                    </div>

                    {/* Attachments */}
                    {msg.attachments && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            {msg.attachments.map(att => (
                                att.type === 'image' && (
                                    <div key={att.id} className="relative group/img overflow-hidden rounded-lg border border-white/10">
                                        <img
                                            src={att.url}
                                            alt={att.name}
                                            className="max-h-64 object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                                            onClick={() => setSelectedImage({ url: att.url, filename: att.name })}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </motion.div>
            ))}
            <div ref={bottomRef} className="h-4" />

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="relative max-w-full max-h-full flex flex-col gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Actions Toolbar */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                <a
                                    href={selectedImage.url}
                                    download={selectedImage.filename}
                                    className="p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                                    title="Download"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <img
                                src={selectedImage.url}
                                className="max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            />

                            {/* Context Actions */}
                            <div className="flex justify-center gap-2">
                                <div className="relative group/menu">
                                    <button
                                        className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium shadow-lg border border-white/10 transition-all flex items-center gap-2"
                                    >
                                        <Wand2 size={16} />
                                        Edit with...
                                    </button>

                                    {/* Hover Menu */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover/menu:opacity-100 pointer-events-none group-hover/menu:pointer-events-auto transition-all transform translate-y-2 group-hover/menu:translate-y-0 flex flex-col">

                                        <button
                                            onClick={async () => {
                                                const res = await fetch(selectedImage.url);
                                                const blob = await res.blob();
                                                const file = new File([blob], selectedImage.filename, { type: blob.type });

                                                useStore.getState().setPendingAttachments([file]);
                                                useStore.getState().setActiveAgent('flux-context');
                                                setSelectedImage(null);
                                            }}
                                            className="px-4 py-3 text-sm text-left hover:bg-white/5 text-pink-300 flex items-center gap-2"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-pink-500" /> Flux Context
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const res = await fetch(selectedImage.url);
                                                const blob = await res.blob();
                                                const file = new File([blob], selectedImage.filename, { type: blob.type });

                                                useStore.getState().setPendingAttachments([file]);
                                                useStore.getState().setActiveAgent('qwen-edit');
                                                setSelectedImage(null);
                                            }}
                                            className="px-4 py-3 text-sm text-left hover:bg-white/5 text-purple-300 flex items-center gap-2 border-t border-white/5"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-purple-500" /> Qwen Context
                                        </button>

                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


