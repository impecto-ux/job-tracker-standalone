import React, { useMemo, useState, useEffect } from 'react';
import {
    Clock, TrendingUp, Calendar, Zap, CheckCircle2, AlertCircle, X,
    ArrowRight, Brain, History, ChevronDown, ListFilter, Info,
    Monitor, Activity, Filter, Users, Tag, Target, ChevronRight,
    CornerDownRight, BarChart3, PieChart as PieChartIcon, LayoutDashboard,
    Flame, Award, Briefcase, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { getBaseUrl } from '@/lib/config';
import api from '@/lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { StatsDrawer } from './StatsDrawer';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface StatsProps {
    tasks: any[];
}

export default function Stats({ tasks }: StatsProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [selectedDetailTask, setSelectedDetailTask] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Filters
    const [filters, setFilters] = useState<any>({
        range: '7d',
        departmentId: null,
        ownerId: null,
        priority: null
    });

    const [availableFilters, setAvailableFilters] = useState({
        departments: [] as any[],
        users: [] as any[]
    });

    useEffect(() => {
        fetchMetadata();
        fetchStats();
    }, [filters]);

    const fetchMetadata = async () => {
        try {
            const [deptsRes, usersRes] = await Promise.all([
                api.get('/departments'),
                api.get('/users')
            ]);

            setAvailableFilters({
                departments: deptsRes.data,
                users: usersRes.data
            });
        } catch (err) {
            console.error("Failed to fetch filter metadata:", err);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const queryParams: any = {};
            if (filters.range) queryParams.range = filters.range;
            if (filters.departmentId) queryParams.departmentId = filters.departmentId;
            if (filters.ownerId) queryParams.ownerId = filters.ownerId;
            if (filters.priority) queryParams.priority = filters.priority;

            const res = await api.get('/tasks/stats/advanced', { params: queryParams });
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch advanced stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: any) => {
        setSelectedDetailTask(task);
        setDrawerOpen(true);
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 bg-zinc-950">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
                <p className="text-zinc-500 text-xs font-black tracking-[0.3em] uppercase animate-pulse">Initializing Nexus Dashboard</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
            {/* Sticky Filter Bar */}
            <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-black tracking-tighter flex items-center gap-2">
                        <LayoutDashboard size={20} className="text-white" />
                        NEXUS STATS
                    </h1>

                    <div className="h-6 w-[1px] bg-white/10" />

                    <div className="flex items-center gap-2">
                        <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/5">
                            {['Today', '7d', '30d'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setFilters({ ...filters, range: r })}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        filters.range === r ? "bg-white text-zinc-950 shadow-lg shadow-white/10" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <select
                            value={filters.departmentId || ''}
                            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value ? e.target.value : null })}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-400 focus:outline-none focus:border-white/20"
                        >
                            <option value="">DEPARTMENTS</option>
                            {availableFilters.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        <select
                            value={filters.ownerId || ''}
                            onChange={(e) => setFilters({ ...filters, ownerId: e.target.value ? e.target.value : null })}
                            className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-400 focus:outline-none focus:border-white/20"
                        >
                            <option value="">OWNERS</option>
                            {availableFilters.users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE ANALYTICS
                    </div>
                    <button
                        onClick={fetchStats}
                        className="p-2 hover:bg-white/5 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white"
                    >
                        <History size={16} />
                    </button>
                </div>
            </div>

            {/* Scrollable Dashboard */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">

                {/* 1. TOP KPI STRIP */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                        { label: 'Created', value: stats?.kpis.created, color: 'zinc', icon: <Briefcase size={14} /> },
                        { label: 'Completed', value: stats?.kpis.completed, color: 'emerald', icon: <CheckCircle2 size={14} /> },
                        { label: 'Comp. Rate', value: `${stats?.kpis.completionRate}%`, color: 'blue', icon: <TrendingUp size={14} /> },
                        { label: 'Total Time', value: `${stats?.kpis.avgTotalTime}h`, color: 'zinc', icon: <Clock size={14} /> },
                        { label: 'Wait Time', value: `${stats?.kpis.avgWaitTime}h`, color: 'amber', icon: <Timer size={14} /> },
                        { label: 'Active Time', value: `${stats?.kpis.avgActiveTime}h`, color: 'cyan', icon: <Zap size={14} /> },
                        { label: 'SLA Breaches', value: stats?.kpis.slaBreaches, color: 'rose', icon: <AlertCircle size={14} />, alert: (stats?.kpis.slaBreaches > 0) },
                        { label: 'WIP (Live)', value: stats?.kpis.wip, color: 'indigo', icon: <Activity size={14} /> }
                    ].map((kpi, i) => (
                        <div
                            key={i}
                            className={cn(
                                "relative overflow-hidden group p-4 rounded-2xl border transition-all hover:bg-zinc-900/50",
                                kpi.alert ? "bg-rose-500/[0.03] border-rose-500/20" : "bg-zinc-900 border-white/5"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={cn("p-1.5 rounded-lg border",
                                    kpi.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                        kpi.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                            kpi.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                                kpi.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                    'bg-white/5 border-white/10 text-zinc-400'
                                )}>
                                    {kpi.icon}
                                </div>
                                <div className="h-4 w-full max-w-[40px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={[
                                            { v: 10 }, { v: 15 }, { v: 8 }, { v: 20 }, { v: 12 }, { v: 25 }, { v: 30 }
                                        ]}>
                                            <Area
                                                type="monotone"
                                                dataKey="v"
                                                stroke={kpi.color === 'rose' ? '#f43f5e' : kpi.color === 'emerald' ? '#10b981' : '#a1a1aa'}
                                                fill="transparent"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{kpi.label}</span>
                            <div className="text-xl font-black text-white mt-1 font-mono tracking-tighter">{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* 2. OVERVIEW ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Time-Series Area Chart */}
                    <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/5 transition-colors duration-700" />
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-1">Productivity Flow</h3>
                                <p className="text-xs text-zinc-600">Created vs. Completed Activity (Last 14 Days)</p>
                            </div>
                            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                    <span>Created</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span>Completed</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.timeSeries}>
                                    <defs>
                                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#71717a" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '16px', fontSize: '12px', color: '#f4f4f5' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#e4e4e7' }}
                                    />
                                    <Area type="monotone" dataKey="created" stroke="#71717a" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                                    <Area type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution Donut */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Status Mix</h3>
                        <div className="flex-1 min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.statusDistribution}
                                        cx="50%" cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats?.statusDistribution.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.name === 'done' ? '#10b981' :
                                                        entry.name === 'in_progress' ? '#3b82f6' :
                                                            entry.name === 'blocked' ? '#f43f5e' : '#27272a'
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '12px', color: '#f4f4f5' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {stats?.statusDistribution.map((s: any) => (
                                <div key={s.name} className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full",
                                            s.name === 'done' ? 'bg-emerald-500' :
                                                s.name === 'in_progress' ? 'bg-blue-500' :
                                                    s.name === 'blocked' ? 'bg-rose-500' : 'bg-zinc-700'
                                        )} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{s.name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. BOTTLENECKS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bottleneck Heatmap Grid */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Flame size={18} className="text-orange-500" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Structural Bottlenecks</h3>
                        </div>

                        <div className="space-y-3">
                            {stats?.bottlenecks.map((dept: any) => (
                                <div key={dept.name} className="group relative bg-black/20 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-800/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-white tracking-tight">{dept.name}</span>
                                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-zinc-500 font-mono">
                                                {dept.total} Tasks
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-zinc-600 uppercase">Avg Age</span>
                                                <span className={cn("text-xs font-mono font-bold", dept.avgAge > 12 ? "text-orange-500" : "text-zinc-300")}>
                                                    {dept.avgAge}h
                                                </span>
                                            </div>
                                            <div className="h-6 w-[1px] bg-white/5" />
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-zinc-600 uppercase">SLA Risk</span>
                                                <span className={cn("text-xs font-mono font-bold", dept.slaRiskPercent > 30 ? "text-rose-500" : "text-zinc-500")}>
                                                    {dept.slaRiskPercent}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 h-1.5">
                                        {Object.entries(dept.counts).map(([status, count]: [any, any]) => (
                                            <div
                                                key={status}
                                                className={cn("rounded-full transition-all",
                                                    status === 'done' ? 'bg-emerald-500/30' :
                                                        status === 'in_progress' ? 'bg-blue-500' :
                                                            status === 'blocked' ? 'bg-rose-500' : 'bg-zinc-800'
                                                )}
                                                style={{ width: `${(count / dept.total) * 100}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Aging Tasks List (Nexus Style) */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-rose-500" />
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">RED ZONE: Aging Tasks</h3>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-600">LIMIT: {'>'}24H</span>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                            {stats?.agingTasks.map((t: any) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTaskClick(t)}
                                    className="w-full text-left group flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-rose-500/30 transition-all hover:bg-rose-500/[0.02]"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn("w-1 h-8 rounded-full", t.priority === 'P1' ? 'bg-rose-500' : 'bg-orange-500')} />
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">{t.title}</div>
                                            <div className="text-[10px] text-zinc-600 font-mono mt-0.5 flex items-center gap-2 uppercase tracking-tighter">
                                                <span>{t.owner}</span>
                                                <span className="opacity-30">•</span>
                                                <span>{t.group}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-rose-500/70 font-mono">{t.ageHours}H</span>
                                            <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-[0.2em]">STALE</span>
                                        </div>
                                        <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. ACCOUNTABILITY SECTION */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Assignee Leaderboard */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Award size={18} className="text-amber-500" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Performance Index</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="pb-3 px-2">Operator</th>
                                        <th className="pb-3 text-right">Done</th>
                                        <th className="pb-3 text-right">Avg Time</th>
                                        <th className="pb-3 text-right">On-Time %</th>
                                        <th className="pb-3 text-right">WIP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats?.leaderboard.map((u: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="text-xs font-mono font-bold text-blue-400">{u.completed}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="text-xs font-mono text-zinc-500">{u.avgTime}h</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={cn("h-full", u.onTimePercent > 80 ? "bg-emerald-500" : "bg-amber-500")}
                                                            style={{ width: `${u.onTimePercent}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-mono font-bold">{u.onTimePercent}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className={cn("text-xs font-mono font-bold", u.wip > 5 ? "text-rose-500" : "text-zinc-600")}>{u.wip}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Workload vs Throughput Scatter */}
                    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-indigo-500" />
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Capacity Analysis</h3>
                            </div>
                            <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded">
                                X: Active WIP / Y: Finished
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" />
                                    <XAxis
                                        type="number"
                                        dataKey="wip"
                                        name="Active WIP"
                                        stroke="#ffffff10"
                                        tick={{ fill: '#71717a', fontSize: 10 }}
                                        label={{ value: 'WIP', position: 'bottom', fill: '#3f3f46', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="completed"
                                        name="Finished"
                                        stroke="#ffffff10"
                                        tick={{ fill: '#71717a', fontSize: 10 }}
                                        label={{ value: 'THROUGHPUT', angle: -90, position: 'left', fill: '#3f3f46', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <ZAxis type="number" range={[400, 1000]} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '16px', color: '#f4f4f5' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                    />
                                    <Scatter
                                        name="Operators"
                                        data={stats?.leaderboard}
                                        fill="#6366f1"
                                        shape="circle"
                                    >
                                        {stats?.leaderboard.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 5. INSIGHTS FLOATING PANEL (Optional placeholder if needed) */}
                <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent border border-white/5 p-6 rounded-3xl flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110">
                            <Brain size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">Nexus AI Insights</h4>
                            <p className="text-xs text-zinc-500 max-w-sm">
                                {stats?.kpis.slaBreaches > 3 ? "Critical SLA deterioration detected in Graphics. Requesting additional capacity." :
                                    stats?.kpis.wip > 15 ? "High concurrency detected. Monitoring for system latency." :
                                        "Systems operate within optimal performance parameters."}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Stats Drawer */}
            <StatsDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                task={selectedDetailTask}
            />
        </div>
    );
}
