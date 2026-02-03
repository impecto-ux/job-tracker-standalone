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
    onMemberClick?: (member: any) => void;
    isPrivateChannel?: boolean;
}

const USE_GLASS_MESSAGES = true;

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
    onLightbox,
    onMemberClick,
    isPrivateChannel
}) => {
    console.log('[DEBUG] Rendering MessageItem:', msg.id);
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
    const isBot = isBotCheck;

    // Bot Identity & P1 Logic
    const botIdentityRef = { fullName: 'JT ADVISOR', email: 'system@art-engine.ai', role: 'bot', id: 0 };
    const displaySender = isBot
        ? { ...botIdentityRef, ...msg.sender }
        : (msg.sender || { fullName: 'Unknown', email: '' });

    // --- High-End Bot Notification Parser ---
    const parseBotContent = (content: string) => {
        const lines = content.split('\n');
        const taskMatch = content.match(/#(\d+)/);
        const taskNumber = taskMatch ? `#${taskMatch[1]}` : null;

        const isCreated = content.includes('Task Created');
        const isUpdated = content.includes('Task Updated');
        const isPriorityChange = content.includes('Priority Changed');

        let status = 'SYSTEM';
        if (content.match(/DONE/i)) status = 'DONE';
        else if (content.match(/IN PROGRESS/i)) status = 'ON IT';
        else if (isCreated) status = 'OPENED';
        else if (isPriorityChange) status = 'CRITICAL';

        // Extract Title or meaningful summary
        let title = '';
        const titleLine = lines.find(l => l.includes('Title:'));
        if (titleLine) title = titleLine.split('Title:')[1].trim();
        else if (isCreated) title = 'New Request';
        else if (isPriorityChange) title = 'Escalation Alert';

        // Extract cc:
        const ccLine = lines.find(l => l.includes('cc:'));
        const mentions = ccLine ? ccLine.split('cc:')[1].trim() : '';

        // Extract Group
        const groupLine = lines.find(l => l.includes('Group:'));
        const group = groupLine ? groupLine.split('Group:')[1].trim() : '';

        return { taskNumber, status, isCreated, isUpdated, isPriorityChange, title, mentions, group };
    };

    const renderBotUI = () => {
        const data = parseBotContent(msg.content);
        const themeColor = isP1 ? 'rose' : (data.status === 'DONE' ? 'emerald' : data.status === 'ON IT' ? 'blue' : 'zinc');
        const accentHex = themeColor === 'rose' ? '#f43f5e' : themeColor === 'emerald' ? '#10b981' : themeColor === 'blue' ? '#3b82f6' : '#a1a1aa';

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full my-6 px-6 relative"
            >
                {/* Glassy Premium Card */}
                <div className={`w-full max-w-lg relative group`}>
                    {/* Background Glow */}
                    <div className="absolute inset-0 rounded-2xl blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: accentHex }} />

                    <div className={`relative bg-[#09090b]/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl`}>
                        {/* Status Left Accent Line (Integrated) */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 opacity-80" style={{ backgroundColor: accentHex, boxShadow: `0 0 10px ${accentHex}` }} />

                        {/* Top Highlights using gradients */}
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                        <div className="p-5 flex gap-5">
                            {/* Icon Column */}
                            <div className="flex flex-col items-center shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg backdrop-blur-md border border-white/5 relative overflow-hidden`}
                                    style={{
                                        backgroundColor: `${accentHex}10`,
                                        color: accentHex
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                    {isP1 ? <Zap size={20} fill="currentColor" className="animate-pulse relative z-10" /> :
                                        data.status === 'DONE' ? <Check size={20} strokeWidth={3} className="relative z-10" /> :
                                            data.status === 'ON IT' ? <Zap size={20} className="animate-spin-slow relative z-10" /> :
                                                <Bot size={20} className="relative z-10" />}
                                </div>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                            {displaySender.fullName}
                                        </span>
                                        <span className="h-0.5 w-0.5 rounded-full bg-zinc-600" />
                                        <span className="text-[10px] font-mono text-zinc-500">{time}</span>
                                    </div>
                                    {data.taskNumber && (
                                        <div className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-zinc-300 tracking-wider shadow-inner backdrop-blur-sm">
                                            {data.taskNumber}
                                        </div>
                                    )}
                                </div>

                                <h3 className="text-sm font-bold text-white leading-snug tracking-tight mb-3 drop-shadow-md">
                                    {data.title || msg.content.split('\n')[0].replace(/\*\*/g, '')}
                                </h3>

                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    {data.group && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Group</span>
                                            <span className="text-[11px] text-zinc-300 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/5">{data.group}</span>
                                        </div>
                                    )}
                                    {data.mentions && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Signal</span>
                                            <div className="text-[11px] text-zinc-300/80">{renderContent(data.mentions)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Glassy Footer */}
                        <div className="bg-black/20 backdrop-blur-md border-t border-white/5 px-5 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-[0.25em] drop-shadow-sm ${taskStatus === 'revision' ? 'text-amber-500' : taskStatus === 'review' ? 'text-purple-400' : ''}`} style={{ color: taskStatus === 'revision' || taskStatus === 'review' ? undefined : accentHex }}>
                                    {data.status === 'revision' ? 'NEEDS REVISION' : data.status === 'review' ? 'PENDING APPROVAL' : data.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                                <Shield size={10} />
                                System Integrity
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderActivityLogUI = () => {
        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center w-full my-8 px-10 group"
            >
                <div className="flex items-center gap-6 w-full max-w-2xl">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase italic transition-colors group-hover:text-zinc-300">
                            {msg.content}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">
                            <span className="h-1 w-1 rounded-full bg-zinc-800" />
                            <span className="text-[8px] font-black tracking-[0.3em] text-zinc-600 uppercase">
                                {time} · Signal Log
                            </span>
                            <span className="h-1 w-1 rounded-full bg-zinc-800" />
                        </div>
                    </div>

                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
            </motion.div>
        );
    };

    const renderUserMessageUI = () => {
        const accentHex = isMe ? '#00e676' : (isP1 ? '#f43f5e' : (isTask ? '#818cf8' : '#e2e2e2'));
        const initial = displaySender.fullName ? displaySender.fullName.charAt(0).toUpperCase() : '?';

        return (
            <motion.div
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex w-full mb-3 px-4 relative ${isMe ? 'justify-end' : 'justify-start'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                    if (isSelectionMode) {
                        e.stopPropagation();
                        onToggleSelect(msg.id);
                    }
                }}
            >
                {/* Selection Checkbox */}
                <AnimatePresence>
                    {isSelectionMode && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, marginRight: 0 }}
                            animate={{ width: 30, opacity: 1, marginRight: 10 }}
                            exit={{ width: 0, opacity: 0, marginRight: 0 }}
                            className="overflow-hidden shrink-0 flex items-center justify-center self-center"
                        >
                            <div
                                onClick={(e) => { e.stopPropagation(); onToggleSelect(msg.id); }}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[#00a884] border-[#00a884]' : 'border-zinc-500 hover:border-white'}`}
                            >
                                {isSelected && <Check size={14} className="text-black font-bold" />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Background Decoration (Initial) */}
                <div className={`absolute inset-0 flex pointer-events-none select-none overflow-hidden opacity-[0.03] ${isMe ? 'justify-end pr-10' : 'justify-start pl-10'}`}>
                    <span className="text-[100px] font-black italic tracking-tighter text-white -mt-4">
                        {initial}
                    </span>
                </div>

                <div className={`relative max-w-[85%] group`}>
                    {/* Shadow/Glow */}
                    <div className={`absolute -inset-1 rounded-2xl blur-xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                        style={{ backgroundColor: accentHex }}
                    />

                    <div className={`relative backdrop-blur-xl border rounded-2xl overflow-hidden shadow-xl
                        ${isTask ? (isMe ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-indigo-900/30 border-indigo-500/30') : 'bg-black/40 border-white/10'}
                    `}>
                        {/* Task Progress Header (Optional) */}
                        {isTask && (
                            <div className={`h-1 w-full ${taskStatus === 'done' ? 'bg-emerald-500' : taskStatus === 'in_progress' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                        )}

                        <div className="p-3">
                            {/* Forwarded Label */}
                            {msg.metadata?.isForwarded && (
                                <div className="flex items-center gap-1 mb-1 text-[10px] text-zinc-400 italic font-medium select-none">
                                    <ArrowLeft size={12} className="rotate-180" />
                                    Forwarded
                                </div>
                            )}

                            {/* Reply Context (Glassy) */}
                            {msg.replyTo && (
                                <div className="rounded-lg p-2 mb-2 text-xs border-l-2 bg-white/5 border-white/20 opacity-80 backdrop-blur-md">
                                    <div className="font-bold mb-0.5" style={{ color: getSenderColor(msg.replyTo.sender?.fullName || '?').replace('text-', '') }}>
                                        {msg.replyTo.sender?.fullName || 'Unknown'}
                                    </div>
                                    <div className="opacity-70 truncate text-white/70">{msg.replyTo.content}</div>
                                </div>
                            )}

                            {/* Header: Sender Name (Others Only) */}
                            {!isMe && (
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                        onClick={(e) => {
                                            if (onMemberClick && msg.sender?.id) {
                                                e.stopPropagation();
                                                onMemberClick(msg.sender);
                                            }
                                        }}
                                        className={`text-[10px] font-black tracking-widest uppercase ${getSenderColor(displaySender.fullName || '?')} ${onMemberClick && msg.sender?.id ? 'cursor-pointer hover:underline' : ''}`}
                                    >
                                        {displaySender.fullName}
                                    </span>
                                </div>
                            )}

                            {/* Media (Optimized for Glass) */}
                            {msg.mediaUrl && (
                                <div className="mb-2 rounded-xl overflow-hidden border border-white/5">
                                    {msg.mediaType === 'video' || (msg.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) ?
                                        <video src={msg.mediaUrl} controls className="max-w-full" /> :
                                        (msg.mediaType === 'image' || msg.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) ?
                                            <img src={msg.thumbnailUrl || msg.mediaUrl} alt="Attachment" className="max-w-full cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onLightbox(msg.mediaUrl || null)} /> :
                                            <a href={msg.mediaUrl} download className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 transition-colors group/doc">
                                                <div className="p-2 rounded bg-emerald-500/20 text-emerald-400"><Layout size={18} /></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{msg.mediaUrl.split('/').pop()?.split('-').slice(1).join('-') || 'Document'}</div>
                                                    <div className="text-[8px] text-zinc-500 uppercase font-mono">{msg.mediaUrl.split('.').pop()}</div>
                                                </div>
                                            </a>
                                    }
                                </div>
                            )}

                            {/* Content */}
                            <div className={`whitespace-pre-wrap break-words select-text text-[13px] leading-relaxed text-zinc-100 ${isMe ? 'pr-2' : ''}`}>
                                {renderContent(msg.content)}
                            </div>

                            {/* System Feedback (Rejection/Deletion) */}
                            {isTask && (msg.metadata?.rejectionReason || msg.metadata?.deletionReason) && (
                                <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-red-400 tracking-wider">
                                        <AlertCircle size={10} />
                                        {msg.metadata.deletionReason ? 'TASK PERMANENTLY DELETED' : 'TASK REJECTED'}
                                    </div>
                                    <div className="text-[11px] text-zinc-300 italic leading-relaxed">
                                        "{msg.metadata.deletionReason || msg.metadata.rejectionReason}"
                                    </div>
                                </div>
                            )}

                            {/* Footer: Time & Status */}
                            <div className="flex items-center justify-end gap-3 mt-3 opacity-60 select-none">
                                {isTask && (
                                    <div className="flex items-center gap-2 mr-auto px-2 py-1 rounded-lg bg-black/40 border border-white/10 shadow-inner" title={`Status: ${taskStatus || 'PENDING'}`}>
                                        <div className="flex gap-1.5 items-center">
                                            {/* TODO / DRAFT */}
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all duration-700 ${!taskStatus || taskStatus === 'todo' ? 'bg-zinc-400 shadow-zinc-400/80 ring-2 ring-zinc-400/20' : 'bg-zinc-800'}`} />

                                            {/* IN PROGRESS */}
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all duration-700 ${taskStatus === 'in_progress' ? 'bg-blue-400 shadow-blue-400/80 ring-2 ring-blue-400/20 animate-pulse' : 'bg-zinc-800'}`} />

                                            {/* REVIEW (Middle-Right) - NEW */}
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all duration-700 ${taskStatus === 'review' ? 'bg-purple-500 shadow-purple-500/80 ring-2 ring-purple-500/20 animate-pulse' : 'bg-zinc-800'}`} />

                                            {/* DONE / REJECTED / REVISION */}
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all duration-700 
                                                 ${taskStatus === 'done' ? 'bg-emerald-400 shadow-emerald-400/80 ring-2 ring-emerald-400/20' :
                                                    (taskStatus === 'rejected' || msg.metadata?.deletionReason) ? 'bg-red-500 shadow-red-500/80 ring-2 ring-red-500/20' :
                                                        taskStatus === 'revision' ? 'bg-amber-500 shadow-amber-500/80 ring-2 ring-amber-500/20 animate-bounce' : 'bg-zinc-800'}`}
                                            />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-wider ml-1 
                                             ${taskStatus === 'done' ? 'text-emerald-400' :
                                                (taskStatus === 'rejected' || msg.metadata?.deletionReason) ? 'text-red-400' :
                                                    taskStatus === 'in_progress' ? 'text-blue-400' :
                                                        taskStatus === 'review' ? 'text-purple-400' :
                                                            taskStatus === 'revision' ? 'text-amber-500' :
                                                                'text-zinc-500'}`}>
                                            {(taskStatus === 'rejected' || msg.metadata?.deletionReason) ? 'REJECTED' :
                                                taskStatus === 'done' ? 'COMPLETED' :
                                                    taskStatus === 'in_progress' ? 'ON AIR' :
                                                        taskStatus === 'review' ? 'IN REVIEW' :
                                                            taskStatus === 'revision' ? `REVISION ${msg.linkedTask?.revisionCount ? `#${msg.linkedTask.revisionCount}` : ''}` :
                                                                'QUEUED'}
                                        </span>
                                    </div>
                                )}
                                <span className="text-[10px] font-mono font-black tracking-tighter text-white">{time}</span>
                                {isMe && (
                                    <div className="flex items-center gap-0.5">
                                        <Check size={12} strokeWidth={3} className={isTask && taskStatus === 'done' ? 'text-emerald-400' : 'text-zinc-500'} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dropdown Arrow (New Premium Version) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                (window as any).dispatchEvent(new CustomEvent('open-msg-menu', { detail: { rect, msg } }));
                            }}
                            className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10 rounded-bl-xl border-l border-b border-white/5"
                        >
                            <MoreHorizontal size={12} className="text-white/60" />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    const isTask = msg.linkedTaskId || msg.taskStatus || (msg.content.includes('!task') && !isPrivateChannel);

    // DEBUG: Force a background color for testing
    const debugStyle = { border: '2px solid rgba(255,255,255,0.05)' };

    if (isActivityLog) {
        return renderActivityLogUI();
    }

    if (isBot) {
        return renderBotUI();
    }

    if (USE_GLASS_MESSAGES) {
        return renderUserMessageUI();
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
                                <div
                                    onClick={(e) => {
                                        if (onMemberClick && msg.sender?.id) {
                                            e.stopPropagation();
                                            onMemberClick(msg.sender);
                                        }
                                    }}
                                    className={`text-xs font-bold mb-1 ${getSenderColor(displaySender.fullName || '?')} ${onMemberClick && msg.sender?.id ? 'cursor-pointer hover:underline' : ''}`}
                                >
                                    {displaySender.fullName}
                                </div>
                            )}

                            {/* Media */}
                            {msg.mediaUrl && (
                                <div className="mb-2 mt-1">
                                    {msg.mediaType === 'video' || (msg.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) ?
                                        <video src={msg.mediaUrl} controls className="max-w-full rounded-lg" /> :
                                        (msg.mediaType === 'image' || msg.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) ?
                                            <img
                                                src={msg.thumbnailUrl || msg.mediaUrl}
                                                alt="Attachment"
                                                className="max-w-full rounded-lg cursor-pointer"
                                                onClick={() => onLightbox(msg.mediaUrl || null)}
                                            /> :
                                            <a
                                                href={msg.mediaUrl}
                                                download
                                                className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/10 hover:bg-black/40 transition-all group/doc"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="p-2 rounded bg-emerald-500/20 text-emerald-500 group-hover/doc:bg-emerald-500/30 transition-colors">
                                                    <Layout size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">
                                                        {msg.mediaUrl.split('/').pop()?.split('-').slice(1).join('-') || 'Document'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 uppercase font-mono mt-0.5">
                                                        {msg.mediaUrl.split('.').pop()?.toUpperCase()} File
                                                    </div>
                                                </div>
                                            </a>
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
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    (window as any).dispatchEvent(new CustomEvent('open-msg-menu', { detail: { rect, msg } }));
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
