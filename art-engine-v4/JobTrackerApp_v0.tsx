import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, MessageSquare, CheckCircle, CheckCircle2, Check, Clock, AlertCircle, ArrowLeft, Send, RefreshCw, Play, AlertOctagon, XCircle, Trash2, User, Sparkles, X, ChevronDown, LogOut, Settings, LayoutGrid, List, MoreHorizontal, Grid3X3, Columns, Layout, Menu, PanelLeftClose, Minimize2, Maximize2 } from 'lucide-react';
import ChatInterface from '@/components/job-tracker/ChatInterface';
import AlmanacApp from '@/apps/AlmanacApp';
import LoginModal from '@/components/auth/LoginModal';
import UserProfileModal from '@/components/auth/UserProfileModal';
import UserManagementModal from '@/components/auth/UserManagementModal';
import { Shield } from 'lucide-react';

import api from '@/lib/api';
import { useStore } from '@/lib/store';

import { TaskTimerWidget } from '@/components/job-tracker/TaskTimerWidget';

// --- TYPES ---
interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    dept: string; // Mapped from department relation if needed
    owner: string;
    requester: string;
    due: string;
    createdAt: string;
    updatedAt: string;
    imageUrl?: string;
    startedAt?: string;
    completedAt?: string;
    score: number;
    category: string;
}



