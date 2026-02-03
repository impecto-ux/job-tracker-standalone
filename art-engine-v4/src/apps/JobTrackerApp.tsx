import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, MessageSquare, CheckCircle, CheckCircle2, Check, Clock, AlertCircle, ArrowLeft, Send, RefreshCw, Play, AlertOctagon, XCircle, Trash2, User, Sparkles, X, ChevronDown, LogOut, Settings, LayoutGrid, List, MoreHorizontal, Grid3X3, Columns, Layout, Menu, PanelLeftClose, Minimize2, Maximize2, Zap, Shield, Users, Lock, Activity, RotateCcw, Layers, Grip } from 'lucide-react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '@/lib/config';
import { useStore } from '@/lib/store'; // Added import
import ChatInterface from '@/components/job-tracker/ChatInterface';
import ChatSidebar from '@/components/job-tracker/ChatSidebar'; // Added import for ChatSidebar
import { AdminDashboard } from '@/components/job-tracker/AdminDashboard';
import AlmanacApp from '@/apps/AlmanacApp';
import LoginModal from '@/components/auth/LoginModal';
import UserProfileModal from '@/components/auth/UserProfileModal';
import MemberProfileModal from '@/components/job-tracker/MemberProfileModal';
import { UserManagementPanel } from '@/components/job-tracker/UserManagementPanel';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // Added api import

// Components
import Stats from '@/components/job-tracker/Stats';
import { UnifiedAssetsBoard } from '@/components/job-tracker/UnifiedAssetsBoard';
import { TaskTimerWidget } from '@/components/job-tracker/TaskTimerWidget';
import { LiveTicker } from '@/components/job-tracker/LiveTicker';
import { LiveStatusModal } from '@/components/job-tracker/LiveStatusModal';
import { RevisionRequestModal } from '@/components/job-tracker/RevisionRequestModal';
import { GroupDiscoveryModal } from '@/components/job-tracker/GroupDiscoveryModal';
import { NotificationCenter } from '@/components/job-tracker/NotificationCenter';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    dept: string;
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
    metadata?: any;
    group?: string; // Added for grouping logic
    revisionCount?: number;
    revisions?: any[];
}

