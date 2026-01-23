"use client";

import React, { useState, useRef, DragEvent } from 'react';
import { Send, Paperclip, X, File as FileIcon, Image as ImageIcon, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useStore } from '@/lib/store';

interface TerminalProps {
    onSubmit: (text: string, files: File[], config: { width: number, height: number, strength: number }) => void;
    isProcessing?: boolean;
}

const RATIOS = [
    { label: 'Square (1:1)', w: 1024, h: 1024 },
    { label: 'Portrait (3:4)', w: 832, h: 1216 },
    { label: 'Landscape (4:3)', w: 1216, h: 832 },
    { label: 'Wide (16:9)', w: 1344, h: 768 }
];

export default function Terminal({ onSubmit, isProcessing = false }: TerminalProps) {
    const { activeQuote, setQuote } = useStore();
    const [input, setInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedRatio, setSelectedRatio] = useState(RATIOS[0]);
    const [strength, setStrength] = useState(0.60);
    const [showConfig, setShowConfig] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && files.length === 0 && !activeQuote) || isProcessing) return;

        onSubmit(input, files, { width: selectedRatio.w, height: selectedRatio.h, strength });
        setInput('');
        setFiles([]);
        setQuote(null); // Clear quote after sending
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Drag & Drop Handlers
    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div
            className={`
        relative w-full rounded-xl border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300
        ${isDragging ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-white/20'}
      `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Quote Preview */}
            <AnimatePresence>
                {activeQuote && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 pt-3 flex items-start gap-3"
                    >
                        <div className="relative group">
                            <img src={activeQuote.url} className="h-16 rounded-md border border-white/20" />
                            <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-0.5 border border-black">
                                <span className="text-[8px] font-bold px-1 text-white">REF</span>
                            </div>
                        </div>
                        <div className="flex-1 text-xs text-white/50 py-1">
                            <div className="font-bold text-indigo-400 mb-0.5">Replying to Image</div>
                            <div className="truncate w-full max-w-[300px]">{activeQuote.filename}</div>
                        </div>
                        <button
                            onClick={() => setQuote(null)}
                            className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* File Previews */}
            <AnimatePresence>
                {files.length > 0 && (
                    <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
                        {files.map((file, i) => (
                            <motion.div
                                key={`${file.name}-${i}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group flex items-center justify-center bg-white/5 border border-white/10 rounded-lg p-2 min-w-[60px] h-[60px]"
                            >
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} className="text-white" />
                                </button>
                                {file.type.startsWith('image/') ? (
                                    <ImageIcon size={24} className="text-white/50" />
                                ) : (
                                    <FileIcon size={24} className="text-white/50" />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] truncate px-1 rounded-b-lg">
                                    {file.name}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
                {/* Config Toggle */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowConfig(!showConfig)}
                        className={`p-2 rounded-lg transition-colors ${showConfig ? 'text-primary bg-primary/10' : 'text-white/50 hover:text-white'}`}
                        title="Generation Settings"
                    >
                        <Settings size={20} />
                    </button>

                    {/* Config Popup */}
                    <AnimatePresence>
                        {showConfig && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full left-0 mb-2 w-64 bg-black/90 border border-white/10 rounded-xl p-4 shadow-xl z-20 backdrop-blur-xl space-y-4"
                            >
                                {/* Aspect Ratio */}
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-white/40 mb-2">Aspect Ratio</div>
                                    <div className="space-y-1">
                                        {RATIOS.map((ratio) => (
                                            <button
                                                key={ratio.label}
                                                type="button"
                                                onClick={() => setSelectedRatio(ratio)}
                                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${selectedRatio.label === ratio.label ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/10'}`}
                                            >
                                                <span>{ratio.label}</span>
                                                {selectedRatio.label === ratio.label && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Strength (Only visible if quoting or explicitly needed, but global is fine) */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-[10px] uppercase font-bold text-white/40">Change Strength</div>
                                        <div className="text-[10px] font-mono text-primary">{(strength * 100).toFixed(0)}%</div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.0"
                                        step="0.05"
                                        value={strength}
                                        onChange={(e) => setStrength(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                    />
                                    <div className="text-[10px] text-white/30 mt-1">
                                        Lower = Subtle, Higher = Creative
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    type="button"
                    className="p-2 text-white/50 hover:text-white transition-colors"
                    title="Attach File"
                >
                    <Paperclip size={20} />
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={files.length > 0 ? "Add message to attached files..." : "Type command or drag & drop files..."}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 resize-none min-h-[24px] max-h-[120px] py-2 font-mono"
                    style={{ height: 'auto' }}
                    disabled={isProcessing}
                />

                <div className="flex items-center gap-2">
                    {/* Aspect Ratio Indicator (Visible when not default or if space permits) */}
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-white/30 border border-white/10 px-1.5 py-0.5 rounded">
                        {selectedRatio.w}x{selectedRatio.h}
                    </div>

                    <button
                        type="submit"
                        disabled={!input.trim() && files.length === 0}
                        className="p-2 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl pointer-events-none text-primary font-mono font-bold animate-pulse">
                    DROP FILES HERE
                </div>
            )}
        </div>
    );
}
