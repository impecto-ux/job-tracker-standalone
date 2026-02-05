import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, Check, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useStore, ChatMessage } from '@/lib/store';

// Utility for mention colors
const generateColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
};

interface MessageInputProps {
    users: any[];
    replyingTo: ChatMessage | null;
    onCancelReply: () => void;
    onSend: (content: string, attachments: { url: string, thumbnailUrl?: string, type: 'image' | 'video' }[], priority: string | null) => void;
    onUpload: (file: File) => Promise<{ url: string, thumbnailUrl?: string, type: 'image' | 'video' }>;
    onTyping: () => void;
    pendingMessage?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
    users,
    replyingTo,
    onCancelReply,
    onSend,
    onUpload,
    onTyping,
    pendingMessage
}) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<{ url: string, thumbnailUrl?: string, type: 'image' | 'video' }[]>([]);
    const [isAttaching, setIsAttaching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync pending message
    useEffect(() => {
        if (pendingMessage) {
            setInput(pendingMessage);
            textareaRef.current?.focus();
        }
    }, [pendingMessage]);

    // Auto-focus on reply
    useEffect(() => {
        if (replyingTo) {
            textareaRef.current?.focus();
        }
    }, [replyingTo]);

    // Handle File Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            try {
                const newAttachments: { url: string, thumbnailUrl?: string, type: 'image' | 'video' }[] = [];
                for (let i = 0; i < e.target.files.length; i++) {
                    const file = e.target.files[i];
                    const data = await onUpload(file);
                    newAttachments.push(data);
                }
                setAttachments(prev => [...prev, ...newAttachments]);
                setIsAttaching(false);
                setShowImagePreview(true);
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        onTyping();

        // Detect @
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/@(\w*)$/);

        if (match) {
            setMentionQuery(match[1].toLowerCase());
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (name: string) => {
        if (!mentionQuery) return;
        const cursor = textareaRef.current?.selectionStart || input.length;
        const textBefore = input.slice(0, cursor);
        const textAfter = input.slice(cursor);
        const newText = textBefore.replace(/@(\w*)$/, `@${name} `) + textAfter;
        setInput(newText);
        setMentionQuery(null);
        textareaRef.current?.focus();
    };

    const handleSendAction = () => {
        if (!input.trim() && attachments.length === 0) return;

        onSend(input, attachments, selectedPriority);

        // Reset State
        setInput('');
        setAttachments([]);
        setSelectedPriority(null);
        setShowImagePreview(false);
        setMentionQuery(null);
        if (replyingTo) onCancelReply();
    };

    return (
        <>
            <AnimatePresence>
                {/* Image Preview Overlay */}
                {showImagePreview && attachments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-[#0b141a] flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 shrink-0">
                            <button onClick={() => { setAttachments([]); setShowImagePreview(false); }} className="text-[#aebac1]">
                                <X size={24} />
                            </button>
                            <span className="text-[#e9edef] font-bold">Preview ({attachments.length})</span>
                            <div className="w-6"></div>
                        </div>

                        {/* Image Grid / Carousel */}
                        <div className="flex-1 flex flex-wrap gap-4 items-center justify-center p-8 bg-black/50 overflow-y-auto">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="relative group rounded-lg overflow-hidden shadow-2xl border border-white/10 max-h-[80%] max-w-[80%]">
                                    {att.type === 'video' ? (
                                        <video src={att.url} controls className="max-h-96 max-w-full object-contain" />
                                    ) : (
                                        <img src={att.url} alt={`Preview ${idx}`} className="max-h-96 max-w-full object-contain" />
                                    )}
                                    <button
                                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Footer / Actions */}
                        <div className="h-20 bg-[#202c33] flex items-center justify-end px-4 shrink-0 gap-4">
                            <span className="text-[#8696a0] text-sm hidden md:block">Click 'Add' to attach to your message</span>
                            <button
                                onClick={() => setShowImagePreview(false)}
                                className="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-colors"
                            >
                                <Check size={20} />
                                ADD TO CHAT
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-[#202c33] shrink-0 z-10 border-t border-[#202c33] flex flex-col">
                {/* REPLYING TO INDICATOR */}
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-[#1d272d] border-l-4 border-[#00a884] mx-4 mt-2 rounded-r">
                        <div className="flex flex-col text-xs overflow-hidden">
                            <span className="text-[#00a884] font-bold">{replyingTo.sender?.fullName || 'System'}</span>
                            <span className="text-[#d1d7db]/70 truncate">{replyingTo.mediaUrl ? '📷 Photo' : replyingTo.content}</span>
                        </div>
                        <button onClick={onCancelReply} className="text-[#aebac1] hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="px-4 py-3 flex items-end gap-2 relative">
                    <div className="relative">
                        <button onClick={() => setIsAttaching(!isAttaching)} className={`p-2 hover:text-[#aebac1] mb-1 ${isAttaching ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                            <div className={`transition-transform duration-200 ${isAttaching ? 'rotate-45' : ''}`}>
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            </div>
                        </button>

                        {/* Attachment Popup */}
                        {isAttaching && (
                            <div className="absolute bottom-14 left-0 bg-[#233138] p-3 rounded-lg shadow-xl w-72 z-20 border border-white/5 flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 bg-[#2a3942] hover:bg-[#354552] text-[#e9edef] text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                            <Plus size={10} />
                                        </div>
                                        Photos & Videos
                                    </button>

                                    <div className="flex items-center gap-2 text-xs text-[#8696a0] p-2">
                                        {isUploading && <Loader className="animate-spin" size={12} />}
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept="image/*,video/*"
                                        multiple
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#2a3942]"></div>
                                    <span className="relative bg-[#233138] px-2 text-[10px] text-[#8696a0] font-bold uppercase block text-center w-fit mx-auto">OR URL</span>
                                </div>

                                <input
                                    autoFocus
                                    className="bg-[#2a3942] text-white text-sm p-2 rounded outline-none border border-transparent focus:border-[#00a884] placeholder-[#8696a0]"
                                    placeholder="Paste image/video URL..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setAttachments(prev => [...prev, { url: e.currentTarget.value, type: 'image' }]);
                                            e.currentTarget.value = '';
                                            setShowImagePreview(true);
                                            setIsAttaching(false);
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-[#2a3942] rounded-lg flex flex-col justify-center min-h-[42px] px-3 py-1 border border-transparent focus-within:border-[#00a884]/50 transition-colors relative">

                        {/* DRAFT THUMBNAILS (Input Area) */}
                        {attachments.length > 0 && !showImagePreview && (
                            <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#202c33]/50 rounded mb-1 border border-white/5 custom-scrollbar">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="flex-shrink-0 relative group">
                                        {att.type === 'video' ? (
                                            <video src={att.url} className="h-12 w-12 object-cover rounded border border-white/10" />
                                        ) : (
                                            <img src={att.url} className="h-12 w-12 object-cover rounded border border-white/10" />
                                        )}
                                        <button
                                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-1 -right-1 text-[#aebac1] hover:text-red-400 bg-black/60 rounded-full p-0.5"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* Priority Selection */}
                        {(input.trim().length > 0 || attachments.length > 0) && (
                            <div className="flex items-center gap-2 mb-1 absolute -top-10 left-0 bg-[#202c33] p-1.5 rounded-lg shadow-xl border border-white/5 z-50">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1 select-none">Priority:</span>
                                {['P1', 'P2', 'P3'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPriority(p === selectedPriority ? null : p)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${selectedPriority === p
                                            ? (p === 'P1' ? 'bg-red-500 text-white' : p === 'P2' ? 'bg-orange-500 text-black' : 'bg-blue-500 text-white')
                                            : 'bg-[#2a3942] text-zinc-400 hover:bg-[#354552] border border-white/5'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Mentions Popup */}
                        {mentionQuery !== null && (
                            <div className="flex flex-col gap-1 mb-1 absolute bottom-12 left-0 bg-[#233138] w-64 max-h-48 overflow-y-auto rounded-lg shadow-xl border border-white/5 z-50 p-2 custom-scrollbar">
                                {users
                                    .filter(u => u.username?.toLowerCase().includes(mentionQuery) || u.fullName?.toLowerCase().includes(mentionQuery))
                                    .map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => insertMention(user.fullName)}
                                            className="flex items-center gap-2 p-2 hover:bg-[#2a3942] rounded-lg text-left transition-colors"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-700/50 flex items-center justify-center text-[10px] font-bold text-white">
                                                {user.fullName?.[0] || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5 min-w-0">
                                                    <span className="text-sm text-[#e9edef] font-bold truncate">{user.fullName}</span>
                                                    {user.department && (
                                                        <span
                                                            className="text-[8px] px-1.5 py-0.5 rounded border border-current font-bold uppercase tracking-tighter shrink-0"
                                                            style={{
                                                                borderColor: `${generateColor(user.department.name)}40`,
                                                                backgroundColor: `${generateColor(user.department.name)}15`,
                                                                color: generateColor(user.department.name)
                                                            }}
                                                        >
                                                            {user.department.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-[#8696a0]">@{user.username}</span>
                                            </div>
                                        </button>
                                    ))}
                                {users.every(u => !u.username?.toLowerCase().includes(mentionQuery) && !u.fullName?.toLowerCase().includes(mentionQuery)) && (
                                    <div className="p-2 text-xs text-[#8696a0] text-center">No users found</div>
                                )}
                            </div>
                        )}

                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInput}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.ctrlKey) {
                                        e.preventDefault();
                                        setInput(prev => prev + '\n');
                                    } else if (!e.shiftKey) {
                                        e.preventDefault();
                                        handleSendAction();
                                    }
                                }
                            }}
                            placeholder="Type a message (Ctrl+Enter for new line)"
                            className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] text-sm outline-none resize-none custom-scrollbar min-h-[24px] max-h-32 py-1"
                            rows={1}
                            style={{ fieldSizing: 'content' } as any}
                        />
                    </div>
                    <button
                        onClick={handleSendAction}
                        disabled={!input.trim()}
                        className={`p-2 rounded-full mb-1 transition-all ${input.trim() ? 'bg-[#00a884] text-white shadow-md' : 'text-[#8696a0]'}`}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default React.memo(MessageInput);
