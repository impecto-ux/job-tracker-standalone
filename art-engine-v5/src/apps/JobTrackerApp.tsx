import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, MessageSquare, CheckCircle, CheckCircle2, Check, Clock, AlertCircle, ArrowLeft, Send, RefreshCw, Play, AlertOctagon, XCircle, Trash2, User, Sparkles, X, ChevronDown, LogOut, Settings } from 'lucide-react';
import ChatInterface from '@/components/job-tracker/ChatInterface';
import LoginModal from '@/components/auth/LoginModal';
import UserProfileModal from '@/components/auth/UserProfileModal';
import UserManagementModal from '@/components/auth/UserManagementModal';
import { Shield } from 'lucide-react';

import api from '@/lib/api';
import { useStore } from '@/lib/store';

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

    const handleAskQuestion = async () => {
        if (!selectedTask) return;

        const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
        const question = commentBox?.value?.trim();

        if (!question) {
            alert("Lütfen sorunuzu yazın.");
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
                alert("Mesaj gönderilemedi.");
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
    const toggleTaskSelection = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
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
                imageUrl: t.imageUrl
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
    const filteredTasks = tasks.filter(task => {
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesDept = filterDept === 'all' || task.dept === filterDept; // Check Dept
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.owner.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch && matchesDept;
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

    // Consistent Random Color for Departments
    const getDepartmentColor = (deptName: string) => {
        const colors = [
            'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500',
            'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-lime-500',
            'bg-orange-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-sky-500'
        ];
        // Simple string hash
        let hash = 0;
        for (let i = 0; i < deptName.length; i++) {
            hash = deptName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    // Resizable Sidebar Logic
    const [sidebarWidth, setSidebarWidth] = useState(850); // Increased initial width to 850px
    const [isResizing, setIsResizing] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false); // Full Screen State

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

    return (
        <div className={`h-full w-full bg-black text-zinc-100 font-sans flex overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''} relative`}>
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

            {/* CHAT PANEL (Resizable) */}
            <div
                style={{ width: isFullScreen ? '100%' : sidebarWidth }}
                className={`border-r border-white/10 hidden lg:block h-full shrink-0 relative group/resizer transition-all duration-300 ease-in-out`}
            >

                <ChatInterface
                    notificationStats={channelStats}
                    pendingMessage={chatPendingMessage}
                    onMessageConsumed={() => setChatPendingMessage(null)}
                />

                {/* Resize Handle & Maximize Button */}
                {!isFullScreen && (
                    <div
                        onMouseDown={startResizing}
                        className="absolute right-0 top-0 bottom-0 w-1 hover:w-1.5 cursor-col-resize hover:bg-indigo-500/50 transition-all z-50 flex items-center justify-center opacity-0 group-hover/resizer:opacity-100 active:opacity-100 active:w-1.5 active:bg-indigo-600"
                    >
                        <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                    </div>
                )}

                {/* Full Screen Toggle Button (Floating) */}
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="absolute right-4 top-4 z-50 p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-sm border border-white/5 transition-all shadow-lg"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10L4 15M9 10l-5 5M15 14l5-5M15 14l-5 5" /> {/* Minimize/Collapse Icon (Simulated) */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6v6" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 10h-6V4" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    )}
                </button>
            </div>

            {/* MAIN DASHBOARD (Right - Remaining) */}
            <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
                {/* HEADER */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0 backdrop-blur-sm z-30">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="text-emerald-500">❖</span>
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
                    </div>

                    <div className="flex items-center gap-4">
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

                {/* INFOGRAPHIC HEADER: Live Operations Center */}
                <div className="h-80 border-b border-white/10 p-6 flex gap-6 bg-zinc-900/30 shrink-0">
                    {/* 1. Completed Today (Daily Velocity) */}
                    <div className="w-64 bg-zinc-900/50 rounded-2xl border border-white/5 p-5 flex flex-col relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Completed Today</span>
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <h2 className="text-5xl font-mono font-bold text-white leading-none">
                                {tasks.filter(t => t.status === 'done' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length}
                            </h2>
                        </div>

                        {/* Mini Stats: Highest Daily Requests */}
                        <div className="mt-auto border-t border-white/5 pt-3">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Highest Daily Requests</span>
                            <div className="space-y-1.5">
                                {Array.from(new Set(tasks.map(t => t.dept || 'General')))
                                    .map(dept => ({
                                        dept,
                                        count: tasks.filter(t => (t.dept === dept || (dept === 'General' && !t.dept)) && new Date(t.createdAt).toDateString() === new Date().toDateString()).length
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
                    <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-6 flex flex-col min-w-0">
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
                                        <div key={dept} className="flex bg-zinc-900/50 border border-white/5 rounded-xl p-4 min-w-[300px] items-center gap-5 shrink-0 hover:bg-zinc-800 transition-colors h-full">

                                            {/* SVG PIE CHART */}
                                            <div className="relative w-16 h-16 flex items-center justify-center">
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
                                                    <span className="text-xl font-bold leading-none" style={{ color: queueColor }}>{todo}</span>
                                                    <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Wait</span>
                                                </div>
                                            </div>

                                            {/* TEXT STATS */}
                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                <span className="text-[11px] uppercase font-black text-zinc-200 whitespace-normal leading-tight mb-2 h-8 flex items-center" title={dept}>
                                                    {dept}
                                                </span>

                                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: queueColor }} /> Queue
                                                    </div>
                                                    <span className="font-bold" style={{ color: queueColor }}>{todo}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Active
                                                    </div>
                                                    <span className="text-zinc-300 font-bold">{inProgress}</span>
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
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
                    <div className="w-64 bg-zinc-900/50 rounded-2xl border border-white/5 p-5 flex flex-col justify-between">
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">AI Resource Usage</span>
                        <div className="text-right">
                            <h2 className="text-4xl font-mono font-bold text-emerald-400">{tokenUsage.toLocaleString('en-US')}</h2>
                            <span className="text-zinc-600 text-xs font-bold uppercase">Total Tokens Processed</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min((tokenUsage / 10000) * 100, 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* BULK ACTION BAR */}
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

                {/* KANBAN BOARD */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex h-full gap-6 min-w-[1400px]">
                        {/* COLUMNS */}
                        {[
                            { id: 'todo', label: 'In Queue', color: 'border-zinc-700', width: 'w-[700px]' }, // 2x Width
                            { id: 'in_progress', label: 'On Air', color: 'border-blue-500', width: 'w-[500px]' }, // Expanded
                            { id: 'done', label: 'Archived', color: 'border-emerald-500', width: 'w-[500px]' }, // Expanded
                        ].map(col => (
                            <div key={col.id} className={`${col.width} shrink-0 flex flex-col bg-zinc-900/20 rounded-xl border border-white/5 h-full`}>
                                {/* Column Header */}
                                <div className={`p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10 rounded-t-xl border-t-2 ${col.color}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">{col.label}</span>
                                        <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {col.id === 'done'
                                                ? filteredTasks.filter(t => (t.status === 'done' || t.status === 'rejected') && new Date(t.updatedAt).toLocaleDateString() === archiveDate.toLocaleDateString()).length
                                                : filteredTasks.filter(t => t.status === col.id).length}
                                        </span>
                                    </div>
                                    {col.id === 'done' && (
                                        <div className="flex gap-1">
                                            {/* Date Navigation */}
                                            <div className="flex items-center bg-zinc-800 rounded-md mr-2">
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
                                                <span className="text-[10px] font-bold px-1 min-w-[70px] text-center">
                                                    {archiveDate.toLocaleDateString()}
                                                </span>
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
                                    {(col.id === 'done'
                                        ? filteredTasks.filter(t => (t.status === 'done' || t.status === 'rejected') && new Date(t.updatedAt).toLocaleDateString() === archiveDate.toLocaleDateString())
                                        : filteredTasks.filter(t => t.status === col.id)
                                    )
                                        .sort((a, b) => {
                                            if (col.id === 'todo') {
                                                const pMap: Record<string, number> = { 'P1': 3, 'P2': 2, 'P3': 1 };
                                                const pDiff = (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
                                                if (pDiff !== 0) return pDiff;
                                                return b.id - a.id; // Secondary sort: Newest First
                                            }
                                            return b.id - a.id;
                                        })
                                        .map(task => {
                                            // Status-based base style
                                            let cardStyle = getStatusColor(task.status);

                                            // PRIORITY STYLING
                                            if (task.priority === 'P1' && task.status !== 'done' && task.status !== 'rejected') {
                                                cardStyle = 'bg-red-950/20 border border-red-500/50 hover:bg-red-900/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]';
                                            } else if (task.priority === 'P2' && task.status !== 'done' && task.status !== 'rejected') {
                                                cardStyle = 'bg-orange-950/20 border border-orange-500/30 hover:border-orange-400';
                                            }

                                            // Priority Overlay
                                            if (task.priority === 'P1' && task.status === 'todo') {
                                                cardStyle += ' relative overflow-hidden';
                                            }

                                            const deptColor = getDepartmentColor(task.dept);
                                            const isSelected = selectedTaskIds.has(task.id);

                                            return (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    key={task.id}
                                                    onClick={() => isSelectionMode ? toggleTaskSelection(task.id) : setSelectedTask(task)}
                                                    className={`
                                                        p-3 rounded-xl border transition-all cursor-pointer group relative hover:shadow-lg hover:-translate-y-0.5
                                                        ${cardStyle}
                                                        ${isSelected ? 'ring-2 ring-emerald-500 bg-zinc-800' : ''}
                                                    `}
                                                >
                                                    {/* Selection Checkbox */}
                                                    {isSelectionMode && (
                                                        <div className="absolute top-2 right-2 z-10">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-black/40 border-white/30'}`}>
                                                                {isSelected && <Check size={12} className="text-black" />}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Department Stripe */}
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent -mr-8 -mt-8 rotate-45 pointer-events-none" />
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${deptColor} opacity-70`} />

                                                    {/* Header: ID + Priority + Thumbnail */}
                                                    <div className="flex justify-between items-center mb-2 pl-2 relative z-10">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-mono font-bold text-lg tracking-tight">#{task.id}</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${task.priority === 'P1' ? 'bg-red-500/20 text-red-200 border-red-500/50' :
                                                                task.priority === 'P2' ? 'bg-orange-500/20 text-orange-200 border-orange-500/50' :
                                                                    'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                                                                }`}>
                                                                {task.priority || 'P3'}
                                                            </span>

                                                            {/* Dept Badge */}
                                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider border border-white/10 px-1.5 py-0.5 rounded bg-black/20">
                                                                {task.dept}
                                                            </span>
                                                        </div>

                                                        {task.imageUrl && (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLightboxUrl(task.imageUrl || null);
                                                                }}
                                                                className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden cursor-zoom-in hover:border-emerald-500 hover:scale-105 transition-all shadow-sm group/thumb"
                                                            >
                                                                <img src={task.imageUrl} alt="Att." className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* User Information */}
                                                    <div className="pl-3 mb-3 relative z-10">
                                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                                            <User size={12} strokeWidth={2.5} />
                                                            <span className="text-xs font-bold text-zinc-300">
                                                                {task.requester || 'System User'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    {task.description && (
                                                        <p className="pl-3 text-xs text-zinc-400 mb-4 whitespace-pre-wrap line-clamp-3">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    {/* Footer Meta */}
                                                    <div className="pl-3 flex items-center justify-between pt-3 border-t border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-full ${deptColor} text-white flex items-center justify-center text-[10px] font-bold border border-white/20`}>
                                                                {task.owner ? task.owner[0] : '?'}
                                                            </div>
                                                            <span className="text-[10px] opacity-60 font-medium truncate max-w-[80px]">{task.owner}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${task.due === 'Today' ? 'text-orange-400' : 'opacity-40'}`}>
                                                            {task.due}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div >


            {/* SLIDE-OVER DETAIL_PANEL */}
            <AnimatePresence>
                {
                    selectedTask && (
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-[480px] border-l border-white/10 bg-zinc-950 absolute right-0 top-0 bottom-0 shadow-2xl z-20 flex flex-col"
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
                                {/* Header Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleSelectionMode}
                                        className={`w - 8 h - 8 rounded - lg flex items - center justify - center transition - colors ${isSelectionMode ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'} `}
                                        title="Select Tasks"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <button className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-bold hover:bg-zinc-700 transition-colors">Edit</button>
                                    <button className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors">Complete</button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text - xs font - bold px - 2 py - 1 rounded border uppercase ${getStatusColor(selectedTask.status)} `}>
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
                                        <span className="text-white text-sm font-medium">User #{selectedTask.requesterId || 1}</span>
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
        </div >
    );
}
