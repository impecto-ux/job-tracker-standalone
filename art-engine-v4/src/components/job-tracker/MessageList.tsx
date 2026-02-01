import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Layout, Trash2, Edit2, Shield, AlertCircle, Download } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import MessageItem from './MessageItem';

interface MessageListProps {
    messages: any[];
    currentUser: any;
    users: any[];
    tasks: any[];
    taskStatusMap: Record<number, string>;
    isSelectionMode: boolean;
    selectedMessageIds: number[];
    onToggleSelect: (id: number) => void;
    onReply: (msg: any) => void;
    onDelete: (msg: any) => void;
    onLightbox: (url: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentUser,
    users,
    tasks,
    taskStatusMap,
    isSelectionMode,
    selectedMessageIds,
    onToggleSelect,
    onReply,
    onDelete,
    onLightbox,
    messagesEndRef
}) => {
    // Local Context Menu State (Lifted from Item via Custom Event)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: any, align?: 'up' | 'down' } | null>(null);

    // Event Listener for Item Context Menu Trigger
    useEffect(() => {
        const handleOpenMenu = (e: any) => {
            const { event, msg } = e.detail;
            const rect = event.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const align = spaceBelow < 250 ? 'up' : 'down';
            const y = align === 'down' ? rect.bottom : rect.top;
            setContextMenu({ x: rect.right - 150, y, msg, align });
        };

        window.addEventListener('open-msg-menu', handleOpenMenu);
        window.addEventListener('click', () => setContextMenu(null));

        return () => {
            window.removeEventListener('open-msg-menu', handleOpenMenu);
            window.removeEventListener('click', () => setContextMenu(null));
        };
    }, []);

    // Memoize Task Map for O(1) Lookup
    const taskMap = useMemo(() => {
        const map = new Map();
        tasks.forEach(t => map.set(t.id, t));
        return map;
    }, [tasks]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-1 z-10 custom-scrollbar relative">
            {/* Context Menu Overlay */}
            {contextMenu && (
                <div
                    className="fixed z-[70] bg-[#233138] rounded-lg shadow-xl border border-white/5 py-1 min-w-[200px]"
                    style={{
                        top: contextMenu.align === 'up' ? undefined : contextMenu.y,
                        bottom: contextMenu.align === 'up' ? (window.innerHeight - contextMenu.y) : undefined,
                        left: contextMenu.x
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { onReply(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                        <ArrowLeft size={16} /> Reply
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                        <Layout size={16} /> Copy
                    </button>

                    {/* Download Attachment */}
                    {contextMenu.msg.mediaUrl && (
                        <button onClick={() => {
                            const link = document.createElement('a');
                            link.href = contextMenu.msg.mediaUrl || '';
                            link.target = '_blank';
                            link.download = contextMenu.msg.mediaUrl?.split('/').pop() || 'download';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setContextMenu(null);
                        }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                            <Download size={16} /> Download
                        </button>
                    )}

                    {currentUser?.id === contextMenu.msg.sender?.id && (
                        <>
                            <div className="h-px bg-white/10 my-1" />
                            {/* Edit not implemented yet but placeholder */}
                            <button onClick={() => { alert('Edit not implemented'); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-[#d1d7db] text-sm flex items-center gap-3">
                                <Edit2 size={16} /> Edit
                            </button>
                            <button onClick={() => { onDelete(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-red-400 text-sm flex items-center gap-3">
                                <Trash2 size={16} /> Delete
                            </button>
                        </>
                    )}
                    {currentUser?.id !== contextMenu.msg.sender?.id && (
                        <>
                            <div className="h-px bg-white/10 my-1" />
                            <button onClick={() => { setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[#111b21] text-red-400 text-sm flex items-center gap-3">
                                <Shield size={16} /> Report
                            </button>
                        </>
                    )}
                </div>
            )}

            {messages.map((msg, index) => {
                const prev = messages[index - 1];
                const isNewDay = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();

                // P1 Logic
                let isP1 = msg.content.includes('[P1]') || msg.content.toUpperCase().includes('URGENT');
                let targetTaskId = msg.linkedTaskId;
                if (!targetTaskId) {
                    const match = msg.content.match(/#(\d+)/);
                    if (match) targetTaskId = parseInt(match[1]);
                }
                if (targetTaskId && taskMap.get(targetTaskId)?.priority === 'P1') {
                    isP1 = true;
                }

                const status = targetTaskId ? taskStatusMap[targetTaskId] : (msg.taskStatus || undefined);

                return (
                    <MessageItem
                        key={msg.id || index}
                        msg={msg}
                        currentUser={currentUser}
                        users={users}
                        isP1={isP1}
                        taskStatus={status}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedMessageIds.includes(msg.id)}
                        isNewDay={isNewDay}
                        onToggleSelect={onToggleSelect}
                        onReply={onReply}
                        onDelete={onDelete}
                        onLightbox={onLightbox}
                    />
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default React.memo(MessageList);