export default function JobTrackerApp() {
    const { chat, auth } = useStore();
    const [lastSync, setLastSync] = useState(new Date());
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tokenUsage, setTokenUsage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDept, setFilterDept] = useState<string>('all'); // NEW: Dept Filter
    const [sortBy, setSortBy] = useState<'priority' | 'group' | 'newest'>('priority'); // NEW: Sort State
    const [viewMode, setViewMode] = useState<'board' | 'list' | 'grid'>('board'); // NEW: View Mode
    const [searchQuery, setSearchQuery] = useState('');
    const [archiveDate, setArchiveDate] = useState(new Date());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [dailyReportContent, setDailyReportContent] = useState('');

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [chatPendingMessage, setChatPendingMessage] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);

    // Quick Action State: { taskId, type: 'ask' | 'reject', content: '' }
    const [quickAction, setQuickAction] = useState<{ taskId: number; type: 'ask' | 'reject', content: string } | null>(null);

    // Mobile State
    const [mobileTab, setMobileTab] = useState<'tasks' | 'chat' | 'stats'>('tasks');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024; // Simple check

    const handleAskQuestion = async () => {
        if (!selectedTask) return;

        const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
        const question = commentBox?.value?.trim();

        if (!question) {
            alert("L├╝tfen sorunuzu yaz─▒n.");
            return;
        }

        const deptChannel = chat.channels.find(c => c.name.toLowerCase() === selectedTask.dept?.toLowerCase());
        const targetChannelId = deptChannel ? deptChannel.id : (chat.activeChannelId || chat.channels[0]?.id);

        if (targetChannelId) {
            try {
                chat.setActiveChannel(targetChannelId);

                // Tag Requester as requested by user
                const messageContent = `@${selectedTask.requester} [Task #${selectedTask.id}] ${question}`;

                await api.post(`/channels/${targetChannelId}/messages`, {
                    content: messageContent
                });

                commentBox.value = '';

            } catch (error) {
                console.error("Failed to send automatic question", error);
                alert("Mesaj g├╢nderilemedi.");
            }
        }
    };

    const handleGenerateReport = async () => {
        setIsReportModalOpen(true);
        if (dailyReportContent) return;

        setIsGeneratingReport(true);
        try {
            const res = await api.get('/ai/daily-report');
            setDailyReportContent(res.data.report);
        } catch (error) {
            console.error("Failed to generate report", error);
            setDailyReportContent("Failed to generate daily report. Please try again.");
        } finally {
            setIsGeneratingReport(false);
        }
    };
    const toggleTaskSelection = (id: number) => {
        const newSet = new Set(selectedTaskIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTaskIds(newSet);
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedTaskIds(new Set());
        } else {
            setIsSelectionMode(true);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedTaskIds.size} tasks permanently ? `)) return;

        try {
            // Delete one by one for now (backend might not have bulk endpoint yet)
            // Or create Promise.all
            await Promise.all(Array.from(selectedTaskIds).map(id => api.delete(`/tasks/${id}`)));

            // Cleanup
            setIsSelectionMode(false);
            setSelectedTaskIds(new Set());
            loadTasks();
        } catch (error) {
            console.error("Failed to delete tasks", error);
            alert("Some tasks could not be deleted.");
        }
    };

    // Load Tasks
    const loadTasks = async () => {
        try {
            // Add cache buster to ensure fresh data
            const res = await api.get(`/tasks?_t=${Date.now()}`);

            // Map backend tasks to frontend shape
            const mappedTasks = res.data.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                priority: t.priority,
                // PRESERVE BACKEND CASING to match filter exactly
                dept: t.department?.name || 'General',
                owner: t.owner?.fullName || 'Unknown',
                requester: t.requester?.fullName || 'System',
                due: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No Date',
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                imageUrl: t.imageUrl,
                startedAt: t.startedAt,
                completedAt: t.completedAt,
                score: t.score || 0,
                category: t.category || 'Uncategorized'
            }));

            // Log for debugging (User can see this in browser console)
            if (res.data.length > 0) {
                console.log(`[Sync] ${res.data.length} tasks synced at ${new Date().toLocaleTimeString()}`);
                // Only log first task if it's new to avoid spamming
                if (tasks.length > 0 && res.data[0].id !== tasks[0]?.id) {
                    console.info("NEW TASK DETECTED:", res.data[0]);
                }
                // DEBUG: Inspect dates
                console.log("Date Check:", {
                    taskDate: res.data[0]?.createdAt,
                    jsDate: new Date(res.data[0]?.createdAt).toDateString(),
                    today: new Date().toDateString()
                });
            }

            setTasks(mappedTasks);
            setLastSync(new Date());
        } catch (error) {
            console.error("Failed to load tasks", error);
        }
    };

    useEffect(() => {
        if (auth.token) {
            loadTasks();
            // Poll for fresh data every 3 seconds (reduced from 5s)
            const interval = setInterval(() => {
                loadTasks();
                api.get('/auth/me').then(res => {
                    if (res.data) {
                        if (res.data.tokenUsage !== undefined) setTokenUsage(res.data.tokenUsage);
                        auth.setUser(res.data);
                    }
                }).catch(e => { });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [auth.token, archiveDate, filterStatus, filterDept]);

    // Filter Logic
    // Filter Logic
    const filteredTasks = tasks.filter(task => {
        const term = searchQuery.toLowerCase();
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesDept = filterDept === 'all' || task.dept === filterDept;

        const matchesSearch =
            task.title.toLowerCase().includes(term) ||
            task.dept.toLowerCase().includes(term) ||
            task.owner.toLowerCase().includes(term) ||
            task.requester?.toLowerCase().includes(term) ||
            task.description?.toLowerCase().includes(term) ||
            task.id.toString().includes(term);

        // Date Filter for Done/Rejected
        // If Searching, Ignore Date Filter to find old tasks
        const isArchived = task.status === 'done' || task.status === 'rejected';
        const matchesDate = searchQuery ? true : (!isArchived || new Date(task.updatedAt).toLocaleDateString() === archiveDate.toLocaleDateString());

        return matchesStatus && matchesSearch && matchesDept && matchesDate;
    });

    // Extract Unique Departments
    const departments = Array.from(new Set(tasks.map(t => t.dept || 'General'))).sort();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'todo': return 'bg-zinc-800 text-zinc-300 border-zinc-700'; // Neutral
            case 'in_progress': return 'bg-indigo-900/40 text-indigo-300 border-indigo-500/50 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]'; // Glowing Blue/Indigo
            case 'review': return 'bg-violet-900/40 text-violet-300 border-violet-500/50';
            case 'done': return 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50';
            case 'blocked': return 'bg-rose-900/40 text-rose-300 border-rose-500/50';
            case 'rejected': return 'bg-gray-900/60 text-gray-500 border-gray-700 dashed border-2';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    // Procedural Color Generator (HSL)
    const generateGroupColor = (str: string, type: 'border' | 'bg' | 'text' = 'bg') => {
        if (!str) return 'bg-zinc-500'; // Fallback

        // Simple Hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // HSL Generation
        // Hue: 0-360 based on hash
        const hue = Math.abs(hash) % 360;
        // Saturation: Fixed high for vibrance (70-80%)
        const sat = 75;
        // Lightness: Fixed medium-high (50-60%) for visibility
        const light = 55;

        if (type === 'border') return `border-[hsl(${hue},${sat}%,${light}%)]`;
        if (type === 'text') return `text-[hsl(${hue},${sat}%,${light}%)]`;
        return `bg-[hsl(${hue},${sat}%,${light}%)]`;
    };

    // Legacy random color (keeping for backup, but unused now)
    const getDepartmentColor = (deptName: string) => {
        // ... (legacy implementation)
        return generateGroupColor(deptName); // Redirect to new generator
    };

    // Resizable Sidebar Logic
    const [sidebarWidth, setSidebarWidth] = useState(850); // Increased initial width to 850px
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [isResizing, setIsResizing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false); // Full Screen State

    // Compute Sorted Channels for Collapsed View
    const sortedChannels = React.useMemo(() => {
        return [...chat.channels].sort((a, b) => {
            const msgsA = chat.messages[a.id] || [];
            const msgsB = chat.messages[b.id] || [];
            const lastTimeA = msgsA.length > 0 ? new Date(msgsA[msgsA.length - 1].createdAt || 0).getTime() : 0;
            const lastTimeB = msgsB.length > 0 ? new Date(msgsB[msgsB.length - 1].createdAt || 0).getTime() : 0;
            return lastTimeB - lastTimeA;
        });
    }, [chat.channels, chat.messages]);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing && !isFullScreen) {
                const newWidth = mouseMoveEvent.clientX;
                if (newWidth > 300 && newWidth < 2500) { // Increased max limit
                    setSidebarWidth(newWidth);
                }
            }
        },
        [isResizing, isFullScreen]
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    // -- Handlers --
    const handleDeleteTask = async () => {
        if (!selectedTask) return;
        if (!confirm('Are you sure you want to PERMANENTLY delete this task? This action cannot be undone.')) return;

        try {
            await api.delete(`/tasks/${selectedTask.id}`);
            // Remove from state
            setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("Failed to delete task");
        }
    };

    const handleStatusUpdate = async (taskId: number, newStatus: string) => {
        try {
            const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
            const comment = commentBox?.value;
            await api.patch(`/tasks/${taskId}`, { status: newStatus, comment }, {
                headers: { 'Content-Type': 'application/json' } // Explicit header
            });

            // Optimistic update
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            if (selectedTask && selectedTask.id === taskId) {
                setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
            }

            // Clear comment
            if (commentBox) commentBox.value = '';

        } catch (error) {
            console.error("Failed to update status", error);
            // alert("Failed to update status"); // Silent fail preferred in dev
        }
    };



    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedTask(null);
                setLightboxUrl(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // ... existing code ...



    // Auto-deselect channel on resize (User Request)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                chat.setActiveChannel(null);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Calculate P1 Stats for Chat Groups
    const channelStats = React.useMemo(() => {
        const stats: Record<string, { p1Count: number }> = {};
        tasks.forEach(task => {
            if (task.priority === 'P1' && task.status !== 'done' && task.status !== 'rejected') {
                const deptName = (task.dept || 'General').toLowerCase();
                if (!stats[deptName]) {
                    stats[deptName] = { p1Count: 0 };
                }
                stats[deptName].p1Count++;
            }
        });
        return stats;
    }, [tasks]);

    // Shared Sort Function
    const sortTasksFn = (a: Task, b: Task) => {
        // 1. Group Logic
        if (sortBy === 'group') {
            const deptA = a.dept || 'ZZZ';
            const deptB = b.dept || 'ZZZ';
            if (deptA !== deptB) return deptA.localeCompare(deptB);
        }

        // 2. Priority Logic
        if (sortBy === 'priority' || sortBy === 'group') {
            const pMap: Record<string, number> = { 'P1': 3, 'P2': 2, 'P3': 1 };
            const pDiff = (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
            if (pDiff !== 0) return pDiff;
        }

        // 3. Newest First
        return b.id - a.id;
    };

    return (
        <div className={`h-full w-full bg-black text-zinc-100 font-sans flex flex-col md:flex-row overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''} relative`}>
            {/* ... */}
            {/* Global Lightbox */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxUrl(null)}
                        className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm cursor-pointer"
                    >
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            src={lightboxUrl}
                            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain border border-white/10"
                        />
                        <button className="absolute top-4 right-4 text-white/50 hover:text-white">
                            <XCircle size={32} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <LoginModal />
            <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentUser={auth.user}
                onUpdate={() => {
                    api.get('/auth/me').then(res => auth.setUser(res.data));
                }}
            />

            <UserManagementModal
                isOpen={isUserManagementOpen}
                onClose={() => setIsUserManagementOpen(false)}
            />

            {/* DAILY REPORT MODAL */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Sparkles size={18} />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Daily Operations Brief</h2>
                                </div>
                                <button
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 font-mono text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {isGeneratingReport ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-500">
                                        <div className="animate-spin text-indigo-500">
                                            <RefreshCw size={32} />
                                        </div>
                                        <p>Analyzing workloads and generating summary...</p>
                                    </div>
                                ) : (
                                    dailyReportContent
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/50 flex justify-end">
                                <button
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="px-4 py-2 bg-white text-black font-bold text-xs rounded hover:bg-zinc-200 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* CHAT PANEL (Resizable & Collapsible) */}
            <div
                style={{ width: isChatCollapsed ? '40px' : (isFullScreen ? '100%' : sidebarWidth) }}
                className={`border-r border-white/10 ${mobileTab === 'chat' ? 'flex w-full fixed inset-0 z-40 bg-zinc-950 pb-20' : 'hidden'} md:flex md:pb-0 h-full shrink-0 relative group/resizer transition-all duration-300 ease-in-out flex-col text-left ${isChatCollapsed ? 'bg-zinc-900 cursor-pointer hover:bg-zinc-800' : ''}`}
                onClick={() => isChatCollapsed && setIsChatCollapsed(false)}
            >
                {/* Collapsed UI */}
                {/* Collapsed UI */}
                <div className={`h-full w-full flex flex-col items-center py-4 gap-4 ${isChatCollapsed ? 'flex' : 'hidden'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setIsChatCollapsed(false); }} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <Menu size={20} />
                    </button>

                    {/* Active Channel Badges */}
                    <div className="flex-1 flex flex-col gap-3 w-full items-center overflow-hidden pt-4">
                        {sortedChannels.slice(0, 6).map(channel => {
                            const unreadCount = unreadCounts[channel.id] || 0;

                            return (
                                <button
                                    key={channel.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        chat.setActiveChannel(channel.id);
                                        setIsChatCollapsed(false);
                                    }}
                                    className="relative group/badge"
                                    title={channel.name}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform hover:scale-110 ${generateGroupColor(channel.name)}`}>
                                        {channel.name.substring(0, 1).toUpperCase()}
                                    </div>

                                    {/* Unread Count Badge */}
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-zinc-900 rounded-full flex items-center justify-center z-10">
                                            <span className="text-[9px] font-bold text-white leading-none">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        {sortedChannels.length > 6 && (
                            <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                        )}
                    </div>


                    {/* Bottom Status Dot */}
                    <div className={`w-2 h-2 rounded-full ${totalUnread > 0 ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse mb-4`} title={totalUnread > 0 ? `${totalUnread} Unread Messages` : 'Online'} />
                </div>

                {/* Expanded UI (Always Mounted, Hidden When Collapsed) */}
                <div className={`flex flex-col h-full w-full relative ${isChatCollapsed ? 'hidden' : 'flex'}`}>
                    <>
                        <ChatInterface
                            notificationStats={channelStats}
                            pendingMessage={chatPendingMessage}
                            onMessageConsumed={() => setChatPendingMessage(null)}
                            onUnreadChange={(total, counts) => {
                                setTotalUnread(total);
                                setUnreadCounts(counts);
                            }}
                        />

                        {/* Resize Handle */}
                        {!isFullScreen && (
                            <div
                                onMouseDown={startResizing}
                                className="absolute right-0 top-0 bottom-0 w-1 hover:w-1.5 cursor-col-resize hover:bg-indigo-500/50 transition-all z-50 flex items-center justify-center opacity-0 group-hover/resizer:opacity-100 active:opacity-100 active:w-1.5 active:bg-indigo-600"
                            >
                                <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                            </div>
                        )}

                        {/* Control Buttons (Top Right) */}
                        <div className="absolute right-4 top-4 z-50 flex gap-2">
                            {/* Collapse Button */}
                            <button
                                onClick={() => {
                                    setIsChatCollapsed(true);
                                    chat.setActiveChannel(null);
                                }}
                                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-sm border border-white/5 transition-all shadow-lg"
                                title="Collapse Sidebar"
                            >
                                <PanelLeftClose size={16} />
                            </button>

                            {/* Full Screen Toggle */}
                            <button
                                onClick={() => setIsFullScreen(!isFullScreen)}
                                className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-sm border border-white/5 transition-all shadow-lg"
                                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                            >
                                {isFullScreen ? (
                                    <Minimize2 size={16} />
                                ) : (
                                    <Maximize2 size={16} />
                                )}
                            </button>
                        </div>
                    </>
                </div>
            </div>

            {/* MAIN DASHBOARD (Right - Remaining) */}
            <div className={`flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                {/* HEADER */}
                {(!isMobile || mobileTab === 'tasks') && (
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0 backdrop-blur-sm z-30">
                        {/* ... content ... */}
                        <div className="flex items-center gap-4">
                            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                <span className="text-emerald-500">Γ¥û</span>
                                JOB TRACKER
                            </h1>
                            <div className="h-4 w-px bg-white/10" />

                            {/* Status Filter */}
                            <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5">
                                {['all', 'todo', 'in_progress', 'done'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-colors ${filterStatus === status ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {status.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            {/* NEW: Department Filter */}
                            <div className="flex items-center gap-2 relative group">
                                <Filter size={14} className="text-zinc-500 absolute left-3 pointer-events-none" />
                                <select
                                    value={filterDept}
                                    onChange={(e) => setFilterDept(e.target.value)}
                                    className="bg-zinc-900 border border-white/5 rounded-lg pl-8 pr-4 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none hover:bg-zinc-800 cursor-pointer"
                                >
                                    <option value="all">ALL GROUPS</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            {/* NEW: Sort By */}
                            <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5 gap-1">
                                <button
                                    onClick={() => setSortBy('priority')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${sortBy === 'priority' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Priority
                                </button>
                                <button
                                    onClick={() => setSortBy('group')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${sortBy === 'group' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Group
                                </button>
                                <button
                                    onClick={() => setSortBy('newest')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${sortBy === 'newest' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Newest
                                </button>
                            </div>

                            {/* NEW: View Mode Toggle */}
                            <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5 gap-1">
                                <button
                                    onClick={() => setViewMode('board')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'board' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Board View"
                                >
                                    <Columns size={14} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="List View"
                                >
                                    <List size={14} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Gallery View"
                                >
                                    <Grid3X3 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* ALMANAC MATRIX BUTTON */}
                            <button
                                onClick={() => setShowMatrix(true)}
                                className="h-8 px-3 bg-zinc-900 border border-white/5 rounded-full flex items-center gap-2 hover:bg-zinc-800 transition-colors group"
                            >
                                <div className="w-4 h-4 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                                    <Sparkles size={10} fill="currentColor" />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">Matrix</span>
                            </button>

                            {/* Sync Indicator */}
                            <div className="flex items-center gap-2 bg-black/20 border border-white/5 px-2.5 py-1 rounded-full group/sync transition-colors hover:border-emerald-500/30">
                                <div className="relative flex items-center justify-center">
                                    <RefreshCw
                                        size={10}
                                        className={`text-emerald-500 transition-all duration-700 ${Date.now() - lastSync.getTime() < 1000 ? 'rotate-180 scale-125' : ''}`}
                                    />
                                    {Date.now() - lastSync.getTime() < 1000 && (
                                        <div className="absolute inset-0 bg-emerald-500/40 blur-[4px] rounded-full animate-ping" />
                                    )}
                                </div>
                                <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover/sync:text-emerald-400">
                                    SYNCED {Math.floor((Date.now() - lastSync.getTime()) / 1000)}s AGO
                                </span>
                                <button
                                    onClick={() => loadTasks()}
                                    className="ml-1 text-zinc-600 hover:text-white transition-colors p-0.5 hover:bg-white/5 rounded"
                                    title="Force Refresh"
                                >
                                    <RefreshCw size={10} />
                                </button>
                            </div>

                            {/* Profile Badge & Dropdown */}
                            {auth.user && (
                                <div className="relative profile-dropdown-container">
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className={`flex items-center gap-2 pl-2 pr-2 py-1 rounded-full transition-all border ${isUserMenuOpen
                                            ? 'bg-zinc-700 border-white/20'
                                            : 'bg-zinc-800 hover:bg-zinc-700 border-white/5'
                                            }`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/30">
                                            {auth.user.fullName ? auth.user.fullName[0] : 'U'}
                                        </div>
                                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white max-w-[100px] truncate">
                                            {auth.user.fullName || auth.user.email}
                                        </span>
                                        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {isUserMenuOpen && (
                                            <>
                                                {/* Backdrop for closing */}
                                                <div
                                                    className="fixed inset-0 z-[60]"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden"
                                                >
                                                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                                                        <p className="text-xs font-bold text-white truncate">{auth.user.fullName}</p>
                                                        <p className="text-[10px] text-zinc-500 truncate">{auth.user.email}</p>
                                                    </div>

                                                    <div className="p-1">
                                                        <button
                                                            onClick={() => {
                                                                setIsProfileOpen(true);
                                                                setIsUserMenuOpen(false);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                        >
                                                            <Settings size={14} className="text-zinc-500" />
                                                            Profile Settings
                                                        </button>

                                                        {auth.user.role === 'admin' && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsUserManagementOpen(true);
                                                                    setIsUserMenuOpen(false);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Shield size={14} />
                                                                User Management
                                                            </button>
                                                        )}

                                                        <div className="h-px bg-white/5 my-1" />

                                                        <button
                                                            onClick={() => {
                                                                auth.logout();
                                                                setIsUserMenuOpen(false);
                                                                // Reload to clear sensitive state
                                                                window.location.reload();
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <LogOut size={14} />
                                                            Sign Out
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="h-4 w-px bg-white/10" />
                            {/* Date Navigation (Visible if All or Done, AND NOT BOARD) */}
                            {(filterStatus === 'all' || filterStatus === 'done' || filterStatus === 'rejected') && viewMode !== 'board' && (
                                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5 ml-2 relative group/date">
                                    <button
                                        onClick={() => {
                                            const d = new Date(archiveDate);
                                            d.setDate(d.getDate() - 1);
                                            setArchiveDate(d);
                                        }}
                                        className="p-1 hover:text-white text-zinc-500 transition-colors"
                                        title="Previous Day"
                                    >
                                        <ArrowLeft size={12} />
                                    </button>

                                    <div className="relative flex items-center justify-center cursor-pointer">
                                        <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-zinc-300 min-w-[80px] justify-center pointer-events-none">
                                            <Clock size={10} className="text-zinc-500" />
                                            {archiveDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'TODAY' : archiveDate.toLocaleDateString()}
                                        </div>
                                        <input
                                            type="date"
                                            value={archiveDate.toISOString().split('T')[0]}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => { if (e.target.valueAsDate) setArchiveDate(e.target.valueAsDate); }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            const d = new Date(archiveDate);
                                            d.setDate(d.getDate() + 1);
                                            setArchiveDate(d);
                                        }}
                                        className="p-1 hover:text-white text-zinc-500 transition-colors"
                                        title="Next Day"
                                    >
                                        <Play size={12} className="rotate-0" />
                                    </button>
                                </div>
                            )}

                            {/* Daily Report Button */}
                            <button
                                onClick={handleGenerateReport}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-xs font-bold border border-indigo-500/20"
                            >
                                <Sparkles size={14} />
                                DAILY BRIEF
                            </button>

                            {/* Search, etc. - Minimal for now since we have filters */}
                            <div className="relative">
                                <Search size={14} className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-zinc-900 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* INFOGRAPHIC HEADER: Live Operations Center */}
                {(!isMobile || mobileTab === 'stats') && (
                    <div className="h-52 border-b border-white/10 p-4 flex gap-4 bg-zinc-900/30 shrink-0">
                        {/* 1. Completed Today (Daily Velocity) */}
                        <div className="w-56 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 flex flex-col relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Completed Today</span>
                                <div className="p-1 bg-emerald-500/10 rounded-lg">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                </div>
                            </div>

                            <div className="mb-2">
                                <h2 className="text-4xl font-mono font-bold text-white leading-none">
                                    {tasks.filter(t => t.status === 'done' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length}
                                </h2>
                            </div>

                            {/* Mini Stats: Most Active Departments */}
                            <div className="mt-auto border-t border-white/5 pt-3">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Most Active Departments</span>
                                <div className="space-y-1.5">
                                    {Array.from(new Set(tasks.map(t => t.dept || 'General')))
                                        .map(dept => ({
                                            dept,
                                            count: tasks.filter(t => (t.dept === dept || (dept === 'General' && !t.dept))).length
                                        }))
                                        .sort((a, b) => b.count - a.count)
                                        .slice(0, 3)
                                        .map((d, i) => (
                                            <div key={d.dept} className="flex items-center justify-between text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-zinc-600 font-bold">#{i + 1}</span>
                                                    <span className="text-zinc-300 font-medium truncate max-w-[120px]">{d.dept}</span>
                                                </div>
                                                <span className="text-zinc-400 font-mono font-bold text-[9px]">{d.count} Requests</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. Department Workload (CSS Bar Chart) */}
                        <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 flex flex-col min-w-0">
                            <div className="flex-1 flex gap-4 overflow-x-auto custom-scrollbar pb-2 items-center">
                                {/* Dynamically get departments from tasks or use fixed list */}
                                {Array.from(new Set(tasks.map(t => t.dept || 'General')))
                                    .map(dept => ({
                                        dept,
                                        count: tasks.filter(t => (t.dept === dept || (dept === 'General' && !t.dept)) && t.status === 'todo').length
                                    }))
                                    .sort((a, b) => b.count - a.count)
                                    .map(({ dept }) => {
                                        const deptTasks = tasks.filter(t => t.dept === dept || (dept === 'General' && !t.dept));
                                        const total = deptTasks.length || 1;
                                        const todo = deptTasks.filter(t => t.status === 'todo').length;
                                        const inProgress = deptTasks.filter(t => t.status === 'in_progress').length;
                                        const done = deptTasks.filter(t => t.status === 'done').length;

                                        // Percentages for stats
                                        const pTodo = Math.round((todo / total) * 100);
                                        const pInP = Math.round((inProgress / total) * 100);
                                        const pDone = Math.round((done / total) * 100);

                                        // Color Logic for Queue Severity
                                        let queueColor = '#10b981'; // Green (Safe)
                                        if (todo > 2) queueColor = '#f59e0b'; // Amber (Caution)
                                        if (todo > 5) queueColor = '#f43f5e'; // Red (Critical)

                                        // Calculate SVG Dash Arrays for Donut Chart
                                        const radius = 20;
                                        const circumference = 2 * Math.PI * radius;
                                        const totalCount = total === 0 ? 1 : total; // Avoid divide by zero

                                        const pctTodo = todo / totalCount;
                                        const pctInP = inProgress / totalCount;
                                        const pctDone = done / totalCount;

                                        const dashTodo = `${pctTodo * circumference} ${circumference}`;
                                        const dashInP = `${pctInP * circumference} ${circumference}`;
                                        const dashDone = `${pctDone * circumference} ${circumference}`;

                                        // Offsets (Start positions)
                                        const offsetTodo = 0; // Starts at top (rotated -90deg via SVG transform)
                                        const offsetInP = -1 * pctTodo * circumference;
                                        const offsetDone = -1 * (pctTodo + pctInP) * circumference;

                                        return (
                                            <div key={dept} className="flex bg-zinc-900/50 border border-white/5 rounded-xl p-3 min-w-[240px] items-center gap-4 shrink-0 hover:bg-zinc-800 transition-colors h-full">

                                                {/* SVG PIE CHART */}
                                                <div className="relative w-14 h-14 flex items-center justify-center">
                                                    {/* Background Circle (Empty Rail) */}
                                                    <div className="absolute inset-0 rounded-full border-[6px] border-zinc-900 box-border z-0"></div>

                                                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 48 48">
                                                        {/* Done Segment (Base Layer) */}
                                                        <circle cx="24" cy="24" r={radius} stroke="#18181b" strokeWidth="6" fill="none"
                                                            strokeDasharray={dashDone} strokeDashoffset={offsetDone} />

                                                        {/* Active Segment */}
                                                        <circle cx="24" cy="24" r={radius} stroke="#3f3f46" strokeWidth="6" fill="none"
                                                            strokeDasharray={dashInP} strokeDashoffset={offsetInP} />

                                                        {/* Queue Segment (Top Layer - Highlight) */}
                                                        <circle cx="24" cy="24" r={radius} stroke={queueColor} strokeWidth="6" fill="none"
                                                            strokeDasharray={dashTodo} strokeDashoffset={offsetTodo} />
                                                    </svg>

                                                    {/* Center Text */}
                                                    <div className="absolute flex flex-col items-center justify-center">
                                                        <span className="text-lg font-bold leading-none" style={{ color: queueColor }}>{todo}</span>
                                                        <span className="text-[6px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Wait</span>
                                                    </div>
                                                </div>

                                                {/* TEXT STATS */}
                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <span className="text-sm uppercase font-black text-zinc-200 whitespace-normal leading-tight mb-1 h-auto flex items-center" title={dept}>
                                                        {dept}
                                                    </span>

                                                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: queueColor }} /> Queue
                                                        </div>
                                                        <span className="font-bold" style={{ color: queueColor }}>{todo}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Active
                                                        </div>
                                                        <span className="text-zinc-300 font-bold">{inProgress}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 border border-zinc-700" /> Done
                                                        </div>
                                                        <span className="text-zinc-500 font-bold">{done}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>

                        {/* 3. AI Token Costs */}
                        <div className="w-56 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">AI Resource Usage</span>
                            <div className="text-right">
                                <h2 className="text-3xl font-mono font-bold text-emerald-400">{tokenUsage.toLocaleString('en-US')}</h2>
                                <span className="text-zinc-600 text-[10px] font-bold uppercase">Total Tokens Processed</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min((tokenUsage / 10000) * 100, 100)}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* BULK ACTION BAR */}
                {(!isMobile || mobileTab === 'tasks') && (
                    <AnimatePresence>
                        {isSelectionMode && selectedTaskIds.size > 0 && (
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-900 border border-white/10 px-6 py-3 rounded-full shadow-2xl"
                            >
                                <span className="text-white font-bold text-sm">{selectedTaskIds.size} Tasks Selected</span>
                                <div className="h-4 w-px bg-white/20" />
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold text-sm bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                    DELETE
                                </button>
                                <button
                                    onClick={toggleSelectionMode}
                                    className="text-zinc-400 hover:text-white text-xs font-medium ml-2"
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* KANBAN BOARD OR LIST VIEW */}

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {viewMode === 'board' ? (
                        <div className="flex flex-col xl:flex-row h-fit xl:h-full gap-6 w-full p-6">
                            {/* KANBAN COLUMNS */}
                            {[
                                { id: 'todo', label: 'In Queue', color: 'border-zinc-700' },
                                { id: 'in_progress', label: 'On Air', color: 'border-blue-500' },
                                { id: 'done', label: 'Archived', color: 'border-emerald-500' },
                            ]
                                .filter(col => filterStatus === 'all' || col.id === filterStatus)
                                .map(col => (
                                    <div key={col.id} className={`flex-1 min-w-[300px] shrink-0 flex flex-col bg-zinc-900/20 rounded-xl border border-white/5 h-[800px] xl:h-full transition-all duration-300`}>
                                        {/* Column Header */}
                                        <div className={`p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10 rounded-t-xl border-t-2 ${col.color}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">{col.label}</span>
                                                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {col.id === 'done' && !searchQuery
                                                        ? filteredTasks.filter(t => (t.status === 'done' || t.status === 'rejected') && new Date(t.updatedAt).toLocaleDateString() === archiveDate.toLocaleDateString()).length
                                                        : filteredTasks.filter(t => t.status === col.id).length}
                                                </span>
                                            </div>

                                            {col.id === 'done' && (
                                                <div className="flex gap-1">
                                                    {/* Date Navigation (Moved Here for Board View) */}
                                                    <div className="flex items-center bg-zinc-800 rounded-md mr-2 relative">
                                                        <button
                                                            onClick={() => {
                                                                const d = new Date(archiveDate);
                                                                d.setDate(d.getDate() - 1);
                                                                setArchiveDate(d);
                                                            }}
                                                            className="p-1 hover:text-white text-zinc-400"
                                                        >
                                                            <ArrowLeft size={12} />
                                                        </button>

                                                        {/* Clickable Date Display */}
                                                        <div className="relative flex items-center">
                                                            <span className="text-[10px] font-bold px-1 min-w-[70px] text-center pointer-events-none">
                                                                {archiveDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'TODAY' : archiveDate.toLocaleDateString()}
                                                            </span>
                                                            <input
                                                                type="date"
                                                                value={archiveDate.toISOString().split('T')[0]}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                onChange={(e) => {
                                                                    if (e.target.valueAsDate) setArchiveDate(e.target.valueAsDate);
                                                                }}
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                const d = new Date(archiveDate);
                                                                d.setDate(d.getDate() + 1);
                                                                setArchiveDate(d);
                                                            }}
                                                            className="p-1 hover:text-white text-zinc-400"
                                                        >
                                                            <Play size={12} className="rotate-0" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cards Container */}
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                            {filteredTasks.filter(t => t.status === col.id)
                                                .sort((a, b) => {
                                                    // 1. Group Logic
                                                    if (sortBy === 'group') {
                                                        const deptA = a.dept || 'ZZZ'; // General last
                                                        const deptB = b.dept || 'ZZZ';
                                                        if (deptA !== deptB) return deptA.localeCompare(deptB);
                                                    }

                                                    // 2. Priority Logic
                                                    if (sortBy === 'priority' || sortBy === 'group') {
                                                        const pMap: Record<string, number> = { 'P1': 3, 'P2': 2, 'P3': 1 };
                                                        const pDiff = (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
                                                        if (pDiff !== 0) return pDiff;
                                                    }

                                                    // 3. Newest First
                                                    return b.id - a.id;
                                                })
                                                .map(task => {
                                                    // ... (Existing Task Card Logic) ...
                                                    // To keep this replacement clean, I'll invoke the 'renderTaskCard' function logic inline or assume it is handled.
                                                    // Since I cannot call functions inside JSX cleanly without defining them, I will paste the card logic here. 
                                                    // However, to save tokens and ensure correctness based on previous edits, I will copy the PREVIOUS card logic.

                                                    // --- VISUAL DESIGN (Copied from previous step) ---
                                                    let cardStyle = 'bg-[#09090b] border-zinc-800/50 hover:border-zinc-700 transition-all';
                                                    if (task.priority === 'P1' && task.status !== 'done' && task.status !== 'rejected') {
                                                        cardStyle += ' shadow-[0_0_15px_-5px_rgba(239,68,68,0.15)] border-red-900/30';
                                                    } else if (task.priority === 'P2' && task.status !== 'done') {
                                                        cardStyle += ' border-orange-900/30';
                                                    }
                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                    const isSelected = selectedTaskIds.has(task.id);

                                                    return (
                                                        <motion.div
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                            key={task.id}
                                                            onClick={() => isSelectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
                                                            className={`relative rounded-xl border overflow-hidden cursor-pointer group hover:-translate-y-0.5 ${cardStyle} ${isSelected ? 'ring-2 ring-emerald-500 bg-zinc-800' : ''}`}
                                                        >
                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] z-10" style={{ backgroundColor: groupColorHsl }} />
                                                            {isSelectionMode && (
                                                                <div className="absolute top-2 right-2 z-20">
                                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-black/60 border-white/30'}`}>
                                                                        {isSelected && <CheckCircle2 size={12} className="text-black" />}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="p-3 pl-5 flex flex-col gap-2">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-zinc-500 font-mono font-bold text-[10px] opacity-70">#{task.id}</span>
                                                                        {task.priority && (
                                                                            <span className={`px-1.5 py-[1px] rounded-[4px] text-[9px] font-black border ${task.priority === 'P1' ? 'bg-red-500 text-white border-red-600 shadow-sm shadow-red-900/50' :
                                                                                task.priority === 'P2' ? 'bg-orange-500 text-white border-orange-600' :
                                                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                                                }`}>{task.priority}</span>
                                                                        )}
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[4px] text-zinc-900 border border-black/10 shadow-sm" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                                        {task.score > 0 && (
                                                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded-[4px] text-cyan-400 border border-cyan-500/30 bg-cyan-950/30 shadow-sm flex items-center gap-1">
                                                                                <span>ΓÜí</span> {task.score}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {task.imageUrl && (
                                                                        <div onClick={(e) => { e.stopPropagation(); setLightboxUrl(task.imageUrl || null); }} className="w-8 h-8 rounded bg-zinc-800 border border-white/10 overflow-hidden cursor-zoom-in hover:border-emerald-500 hover:scale-105 transition-all shadow-sm shrink-0">
                                                                            <img src={task.imageUrl} alt="img" className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <h3 className="text-sm font-bold text-zinc-200 leading-snug group-hover:text-white transition-colors line-clamp-2">{task.title}</h3>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ring-1 ring-white/10" style={{ backgroundColor: groupColorHsl }}>{task.owner ? task.owner[0] : '?'}</div>
                                                                        <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[100px]">{task.owner}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-0.5">
                                                                        <span className={`text-[10px] font-bold ${task.due === 'Today' ? 'text-orange-400' : 'text-zinc-600'}`}>{task.due}</span>

                                                                        {/* Timing Metrics */}
                                                                        <div className="flex items-center gap-1.5 opacity-80 mt-1">
                                                                            <TaskTimerWidget
                                                                                status={task.status}
                                                                                createdAt={task.createdAt}
                                                                                startedAt={task.startedAt}
                                                                                completedAt={task.completedAt}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Quick Actions Integration */}
                                                            {task.status !== 'done' && task.status !== 'rejected' && (
                                                                <div className="px-3 pb-3 pl-5 mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                    {quickAction?.taskId === task.id ? (
                                                                        // Quick Action Form (Simplified for brevity in list view logic copy)
                                                                        <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-700 relative z-30">
                                                                            <textarea autoFocus className="w-full bg-black/50 text-xs text-white p-2 rounded border border-white/10 mb-2" rows={2} value={quickAction.content} onChange={e => setQuickAction({ ...quickAction, content: e.target.value })}
                                                                                onKeyDown={e => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                                        e.preventDefault();
                                                                                        if (quickAction.type === 'ask') {
                                                                                            const deptChannel = chat.channels.find(c => c.name.toLowerCase() === task.dept?.toLowerCase());
                                                                                            const targetChannelId = deptChannel ? deptChannel.id : (chat.activeChannelId || chat.channels[0]?.id);
                                                                                            if (targetChannelId && quickAction.content.trim()) api.post(`/channels/${targetChannelId}/messages`, { content: `@${task.requester} [Task #${task.id}] ${quickAction.content}` }).then(() => setQuickAction(null));
                                                                                        } else {
                                                                                            api.patch(`/tasks/${task.id}`, { status: 'rejected', comment: quickAction.content }).then(loadTasks).finally(() => setQuickAction(null));
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="flex justify-end gap-2"><button onClick={() => setQuickAction(null)} className="text-[10px] text-zinc-500">Cancel</button></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1">
                                                                            {task.status === 'todo' && <button onClick={() => api.patch(`/tasks/${task.id}`, { status: 'in_progress' }).then(loadTasks)} className="flex-1 h-6 flex items-center justify-center bg-zinc-800 border border-white/5 rounded hover:text-emerald-400"><Play size={10} /></button>}
                                                                            <button onClick={() => setQuickAction({ taskId: task.id, type: 'ask', content: '' })} className="flex-1 h-6 flex items-center justify-center bg-zinc-800 border border-white/5 rounded hover:text-blue-400"><MessageSquare size={10} /></button>
                                                                            <button onClick={() => setQuickAction({ taskId: task.id, type: 'reject', content: '' })} className="flex-1 h-6 flex items-center justify-center bg-zinc-800 border border-white/5 rounded hover:text-red-400"><XCircle size={10} /></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : viewMode === 'list' ? (
                        // LIST VIEW IMPLEMENTATION (SECTIONED)
                        <div className="w-full flex flex-col gap-6 pb-20 relative">
                            {/* Sticky List Header with Solid Background */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 bg-[#09090b] sticky top-0 z-40 shadow-sm">
                                <div className="col-span-1">ID</div>
                                <div className="col-span-4">Job Title</div>
                                <div className="col-span-2">Department</div>
                                <div className="col-span-2">Assignee</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-2 text-right">Duration</div>
                            </div>

                            {['todo', 'in_progress', 'done'].map(status => {
                                const sectionTasks = filteredTasks.filter(t => status === 'done' ? (t.status === 'done' || t.status === 'rejected') : t.status === status);
                                if (sectionTasks.length === 0 && filterStatus !== 'all' && filterStatus !== status) return null;
                                if (sectionTasks.length === 0 && filterStatus === 'all' && status !== 'todo') return null; // Optional: Hide empty sections in 'all' view if preferred, but usually we show them if meaningful. Let's show them.

                                // Actually, let's just standard filter:
                                if (filterStatus !== 'all' && filterStatus !== status) return null;

                                const label = status === 'todo' ? 'In Queue' : status === 'in_progress' ? 'On Air' : 'Archived';
                                const labelColor = status === 'todo' ? 'text-zinc-400' : status === 'in_progress' ? 'text-blue-400' : 'text-emerald-400';

                                return (
                                    <div key={status} className="flex flex-col gap-2 px-6">
                                        {/* Section Header */}
                                        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5 mt-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`text-sm font-bold uppercase tracking-wider ${labelColor}`}>{label}</h3>
                                                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{sectionTasks.length}</span>
                                            </div>
                                            {status === 'done' && (
                                                <div className="flex items-center bg-zinc-800 rounded-md relative">
                                                    <button onClick={() => { const d = new Date(archiveDate); d.setDate(d.getDate() - 1); setArchiveDate(d); }} className="p-1 hover:text-white text-zinc-400"><ArrowLeft size={12} /></button>
                                                    <div className="relative flex items-center">
                                                        <span className="text-[10px] font-bold px-1 min-w-[70px] text-center pointer-events-none">{archiveDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'TODAY' : archiveDate.toLocaleDateString()}</span>
                                                        <input type="date" value={archiveDate.toISOString().split('T')[0]} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if (e.target.valueAsDate) setArchiveDate(e.target.valueAsDate); }} />
                                                    </div>
                                                    <button onClick={() => { const d = new Date(archiveDate); d.setDate(d.getDate() + 1); setArchiveDate(d); }} className="p-1 hover:text-white text-zinc-400"><Play size={12} /></button>
                                                </div>
                                            )}
                                        </div>

                                        {/* List Rows */}
                                        {sectionTasks
                                            .sort(sortTasksFn)
                                            .map(task => {
                                                const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                const isSelected = selectedTaskIds.has(task.id);
                                                return (
                                                    <motion.div
                                                        key={task.id}
                                                        layout
                                                        onClick={() => isSelectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
                                                        className={`
                                                            flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center px-4 py-3 rounded-lg border border-white/5 bg-[#09090b] hover:bg-zinc-900/80 transition-all cursor-pointer group relative overflow-hidden
                                                            ${isSelected ? 'ring-1 ring-emerald-500 bg-zinc-900' : ''}
                                                        `}
                                                    >
                                                        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: groupColorHsl }} />

                                                        {/* Mobile Top Row: ID + Dept + Status */}
                                                        <div className="flex md:hidden items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-[10px] text-zinc-500 font-bold">#{task.id}</span>
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-zinc-900 border border-black/10" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {task.priority && (
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${task.priority === 'P1' ? 'bg-red-500/20 text-red-500 border-red-500/30' : task.priority === 'P2' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{task.priority}</span>
                                                                )}
                                                                <span className={`text-[10px] font-bold uppercase ${task.status === 'todo' ? 'text-zinc-400' : task.status === 'in_progress' ? 'text-blue-400' : task.status === 'done' ? 'text-emerald-400' : 'text-red-400'}`}>{task.status.replace('_', ' ')}</span>

                                                                {/* NEW: Timer Widget for Mobile List */}
                                                                <TaskTimerWidget
                                                                    status={task.status}
                                                                    createdAt={task.createdAt}
                                                                    startedAt={task.startedAt}
                                                                    completedAt={task.completedAt}
                                                                    className="ml-2 scale-90 origin-left"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Desktop ID */}
                                                        <div className="hidden md:block col-span-1 font-mono text-xs text-zinc-500 font-bold pl-2">#{task.id}</div>

                                                        {/* Title Section */}
                                                        <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                                                            {task.imageUrl && (
                                                                <div className="w-8 h-8 rounded bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                                                                    <img src={task.imageUrl} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-bold text-zinc-200 truncate pr-4">{task.title}</span>
                                                                <span className="text-[10px] text-zinc-500 truncate">Requested by {task.requester}</span>
                                                                {/* Timer moved under title */}
                                                                <div className="mt-2 text-left">
                                                                    <TaskTimerWidget
                                                                        status={task.status}
                                                                        createdAt={task.createdAt}
                                                                        startedAt={task.startedAt}
                                                                        completedAt={task.completedAt}
                                                                        className="origin-left scale-90"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="hidden md:block col-span-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-900 border border-black/10" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                                {task.score > 0 && <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/30 bg-cyan-950/30">ΓÜí {task.score}</span>}
                                                            </div>
                                                        </div>

                                                        {/* Owner */}
                                                        <div className="col-span-12 md:col-span-2 flex items-center gap-2 mt-1 md:mt-0">
                                                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10">{task.owner ? task.owner[0] : '?'}</div>
                                                            <span className="text-xs text-zinc-400 font-medium truncate">{task.owner}</span>
                                                        </div>

                                                        {/* Desktop Status */}
                                                        <div className="hidden md:block col-span-1">
                                                            <span className={`text-[10px] font-bold uppercase ${task.status === 'todo' ? 'text-zinc-400' : task.status === 'in_progress' ? 'text-blue-400' : task.status === 'done' ? 'text-emerald-400' : 'text-red-400'}`}>{task.status.replace('_', ' ')}</span>
                                                        </div>

                                                        {/* Desktop Priority */}
                                                        <div className="hidden md:block col-span-1">
                                                            {task.priority && (
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${task.priority === 'P1' ? 'bg-red-500/20 text-red-500 border-red-500/30' : task.priority === 'P2' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{task.priority}</span>
                                                            )}
                                                        </div>



                                                        <div className="hidden md:flex col-span-1 justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"><MoreHorizontal size={14} /></button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        // GRID VIEW (GALLERY - SECTIONED)
                        <div className="w-full pb-20 flex flex-col gap-8">
                            {['todo', 'in_progress', 'done'].map(status => {
                                const sectionTasks = filteredTasks.filter(t => status === 'done' ? (t.status === 'done' || t.status === 'rejected') : t.status === status);
                                if (filterStatus !== 'all' && filterStatus !== status) return null;

                                const label = status === 'todo' ? 'In Queue' : status === 'in_progress' ? 'On Air' : 'Archived';
                                const labelColor = status === 'todo' ? 'text-zinc-400' : status === 'in_progress' ? 'text-blue-400' : 'text-emerald-400';

                                return (
                                    <div key={status} className="flex flex-col gap-4">
                                        {/* Section Header */}
                                        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`text-xl font-bold uppercase tracking-wider ${labelColor}`}>{label}</h3>
                                                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-3 py-1 rounded-full border border-white/5">{sectionTasks.length}</span>
                                            </div>
                                            {status === 'done' && (
                                                <div className="flex items-center bg-zinc-800 rounded-md relative z-20">
                                                    <button onClick={() => { const d = new Date(archiveDate); d.setDate(d.getDate() - 1); setArchiveDate(d); }} className="p-1.5 hover:text-white text-zinc-400"><ArrowLeft size={14} /></button>
                                                    <div className="relative flex items-center">
                                                        <span className="text-[11px] font-bold px-2 min-w-[80px] text-center pointer-events-none">{archiveDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'TODAY' : archiveDate.toLocaleDateString()}</span>
                                                        <input type="date" value={archiveDate.toISOString().split('T')[0]} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if (e.target.valueAsDate) setArchiveDate(e.target.valueAsDate); }} />
                                                    </div>
                                                    <button onClick={() => { const d = new Date(archiveDate); d.setDate(d.getDate() + 1); setArchiveDate(d); }} className="p-1.5 hover:text-white text-zinc-400"><Play size={14} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-12 md:grid-cols-12 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
                                            {sectionTasks
                                                .sort(sortTasksFn)
                                                .map(task => {
                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                    const isSelected = selectedTaskIds.has(task.id);
                                                    return (
                                                        <motion.div
                                                            key={task.id}
                                                            layout
                                                            onClick={() => isSelectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
                                                            className={`
                                                                flex flex-col h-full bg-zinc-900 rounded-2xl border overflow-hidden relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl
                                                                ${isSelected ? 'ring-2 ring-emerald-500' : ''}
                                                            `}
                                                            style={{ borderColor: groupColorHsl }}
                                                        >
                                                            {/* Dedicated Timer Header Area */}
                                                            <div className="h-36 w-full shrink-0 relative flex items-center justify-center border-b border-white/5 bg-zinc-900/50"
                                                                style={{ backgroundImage: `linear-gradient(to bottom right, ${groupColorHsl}15, transparent)` }}>

                                                                {/* Status & Priority Badges (Floating) */}
                                                                <div className="absolute top-2 left-2 flex gap-2">{task.priority && <span className={`px-2 py-0.5 rounded shadow-lg text-[9px] font-black border backlight-blur ${task.priority === 'P1' ? 'bg-red-500 text-white border-red-600' : 'bg-zinc-800/80 text-white border-white/10'}`}>{task.priority}</span>}</div>
                                                                <div className="absolute top-2 right-2"><div className={`w-2.5 h-2.5 rounded-full border border-white/20 shadow-lg ${task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : task.status === 'done' ? 'bg-emerald-500' : 'bg-zinc-500'}`} /></div>

                                                                {/* Centered Large Timer */}
                                                                <div className="scale-105 mt-6">
                                                                    <TaskTimerWidget
                                                                        status={task.status}
                                                                        createdAt={task.createdAt}
                                                                        startedAt={task.startedAt}
                                                                        completedAt={task.completedAt}
                                                                        className="drop-shadow-lg"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {/* Footer Content */}
                                                            <div className="p-3 flex flex-col gap-1.5 flex-1 bg-[#09090b] relative">
                                                                <div className="absolute top-0 left-0 right-0 h-[1px] opacity-20" style={{ backgroundColor: groupColorHsl }} />
                                                                <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groupColorHsl }} /><span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{task.dept}</span><span className="text-zinc-700 text-[9px] ml-auto font-mono">#{task.id}</span></div>
                                                                <h3 className="text-sm font-bold text-white leading-tight mb-auto" title={task.title}>{task.title}</h3>
                                                                <div className="mt-1 text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{task.description || "No description provided."}</div>
                                                                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto min-h-[29px]">
                                                                    <div className="flex items-center gap-2 min-w-0 pr-2"><div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] border border-white/10 shrink-0" style={{ color: groupColorHsl }}>{task.owner ? task.owner[0] : '?'}</div><div className="flex flex-col min-w-0"><span className="text-[10px] text-zinc-400 font-bold truncate">{task.owner}</span></div></div>
                                                                    <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5 shrink-0 whitespace-nowrap">{task.due}</span>
                                                                </div>

                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>



            {/* USER PROFILE MODAL */}

            {isUserManagementOpen && <UserManagementModal isOpen={isUserManagementOpen} onClose={() => setIsUserManagementOpen(false)} />}

            {/* MATRIX / ALMANAC MODAL */}
            <AnimatePresence>
                {showMatrix && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                    >
                        <div className="w-full max-w-7xl h-full max-h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                            <AlmanacApp onClose={() => setShowMatrix(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SLIDE-OVER DETAIL_PANEL */}
            {(!isMobile || mobileTab === 'tasks') && (
                <AnimatePresence>
                    {
                        selectedTask && (
                            <motion.div
                                initial={{ x: '100%', opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="w-[480px] border-l border-white/10 bg-zinc-950 absolute right-0 top-0 bottom-0 shadow-2xl z-50 flex flex-col"
                            >
                                {/* Header */}
                                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900 shrink-0 z-50 relative">
                                    <button
                                        className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors group bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-white/10"
                                        onClick={() => setSelectedTask(null)}
                                    >
                                        <ArrowLeft size={16} />
                                        <span className="text-sm font-bold">Close</span>
                                    </button>

                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded border uppercase ${getStatusColor(selectedTask.status)} `}>
                                            {selectedTask.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-zinc-500 text-xs font-mono">#{selectedTask.id}</span>
                                    </div>

                                    <h1 className="text-2xl font-bold text-white mb-4 leading-tight">{selectedTask.title}</h1>

                                    {selectedTask.imageUrl && (
                                        <div
                                            className="mb-6 rounded-xl overflow-hidden border border-white/10 group relative cursor-pointer"
                                            onClick={() => setLightboxUrl(selectedTask.imageUrl || null)}
                                        >
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10 flex items-center gap-2">
                                                    <Search size={14} /> Full Screen
                                                </div>
                                            </div>
                                            <img src={selectedTask.imageUrl} className="w-full h-auto max-h-64 object-cover" alt="Task Attachment" />
                                        </div>
                                    )}

                                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 mb-6">
                                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-2">Description</span>
                                        <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {selectedTask.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5">
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Requested By</span>
                                            <span className="text-white text-sm font-medium">{selectedTask.requester || 'System'}</span>
                                        </div>
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5">
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Department</span>
                                            <span className="text-white text-sm font-medium">{selectedTask.dept}</span>
                                        </div>
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5">
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Priority</span>
                                            <span className={`text - sm font - bold ${selectedTask.priority === 'P1' ? 'text-red-400' : 'text-zinc-300'} `}>
                                                {selectedTask.priority}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5">
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Due Date</span>
                                            <span className="text-white text-sm font-medium">{selectedTask.due}</span>
                                        </div>
                                        <div className="bg-zinc-900/30 p-3 rounded-lg border border-white/5 col-span-2 flex items-center justify-between">
                                            <span className="text-zinc-500 text-[10px] font-bold uppercase block">Duration Tracking</span>
                                            <TaskTimerWidget
                                                status={selectedTask.status}
                                                createdAt={selectedTask.createdAt}
                                                startedAt={selectedTask.startedAt}
                                                completedAt={selectedTask.completedAt}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="p-6 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md">
                                    <textarea
                                        placeholder="Add a resolution note or comment (optional)..."
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 mb-4 h-20 resize-none"
                                        id="status-comment"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedTask.status === 'todo' && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedTask.id, 'in_progress')}
                                                className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                                            >
                                                <Play size={16} /> Start Job
                                            </button>
                                        )}

                                        {selectedTask.status === 'in_progress' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedTask.id, 'done')}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={16} /> Complete
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedTask.id, 'blocked')}
                                                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                                                >
                                                    <AlertOctagon size={16} /> Block
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={() => handleStatusUpdate(selectedTask.id, 'todo')}
                                            className="col-span-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={16} /> Re-Queue
                                        </button>

                                        <button
                                            onClick={handleAskQuestion}
                                            className="col-span-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={16} /> Ask
                                        </button>

                                        {selectedTask.status !== 'rejected' && (
                                            <button
                                                onClick={() => handleStatusUpdate(selectedTask.id, 'rejected')}
                                                className="col-span-2 mt-2 border border-red-900/50 text-red-500 font-bold py-2 rounded-lg hover:bg-red-900/20 flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={16} /> Reject Task
                                            </button>
                                        )}

                                        <button
                                            onClick={handleDeleteTask}
                                            className="col-span-2 mt-4 bg-red-950/30 hover:bg-red-900/40 text-red-700 hover:text-red-500 font-bold py-3 rounded-lg border border-red-900/20 flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Trash2 size={16} /> Delete Permanently
                                        </button>
                                    </div>
                                </div>

                                {/* Comment Input */}
                                <div className="p-4 border-t border-white/10 bg-zinc-900">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Add a comment..."
                                            className="w-full bg-black border border-white/10 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                                        />
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >
            )}
            {/* BOTTOM NAVIGATION (Mobile Only) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 shrink-0 flex items-center justify-around px-2 z-[60] pb-2">
                <button
                    onClick={() => setMobileTab('tasks')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${mobileTab === 'tasks' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <List size={22} className={mobileTab === 'tasks' ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
                    <span className="text-[10px] font-bold mt-1">Tasks</span>
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${mobileTab === 'chat' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <div className="relative">
                        <MessageSquare size={22} className={mobileTab === 'chat' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''} />
                        {Object.values(channelStats).reduce((a, b) => a + b.p1Count, 0) > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-zinc-900 animate-pulse" />
                        )}
                    </div>
                    <span className="text-[10px] font-bold mt-1">Chat</span>
                </button>
                <button
                    onClick={() => setMobileTab('stats')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${mobileTab === 'stats' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <LayoutGrid size={22} className={mobileTab === 'stats' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''} />
                    <span className="text-[10px] font-bold mt-1">Stats</span>
                </button>
            </div>
        </div >
    );
}
