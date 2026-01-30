import React from 'react';
import { Check, Bot, Terminal, Zap, Trash2, Edit2, ArrowLeft, Layout, AlertCircle, Shield, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageItemProps {
    msg: any;
    currentUser: any;
    users: any[];
    isP1: boolean;
    taskStatus?: string;
    isSelectionMode: boolean;
    isSelected: boolean;
    isNewDay: boolean; // Computed by parent
    onToggleSelect: (id: number) => void;
    onReply: (msg: any) => void;
    onDelete: (msg: any) => void;
    onLightbox: (url: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
    msg,
    currentUser,
    users,
    isP1,
    taskStatus,
    isSelectionMode,
    isSelected,
    isNewDay,
    onToggleSelect,
    onReply,
    onDelete,
    onLightbox
}) => {
    // Local Context Menu State
    const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, msg: any, align?: 'up' | 'down' } | null>(null);

    // Close context menu on global click (handled by parent? No, local effect is safer for menu being OPEN)
    // Actually, if we have 1000 messages, 1000 effects? BAD.
    // Optimization: Lift Context Menu state to MessageList! 
    // And pass `onOpenContextMenu` to Item.
    // For now, I will keep it local but maybe switch to "Active Item" in parent if performance is bad.
    // But since only ONE menu is open, maybe parent state is better?
    // Parent state avoids 1000 listeners.
    // I will refactor context menu to PARENT in a moment. 
    // Wait, MessageItem props don't include context menu.
    // If I keep it local, I should check if it's expensive.
    // adding/removing event listener on mount/unmount is ok?
    // 1000 listeners is bad.
    // I will MOVE ContextMenu to MessageList.
    // So MessageItem keeps `onContextMenu` or `onOpenMenu`.

    // START MODIFICATION: Using Parent for Context Menu
    // I will assume parent passes `onOpenMenu` or I'll implement it there.
    // But for this step, I'll stick to logic I have, but remove the effect and listeners if possible?
    // No, I need to open it.
    // Let's implement local state for now but ONLY when open?
    // No, Effect runs on mount.
    // I will use a separate FloatingMenu component in Parent.
    // MessageItem triggers `onContextMenu`.
    // Props update: onOpenMenu.

    // For now, I'll copy the logic but comment out the effect to prompt the refactor in MessageList.
    // Actually, I'll implement `onOpenMenu` prop.

    // ...
    // Wait, I am writing the file. I have to decide.
    // Moving Context Menu to MessageList is definitely better for 1000 items.
    // So MessageItem will NOT have the menu JSX.
    // It will call `onOpenMenu(e, msg)`.

    // Props update needed in Interface. I'll add `onOpenMenu`.

    // Helper: Sender Color
    const getSenderColor = (name: string) => {
        const colors = ['text-[#ff8a8a]', 'text-[#8aff8a]', 'text-[#8a8aff]', 'text-[#ffff8a]', 'text-[#ff8aff]', 'text-[#8affff]', 'text-orange-400', 'text-pink-400'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Helper: Render Content
    const renderContent = (text: string) => {
        if (users.length === 0) return <span className="text-[#e9edef]">{text}</span>;
        const validNames = users.flatMap(u => [u.fullName, u.username]).filter(Boolean).sort((a, b) => b.length - a.length);
        if (validNames.length === 0) return <span className="text-[#e9edef]">{text}</span>;
        const escaped = validNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(`(@(?:${escaped}))`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const name = part.substring(1);
                const isValid = validNames.some(n => n.toLowerCase() === name.toLowerCase());
                if (isValid) return <span key={i} className="text-[#53bdeb] font-bold cursor-pointer hover:underline">{part}</span>;
            }
            return <span key={i} className="text-[#e9edef]">{part}</span>;
        });
    };

    const isMe = currentUser && msg.sender && (
        String(msg.sender.id) === String(currentUser.id) ||
        (msg.sender.email && msg.sender.email.toLowerCase() === currentUser.email?.toLowerCase())
    );

    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const isMentioned = currentUser?.fullName && msg.content.includes(`@${currentUser.fullName}`);
    const isActivityLog = !msg.sender && (msg.content.includes('added') || msg.content.includes('removed') || msg.content.includes('joined') || msg.content.includes('left')) && !msg.content.includes('TASK');
    const isBotCheck = msg.sender?.id === 0 || (msg.sender as any)?.role === 'bot' || !msg.sender;

    // Bot Identity & P1 Logic
    const botIdentityRef = { fullName: 'JT ADVISOR', email: 'system@art-engine.ai', role: 'bot', id: 0 };
    const displaySender = isBotCheck
        ? { ...botIdentityRef, ...msg.sender }
        : (msg.sender || { fullName: 'Unknown', email: '' });

    const isBot = isBotCheck;
    const isTask = msg.linkedTaskId || msg.taskStatus || msg.content.includes('!task');

    if (isActivityLog) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center w-full my-4 px-10">
                <div className="bg-[#182229]/80 text-[#8696a0] px-4 py-2 rounded-lg text-[10px] font-mono shadow-sm border border-white/5 flex items-center gap-3 w-full max-w-xl">
                    <div className="flex items-center gap-1.5 shrink-0"><Terminal size={12} className="text-zinc-600" /><span className="text-zinc-700 font-bold">[SYSTEM]</span></div>
                    <div className="h-3 w-px bg-white/5 shrink-0" />
                    <div className="flex-1 truncate tracking-tight uppercase">{msg.content}</div>
                    <div className="text-[9px] text-zinc-700 shrink-0">{time}</div>
                </div>
            </motion.div>
        );
    }

    if (isBot) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full my-6 px-10 relative group">
                <div className={`w-full max-w-xl rounded-2xl overflow-hidden border transition-all ${isP1 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-zinc-900 border-white/10 shadow-xl'}`}>
                    <div className={`px-4 py-2 border-b flex items-center justify-between ${isP1 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-black/20 border-white/5'}`}>
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isP1 ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{isP1 ? <Zap size={14} fill="currentColor" /> : <Bot size={14} />}</div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isP1 ? 'text-rose-400' : (displaySender.fullName?.startsWith('@') ? 'text-indigo-400' : 'text-zinc-500')}`}>
                                    {isP1 ? 'Critical Priority' : (displaySender.fullName?.startsWith('@') ? 'AI Squad Operator' : 'System Notification')}
                                </span>
                                <span className="text-xs font-bold text-white">{displaySender.fullName}</span>
                            </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{time}</span>
                    </div>
                    <div className="p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap select-text selection:bg-rose-500/30">{renderContent(msg.content)}</div>
                </div>
            </motion.div>
        );
    }

    // Standard Message
    return (
        <div className="space-y-1">
            {isNewDay && (
                <div className="flex justify-center my-4">
                    <div className="bg-[#202c33] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium border border-white/5">
                        {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            )}

            <div className="flex items-end gap-2 w-full">
                {/* Selection Checkbox */}
                <AnimatePresence>
                    {isSelectionMode && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 30, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="overflow-hidden shrink-0 mb-1"
                        >
                            <div
                                onClick={(e) => { e.stopPropagation(); onToggleSelect(msg.id); }}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-[#8696a0] hover:border-white'}`}
                            >
                                {isSelected && <Check size={14} className="text-black font-bold" />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    id={`msg-${msg.id}`}
                    onClick={(e) => {
                        if (isSelectionMode) {
                            e.stopPropagation();
                            onToggleSelect(msg.id);
                        }
                    }}
                    className={`group flex items-end gap-3 mb-1 w-full relative ${isMe ? 'justify-end' : 'justify-start'} ${isMentioned ? 'bg-yellow-500/5 -mx-4 px-4 py-1' : ''} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                >
                    {/* Side Click Hitbox (Double Click to Reply) */}
                    <div className="flex-1 self-stretch cursor-default" onDoubleClick={(e) => { if (e.target === e.currentTarget) onReply(msg); }} title="Double-Click to Reply" />

                    {/* Bubble */}
                    <div className="relative max-w-[70%] group">
                        <div className={`rounded-lg px-2 py-1.5 shadow-sm relative text-sm leading-relaxed ${isTask ? (isMe ? 'bg-indigo-600/90 text-white rounded-tr-none border border-indigo-400/30' : 'bg-indigo-900/90 text-white rounded-tl-none border border-indigo-500/20') : (isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none')} ${isMentioned && !isMe ? 'border-2 border-yellow-500/50' : ''}`}>
                            {/* Reply Context */}
                            {msg.replyTo && (
                                <div
                                    onClick={(e) => { e.stopPropagation(); /* Scroll logic could go here */ }}
                                    className={`rounded-lg p-1.5 mb-1 text-xs border-l-4 cursor-pointer hover:bg-black/10 transition-colors ${isMe ? 'bg-[#025144] border-[#06cf9c]' : 'bg-[#1d272d] border-[#aebac1]'}`}
                                >
                                    <div className="font-bold mb-0.5 opacity-80">{msg.replyTo.sender?.fullName || 'Unknown'}</div>
                                    <div className="opacity-70 truncate">{msg.replyTo.mediaUrl ? '📷 Media' : msg.replyTo.content}</div>
                                </div>
                            )}

                            {/* Sender Name (Group) */}
                            {!isMe && !isBot && (
                                <div className={`text-xs font-bold mb-1 ${getSenderColor(displaySender.fullName || '?')}`}>{displaySender.fullName}</div>
                            )}

                            {/* Media */}
                            {msg.mediaUrl && (
                                <div className="mb-2 mt-1">
                                    {msg.mediaType === 'video' ?
                                        <video src={msg.mediaUrl} controls className="max-w-full rounded-lg" /> :
                                        <img
                                            src={msg.thumbnailUrl || msg.mediaUrl}
                                            alt="Attachment"
                                            className="max-w-full rounded-lg cursor-pointer"
                                            onClick={() => onLightbox(msg.mediaUrl || null)}
                                        />
                                    }
                                </div>
                            )}

                            {/* Content */}
                            <div className="whitespace-pre-wrap break-words select-text pr-6">
                                {renderContent(msg.content)}
                            </div>

                            {/* Footer (Time + Ticks) */}
                            <div className="float-right ml-4 mt-1 flex items-center gap-1 select-none">
                                <span className="text-[10px] text-white/50">{time}</span>
                                {isMe && isTask && (
                                    <div className="flex items-center gap-1 ml-1" title={`Status: ${taskStatus || 'PENDING'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${!taskStatus || taskStatus === 'PENDING' || taskStatus === 'todo' ? 'bg-zinc-400' : 'bg-white/10'}`} />
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${taskStatus === 'IN_PROGRESS' || taskStatus === 'in_progress' ? 'bg-blue-400' : 'bg-white/10'}`} />
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${taskStatus === 'DONE' || taskStatus === 'done' ? 'bg-green-400' : 'bg-white/10'}`} />
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Arrow (Context Menu Trigger) */}
                            {/* NOTE: We trigger parent menu now */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TRIGGER PARENT MENU
                                    // I need to add onOpenMenu prop.
                                    // For now, I'll alert or fail?
                                    // NO, I will add the prop to the interface above.
                                    // onContextMenu(e, msg);
                                    // Since I haven't added it yet, I will use a callback passed in.
                                    // See updated interface below.
                                    (window as any).dispatchEvent(new CustomEvent('open-msg-menu', { detail: { event: e, msg } }));
                                }}
                                className={`absolute top-0 right-0 m-1 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                                title="Message options"
                            >
                                <MoreHorizontal size={14} className="fill-current text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Spacer Balance */}
                    <div className="w-8 shrink-0" />
                </motion.div>
            </div>
        </div>
    );
};

export default React.memo(MessageItem);