interface JobTrackerProps {
    onExit: () => void;
}
// ...
export default function JobTrackerApp({ onExit }: JobTrackerProps) {
    const router = useRouter();
    const auth = useStore(state => state.auth);
    const chat = useStore(state => state.chat);
    // ...
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [chatPendingMessage, setChatPendingMessage] = useState<string | null>(null);
    // State for UI
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null); // NEW: Selected Member for Profile View
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
    const [userManagementInitialView, setUserManagementInitialView] = useState<'root' | 'groups_root' | 'departments_root'>('root');
    const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
    const [adminInitialNode, setAdminInitialNode] = useState<string | null>(null);
    const [showMatrix, setShowMatrix] = useState(false);
    const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);

    // Quick Action State: { taskId, type: 'ask' | 'reject' | 'revision', content: '' }
    const [quickAction, setQuickAction] = useState<{ taskId: number; type: 'ask' | 'reject' | 'revision', content: string } | null>(null);

    const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false);

    // Mobile State
    const [mobileTab, setMobileTab] = useState<'tasks' | 'chat' | 'stats'>('tasks');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const [detailTab, setDetailTab] = useState<'details' | 'revisions'>('details');

    // Data State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDept, setFilterDept] = useState('all');

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Added selectedTask
    const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set<number>());

    const ShortcutHints = ({ task }: { task: Task }) => {
        const status = task.status;
        const hints: { key: string, label: string }[] = [];
        if (status === 'todo') {
            hints.push({ key: 'S', label: 'Start' });
            hints.push({ key: 'R', label: 'Reject' });
        } else if (status === 'in_progress') {
            hints.push({ key: 'D', label: 'Done' });
            hints.push({ key: 'Q', label: 'Re-Queue' });
            hints.push({ key: 'A', label: 'Ask' });
        } else if (status === 'done') {
            hints.push({ key: 'Q', label: 'Re-Queue' });
            hints.push({ key: 'A', label: 'Ask' });
        } else if (status === 'rejected') {
            hints.push({ key: 'Q', label: 'Re-Queue' });
        }

        if (hints.length === 0) return null;

        return (
            <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2 z-[45] pointer-events-none border border-emerald-500/20 rounded-xl">
                <div className="flex flex-wrap justify-center gap-2 px-4 scale-90 group-hover:scale-100 transition-transform duration-300">
                    {hints.map(hint => (
                        <div key={hint.key} className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 shadow-2xl">
                            <span className="text-[11px] font-mono font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {hint.key}
                            </span>
                            <span className="text-[10px] font-black text-zinc-100 uppercase tracking-widest">{hint.label}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="h-px w-4 bg-emerald-500/30" />
                    <span className="text-[9px] text-emerald-500/60 font-black uppercase tracking-[0.3em]">Quick Access</span>
                    <div className="h-px w-4 bg-emerald-500/30" />
                </div>
            </div>
        );
    };
    const [tokenUsage, setTokenUsage] = useState<any>(null); // Added tokenUsage for polling

    // Report State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [dailyReportContent, setDailyReportContent] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'grid'>('list');
    const [activeTab, setActiveTab] = useState<'my_tasks' | 'squad_tasks' | 'all_tasks' | 'stats' | 'assets' | 'admin' | 'tasks'>('my_tasks');
    const [archiveDate, setArchiveDate] = useState<Date>(new Date());
    const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
    const [discoveryTab, setDiscoveryTab] = useState<'groups' | 'people'>('groups');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'priority' | 'due' | 'newest' | 'group'>('newest');

    const handleAskQuestion = async (taskOverride?: Task) => {
        const taskToUse = taskOverride || selectedTask;
        if (!taskToUse) return;

        const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
        const question = commentBox?.value?.trim();

        if (!question) {
            if (!taskOverride) alert("Lütfen sorunuzu yazın.");
            return;
        }

        const deptChannel = chat.channels.find(c => c.name.toLowerCase() === taskToUse.dept?.toLowerCase());
        const targetChannelId = deptChannel ? deptChannel.id : (chat.activeChannelId || chat.channels[0]?.id);

        if (targetChannelId) {
            try {
                chat.setActiveChannel(targetChannelId);

                // Tag Requester as requested by user
                const messageContent = `@${taskToUse.requester} [Task #${taskToUse.id}] ${question}`;

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

    const handleBulkStatus = async (status: string) => {
        try {
            await api.post('/tasks/bulk-status', {
                ids: Array.from(selectedTaskIds),
                status
            });

            // Clean up selections and refresh
            setSelectedTaskIds(new Set());
            loadTasks();

        } catch (error) {
            console.error("Failed to update bulk tasks", error);
            alert("Bulk update failed.");
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

    const handleBulkStatusChange = async (status: string) => {
        if (!confirm(`Update ${selectedTaskIds.size} tasks to '${status}'?`)) return;

        try {
            await Promise.all(Array.from(selectedTaskIds).map(id => api.patch(`/tasks/${id}`, { status })));

            // Cleanup
            setIsSelectionMode(false);
            setSelectedTaskIds(new Set());
            loadTasks();
        } catch (error) {
            console.error("Failed to update tasks", error);
            alert("Some tasks could not be updated.");
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
            }

            setTasks(mappedTasks);
            setLastSync(new Date());
        } catch (error) {
            console.warn("[JobTracker] Failed to load tasks - Backend might be momentarily offline.");
            // Do NOT throw. Just log. This prevents the "Uncaught Error" overlay in dev mode.
        }
    };


    useEffect(() => {
        if (auth.token) {
            loadTasks();

            // WebSocket Connection
            const socket = io(getSocketUrl());

            socket.on('connect', () => {
                console.log('[JobTracker] Connected to WebSocket');
            });

            socket.on('task_created', (newTask: any) => {
                console.log('[WS] Task Created:', newTask.id);
                const mappedTask = {
                    id: newTask.id,
                    title: newTask.title,
                    description: newTask.description,
                    status: newTask.status,
                    priority: newTask.priority,
                    dept: newTask.department?.name || 'General',
                    owner: newTask.owner?.fullName || 'Unknown',
                    requester: newTask.requester?.fullName || 'System',
                    due: newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'No Date',
                    createdAt: newTask.createdAt,
                    updatedAt: newTask.updatedAt,
                    imageUrl: newTask.imageUrl,
                    startedAt: newTask.startedAt,
                    completedAt: newTask.completedAt,
                    score: newTask.score || 0,
                    category: newTask.category || 'Uncategorized',
                    metadata: newTask.metadata
                };
                setTasks(prev => [mappedTask, ...prev]);
            });

            socket.on('task_updated', (updatedTask: any) => {
                console.log('[WS] Task Updated:', updatedTask.id, updatedTask.status);
                setTasks(prev => prev.map(t => {
                    if (String(t.id) === String(updatedTask.id)) {
                        return {
                            ...t,
                            title: updatedTask.title,
                            description: updatedTask.description,
                            status: updatedTask.status,
                            priority: updatedTask.priority,
                            dept: updatedTask.department?.name || 'General',
                            owner: updatedTask.owner?.fullName || 'Unknown',
                            requester: updatedTask.requester?.fullName || 'System',
                            due: updatedTask.dueDate ? new Date(updatedTask.dueDate).toLocaleDateString() : 'No Date',
                            imageUrl: updatedTask.imageUrl,
                            startedAt: updatedTask.startedAt,
                            completedAt: updatedTask.completedAt,
                            score: updatedTask.score || 0,
                            category: updatedTask.category || 'Uncategorized',
                            metadata: updatedTask.metadata,
                            updatedAt: updatedTask.updatedAt // Ensure updatedAt is synced
                        };
                    }
                    return t;
                }));
            });

            socket.on('task_deleted', ({ id }: { id: number }) => {
                console.log('[WS] Task Deleted:', id);
                setTasks(prev => prev.filter(t => String(t.id) !== String(id)));
            });

            socket.on('channel_updated', (updatedChannel: any) => {
                console.log('[WS] Channel Updated:', updatedChannel);
                const currentChannels = useStore.getState().chat.channels;
                chat.setChannels(currentChannels.map(c => c.id === updatedChannel.id ? { ...c, ...updatedChannel } : c));
            });

            // Keep a slower poll just for auth/token sync if needed, or rely on other mechanisms
            // For now, we'll remove the task polling but keep the auth check in a separate effect if strictly needed.
            // Actually, let's keep a very slow poll (30s) for "safety" sync
            const interval = setInterval(() => {
                api.get('/auth/me').then(res => {
                    if (res.data) {
                        if (res.data.tokenUsage !== undefined) setTokenUsage(res.data.tokenUsage);
                        auth.setUser(res.data);
                    }
                }).catch(e => { });
            }, 30000);

            return () => {
                socket.disconnect();
                clearInterval(interval);
            };
        }
    }, [auth.token]);

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

    // Extract Unique Groups (Filter out Departments)
    const departments = useMemo(() => {
        // Create a map of normalized names to types for case-insensitive lookup
        const channelTypeMap = new Map(chat.channels.map(c => [c.name.toLowerCase(), c.type]));
        const userChannels = chat.channels.map(c => c.name.toLowerCase());
        const isAdmin = auth.user?.role === 'admin';

        return Array.from(new Set(tasks.map(t => t.dept || 'General')))
            .filter(dept => {
                const normalizedDept = dept.toLowerCase();

                // Strict Filter: Must be of type 'group'
                // We do NOT allow 'General' or unknown                // Check type if known
                const type = channelTypeMap.get(normalizedDept);

                // If we have explicit type info, enforce it matches 'group'
                // This will hide 'department', 'public', 'private' etc.
                if (type && type !== 'group') return false;

                // If type is UNKNOWN (not in channel list e.g. admin view), we ALLOW it
                // This ensures groups don't disappear just because we miss channel info

                // Standard permission check
                return isAdmin || userChannels.includes(normalizedDept);
            })
            .sort();
    }, [tasks, chat.channels, auth.user?.role]);

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
    const [sidebarWidth, setSidebarWidth] = useState(400); // Increased initial width to 850px
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);

    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const [mentionCounts, setMentionCounts] = useState<Record<number, number>>({});
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

        const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
        const reason = commentBox?.value;

        if (!confirm('Are you sure you want to PERMANENTLY delete this task? This action cannot be undone.')) return;

        try {
            await api.delete(`/tasks/${selectedTask.id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`);
            // Remove from state
            setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
            if (commentBox) commentBox.value = '';
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

            if (newStatus === 'done') {
                api.get('/auth/me').then(res => auth.setUser(res.data)).catch(console.error);
            }

            // Clear comment
            if (commentBox) commentBox.value = '';

        } catch (error: any) {
            console.error("Failed to update status", error);
            if (error.response?.status === 403) {
                alert(error.response?.data?.message || 'Bu işlem için yetkiniz yok. Sadece yetkili departman kullanıcıları bu task üzerinde çalışabilir.');
            } else {
                alert("Görev güncellenemedi. Lütfen tekrar deneyin.");
            }
        }
    };



    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Close on Escape
    // Keyboard Shortcuts (Global)
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            // 1. Ignore if typing in any input/textarea
            const activeElem = document.activeElement;
            const isTyping = activeElem instanceof HTMLInputElement || activeElem instanceof HTMLTextAreaElement;
            if (isTyping) {
                // Special case: Esc should still work if not blocked by admin
                if (e.key === 'Escape' && !isAdminDashboardOpen) {
                    if (lightboxUrl) { setLightboxUrl(null); return; }
                    if (isReportModalOpen) { setIsReportModalOpen(false); return; }
                    if (isDiscoveryOpen) { setIsDiscoveryOpen(false); return; }
                    if (isProfileOpen) { setIsProfileOpen(false); return; }
                    if (isUserMenuOpen) { setIsUserMenuOpen(false); return; }
                    if (selectedTask) { setSelectedTask(null); return; }
                    if (showMatrix) { setShowMatrix(false); return; }
                    if (activeTab === 'stats') { setActiveTab('tasks'); return; }
                    if (searchQuery) { setSearchQuery(''); return; }
                }
                return;
            }

            // 2. Global Esc (Duplicate check for when not typing, keeping it simple)
            if (e.key === 'Escape' && !isAdminDashboardOpen) {
                if (lightboxUrl) { setLightboxUrl(null); return; }
                if (isReportModalOpen) { setIsReportModalOpen(false); return; }
                if (isDiscoveryOpen) { setIsDiscoveryOpen(false); return; }
                if (isProfileOpen) { setIsProfileOpen(false); return; }
                if (isUserMenuOpen) { setIsUserMenuOpen(false); return; }
                if (selectedTask) { setSelectedTask(null); return; }
                if (showMatrix) { setShowMatrix(false); return; }
                if (activeTab === 'stats') { setActiveTab('tasks'); return; }
                if (searchQuery) { setSearchQuery(''); return; }
            }

            // 3. Action Shortcuts (Only if a task is selected)
            const targetTask = selectedTask || hoveredTask;
            if (!targetTask) return;

            const key = e.key.toLowerCase();
            const status = targetTask.status;

            switch (key) {
                case 's': // Start
                    if (status === 'todo') handleStatusUpdate(targetTask.id, 'in_progress');
                    break;
                case 'd': // Done
                    if (status === 'in_progress') handleStatusUpdate(targetTask.id, 'done');
                    break;
                case 'a': // Ask
                    // Focus comment box if we have a selected task, otherwise maybe we should just allow 'A' if hovered?
                    // For now, let's stick to the selectedTask behavior for 'A' since it needs a comment box check.
                    // UNLESS we want 'A' to work on hover too? Let's make it work on hover if selectedTask is null.
                    const commentBox = document.getElementById('status-comment') as HTMLTextAreaElement;
                    if (commentBox && commentBox.value.trim()) {
                        // We need to make sure handleAskQuestion uses targetTask
                        handleAskQuestion(targetTask);
                    } else if (selectedTask) {
                        commentBox?.focus();
                    }
                    break;
                case 'r': // Reject
                    if (status === 'todo') handleStatusUpdate(targetTask.id, 'rejected');
                    break;
                case 'q': // Re-Queue
                    if (status === 'done' || status === 'rejected' || status === 'in_progress') handleStatusUpdate(targetTask.id, 'todo');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [isAdminDashboardOpen, lightboxUrl, isReportModalOpen, isDiscoveryOpen, isProfileOpen, isUserMenuOpen, selectedTask, showMatrix, activeTab, searchQuery, hoveredTask]);

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
    const taskStatusMap = React.useMemo(() => {
        return tasks.reduce((acc, task) => {
            acc[task.id] = task.status;
            return acc;
        }, {} as Record<number, string>);
    }, [tasks]);

    // Shared Sort Function
    const sortTasksFn = (a: Task, b: Task) => {
        // 0. Status Logic (Rejected always at bottom)
        if (a.status === 'rejected' && b.status !== 'rejected') return 1;
        if (a.status !== 'rejected' && b.status === 'rejected') return -1;

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
        <>
            <div className={`h-full w-full bg-black text-[#e9edef] font-sans flex flex-col overflow-hidden pb-12 md:flex-row ${isResizing ? 'cursor-col-resize select-none' : ''} relative`}>
                {/* Collapsed UI */}
                {/* Collapsed UI */}
                <div className={`h-full w-full md:w-20 flex flex-col items-center py-4 gap-4 ${isChatCollapsed ? 'flex' : 'hidden'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setIsChatCollapsed(false); }} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <Menu size={20} />
                    </button>

                    {/* Active Channel Badges */}
                    <div className="flex-1 flex flex-col gap-3 w-full items-center overflow-hidden pt-4 overflow-y-auto no-scrollbar">
                        {/* 1. Direct Messages */}
                        {sortedChannels.filter(c => c.type === 'private').length > 0 && (
                            <div className="w-full flex flex-col items-center gap-2 mb-2">
                                <div className="w-4 h-px bg-white/10 my-1" />
                                {sortedChannels.filter(c => c.type === 'private').map(channel => {
                                    const unreadCount = unreadCounts[channel.id] || 0;
                                    const otherUser = channel.users?.find((u: any) => u.id !== auth.user?.id);
                                    const initial = otherUser?.fullName ? otherUser.fullName[0].toUpperCase() : '?';

                                    return (
                                        <button
                                            key={channel.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                chat.setActiveChannel(channel.id);
                                                setIsChatCollapsed(false);
                                            }}
                                            className="relative group/badge"
                                            title={otherUser?.fullName || 'Unknown User'}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-transform hover:scale-110`}>
                                                {initial}
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
                            </div>
                        )}

                        <div className="w-4 h-px bg-white/10 my-1" />

                        {/* 2. Groups / Departments */}
                        {sortedChannels.filter(c => c.type !== 'private').slice(0, 10).map(channel => {
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
                    </div>


                    {/* Bottom Status Dot */}
                    <div className={`w-2 h-2 rounded-full ${totalUnread > 0 ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse mb-4`} title={totalUnread > 0 ? `${totalUnread} Unread Messages` : 'Online'} />
                </div>

                {/* Expanded UI (Always Mounted, Hidden When Collapsed) */}
                <div
                    style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
                    className={`flex-shrink-0 h-full relative ${isChatCollapsed ? 'hidden' : 'flex'}`}
                >
                    <ChatSidebar
                        notificationStats={channelStats}
                        unreadCounts={unreadCounts}
                        mentionCounts={mentionCounts} // Pass mentions
                        onCreateGroup={(view = 'groups_root') => {
                            setUserManagementInitialView(view);
                            setIsUserManagementOpen(true);
                        }}
                        onDiscoveryClick={(tab: 'groups' | 'people' | undefined) => {
                            setDiscoveryTab(tab || 'groups');
                            setIsDiscoveryOpen(true);
                        }}
                        headerActions={
                            <div className="flex gap-1">
                                {/* Collapse Button */}
                                <button
                                    onClick={() => {
                                        setIsChatCollapsed(true);
                                        chat.setActiveChannel(null);
                                    }}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                                    title="Collapse Sidebar"
                                >
                                    <PanelLeftClose size={18} />
                                </button>
                                {/* Full Screen Toggle */}
                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                                >
                                    {isFullScreen ? (
                                        <Minimize2 size={18} />
                                    ) : (
                                        <Maximize2 size={18} />
                                    )}
                                </button>
                            </div>
                        }
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
                </div>
                {/* MAIN DASHBOARD (Right - Remaining) */}
                <div className={`flex-1 flex flex-row min-w-0 bg-zinc-950 overflow-hidden relative ${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>

                    {/* DASHBOARD CONTENT (Center Pane) */}
                    {/* On Desktop: Always visible (lg:flex). On Mobile: Hidden if chat active. */}
                    <div className={`flex-1 flex flex-col min-w-0 h-full ${chat.activeChannelId ? 'hidden lg:flex' : 'flex'}`}>
                        <AnimatePresence mode="wait">
                            {isAdminDashboardOpen ? (
                                <motion.div
                                    key="admin-dashboard"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="absolute inset-0 z-[110]"
                                >
                                    <AdminDashboard
                                        initialNode={adminInitialNode}
                                        onClose={() => {
                                            setIsAdminDashboardOpen(false);
                                            setAdminInitialNode(null);
                                            setIsChatCollapsed(false); // Auto-expand when exiting
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="main-content"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 flex flex-col min-w-0 h-full"
                                >
                                    {/* HEADER */}
                                    {(!isMobile || mobileTab === 'tasks') && (
                                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0 backdrop-blur-sm z-[100]">
                                            {/* ... content ... */}
                                            <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                                                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 shrink-0">
                                                    <span className="text-emerald-500">❖</span>
                                                    JOB TRACKER
                                                </h1>
                                                <div className="h-4 w-px bg-white/10 shrink-0" />

                                                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 -mb-1 pr-2 w-full mask-linear-fade">
                                                    {/* Status Filter */}
                                                    <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5 shrink-0">
                                                        {['all', 'todo', 'in_progress', 'done'].map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => setFilterStatus(status)}
                                                                className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                            >
                                                                {status.replace('_', ' ')}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* NEW: Department Filter */}
                                                    <div className="relative group min-w-[180px] shrink-0">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-zinc-500">
                                                            <Filter size={14} />
                                                        </div>
                                                        <select
                                                            value={filterDept}
                                                            onChange={(e) => setFilterDept(e.target.value)}
                                                            className="w-full bg-zinc-900 border border-white/5 rounded-lg pl-9 pr-8 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none hover:bg-zinc-800 cursor-pointer relative z-0"
                                                        >
                                                            <option value="all">ALL GROUPS</option>
                                                            {departments.map((dept: string) => (
                                                                <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-zinc-500">
                                                            <ChevronDown size={12} />
                                                        </div>
                                                    </div>

                                                    {/* NEW: Sort By (Hidden on lg/xl) */}
                                                    <div className="hidden 2xl:flex bg-zinc-900 p-1 rounded-lg border border-white/5 gap-1 shrink-0">
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

                                                    {/* NEW: View Mode Toggle (Hidden on lg/xl) */}
                                                    <div className="hidden 2xl:flex bg-zinc-900 p-1 rounded-lg border border-white/5 gap-1 shrink-0">
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
                                                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5 gap-1 shrink-0 ml-2">
                                                        <button
                                                            onClick={() => setActiveTab('tasks')}
                                                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${activeTab === 'tasks' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            Tasks
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab('stats')}
                                                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${activeTab === 'stats' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            Stats
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab('assets')}
                                                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${activeTab === 'assets' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                        >
                                                            Assets
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* APPS DROPDOWN */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
                                                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all border ${isAppsMenuOpen
                                                        ? 'bg-zinc-700 border-white/20 text-white'
                                                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                                        }`}
                                                    title="Apps"
                                                >
                                                    <Grip size={16} />
                                                </button>

                                                <AnimatePresence>
                                                    {isAppsMenuOpen && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-[60]"
                                                                onClick={() => setIsAppsMenuOpen(false)}
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden p-1"
                                                            >
                                                                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                                    Apps
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setShowMatrix(true);
                                                                        setIsAppsMenuOpen(false);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                                                                >
                                                                    <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                                                                        <Sparkles size={12} fill="currentColor" />
                                                                    </div>
                                                                    Almanac Matrix
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        handleGenerateReport();
                                                                        setIsAppsMenuOpen(false);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                                                                >
                                                                    <div className="w-5 h-5 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                                        <Sparkles size={12} />
                                                                    </div>
                                                                    Daily Brief
                                                                </button>

                                                                {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsLiveStatusOpen(true);
                                                                            setIsAppsMenuOpen(false);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                                                                    >
                                                                        <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                                            <Activity size={12} />
                                                                        </div>
                                                                        Live Status
                                                                    </button>
                                                                )}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Sync Indicator */}
                                            <div className="flex items-center gap-2 bg-black/20 border border-white/5 px-2.5 py-1 rounded-full group/sync transition-colors hover:border-emerald-500/30">
                                                <div className="relative flex items-center justify-center">
                                                    <RefreshCw
                                                        size={10}
                                                        className={`text-emerald-500 transition-all duration-700 ${lastSync && Date.now() - lastSync.getTime() < 1000 ? 'rotate-180 scale-125' : ''}`}
                                                    />
                                                    {lastSync && Date.now() - lastSync.getTime() < 1000 && (
                                                        <div className="absolute inset-0 bg-emerald-500/40 blur-[4px] rounded-full animate-ping" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover/sync:text-emerald-400">
                                                    SYNCED {lastSync ? Math.floor((Date.now() - lastSync.getTime()) / 1000) : 0}s AGO
                                                </span>
                                                <button
                                                    onClick={() => loadTasks()}
                                                    className="ml-1 text-zinc-600 hover:text-white transition-colors p-0.5 hover:bg-white/5 rounded"
                                                    title="Force Refresh"
                                                >
                                                    <RefreshCw size={10} />
                                                </button>
                                            </div>

                                            {/* Notification Center */}
                                            <div className="mr-2">
                                                <NotificationCenter />
                                            </div>
                                            <div className="h-4 w-px bg-white/10 mr-2" />

                                            {/* Profile Badge & Dropdown */}
                                            {auth.user && (
                                                <div className="relative profile-dropdown-container flex items-center">
                                                    {/* Points Badge */}
                                                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mr-2" title="Total XP Earned">
                                                        <div className="text-amber-500"><Sparkles size={12} fill="currentColor" /></div>
                                                        <span className="text-xs font-bold text-amber-500 tabular-nums">{(auth.user.totalPoints || 0).toLocaleString()} XP</span>
                                                    </div>

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
                                                                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden"
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
                                                                            <>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        // setIsAdminDashboardOpen(true); // OLD
                                                                                        router.push('/admin');
                                                                                        setIsUserMenuOpen(false);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                                                >
                                                                                    <Shield size={14} />
                                                                                    Admin Dashboard
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        // setIsUserManagementOpen(true); // OLD
                                                                                        router.push('/admin/users');
                                                                                        setIsUserMenuOpen(false);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors mt-1"
                                                                                >
                                                                                    <Users size={14} />
                                                                                    User Management
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        <div className="h-px bg-white/5 my-1" />

                                                                        <button
                                                                            onClick={() => {
                                                                                auth.logout();
                                                                                setIsUserMenuOpen(false);
                                                                                router.push('/login');
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
                                                        {tasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length}
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
                                                            count: tasks.filter(t => (t.dept === dept || (dept === 'General' && !t.dept)) && t.status === 'todo').length,
                                                            totalActivity: tasks.filter(t => (t.dept === dept || (dept === 'General' && !t.dept))).length
                                                        }))
                                                        .filter(item => {
                                                            // Role-based filtering
                                                            if (auth.user?.role === 'admin' || auth.user?.role === 'manager') return true;
                                                            // Regular users only see groups they are members of
                                                            return chat.channels.some(c => c.name.toLowerCase() === item.dept.toLowerCase());
                                                        })
                                                        .sort((a, b) => b.totalActivity - a.totalActivity)
                                                        .slice(0, (auth.user?.role === 'admin' || auth.user?.role === 'manager') ? 5 : 99)
                                                        .map(({ dept }) => {
                                                            const deptTasks = tasks.filter(t => t.dept === dept || (dept === 'General' && !t.dept));
                                                            const total = deptTasks.length || 1;
                                                            const todo = deptTasks.filter(t => t.status === 'todo').length;
                                                            const inProgress = deptTasks.filter(t => t.status === 'in_progress').length;
                                                            const done = deptTasks.filter(t => t.status === 'done').length;
                                                            const urgent = deptTasks.filter(t => (t.status === 'todo' || t.status === 'in_progress') && t.priority === 'P1').length;

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
                                                                        {urgent > 0 && (
                                                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white border border-[#222e35] animate-pulse shadow-lg shadow-red-500/50">
                                                                                {urgent}
                                                                            </div>
                                                                        )}
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
                                                    <h2 className="text-3xl font-mono font-bold text-emerald-400">{(tokenUsage || 0).toLocaleString('en-US')}</h2>
                                                    <span className="text-zinc-600 text-[10px] font-bold uppercase">Total Tokens Processed</span>
                                                </div>
                                                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(((tokenUsage || 0) / 10000) * 100, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* QUICK ACTION OVERLAY (Modal) */}
                                    {quickAction && (
                                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl relative"
                                            >
                                                <h3 className="text-lg font-bold text-white mb-1">
                                                    {quickAction.type === 'ask' ? 'Ask Question' :
                                                        quickAction.type === 'revision' ? 'Request Revision' :
                                                            'Reject Task'}
                                                </h3>
                                                <p className="text-sm text-zinc-400 mb-4">
                                                    {quickAction.type === 'ask' ? 'Post a question to the channel.' :
                                                        quickAction.type === 'revision' ? 'Explain what needs to be changed. This will open a private chat with the owner.' :
                                                            'Provide a reason for rejection.'}
                                                </p>

                                                <textarea
                                                    autoFocus
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[100px] resize-none mb-4"
                                                    placeholder={quickAction.type === 'ask' ? "What's your question?" : "Describe required changes..."}
                                                    value={quickAction.content}
                                                    onChange={e => setQuickAction({ ...quickAction, content: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            // Trigger Submit
                                                            const btn = document.getElementById('quick-action-submit');
                                                            if (btn) btn.click();
                                                        }
                                                    }}
                                                />

                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => setQuickAction(null)}
                                                        className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        id="quick-action-submit"
                                                        onClick={() => {
                                                            if (!quickAction.content.trim()) return;

                                                            if (quickAction && quickAction.type === 'ask') {
                                                                const task = tasks.find(t => t.id === quickAction.taskId);
                                                                const deptChannel = chat.channels.find(c => c.name.toLowerCase() === task?.dept?.toLowerCase());
                                                                const targetChannelId = deptChannel ? deptChannel.id : (chat.activeChannelId || chat.channels[0]?.id);
                                                                if (targetChannelId) {
                                                                    api.post(`/channels/${targetChannelId}/messages`, { content: `@${task?.requester} [Task #${task?.id}] ${quickAction.content}` })
                                                                        .then(() => setQuickAction(null));
                                                                }
                                                            } else if (quickAction && quickAction.type === 'revision') {
                                                                api.post(`/tasks/${quickAction.taskId}/request-revision`, { reason: quickAction.content })
                                                                    .then((res: any) => {
                                                                        loadTasks(); // Refresh list to show new status
                                                                        setQuickAction(null);
                                                                        // TODO: Navigate to new Channel?
                                                                        if (res.data?.revisionChannelId) {
                                                                            useStore.getState().chat.setActiveChannel(res.data.revisionChannelId);
                                                                            setIsChatCollapsed(false);
                                                                        }
                                                                    })
                                                                    .catch(err => console.error(err));
                                                            } else {
                                                                api.patch(`/tasks/${quickAction.taskId}`, { status: 'rejected', comment: quickAction.content })
                                                                    .then(loadTasks)
                                                                    .finally(() => setQuickAction(null));
                                                            }
                                                        }}
                                                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-lg flex items-center gap-2 ${quickAction.type === 'ask' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' :
                                                            quickAction.type === 'revision' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' :
                                                                'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                                                            }`}
                                                    >
                                                        {quickAction.type === 'ask' ? <Send size={14} /> : quickAction.type === 'revision' ? <RefreshCw size={14} /> : <XCircle size={14} />}
                                                        {quickAction.type === 'ask' ? 'Send' : quickAction.type === 'revision' ? 'Request Revision' : 'Reject'}
                                                    </button>
                                                </div>
                                            </motion.div>
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
                                                    <div className="h-4 w-px bg-white/20" />
                                                    <button
                                                        onClick={() => handleBulkStatusChange('done')}
                                                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        DONE
                                                    </button>
                                                    <button
                                                        onClick={() => handleBulkStatusChange('in_progress')}
                                                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-sm bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20"
                                                    >
                                                        <Zap size={16} />
                                                        ACTIVE
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

                                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                        {(activeTab === 'stats' || mobileTab === 'stats') ? (
                                            <Stats tasks={tasks} />
                                        ) : activeTab === 'assets' ? (
                                            <UnifiedAssetsBoard />
                                        ) : viewMode === 'board' ? (
                                            <div className="flex flex-col xl:flex-row h-fit xl:h-full gap-6 w-full p-6">
                                                {/* KANBAN COLUMNS */}
                                                {[
                                                    { id: 'todo', label: 'In Queue', color: 'border-zinc-700' },
                                                    { id: 'in_progress', label: 'On Air', color: 'border-blue-500' },
                                                    { id: 'done', label: 'Archived', color: 'border-emerald-500' },
                                                ]
                                                    .filter(col => filterStatus === 'all' || col.id === filterStatus)
                                                    .map(col => {
                                                        // Column Filter Logic
                                                        const colTasks = filteredTasks.filter(t => {
                                                            if (col.id === 'todo') return t.status === 'todo' || t.status === 'review' || t.status === 'revision';
                                                            if (col.id === 'in_progress') return t.status === 'in_progress';
                                                            if (col.id === 'done') {
                                                                const isDoneDate = new Date(t.updatedAt).toLocaleDateString() === archiveDate.toLocaleDateString();
                                                                return (t.status === 'done' || t.status === 'rejected') && (!searchQuery ? isDoneDate : true);
                                                            }
                                                            return false;
                                                        });

                                                        return (
                                                            <div key={col.id} className={`flex-1 min-w-[300px] shrink-0 flex flex-col bg-zinc-900/20 rounded-xl border border-white/5 h-[800px] xl:h-full transition-all duration-300`}>
                                                                {/* Column Header */}
                                                                <div className={`p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10 rounded-t-xl border-t-2 ${col.color}`}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-display font-black text-sm text-zinc-300 uppercase tracking-widest">{col.label}</span>
                                                                        <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                                                            {colTasks.length}
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
                                                                    {colTasks.length === 0 ? (
                                                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3 opacity-50 select-none">
                                                                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                                                                {col.id === 'todo' ? <List size={24} /> :
                                                                                    col.id === 'in_progress' ? <Zap size={24} /> :
                                                                                        <CheckCircle size={24} />}
                                                                            </div>
                                                                            <span className="text-xs font-bold uppercase tracking-widest">No Tasks</span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {/* 1. Normal (Non-Rejected) Tasks */}
                                                                            {colTasks
                                                                                .filter(t => t.status !== 'rejected')
                                                                                .sort(sortTasksFn)
                                                                                .map(task => {
                                                                                    // --- VISUAL DESIGN ---
                                                                                    let cardStyle = 'bg-[#09090b] border-zinc-800/50 hover:border-zinc-700 transition-all';
                                                                                    if (task.priority === 'P1' && task.status !== 'done' && task.status !== 'rejected') {
                                                                                        cardStyle += ' shadow-[0_0_15px_-5px_rgba(239,68,68,0.15)] border-red-900/30';
                                                                                    } else if (task.priority === 'P2' && task.status !== 'done') {
                                                                                        cardStyle += ' border-orange-900/30';
                                                                                    }
                                                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                                    const isSelected = selectedTaskIds.has(task.id);
                                                                                    const isMyRequest = auth.user && task.requester === auth.user.fullName;

                                                                                    return (
                                                                                        <motion.div
                                                                                            layout
                                                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                                                            key={task.id}
                                                                                            onClick={(e: any) => {
                                                                                                if (isSelectionMode || e.ctrlKey || e.metaKey || e.shiftKey) {
                                                                                                    e.stopPropagation();
                                                                                                    if (!isSelectionMode) setIsSelectionMode(true);
                                                                                                    toggleTaskSelection(task.id);
                                                                                                } else {
                                                                                                    setSelectedTask(task);
                                                                                                }
                                                                                            }}
                                                                                            onMouseEnter={() => setHoveredTask(task)}
                                                                                            onMouseLeave={() => setHoveredTask(null)}
                                                                                            className={`relative rounded-xl border overflow-hidden cursor-pointer group hover:-translate-y-0.5 ${cardStyle} ${isSelected ? 'ring-2 ring-emerald-500 bg-zinc-800' : ''} ${isMyRequest ? 'bg-blue-500/5' : 'bg-zinc-900'} mb-3`}
                                                                                            style={{
                                                                                                borderColor: isMyRequest ? undefined : (isSelected ? undefined : 'rgba(255,255,255,0.05)')
                                                                                            }}
                                                                                        >
                                                                                            <ShortcutHints task={task} />
                                                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] z-10" style={{ backgroundColor: groupColorHsl }} />
                                                                                            <div className="p-3 pl-5 flex flex-col gap-3">
                                                                                                <div className="flex justify-between items-start gap-2">
                                                                                                    <div className="flex flex-col min-w-0">
                                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                                            <span className="text-zinc-500 font-mono font-black text-[10px] opacity-70 tracking-tighter">#{task.id}</span>
                                                                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[4px] text-zinc-900 border border-black/10 shadow-sm" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                                                                        </div>
                                                                                                        <h3 className="text-sm font-display font-black text-zinc-200 leading-tight group-hover:text-emerald-400 transition-colors">{task.title}</h3>
                                                                                                        <span className="text-[10px] text-zinc-500 mt-1">
                                                                                                            Requested by <span className="text-zinc-400 font-bold">{isMyRequest ? 'You' : task.requester}</span>
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    {task.imageUrl && (
                                                                                                        <div className="w-10 h-10 rounded bg-zinc-800 border border-white/10 overflow-hidden shrink-0 shadow-lg">
                                                                                                            <img src={task.imageUrl} alt="img" className="w-full h-full object-cover" />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                <div className="flex items-center justify-between mt-1">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10" style={{ backgroundColor: task.owner === 'Unknown' ? '#27272a' : groupColorHsl }}>
                                                                                                            {task.owner ? task.owner[0] : '?'}
                                                                                                        </div>
                                                                                                        <span className={`text-[10px] font-black uppercase tracking-tight ${task.status === 'done' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                                                                                            {task.owner === 'Unknown' ? 'Pool' : task.owner}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <TaskTimerWidget
                                                                                                        status={task.status}
                                                                                                        createdAt={task.createdAt}
                                                                                                        startedAt={task.startedAt}
                                                                                                        completedAt={task.completedAt}
                                                                                                        className="scale-75 origin-right"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    );
                                                                                })}

                                                                            {/* 2. Divider & Rejected Header */}
                                                                            {colTasks.some(t => t.status === 'rejected') && (
                                                                                <div className="py-4 space-y-4">
                                                                                    <div className="h-px bg-white/10 w-full" />
                                                                                    <div className="mx-1 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                                                                        <AlertCircle size={14} className="text-red-500" />
                                                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Rejected Jobs</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* 3. Rejected Tasks */}
                                                                            {colTasks
                                                                                .filter(t => t.status === 'rejected')
                                                                                .sort(sortTasksFn)
                                                                                .map(task => {
                                                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                                    return (
                                                                                        <motion.div
                                                                                            layout
                                                                                            key={task.id}
                                                                                            onClick={() => setSelectedTask(task)}
                                                                                            onMouseEnter={() => setHoveredTask(task)}
                                                                                            onMouseLeave={() => setHoveredTask(null)}
                                                                                            className="relative rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden cursor-pointer group hover:bg-red-500/10 transition-colors p-3 pl-5 mb-3"
                                                                                        >
                                                                                            <ShortcutHints task={task} />
                                                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500" />
                                                                                            <div className="flex justify-between items-center gap-2">
                                                                                                <div className="flex flex-col min-w-0">
                                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                                        <span className="text-red-500 font-mono font-black text-[10px]">#{task.id}</span>
                                                                                                        <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1 rounded uppercase">{task.dept}</span>
                                                                                                    </div>
                                                                                                    <h3 className="text-xs font-bold text-zinc-300 truncate">{task.title}</h3>
                                                                                                </div>
                                                                                                <XCircle size={14} className="text-red-500/50 group-hover:text-red-500" />
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    );
                                                                                })}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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

                                                <div className="space-y-2">
                                                    {(() => {
                                                        const sortedList = [...filteredTasks].sort(sortTasksFn);
                                                        const activeTasks = sortedList.filter(t => t.status !== 'rejected');
                                                        const rejectedTasks = sortedList.filter(t => t.status === 'rejected');

                                                        return (
                                                            <>
                                                                {/* 1. Active Tasks */}
                                                                {activeTasks.map((task, index) => {
                                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                    const isSelected = selectedTaskIds.has(task.id);
                                                                    const isMyRequest = auth.user && task.requester === auth.user.fullName;

                                                                    const handleRowClick = (e: React.MouseEvent) => {
                                                                        e.stopPropagation();
                                                                        if (e.shiftKey && lastSelectedId !== null) {
                                                                            const lastIndex = activeTasks.findIndex(t => t.id === lastSelectedId);
                                                                            if (lastIndex !== -1) {
                                                                                const start = Math.min(lastIndex, index);
                                                                                const end = Math.max(lastIndex, index);
                                                                                const rangeIds = activeTasks.slice(start, end + 1).map(t => t.id);
                                                                                const nextSet = new Set(selectedTaskIds);
                                                                                rangeIds.forEach(id => nextSet.add(id));
                                                                                setSelectedTaskIds(nextSet);
                                                                                return;
                                                                            }
                                                                        }
                                                                        if (e.ctrlKey || e.metaKey || isSelectionMode) {
                                                                            toggleTaskSelection(task.id);
                                                                            setLastSelectedId(task.id);
                                                                            return;
                                                                        }
                                                                        setSelectedTask(task);
                                                                    };

                                                                    return (
                                                                        <motion.div
                                                                            key={task.id}
                                                                            layout
                                                                            onClick={handleRowClick}
                                                                            onMouseEnter={() => setHoveredTask(task)}
                                                                            onMouseLeave={() => setHoveredTask(null)}
                                                                            className={`
                                                                    flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center px-4 py-3 rounded-lg border border-white/5 hover:bg-zinc-900/80 transition-all cursor-pointer group relative overflow-hidden
                                                                    ${isSelected ? 'ring-1 ring-emerald-500 bg-zinc-900' : ''}
                                                                    ${isMyRequest && !isSelected ? 'bg-blue-500/[0.02]' : (!isSelected ? 'bg-[#09090b]' : '')}
                                                                `}
                                                                        >
                                                                            <ShortcutHints task={task} />
                                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: groupColorHsl }} />
                                                                            <div
                                                                                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 cursor-pointer p-1"
                                                                                onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }}
                                                                            >
                                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-transparent border-zinc-700 hover:border-zinc-500 text-transparent'}`}>
                                                                                    <Check size={12} strokeWidth={4} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                                                                                </div>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-1 font-mono text-xs text-zinc-500 font-black pl-8 md:pl-8 group-hover:pl-8 transition-all tracking-tighter">#{task.id}</div>
                                                                            <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                                                                                {task.imageUrl && (
                                                                                    <div className="w-8 h-8 rounded bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                                                                                        <img src={task.imageUrl} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-sm font-display font-black text-zinc-200 truncate pr-4 tracking-tight">{task.title}</span>
                                                                                    <span className="text-[10px] text-zinc-500 truncate">
                                                                                        Requested by {isMyRequest ? <span className="text-blue-200 font-bold shadow-blue-500/20 drop-shadow-sm">You</span> : task.requester}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-2">
                                                                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-900 border border-black/10" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                                            </div>
                                                                            <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                                                                                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10" style={{ backgroundColor: task.owner === 'Unknown' ? '#27272a' : groupColorHsl }}>{task.owner ? task.owner[0] : '?'}</div>
                                                                                <span className={`text-[10px] font-black truncate uppercase tracking-tight ${task.status === 'done' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                                                    {task.status === 'done' ? `Done` : (task.owner === 'Unknown' ? 'Pool' : task.owner)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-1">
                                                                                <span className={`text-[10px] font-bold uppercase ${task.status === 'todo' ? 'text-zinc-400' : task.status === 'in_progress' ? 'text-blue-400' : 'text-emerald-400'}`}>{task.status.replace('_', ' ')}</span>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-2 text-right">
                                                                                <TaskTimerWidget
                                                                                    status={task.status}
                                                                                    createdAt={task.createdAt}
                                                                                    startedAt={task.startedAt}
                                                                                    completedAt={task.completedAt}
                                                                                    className="justify-end scale-90"
                                                                                />
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                })}

                                                                {/* 2. Divider & Rejected Header */}
                                                                {rejectedTasks.length > 0 && (
                                                                    <div className="py-8 space-y-6">
                                                                        <div className="h-px bg-white/10 w-full" />
                                                                        <div className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-2 bg-red-500 rounded-lg shadow-lg">
                                                                                    <AlertCircle size={20} className="text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Rejected Jobs Archive</h4>
                                                                                    <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">These tasks were rejected and moved to the archive</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-[10px] font-black text-red-500/50 tracking-widest px-3 py-1 border border-red-500/20 rounded-full">
                                                                                {rejectedTasks.length} TASKS
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* 3. Rejected Tasks */}
                                                                {rejectedTasks.map((task) => {
                                                                    const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                    return (
                                                                        <motion.div
                                                                            key={task.id}
                                                                            layout
                                                                            onClick={() => setSelectedTask(task)}
                                                                            className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all cursor-pointer group relative overflow-hidden"
                                                                        >
                                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500" />
                                                                            <div className="hidden md:block col-span-1 font-mono text-xs text-red-500/50 font-black pl-8">#{task.id}</div>
                                                                            <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-sm font-display font-black text-zinc-200 truncate pr-4 tracking-tight">{task.title}</span>
                                                                                    <span className="text-[10px] text-red-500/50 truncate uppercase font-bold">Rejected</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-2">
                                                                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-900 border border-black/10" style={{ backgroundColor: groupColorHsl }}>{task.dept}</span>
                                                                            </div>
                                                                            <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                                                                                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10" style={{ backgroundColor: groupColorHsl }}>{task.owner ? task.owner[0] : '?'}</div>
                                                                                <span className="text-[10px] font-black text-zinc-400 uppercase truncate">{task.owner}</span>
                                                                            </div>
                                                                            <div className="hidden md:block col-span-1 text-red-500 font-bold text-[10px] uppercase">Rejected</div>
                                                                            <div className="hidden md:block col-span-2 text-right">
                                                                                <span className="text-[10px] text-zinc-500 font-bold">{new Date(task.updatedAt).toLocaleDateString()}</span>
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            // GRID VIEW (GALLERY - SECTIONED)
                                            <div className="w-full pb-20 flex flex-col gap-8">
                                                {['todo', 'in_progress', 'done'].map(status => {
                                                    const sectionTasks = filteredTasks.filter(t => status === 'done' ? (t.status === 'done' || t.status === 'rejected') : (status === 'in_progress' ? (t.status === 'in_progress' || t.status === 'review' || t.status === 'revision') : t.status === status));
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

                                                            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                                                                {/* 1. Normal (Non-Rejected) Tasks */}
                                                                {sectionTasks
                                                                    .filter(t => t.status !== 'rejected')
                                                                    .sort(sortTasksFn)
                                                                    .map(task => {
                                                                        const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                        const isSelected = selectedTaskIds.has(task.id);
                                                                        const isMyRequest = auth.user && task.requester === auth.user.fullName;
                                                                        return (
                                                                            <motion.div
                                                                                key={task.id}
                                                                                layout
                                                                                onClick={() => {
                                                                                    if (isSelectionMode) {
                                                                                        toggleTaskSelection(task.id);
                                                                                    } else if (task.metadata?.sourceMessageId && task.metadata?.sourceChannelId) {
                                                                                        // Navigate to Chat
                                                                                        useStore.getState().chat.setActiveChannel(task.metadata.sourceChannelId);
                                                                                        setHighlightMessageId(task.metadata.sourceMessageId);
                                                                                        if (isMobile) {
                                                                                            setMobileTab('chat');
                                                                                        } else {
                                                                                            setIsChatCollapsed(false);
                                                                                        }
                                                                                    } else {
                                                                                        setSelectedTask(task);
                                                                                    }
                                                                                }}
                                                                                className={`
                                                                flex flex-col h-full rounded-2xl border overflow-hidden relative group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl
                                                                ${isSelected ? 'ring-2 ring-emerald-500' : ''}
                                                                ${isMyRequest ? 'bg-blue-500/[0.02]' : 'bg-zinc-900'}
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
                                                                                    <div className="scale-125 mt-6">
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
                                                                                <div className="p-4 flex flex-col gap-3 flex-1 bg-[#09090b] relative">
                                                                                    <div className="absolute top-0 left-0 right-0 h-[1px] opacity-20" style={{ backgroundColor: groupColorHsl }} />

                                                                                    <div className="flex flex-col gap-1 flex-1">
                                                                                        <h3 className="text-sm font-bold text-white leading-tight" title={task.title}>{task.title}</h3>
                                                                                        <span className="text-[10px] text-zinc-500">
                                                                                            Requested by <span className="text-zinc-400 font-bold">{isMyRequest ? 'You' : task.requester}</span>
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10" style={{ backgroundColor: task.owner === 'Unknown' ? '#27272a' : groupColorHsl }}>
                                                                                                {task.owner ? task.owner[0] : '?'}
                                                                                            </div>
                                                                                            <span className={`text-[10px] font-black uppercase tracking-tight ${task.status === 'done' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                                                                                {task.owner === 'Unknown' ? 'Pool' : task.owner}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className="text-[9px] text-zinc-600 font-mono font-bold">#{task.id}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )
                                                                    })}

                                                                {/* 2. Divider & Rejected Header (Full Width in Grid) */}
                                                                {status === 'done' && sectionTasks.some(t => t.status === 'rejected') && (
                                                                    <div className="col-span-full py-6 space-y-6">
                                                                        <div className="h-px bg-white/10 w-full" />
                                                                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-2 bg-red-500 rounded-lg shadow-lg shadow-red-500/20">
                                                                                    <AlertCircle size={20} className="text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Rejected Jobs Archive</h4>
                                                                                    <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">These tasks were rejected and archived</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-[10px] font-black text-red-500/50 tracking-widest px-3 py-1 border border-red-500/20 rounded-full">
                                                                                {sectionTasks.filter(t => t.status === 'rejected').length} TASKS
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* 3. Rejected Tasks */}
                                                                {status === 'done' && sectionTasks
                                                                    .filter(t => t.status === 'rejected')
                                                                    .sort(sortTasksFn)
                                                                    .map(task => {
                                                                        const groupColorHsl = generateGroupColor(task.dept || 'General', 'bg').match(/hsl\([^)]+\)/)?.[0] || '#52525b';
                                                                        return (
                                                                            <motion.div
                                                                                key={task.id}
                                                                                layout
                                                                                onClick={() => setSelectedTask(task)}
                                                                                className="flex flex-col h-48 rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden group cursor-pointer hover:bg-red-500/10 transition-all p-4 relative"
                                                                            >
                                                                                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <span className="text-red-500 font-mono font-black text-xs">#{task.id}</span>
                                                                                    <XCircle size={18} className="text-red-500/30 group-hover:text-red-500 transition-colors" />
                                                                                </div>
                                                                                <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-red-400 transition-colors">{task.title}</h3>
                                                                                <div className="mt-auto flex items-center gap-2">
                                                                                    <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded uppercase tracking-wider">{task.dept}</span>
                                                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase ml-auto">{new Date(task.updatedAt).toLocaleDateString()}</span>
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





                                    {/* USER PROFILE MODAL */}

                                    {/* USER PROFILE MODAL */}
                                    {isUserManagementOpen && (
                                        <div className="fixed inset-0 z-[120]">
                                            <UserManagementPanel
                                                onClose={() => setIsUserManagementOpen(false)}
                                                initialView={userManagementInitialView}
                                            />
                                        </div>
                                    )}


                                    {/* MATRIX / ALMANAC MODAL */}
                                    <AnimatePresence>
                                        {showMatrix && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                                            >
                                                <div className="w-full max-w-7xl h-full max-h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                                                    <AlmanacApp onClose={() => setShowMatrix(false)} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* SLIDE-OVER DETAIL_PANEL */}
                                    {
                                        (!isMobile || mobileTab === 'tasks') && (
                                            <AnimatePresence>
                                                {
                                                    selectedTask && (
                                                        <motion.div
                                                            initial={{ x: '100%', opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            exit={{ x: '100%', opacity: 0 }}
                                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                            className="w-[480px] border-l border-white/10 bg-zinc-950 absolute right-0 top-0 bottom-0 shadow-2xl z-[150] flex flex-col"
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

                                                                {/* Detail Tabs */}
                                                                <div className="flex items-center gap-4 border-b border-white/10 mb-4">
                                                                    <button
                                                                        onClick={() => setDetailTab('details')}
                                                                        className={`pb-2 text-sm font-bold border-b-2 transition-colors ${detailTab === 'details' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                                                    >
                                                                        Details
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDetailTab('revisions')}
                                                                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'revisions' ? 'border-amber-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                                                    >
                                                                        Revisions
                                                                        {(selectedTask.revisions?.length || 0) > 0 && (
                                                                            <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px]">{selectedTask.revisions?.length}</span>
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                {detailTab === 'details' ? (
                                                                    <>
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
                                                                                <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Assigned To</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 border border-white/10">
                                                                                        {selectedTask.owner && selectedTask.owner !== 'Unknown' ? selectedTask.owner[0] : '?'}
                                                                                    </div>
                                                                                    <span className={`text-sm font-medium ${selectedTask.owner && selectedTask.owner !== 'Unknown' ? 'text-white' : 'text-zinc-600 italic'}`}>
                                                                                        {selectedTask.owner && selectedTask.owner !== 'Unknown' ? selectedTask.owner : 'Unassigned'}
                                                                                    </span>
                                                                                </div>
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

                                                                    </>
                                                                ) : (
                                                                    <div className="space-y-6">
                                                                        {/* Revisions Timeline */}
                                                                        {(!selectedTask.revisions || selectedTask.revisions.length === 0) ? (
                                                                            <div className="text-center py-10 opacity-50">
                                                                                <Layers size={48} className="mx-auto mb-3 text-zinc-600" />
                                                                                <p className="text-sm font-bold text-zinc-500">No revisions found.</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="relative border-l border-white/10 ml-3 pl-6 space-y-8 py-2">
                                                                                {[...selectedTask.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber).map((rev) => (
                                                                                    <div key={rev.id} className="relative">
                                                                                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500 flex items-center justify-center">
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                                        </div>
                                                                                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider">Revision v{rev.revisionNumber}</h4>
                                                                                                <span className="text-[10px] font-mono text-zinc-500">{new Date(rev.created_at || rev.createdAt).toLocaleDateString()}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${rev.severity === 'critical' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                                                                                    rev.severity === 'high' ? 'bg-orange-500/10 border-orange-500 text-orange-500' :
                                                                                                        'bg-zinc-800 border-white/10 text-zinc-400'
                                                                                                    }`}>{rev.severity}</span>
                                                                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-zinc-800 border-white/10 text-zinc-400">{rev.type}</span>
                                                                                            </div>
                                                                                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{rev.description}</p>
                                                                                            {rev.attachmentUrl && (
                                                                                                <a href={rev.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300">
                                                                                                    <LogOut size={10} /> View Attachment
                                                                                                </a>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
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
                                                                            className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group transition-all"
                                                                            title="Shortcut: S"
                                                                        >
                                                                            <Play size={16} />
                                                                            <span>Start Job</span>
                                                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-indigo-200 border border-indigo-400/30 opacity-60 group-hover:opacity-100 transition-opacity uppercase font-mono">S</span>
                                                                        </button>
                                                                    )}

                                                                    {selectedTask.status === 'in_progress' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleStatusUpdate(selectedTask.id, 'done')}
                                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group transition-all"
                                                                                title="Shortcut: D"
                                                                            >
                                                                                <CheckCircle2 size={16} />
                                                                                <span>Complete</span>
                                                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-emerald-200 border border-emerald-400/30 opacity-60 group-hover:opacity-100 transition-opacity uppercase font-mono">D</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleStatusUpdate(selectedTask.id, 'blocked')}
                                                                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all"
                                                                            >
                                                                                <AlertOctagon size={16} /> Block
                                                                            </button>
                                                                        </>
                                                                    )}

                                                                    <button
                                                                        onClick={() => handleStatusUpdate(selectedTask.id, 'todo')}
                                                                        className="col-span-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 group transition-all"
                                                                        title="Shortcut: Q"
                                                                    >
                                                                        <RefreshCw size={16} />
                                                                        <span>Re-Queue</span>
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-zinc-300 border border-zinc-500/30 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono">Q</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={handleAskQuestion}
                                                                        className="col-span-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 group transition-all"
                                                                        title="Shortcut: A (Requires comment)"
                                                                    >
                                                                        <MessageSquare size={16} />
                                                                        <span>Ask</span>
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-sky-200 border border-sky-400/30 opacity-60 group-hover:opacity-100 transition-opacity uppercase font-mono">A</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => setQuickAction({ taskId: selectedTask.id, type: 'revision', content: '' })}
                                                                        className="col-span-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                                                                    >
                                                                        <RotateCcw size={16} /> Request Revision
                                                                    </button>

                                                                    {selectedTask.status !== 'rejected' && (
                                                                        <button
                                                                            onClick={() => handleStatusUpdate(selectedTask.id, 'rejected')}
                                                                            className="col-span-2 mt-2 border border-red-900/50 text-red-500 font-bold py-2 rounded-lg hover:bg-red-900/20 flex items-center justify-center gap-2 group transition-all"
                                                                            title="Shortcut: R"
                                                                        >
                                                                            <XCircle size={16} />
                                                                            <span>Reject Task</span>
                                                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] text-red-400 border border-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono">R</span>
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
                                            </AnimatePresence>
                                        )
                                    }

                                    {/* LIVE TICKER (Global) */}
                                    <LiveTicker tasks={tasks} />

                                    <LiveStatusModal
                                        isOpen={isLiveStatusOpen}
                                        onClose={() => setIsLiveStatusOpen(false)}
                                        tasks={tasks}
                                    />

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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* CHAT PANEL (Desktop: Left of Dashboard | Mobile: Overlay) */}
                    <div className={`flex flex-col h-full bg-[#0b141a] transition-all duration-300 ease-in-out border-r border-white/5
                    ${chat.activeChannelId
                            ? 'absolute inset-0 z-[60] w-full lg:static lg:order-first lg:w-[450px] lg:opacity-100 lg:translate-x-0'
                            : 'w-0 opacity-0 overflow-hidden border-r-0 lg:w-0'}
                `}>
                        {chat.activeChannelId && (
                            <ChatInterface
                                notificationStats={channelStats}
                                pendingMessage={chatPendingMessage}
                                isChatOnly={true} // Hides Sidebar
                                onMessageConsumed={() => setChatPendingMessage(null)}
                                onUnreadChange={(total, counts, mentions) => {
                                    setTotalUnread(total);
                                    setUnreadCounts(counts);
                                    setMentionCounts(mentions);
                                }}
                                onCreateGroup={(view = 'groups_root') => {
                                    setUserManagementInitialView(view);
                                    setIsUserManagementOpen(true);
                                }}
                                onDiscoveryClick={(tab: 'groups' | 'people' | undefined) => {
                                    setDiscoveryTab(tab || 'groups');
                                    setIsDiscoveryOpen(true);
                                }}
                                onMemberClick={(member) => setSelectedMember(member)}
                                taskStatusMap={taskStatusMap}
                                highlightMessageId={highlightMessageId}
                                tasks={tasks}
                            />
                        )}
                    </div>
                </div>
            </div >

            {/* GLOBAL MODALS (Rendered at End for Stacking Context) */}
            <AnimatePresence>
                {
                    lightboxUrl && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setLightboxUrl(null)}
                            className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm cursor-pointer"
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
                    )
                }
            </AnimatePresence >

            <LoginModal />

            <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentUser={auth.user}
                onUpdate={() => {
                    api.get('/auth/me').then(res => auth.setUser(res.data));
                }}
            />

            {/* Member Profile Modal (View Only + DM) */}
            <MemberProfileModal
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
                member={selectedMember}
                currentUserId={auth.user?.id}
                onDmCreated={(channelId) => {
                    chat.setActiveChannel(channelId);
                }}
            />

            {/* DAILY REPORT MODAL */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
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

            {/* Discovery Modal */}
            <GroupDiscoveryModal
                isOpen={isDiscoveryOpen}
                initialTab={discoveryTab}
                onClose={() => setIsDiscoveryOpen(false)}
                onJoined={(channelId: number | undefined) => {
                    chat.refreshChannels(); // Force sidebar sync (stable)
                    if (channelId) {
                        chat.setActiveChannel(channelId); // Stable
                    }
                }}
            />

            {/* Revision Modal */}
            <RevisionRequestModal
                isOpen={quickAction?.type === 'revision'}
                onClose={() => setQuickAction(null)}
                onSubmit={async (data) => {
                    if (!quickAction?.taskId) return;
                    try {
                        const response = await api.post(`/tasks/${quickAction.taskId}/request-revision`, data);
                        setQuickAction(null);

                        // Update UI immediately
                        if (selectedTask && selectedTask.id === quickAction.taskId) {
                            setSelectedTask(response.data);
                            setDetailTab('revisions');
                        }

                        loadTasks(); // Refresh
                    } catch (error) {
                        console.error('Failed to request revision', error);
                        alert("Failed to request revision");
                    }
                }}
                taskTitle={tasks.find(t => t.id === quickAction?.taskId)?.title || ''}
            />
        </>
    );
}
