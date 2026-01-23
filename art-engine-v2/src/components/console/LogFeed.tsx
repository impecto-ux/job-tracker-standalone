"use client";

import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export default function LogFeed() {
    const { messages, setQuote } = useStore();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = React.useState<{ url: string, filename: string } | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <>
            <div className="h-full overflow-y-auto px-4 py-2 space-y-2 font-mono text-sm relative custom-scrollbar">
                {/* Empty State */}
                {messages.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 select-none pointer-events-none">
                        <div className="text-4xl mb-2">⚡</div>
                        <p>System Ready. Waiting for input...</p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`
                  p-2 rounded border-l-2 pl-3 bg-white/5 backdrop-blur-sm
                  ${msg.type === 'error' ? 'border-red-500 bg-red-500/10' :
                                    msg.type === 'success' ? 'border-green-500 bg-green-500/10' :
                                        msg.type === 'warning' ? 'border-yellow-500' :
                                            msg.type === 'user' ? 'border-blue-500 bg-blue-500/5' :
                                                'border-white/20'}
                `}
                        >
                            <div className="flex gap-2 text-xs opacity-50 mb-0.5">
                                <span>[{msg.timestamp}]</span>
                                <span className="font-bold uppercase tracking-wider">{msg.sender}</span>
                            </div>
                            <div className="text-white/90 whitespace-pre-wrap">{msg.content}</div>
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {msg.attachments.map((att) => (
                                        <div key={att.id} className="relative group">
                                            {att.type === 'image' ? (
                                                <img
                                                    src={att.url}
                                                    alt={att.name}
                                                    onClick={() => setSelectedImage({ url: att.url, filename: att.name })}
                                                    className="max-w-[200px] h-auto rounded-lg border border-white/10 cursor-pointer hover:border-white/50 transition-colors"
                                                />
                                            ) : (
                                                <div className="p-2 bg-white/10 rounded-lg text-xs flex items-center gap-2">
                                                    <span>📄</span>
                                                    <span>{att.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Lightbox Overlay */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8 transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage.url}
                                className="rounded-xl shadow-2xl border border-white/10 max-h-[90vh]"
                            />

                            {/* Quote Button */}
                            <button
                                onClick={() => {
                                    setQuote({ id: Math.random().toString(), url: selectedImage.url, filename: selectedImage.filename });
                                    setSelectedImage(null);
                                }}
                                className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 hover:scale-105 transition-all text-white px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-2 font-mono text-sm font-bold shadow-lg"
                            >
                                <span className="text-lg">↩</span> Quote Image
                            </button>
                        </motion.div>

                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
