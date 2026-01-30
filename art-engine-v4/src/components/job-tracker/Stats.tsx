import React, { useMemo, useState, useEffect } from 'react';
import { Clock, TrendingUp, Calendar, Zap, CheckCircle2, AlertCircle, X, ArrowRight, Brain, History, ChevronDown, ListFilter, Info, Monitor, Activity } from 'lucide-react';
import { StockBoard } from './StockBoard';
import { motion, AnimatePresence } from 'framer-motion';
import { getBaseUrl } from '@/lib/config';

interface StatsProps {
    tasks: any[];
}

export default function Stats({ tasks }: StatsProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [statsHistory, setStatsHistory] = useState<any[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'health'>('overview');
    const [analysisRange, setAnalysisRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
    const [rangeOpen, setRangeOpen] = useState(false);

    // EFFICIENCY STATS
    const [efficiency, setEfficiency] = useState<any>(null);
    const [loadingEfficiency, setLoadingEfficiency] = useState(false);

    useEffect(() => {
        fetchHistory();
        fetchEfficiency();
    }, []);

    const fetchEfficiency = async () => {
        setLoadingEfficiency(true);
        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(`${getBaseUrl()}/tasks/stats/efficiency`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEfficiency(data);
            }
        } catch (err) {
            console.error("Failed to fetch efficiency stats:", err);
        } finally {
            setLoadingEfficiency(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('jwt');
            // Fetch AI Stats History
            const res = await fetch(`${getBaseUrl()}/ai/stats-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatsHistory(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateAiSummary = async () => {
        setLoadingAi(true);
        setAiSummary(null);
        try {
            const token = localStorage.getItem('jwt');
            const res = await fetch(`${getBaseUrl()}/ai/stats-summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dailyStats,
                    dailyWorkHours,
                    hourlyActivity,
                    statusData,
                    avgCompletionTime,
                    totalScore,
                    range: analysisRange
                })
            });
            if (res.ok) {
                const data = await res.json();
                setAiSummary(data.content);
                fetchHistory(); // Refresh history
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAi(false);
        }
    };

    // 1. Task Completion Stats (Daily Count)
    const dailyStats = useMemo(() => {
        const stats: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.status === 'done' && t.completedAt) {
                const date = new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                stats[date] = (stats[date] || 0) + 1;
            }
        });
        return Object.entries(stats).map(([date, count]) => ({ date, count })).slice(-7);
    }, [tasks]);

    // 2. Daily Working Hours
    const dailyWorkHours = useMemo(() => {
        const stats: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.status === 'done' && t.completedAt && t.startedAt) {
                const date = new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const start = new Date(t.startedAt).getTime();
                const end = new Date(t.completedAt).getTime();
                const hours = (end - start) / (1000 * 60 * 60);
                stats[date] = (stats[date] || 0) + hours;
            }
        });
        return Object.entries(stats).map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(1)) })).slice(-7);
    }, [tasks]);

    // 3. Hourly Activity
    const hourlyActivity = useMemo(() => {
        const hours = Array(24).fill(0);
        tasks.forEach(t => {
            if (t.completedAt) {
                const h = new Date(t.completedAt).getHours();
                hours[h]++;
            }
            if (t.startedAt) {
                const h = new Date(t.startedAt).getHours();
                hours[h]++;
            }
        });
        return hours.map((count, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            count
        }));
    }, [tasks]);

    // 4. Status Distribution
    const statusData = useMemo(() => {
        const counts = { todo: 0, in_progress: 0, done: 0, review: 0 };
        tasks.forEach(t => {
            if (t.status in counts) counts[t.status as keyof typeof counts]++;
        });
        return [
            { name: 'To Do', value: counts.todo, color: '#71717a' },
            { name: 'In Progress', value: counts.in_progress, color: '#6366f1' },
            { name: 'Review', value: counts.review, color: '#8b5cf6' },
            { name: 'Done', value: counts.done, color: '#10b981' }
        ];
    }, [tasks]);

    // 5. Aggregate Metrics
    const avgCompletionTime = useMemo(() => {
        const completed = tasks.filter(t => t.status === 'done' && t.completedAt && t.startedAt);
        if (completed.length === 0) return 0;

        const totalHours = completed.reduce((acc, t) => {
            const start = new Date(t.startedAt!).getTime();
            const end = new Date(t.completedAt!).getTime();
            return acc + ((end - start) / (1000 * 60 * 60));
        }, 0);

        return (totalHours / completed.length).toFixed(1);
    }, [tasks]);

    const totalScore = useMemo(() => {
        return tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.score || 0), 0);
    }, [tasks]);

    // 6. Selected Date Details
    const selectedDateDetails = useMemo(() => {
        if (!selectedDate) return null;

        // Filter tasks that match the selected date (Completed At)
        const dayTasks = tasks.filter(t => {
            if (!t.completedAt) return false;
            const d = new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return d === selectedDate;
        });

        // Calculate metrics for this specific day
        const dayCount = dayTasks.length;
        const dayScore = dayTasks.reduce((acc, t) => acc + (t.score || 0), 0);
        const dayHours = dayTasks.reduce((acc, t) => {
            if (t.startedAt && t.completedAt) {
                const s = new Date(t.startedAt).getTime();
                const e = new Date(t.completedAt).getTime();
                return acc + (e - s);
            }
            return acc;
        }, 0) / (1000 * 60 * 60);

        return {
            date: selectedDate,
            count: dayCount,
            score: dayScore,
            hours: dayHours.toFixed(1),
            tasks: dayTasks.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        };
    }, [selectedDate, tasks]);

    // 7. Stats for Live Ticker & Header (Last 30 Days Scope)
    const { dailyAvgCompleted, dailyAvgScore, dailyAvgHours, tickerSlides } = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTasks = tasks.filter(t =>
            t.status === 'done' &&
            t.completedAt &&
            new Date(t.completedAt) > thirtyDaysAgo
        );

        // Averages
        const avgCompleted = (recentTasks.length / 30).toFixed(1);
        const totalRecentScore = recentTasks.reduce((acc, t) => acc + (t.score || 0), 0);
        const avgScore = (totalRecentScore / 30).toFixed(0);

        const totalRecentHours = recentTasks.reduce((acc, t) => {
            const s = new Date(t.startedAt!).getTime();
            const e = new Date(t.completedAt!).getTime();
            return acc + (e - s);
        }, 0) / (1000 * 60 * 60);
        const avgHours = (totalRecentHours / 30).toFixed(1);

        // Ticker Slides Data
        const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const todaysTasks = tasks.filter(t =>
            t.status === 'done' &&
            t.completedAt &&
            new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === todayStr
        );

        // 1. Today's Summary
        const todayScore = todaysTasks.reduce((acc, t) => acc + (t.score || 0), 0);
        const slideSummary = {
            id: 'summary',
            icon: <Calendar size={16} className="text-blue-400" />,
            label: "TODAY'S OUTPUT",
            text: `${todaysTasks.length} Tasks Completed • ${todayScore} XP Earned`
        };

        // 2. Top Performer (Mocking Owner for now if missing, defaulting to 'Team')
        const performerMap: Record<string, number> = {};
        todaysTasks.forEach(t => {
            const name = t.owner?.fullName || t.owner?.username || t.owner?.email || 'Unassigned'; // Assuming owner relation exists or fallback
            performerMap[name] = (performerMap[name] || 0) + (t.score || 0);
        });
        const topPerformerEntry = Object.entries(performerMap).sort((a, b) => b[1] - a[1])[0];
        const slidePerformer = topPerformerEntry ? {
            id: 'performer',
            icon: <Zap size={16} className="text-amber-400" />,
            label: "TOP PERFORMER",
            text: `${topPerformerEntry[0]} is leading with ${topPerformerEntry[1]} XP!`
        } : {
            id: 'performer',
            icon: <Zap size={16} className="text-zinc-600" />,
            label: "TOP PERFORMER",
            text: "No activity yet today. Be the first!"
        };

        // 3. Latest Activity
        const sortedRecent = [...recentTasks].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        const latest = sortedRecent[0];
        const slideLatest = latest ? {
            id: 'latest',
            icon: <CheckCircle2 size={16} className="text-emerald-400" />,
            label: "LATEST COMPLETION",
            text: `${latest.title} (+${latest.score} XP)`
        } : null;

        // 4. Efficiency Slides
        let efficiencySlides: any[] = [];
        if (efficiency) {
            efficiencySlides = [
                {
                    id: 'wait',
                    icon: <History size={16} className="text-orange-400" />,
                    label: "AVG WAIT TIME",
                    text: `${efficiency.avgWaitTime} m(Creation ➔ Start)`
                },
                {
                    id: 'cycle',
                    icon: <Zap size={16} className="text-cyan-400" />,
                    label: "AVG CYCLE TIME",
                    text: `${efficiency.avgCycleTime} m(Start ➔ Done)`
                },
                {
                    id: 'velocity',
                    icon: <TrendingUp size={16} className="text-pink-400" />,
                    label: "WEEKLY VELOCITY",
                    text: `${efficiency.avgVelocity} Tasks / Day`
                }
            ];
        }

        return {
            dailyAvgCompleted: avgCompleted,
            dailyAvgScore: avgScore,
            dailyAvgHours: avgHours,
            tickerSlides: [slideSummary, slidePerformer, slideLatest, ...efficiencySlides].filter(Boolean)
        };
    }, [tasks, efficiency]);

    // EFFICIENCY STATS
    // EFFICIENCY STATS (Moved up)


    // Ticker State
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [showStockBoard, setShowStockBoard] = useState(false);
    const slidesRef = React.useRef(tickerSlides);

    // Debug: Log when tasks update
    useEffect(() => {
        console.log(`[Stats Render] Tasks updated.Count: ${tasks.length} `);
    }, [tasks]);

    // Keep ref updated
    useEffect(() => {
        slidesRef.current = tickerSlides;
    }, [tickerSlides]);

    // Independent Timer
    useEffect(() => {
        const interval = setInterval(() => {
            if (slidesRef.current && slidesRef.current.length > 0) {
                setCurrentSlideIndex((prev) => (prev + 1) % slidesRef.current.length);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []); // Empty dependency = never resets!

    // FLASH NEWS SYSTEM
    const [flashMessage, setFlashMessage] = useState<any>(null);
    const lastProcessedTaskRef = React.useRef<string | null>(null);

    useEffect(() => {
        if (!tasks || tasks.length === 0) return;

        // Find the absolute latest completed task
        const sortedCompleted = [...tasks]
            .filter(t => t.status === 'done' && t.completedAt)
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        const latest = sortedCompleted[0];

        if (!latest) return;

        // Check freshness
        const diff = new Date().getTime() - new Date(latest.completedAt).getTime();
        const isRecent = diff < 15000; // Increased to 15s window

        // Debug
        console.log(`[Flash Check]Latest: ${latest.title}, Diff: ${diff} ms, Ref: ${lastProcessedTaskRef.current} `);

        // Initialize ref on first load
        if (!lastProcessedTaskRef.current) {
            // Even on init, if it's very recent (e.g. user just switched tabs after completing), show it!
            if (isRecent) {
                console.log("[Flash] Triggering on INIT because it's recent!");
                triggerFlash(latest);
            }
            lastProcessedTaskRef.current = latest.id;
            return;
        }

        // Detect NEW completion during active view
        if (latest.id !== lastProcessedTaskRef.current) {
            console.log(`[Flash] New completion detected! ID: ${latest.id}, Recent: ${isRecent} `);

            if (isRecent) {
                triggerFlash(latest);
            } else {
                console.log("[Flash] Ignored because too old.");
            }

            lastProcessedTaskRef.current = latest.id;
        }
    }, [tasks]);

    const triggerFlash = (task: any) => {
        setFlashMessage({
            id: `flash - ${Date.now()} `,
            icon: <AlertCircle size={16} className="text-white animate-pulse" />,
            label: "BREAKING NEWS",
            text: `TASK COMPLETED: ${task.title} (+${task.score} XP)`,
            type: 'flash'
        });
        setTimeout(() => setFlashMessage(null), 8000);
    };


    return (
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto h-full bg-zinc-950/50 pb-20 font-sans">

            {/* TABS HEADER */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'overview'
                        ? 'bg-zinc-100 text-black shadow-lg scale-105'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                    <Monitor size={16} />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('health')}
                    className={`text-sm font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'health'
                        ? 'bg-zinc-100 text-black shadow-lg scale-105'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                    <Activity size={16} />
                    Team Health
                </button>
            </div>

            {loadingEfficiency && (
                <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-white animate-spin" />
                    <p className="text-zinc-500 text-sm font-medium animate-pulse">Gathering stats...</p>
                </div>
            )}

            {/* OVERVIEW CONTENT */}
            {!loadingEfficiency && activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header Metrics (Daily Averages) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 relative overflow-visible group cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Daily Completion</div>
                                Average tasks finished per day. (Last 30 Days)
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-bold border border-white/5 px-1.5 py-0.5 rounded">30d Avg</div>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase">Daily Tasks</p>
                                <p className="text-2xl font-bold text-white">{dailyAvgCompleted}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 relative overflow-visible group cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Daily Performance</div>
                                Average XP earned per day. (Last 30 Days)
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-bold border border-white/5 px-1.5 py-0.5 rounded">30d Avg</div>
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase">Daily XP</p>
                                <p className="text-2xl font-bold text-white">{dailyAvgScore}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 relative overflow-visible group cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Daily Workload</div>
                                Average hours logged per day. (Last 30 Days)
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-bold border border-white/5 px-1.5 py-0.5 rounded">30d Avg</div>
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase">Daily Hours</p>
                                <p className="text-2xl font-bold text-white">{dailyAvgHours}h</p>
                            </div>
                        </div>

                        {/* Active (Live) - No Avg needed here */}
                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 group relative overflow-visible cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Live Count</div>
                                Total tasks currently in "In Progress" status.
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase">Live Active</p>
                                <p className="text-2xl font-bold text-white">{tasks.filter(t => t.status === 'in_progress').length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEALTH TAB CONTENT */}
            {!loadingEfficiency && activeTab === 'health' && efficiency && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* WORKLOAD MATRIX TABLE */}
                        <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Activity size={18} className="text-purple-400" />
                                    Workload Matrix
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-400">
                                    <thead className="bg-zinc-950/50 text-xs uppercase font-bold text-zinc-500">
                                        <tr>
                                            <th className="px-4 py-3">Team Member</th>
                                            <th className="px-4 py-3 text-right">Active Tasks</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {efficiency.userWorkload.map((user: any, i: number) => (
                                            <tr key={user.name} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    {user.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                                                    {user.count}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.count > 5 ? 'bg-red-500/10 text-red-400' :
                                                        user.count > 2 ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-emerald-500/10 text-emerald-400'
                                                        }`}>
                                                        {user.count > 5 ? 'Overload' : user.count > 2 ? 'Busy' : 'Available'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {efficiency.userWorkload.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-zinc-600">No active workload data.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* STALE TASKS LIST (Table View) */}
                        <div className="bg-zinc-900 border border-red-900/20 rounded-xl overflow-hidden relative">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between relative z-10">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertCircle size={18} className="text-red-500" />
                                    Stale Tasks (Red Zone)
                                </h3>
                            </div>
                            <div className="overflow-x-auto relative z-10">
                                <table className="w-full text-left text-sm text-zinc-400">
                                    <thead className="bg-zinc-950/50 text-xs uppercase font-bold text-zinc-500">
                                        <tr>
                                            <th className="px-4 py-3">Task</th>
                                            <th className="px-4 py-3">Owner</th>
                                            <th className="px-4 py-3 text-right">Wait Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {efficiency.staleTasks && efficiency.staleTasks.length > 0 ? (
                                            efficiency.staleTasks.map((t: any) => (
                                                <tr key={t.id} className="hover:bg-red-500/5 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-zinc-200 truncate max-w-[150px]">{t.title}</span>
                                                            <span className="text-[10px] font-mono text-zinc-500">#{t.id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">{t.owner}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-red-400 font-bold">
                                                        {t.days} <span className="text-[10px] font-sans font-normal text-zinc-600">days</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-zinc-600">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <CheckCircle2 size={24} className="text-emerald-500/20" />
                                                        <span>Clean slate! No stale tasks.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERVIEW CONTENT (Continued) */}
            {activeTab === 'overview' && efficiency && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* ... Existing Efficiency Cards ... */}
                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 group relative cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Wait Time</div>
                                Time from creation to start. (Creation ➔ In Progress)
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <History size={24} />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Avg Wait Time</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-white">{efficiency.avgWaitTime}m</p>
                                    <span className="text-[10px] text-zinc-600">to start</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 group relative cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Cycle Time</div>
                                Actual working time. (In Progress ➔ Done)
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                                <Zap size={24} />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Avg Cycle Time</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-white">{efficiency.avgCycleTime}m</p>
                                    <span className="text-[10px] text-zinc-600">to finish</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-4 group relative cursor-help transition-colors hover:bg-zinc-900/80">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 bg-black border border-white/10 rounded-lg text-xs w-48 text-center hidden group-hover:block z-50 text-zinc-300 shadow-xl pointer-events-none">
                                <div className="text-white font-bold mb-0.5">Velocity</div>
                                Avg tasks completed daily over last 7 days.
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/10 rotate-45"></div>
                            </div>

                            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Weekly Velocity</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-white">{efficiency.avgVelocity}</p>
                                    <span className="text-[10px] text-zinc-600">tasks/day</span>
                                </div>
                            </div>
                        </div>

                        {/* Department Breakdown Mini-List */}
                        <div className="bg-zinc-900 border border-white/5 p-3 rounded-xl flex flex-col justify-center gap-2 overflow-hidden">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Slowest Depts (Cycle)</p>
                            <div className="flex flex-col gap-1.5">
                                {efficiency.departmentBreakdown
                                    .sort((a: any, b: any) => b.avgCycle - a.avgCycle)
                                    .slice(0, 2)
                                    .map((d: any) => (
                                        <div key={d.name} className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 truncate w-20">{d.name}</span>
                                            <div className="flex items-center gap-1">
                                                <div className="h-1.5 bg-red-500/30 rounded-full w-12 overflow-hidden">
                                                    <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (d.avgCycle / 200) * 100)}% ` }} />
                                                </div>
                                                <span className="text-zinc-500 w-8 text-right">{d.avgCycle}m</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* DAILY PERFORMANCE REPORT (TABLE) */}
                    <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ListFilter size={18} className="text-blue-400" />
                                Daily Performance Report
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-400">
                                <thead className="bg-zinc-950/50 text-xs uppercase font-bold text-zinc-500">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Tasks Completed</th>
                                        <th className="px-4 py-3 text-right">Work Hours</th>
                                        <th className="px-4 py-3 text-right">Productivity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dailyStats.map((stat: any, i: number) => {
                                        const workHours = dailyWorkHours.find((h: any) => h.date === stat.date)?.hours || 0;
                                        const tasksPerHour = workHours > 0 ? (stat.count / workHours).toFixed(1) : 0;

                                        return (
                                            <tr key={stat.date} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-mono text-zinc-300">{stat.date}</td>
                                                <td className="px-4 py-3 text-right text-white font-bold">{stat.count}</td>
                                                <td className="px-4 py-3 text-right font-mono">{typeof workHours === 'number' ? workHours.toFixed(1) : workHours}h</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-zinc-500 text-xs">{tasksPerHour} task/hr</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {dailyStats.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">No activity in the last 7 days.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE NEWS TICKER (Moved to Global Layout) */}
            <div className="w-full h-1 bg-red-900/10"></div>

            {/* DAILY SUMMARY PANEL (Appears when date selected) */}
            <AnimatePresence>
                {selectedDateDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Calendar size={24} className="text-emerald-500" />
                                        Summary for {selectedDateDetails.date}
                                    </h3>
                                    <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                                        {selectedDateDetails.count} Tasks Completed
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                                {/* METRICS */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-zinc-950/50 rounded-xl border border-white/5 flex flex-col gap-1">
                                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Total Work Duration</span>
                                        <span className="text-3xl font-mono font-bold text-white">{selectedDateDetails.hours}h</span>
                                    </div>
                                    <div className="p-4 bg-zinc-950/50 rounded-xl border border-white/5 flex flex-col gap-1">
                                        <span className="text-zinc-500 text-[10px] uppercase font-bold">XP Earned</span>
                                        <span className="text-3xl font-mono font-bold text-amber-500">{selectedDateDetails.score} XP</span>
                                    </div>
                                </div>

                                {/* TASK LIST */}
                                <div className="lg:col-span-2 bg-zinc-950/30 rounded-xl border border-white/5 overflow-hidden flex flex-col max-h-[300px]">
                                    <div className="p-3 border-b border-white/5 bg-white/5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        Tasks Completed
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {selectedDateDetails.tasks.map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w - 2 h - 2 rounded - full ${t.priority === 'P1' ? 'bg-red-500' : t.priority === 'P2' ? 'bg-orange-500' : 'bg-blue-500'} `} />
                                                    <span className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{t.title}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-zinc-500 font-mono">
                                                        {new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {t.startedAt && t.completedAt && (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-zinc-400">
                                                                {(() => {
                                                                    const diff = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
                                                                    const hours = Math.floor(diff / (1000 * 60 * 60));
                                                                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                    return `${hours}h ${mins} m`;
                                                                })()}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-bold text-emerald-500 flex items-center gap-1">
                                                        +{t.score} XP
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI SUMMARY SECTION */}
            <div className="bg-zinc-900 border border-purple-500/20 p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="text-purple-400" size={24} />
                        AI Executive Summary
                    </h3>

                    <div className="flex items-center gap-4">
                        {/* Range Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setRangeOpen(!rangeOpen)}
                                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-950/50 px-3 py-2 rounded-lg border border-white/5 transition-colors"
                            >
                                <ListFilter size={14} />
                                {analysisRange}
                                <ChevronDown size={12} />
                            </button>

                            <AnimatePresence>
                                {rangeOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
                                    >
                                        <div className="p-1 space-y-1">
                                            {['Daily', 'Weekly', 'Monthly'].map((range) => (
                                                <button
                                                    key={range}
                                                    onClick={() => {
                                                        setAnalysisRange(range as any);
                                                        setRangeOpen(false);
                                                    }}
                                                    className={`w - full text - left px - 3 py - 2 text - xs rounded - lg transition - colors ${analysisRange === range ? 'bg-purple-500/20 text-purple-200' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                        } `}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* History Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setHistoryOpen(!historyOpen)}
                                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-950/50 px-3 py-2 rounded-lg border border-white/5 transition-colors"
                            >
                                <History size={14} />
                                History
                                <ChevronDown size={12} />
                            </button>

                            <AnimatePresence>
                                {historyOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 max-h-64 overflow-y-auto"
                                    >
                                        <div className="p-2 space-y-1">
                                            {statsHistory.map((h: any) => (
                                                <button
                                                    key={h.id}
                                                    onClick={() => {
                                                        setAiSummary(h.content);
                                                        setHistoryOpen(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex flex-col gap-1"
                                                >
                                                    <span className="font-bold text-zinc-200">Analysis #{h.id}</span>
                                                    <span className="text-[10px] opacity-50">{new Date(h.createdAt).toLocaleString()}</span>
                                                </button>
                                            ))}
                                            {statsHistory.length === 0 && (
                                                <div className="px-3 py-4 text-center text-xs text-zinc-600">No history yet</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={generateAiSummary}
                            disabled={loadingAi}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)]"
                        >
                            {loadingAi ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing Data...
                                </>
                            ) : (
                                <>
                                    <Zap size={14} fill="currentColor" />
                                    Generate New Analysis
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {aiSummary ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="prose prose-invert prose-sm max-w-none bg-zinc-950/30 p-6 rounded-xl border border-white/5"
                        >
                            <div className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">
                                {aiSummary}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-4"
                        >
                            <Brain size={48} className="text-zinc-800" />
                            <p className="text-sm">Click "Generate New Analysis" to get AI-driven insights about your productivity.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


        </div >
    );
}
