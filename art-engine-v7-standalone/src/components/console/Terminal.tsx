"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Image as ImageIcon, Settings2, Paperclip, ArrowUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalProps {
    onSubmit: (text: string, files: File[], config: { width: number, height: number, strength: number }) => void;
}

export default function Terminal({ onSubmit }: TerminalProps) {
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const { pendingAttachments, setPendingAttachments } = useStore();

    useEffect(() => {
        if (pendingAttachments.length > 0) {
            setFiles(prev => [...prev, ...pendingAttachments]);
            setPendingAttachments([]); // Clear after consuming
        }
    }, [pendingAttachments, setPendingAttachments]);
    const [showConfig, setShowConfig] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Config State
    const [width, setWidth] = useState(1024);
    const [height, setHeight] = useState(1024);
    const [strength, setStrength] = useState(0.6);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && files.length === 0) || isLoading) return;

        onSubmit(input, files, { width, height, strength });

        setInput('');
        setFiles([]);
        setShowConfig(false);
    };

    const handleMagic = async () => {
        console.log("Magic Clicked! Input:", input);
        if (!input.trim()) {
            console.log("Input empty, aborting.");
            return;
        }
        setIsLoading(true);
        try {
            console.log("Sending request to /api/gemini/optimize...");
            const res = await fetch('/api/gemini/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: input })
            });
            console.log("Response Status:", res.status);

            const data = await res.json();
            console.log("Data:", data);

            if (data.enhancedPrompt) {
                setInput(data.enhancedPrompt);
            } else if (data.error) {
                console.error("API Error:", data.error);
                alert("Magic failed: " + data.error);
            }
        } catch (err) {
            console.error("Magic Failed:", err);
            alert("Magic Error: " + String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="relative z-20">
            {/* Configuration Popup */}
            <AnimatePresence>
                {showConfig && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-4 right-0 p-4 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-64 backdrop-blur-xl"
                    >
                        <h4 className="text-xs font-mono font-bold text-white/50 mb-4 uppercase tracking-wider">Configuration</h4>

                        {/* Aspect Ratio / Dimensions */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-zinc-400 block mb-1">Dimensions</label>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <button onClick={() => { setWidth(1024); setHeight(1024); }} className={`p-2 rounded border ${width === 1024 && height === 1024 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>Square</button>
                                    <button onClick={() => { setWidth(1920); setHeight(1080); }} className={`p-2 rounded border ${width === 1920 && height === 1080 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>16:9</button>
                                    <button onClick={() => { setWidth(1080); setHeight(1920); }} className={`p-2 rounded border ${width === 1080 && height === 1920 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>9:16</button>
                                    <button onClick={() => { setWidth(1280); setHeight(768); }} className={`p-2 rounded border ${width === 1280 && height === 768 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}>Landscape</button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-400 block mb-1">Context Strength: {strength}</label>
                                <input
                                    type="range" min="0.1" max="1" step="0.05"
                                    value={strength}
                                    onChange={(e) => setStrength(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                                    <span>Subtle</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Bar */}
            <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 flex gap-3 items-end shadow-lg focus-within:ring-1 focus-within:ring-white/20 transition-all">
                {/* Actions */}
                <div className="flex pb-1 gap-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Attach Context Image"
                    >
                        <ImageIcon size={20} />
                    </button>
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-lg transition-colors ${showConfig ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                        title="Settings"
                    >
                        <Settings2 size={20} />
                    </button>
                </div>

                {/* Main Input Area */}
                <div
                    className={`
                        flex-1 relative bg-black/50 border border-white/10 rounded-xl overflow-hidden transition-all duration-300
                        ${isFocused ? 'ring-2 ring-cyan-500/50 border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'hover:border-white/20'}
                    `}
                >
                    {files.length > 0 && (
                        <div className="flex gap-2 p-2 border-b border-white/10 overflow-x-auto custom-scrollbar">
                            {files.map((file, i) => (
                                <div key={i} className="relative group shrink-0">
                                    <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                        {file.type.startsWith('image/') ? (
                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <span className="text-xs text-white/50">{file.name.slice(-3)}</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-2 p-3">
                        <span className="text-cyan-400 font-mono text-lg pb-1">›</span>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Enter command or prompt..."
                            className="w-full bg-transparent border-none outline-none text-sm font-mono text-white/90 placeholder:text-white/20 resize-none min-h-[24px] max-h-32 py-1"
                            rows={1}
                            disabled={isLoading}
                        />

                        {/* Magic Button */}
                        <button
                            onClick={handleMagic}
                            disabled={isLoading || !input.trim()}
                            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Enhance with Gemini"
                        >
                            <Sparkles size={16} />
                        </button>

                        <div className="flex gap-1">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Paperclip size={16} />
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={(!input.trim() && files.length === 0) || isLoading}
                                className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-950/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
                    }}
                    multiple
                />
            </div>
        </div>
    );
}
