
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Edit2, X, Check, Activity, MessageSquare, Monitor, Shield, GripVertical } from 'lucide-react';
import api from '@/lib/api';
import { Reorder } from 'framer-motion';

interface TickerManagementPanelProps {
    onClose: () => void;
}

export const TickerManagementPanel: React.FC<TickerManagementPanelProps> = ({ onClose }) => {
    const [tickers, setTickers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTicker, setEditingTicker] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        label: '',
        type: 'custom', // 'preset' | 'custom'
        presetFunction: 'daily_summary',
        customMessage: '',
        allowedRoles: ['all'],
        isActive: true,
        duration: 3
    });

    useEffect(() => {
        fetchTickers();
    }, []);

    const fetchTickers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/ticker');
            setTickers(res.data);
        } catch (error) {
            console.error("Failed to fetch tickers", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await api.post('/ticker', formData);
            fetchTickers();
            setIsAddModalOpen(false);
            resetForm();
        } catch (e) {
            alert('Failed to create ticker');
        }
    };

    const handleUpdate = async () => {
        if (!editingTicker) return;
        try {
            await api.patch(`/ticker/${editingTicker.id}`, formData);
            fetchTickers();
            setIsEditModalOpen(false);
            setEditingTicker(null);
            resetForm();
        } catch (e) {
            alert('Failed to update ticker');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this ticker configuration?')) return;
        try {
            await api.delete(`/ticker/${id}`);
            fetchTickers();
        } catch (e) {
            alert('Failed to delete ticker');
        }
    };

    const handleToggleActive = async (ticker: any) => {
        try {
            await api.patch(`/ticker/${ticker.id}`, { isActive: !ticker.isActive });
            fetchTickers(); // Refresh to ensure sync
        } catch (e) {
            console.error("Failed to toggle", e);
        }
    };

    const openEditModal = (ticker: any) => {
        setEditingTicker(ticker);
        setFormData({
            label: ticker.label,
            type: ticker.type,
            presetFunction: ticker.presetFunction || 'daily_summary',
            customMessage: ticker.customMessage || '',
            allowedRoles: ticker.allowedRoles || ['all'],
            isActive: ticker.isActive,
            duration: ticker.duration || 3
        });
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            label: '',
            type: 'custom',
            presetFunction: 'daily_summary',
            customMessage: '',
            allowedRoles: ['all'],
            isActive: true,
            duration: 3
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#09090b] border border-white/10 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                {/* HEADER */}
                <div className="h-24 border-b border-white/5 flex items-center px-8 bg-zinc-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Ticker System</h1>
                            <p className="text-sm text-zinc-500">Manage live updates and announcements</p>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm text-zinc-400">
                            Manage the rotating slides shown in the Mission Control header.
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Add Ticker Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {tickers.map((ticker) => (
                            <div key={ticker.id} className={`bg-zinc-900/50 border ${ticker.isActive ? 'border-white/10' : 'border-white/5 opacity-60'} p-4 rounded-xl flex items-center gap-4 group transition-all`}>
                                <div className="p-2 rounded-lg bg-white/5 text-zinc-400">
                                    <GripVertical size={16} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-white">{ticker.label}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${ticker.type === 'preset' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                            {ticker.type}
                                        </span>
                                        {!ticker.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">INACTIVE</span>}
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {ticker.type === 'preset' ? `Function: ${ticker.presetFunction}` : `Message: ${ticker.customMessage}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 mr-4">
                                    <div className="text-xs text-zinc-600 font-mono">
                                        Duration: {ticker.duration || 3}s | Visibility: {ticker.allowedRoles?.includes('all') ? 'Everyone' : ticker.allowedRoles?.join(', ')}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                    <button
                                        onClick={() => handleToggleActive(ticker)}
                                        className={`p-2 rounded-lg transition-colors ${ticker.isActive ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                                        title="Toggle Active"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button onClick={() => openEditModal(ticker)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(ticker.id)} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {tickers.length === 0 && !isLoading && (
                            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-zinc-500">
                                No ticker items configured.
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* CREATE/EDIT MODAL */}
            <AnimatePresence>
                {(isAddModalOpen || isEditModalOpen) && (
                    <>
                        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed z-[210] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-white">{isEditModalOpen ? 'Edit Ticker Item' : 'New Ticker Item'}</h2>
                                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Label (Internal Name)</label>
                                    <input
                                        type="text"
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 outline-none"
                                        placeholder="e.g. Morning Greetings"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none [&>option]:bg-[#09090b]"
                                        >
                                            <option value="custom">Custom Message</option>
                                            <option value="preset">Preset Function</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Display Duration (s)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 3 })}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                                        <div
                                            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                            className={`cursor-pointer border border-white/10 rounded px-3 py-2 text-sm flex items-center gap-2 ${formData.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-black/20 text-zinc-500'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                                            {formData.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>

                                {formData.type === 'custom' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Message Content</label>
                                        <textarea
                                            value={formData.customMessage}
                                            onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 outline-none h-24 resize-none"
                                            placeholder="Enter the message to display..."
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Preset Function</label>
                                        <select
                                            value={formData.presetFunction}
                                            onChange={(e) => setFormData({ ...formData, presetFunction: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none [&>option]:bg-[#09090b]"
                                        >
                                            <option value="daily_summary">Daily Summary (Tasks & XP)</option>
                                            <option value="top_performer">Top Performer (XP Leader)</option>
                                            <option value="latest_activity">Latest Completed Task</option>
                                            <option value="efficiency">Efficiency Stats (Cycle Time)</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Visibility (Role)</label>
                                    <select
                                        value={formData.allowedRoles[0]} // Simple single select for now
                                        onChange={(e) => setFormData({ ...formData, allowedRoles: [e.target.value] })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none [&>option]:bg-[#09090b]"
                                    >
                                        <option value="all">Everyone</option>
                                        <option value="admin">Admins Only</option>
                                        <option value="user">Users Only</option>
                                    </select>
                                </div>

                                <button
                                    onClick={isEditModalOpen ? handleUpdate : handleCreate}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
                                >
                                    {isEditModalOpen ? 'Save Changes' : 'Create Ticker Item'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

};
