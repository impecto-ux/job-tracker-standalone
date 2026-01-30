import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Users, Clock, CheckCircle2, AlertCircle, Zap, Shield, Search, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

interface LiveStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: any[];
}

type SortField = 'name' | 'todo' | 'in_progress' | 'review' | 'done' | 'urgent';
type SortDirection = 'asc' | 'desc';
type TimeRange = 'daily' | 'weekly' | 'monthly';

export const LiveStatusModal: React.FC<LiveStatusModalProps> = ({ isOpen, onClose, tasks }) => {
    const auth = useStore(state => state.auth);
    const chat = useStore(state => state.chat);
    const [searchQuery, setSearchQuery] = useState('');
    const [squadAgents, setSquadAgents] = useState<any[]>([]);
    const [isLoadingSquads, setIsLoadingSquads] = useState(false);
    const [allGroups, setAllGroups] = useState<any[]>([]);

    // Time Range State
    const [timeRange, setTimeRange] = useState<TimeRange>('daily');

    // Sort State
    const [sortField, setSortField] = useState<SortField>('done');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        if (isOpen) {
            if (auth.user?.role === 'admin' || auth.user?.role === 'manager') {
                fetchSquadStatus();
                fetchAllGroups();
            } else {
                // For non-admins, use joined channels from store
                setAllGroups(chat.channels);
            }
        }
    }, [isOpen]);

    const fetchSquadStatus = async () => {
        setIsLoadingSquads(true);
        try {
            const res = await api.get('/squad-agents');
            setSquadAgents(res.data || []);
        } catch (err) {
            console.error('Failed to fetch squad status', err);
        } finally {
            setIsLoadingSquads(false);
        }
    };

    const fetchAllGroups = async () => {
        try {
            const res = await api.get('/groups?isArchived=false');
            setAllGroups(res.data || []);
        } catch (err) {
            console.error('Failed to fetch all groups', err);
            // Fallback to chat channels if API fails
            setAllGroups(chat.channels);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Calculate Date Threshold
    const isDateInRange = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();

        if (timeRange === 'daily') {
            return date.toDateString() === now.toDateString();
        }

        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (timeRange === 'weekly') return diffDays < 7;
        if (timeRange === 'monthly') return diffDays < 30;

        return false;
    };

    // Derive names from all groups to ensure even empty ones appear
    const groupNames = Array.from(new Set([
        ...allGroups.map(g => g.name),
        ...tasks.map(t => t.dept || 'General')
    ])).sort();

    const stats = groupNames.map(name => {
        const deptTasks = tasks.filter(t => t.dept === name || (name === 'General' && !t.dept));
        const squad = squadAgents.find(s => s.department?.name === name || (name === 'General' && !s.department));

        return {
            name: name,
            todo: deptTasks.filter(t => t.status === 'todo').length,
            in_progress: deptTasks.filter(t => t.status === 'in_progress').length,
            review: deptTasks.filter(t => t.status === 'review' || t.status === 'in_review').length,
            done: deptTasks.filter(t => (t.status === 'done' || t.status === 'rejected') && isDateInRange(t.completedAt || t.updatedAt)).length,
            urgent: deptTasks.filter(t => (t.status === 'todo' || t.status === 'in_progress') && t.priority === 'P1').length,
            agentsActive: squad?.isActive || false,
            agentCount: squad?.agents?.length || 0
        };
    })
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const modifier = sortDirection === 'asc' ? 1 : -1;
            if (sortField === 'name') {
                return a.name.localeCompare(b.name) * modifier;
            }
            return ((a[sortField] as number) - (b[sortField] as number)) * modifier;
        });

    const SortIndicator = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-white/10 w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Live Operations Status</h2>
                            <p className="text-xs text-zinc-500 font-medium">Real-time activity breakdown across all groups</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search all groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/10 gap-1">
                        {(['daily', 'weekly', 'monthly'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${timeRange === range
                                    ? 'bg-zinc-800 text-white shadow-lg'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-900 z-10">
                            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">
                                        Group / Department <SortIndicator field="name" />
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('todo')}>
                                    <div className="flex items-center justify-center">
                                        In Queue <SortIndicator field="todo" />
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('in_progress')}>
                                    <div className="flex items-center justify-center">
                                        Active <SortIndicator field="in_progress" />
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('review')}>
                                    <div className="flex items-center justify-center">
                                        Review <SortIndicator field="review" />
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('done')}>
                                    <div className="flex items-center justify-center">
                                        Done ({timeRange === 'daily' ? 'Today' : timeRange === 'weekly' ? '7d' : '30d'}) <SortIndicator field="done" />
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-center">AI Agents</th>
                                <th className="px-4 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('urgent')}>
                                    <div className="flex items-center justify-center">
                                        Urgent <SortIndicator field="urgent" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.map((row) => (
                                <tr key={row.name} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-emerald-400 transition-colors">
                                                {row.name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-bold text-zinc-200">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-sm font-mono font-bold ${row.todo > 5 ? 'text-red-400' : row.todo > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                            {row.todo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-sm font-mono font-bold ${row.in_progress > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>
                                            {row.in_progress}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-sm font-mono font-bold ${row.review > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>
                                            {row.review}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`text-sm font-mono font-bold ${row.done > 0 ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                            {row.done}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${row.agentsActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                                            <span className="text-[10px] font-bold text-zinc-500">{row.agentsActive ? 'ON' : 'OFF'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {row.urgent > 0 ? (
                                            <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-500/20 text-red-500 text-[10px] font-black animate-pulse border border-red-500/30">
                                                {row.urgent}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-800">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-zinc-600">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle size={32} className="opacity-20" />
                                            <p className="text-sm font-medium">No groups found matching your search</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Summary */}
                <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Total Active Tasks</p>
                            <p className="text-xl font-bold text-white">{tasks.filter(t => t.status === 'in_progress').length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Queue Depth</p>
                            <p className="text-xl font-bold text-white">{tasks.filter(t => t.status === 'todo').length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">System Health</p>
                            <p className="text-xl font-bold text-emerald-500">OPTIMAL</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5">
                        <Shield size={12} className="text-emerald-500" />
                        Admin Monitor Active
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
