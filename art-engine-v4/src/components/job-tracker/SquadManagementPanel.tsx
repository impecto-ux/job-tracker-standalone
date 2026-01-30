import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Shield, Zap, Target, Save, X, Activity, MessageSquare, Search } from 'lucide-react';
import api from '@/lib/api';

interface Group {
    id: number;
    name: string;
    channelId?: number;
}

interface SquadAgent {
    id?: number;
    groupId?: number;
    channelId: number;
    name: string;
    personality: string;
    systemPrompt: string;
    isActive: boolean;
    triggers: string[];
}

export const SquadManagementPanel = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [agents, setAgents] = useState<SquadAgent[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [formData, setFormData] = useState<SquadAgent>({
        channelId: 0,
        name: '',
        personality: 'Analytical',
        systemPrompt: '',
        isActive: true,
        triggers: ['task_created', 'task_done']
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [gRes, aRes] = await Promise.all([
                api.get('/groups?isArchived=false'),
                api.get('/squad-agents')
            ]);
            setGroups(gRes.data);
            setAgents(aRes.data);
        } catch (err) {
            console.error('Failed to load squad data', err);
        }
    };

    const handleGroupSelect = (groupId: number) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        setSelectedGroupId(groupId);

        // Find agent by channelId (since backend now uses channelId as primary anchor)
        const agent = agents.find(a => a.channelId === group.channelId);

        if (agent) {
            setFormData(agent);
        } else {
            setFormData({
                groupId,
                channelId: group.channelId || 0,
                name: `@${group.name.replace(/\s+/g, '')}AI`,
                personality: 'Analytical',
                systemPrompt: '',
                isActive: true,
                triggers: ['task_created', 'task_done']
            });
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = async () => {
        if (!selectedGroupId) return;
        setIsSaving(true);
        try {
            await api.post('/squad-agents', formData);
            await loadData();
            alert('Squad Agent updated successfully!');
        } catch (err) {
            console.error('Failed to save agent', err);
            alert('Failed to save agent configuration.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisableAll = async () => {
        if (!confirm('Are you sure you want to disable ALL AI agents across all groups?')) return;
        setIsSaving(true);
        try {
            await api.post('/squad-agents/disable-all');
            await loadData();
            alert('All agents have been disabled.');
        } catch (err) {
            console.error('Failed to disable agents', err);
            alert('Failed to disable all agents.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleTrigger = (trigger: string) => {
        const triggers = [...formData.triggers];
        const idx = triggers.indexOf(trigger);
        if (idx > -1) triggers.splice(idx, 1);
        else triggers.push(trigger);
        setFormData({ ...formData, triggers });
    };

    const personalityOptions = [
        { id: 'Analytical', icon: <Activity size={14} />, desc: 'Focuses on stats & logic' },
        { id: 'Proactive', icon: <Zap size={14} />, desc: 'Drives tasks forward' },
        { id: 'Creative', icon: <Shield size={14} />, desc: 'Focuses on design & quality' },
        { id: 'Enforcer', icon: <Target size={14} />, desc: 'Strict about deadlines' },
    ];

    const triggersOptions = [
        { id: 'task_created', label: 'New Task' },
        { id: 'task_done', label: 'Task Completed' },
        { id: 'task_blocked', label: 'Task Blocked' },
        { id: 'p1_priority', label: 'Critical (P1) Warning' },
        { id: 'file_upload', label: 'File Uploaded' },
    ];

    return (
        <div className="flex h-[600px] bg-black/40 rounded-xl overflow-hidden border border-white/5 backdrop-blur-md shadow-2xl">
            {/* Sidebar: Groups */}
            <div className="w-64 border-r border-white/5 p-4 flex flex-col gap-2 bg-white/5">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 px-2">Active Groups</span>

                {/* Search Bar */}
                <div className="px-2 mb-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredGroups.map(group => {
                        const hasAgent = agents.find(a => a.channelId === group.channelId && a.isActive);
                        return (
                            <button
                                key={group.id}
                                onClick={() => handleGroupSelect(group.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all group ${selectedGroupId === group.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-zinc-400 hover:bg-white/5 border border-transparent'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${hasAgent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                                    <span className="text-sm font-bold truncate">{group.name}</span>
                                </div>
                                {hasAgent && <Bot size={14} className="opacity-50 group-hover:opacity-100" />}
                            </button>
                        );
                    })}
                    {filteredGroups.length === 0 && (
                        <div className="text-center py-8 text-zinc-600 text-xs italic">
                            No groups found
                        </div>
                    )}
                </div>
            </div>

            {/* Main: Configuration */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                {/* Header - Fixed at Top */}
                <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Bot className="text-indigo-400" />
                            AI Squad Manager
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            {selectedGroupId
                                ? `Configure proactive behaviors for ${groups.find(g => g.id === selectedGroupId)?.name}`
                                : 'Select a squad to configure its AI Operator'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedGroupId && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <Save size={16} /> {isSaving ? 'Saving...' : 'Sync Agent'}
                            </button>
                        )}
                        <button
                            onClick={handleDisableAll}
                            disabled={isSaving || agents.filter(a => a.isActive).length === 0}
                            className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 disabled:opacity-30 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
                        >
                            <X size={14} /> Disable All Agents
                        </button>
                    </div>
                </div>

                {!selectedGroupId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
                        <Bot size={48} strokeWidth={1} />
                        <p className="text-sm">Select a squad from the left sidebar</p>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                        <div className="grid grid-cols-2 gap-8">
                            {/* Basics */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Agent Identity (Bot Name)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all"
                                        placeholder="@SquadAI"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Operator Personality</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {personalityOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setFormData({ ...formData, personality: opt.id })}
                                                className={`p-3 rounded-xl border text-left transition-all ${formData.personality === opt.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/10'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {opt.icon}
                                                    <span className="text-xs font-bold">{opt.id}</span>
                                                </div>
                                                <span className="text-[9px] opacity-60 leading-tight block">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Logic & Triggers */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Proactive Triggers</label>
                                    <div className="flex flex-wrap gap-2">
                                        {triggersOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => toggleTrigger(opt.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${formData.triggers.includes(opt.id) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-black/20 border-white/5 text-zinc-600'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Core Directives (System Prompt)</label>
                                    <textarea
                                        value={formData.systemPrompt}
                                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-all h-32 resize-none text-xs leading-relaxed"
                                        placeholder="e.g., You manage the Dev team. Focus on code quality and warn users about P1 bugs immediately."
                                    />
                                    <p className="text-[9px] text-zinc-600 px-1 italic">The AI uses these instructions when deciding what to say proactively.</p>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-10 h-5 rounded-full relative transition-all ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Agent Online</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
