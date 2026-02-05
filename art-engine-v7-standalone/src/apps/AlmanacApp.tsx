import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Save, Trash2, X, Book, Sparkles, Wand2 } from 'lucide-react';
import api from '../lib/api';

interface ScoringRule {
    id: number;
    keyword: string;
    score: number;
    category: string;
    matchType: 'contains' | 'exact';
    funFact?: string;
}

export default function AlmanacApp({ onClose }: { onClose: () => void }) {
    const [rules, setRules] = useState<ScoringRule[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRule, setSelectedRule] = useState<ScoringRule | null>(null);
    const [isCreateMode, setIsCreateMode] = useState(false);

    // Form State
    const [formState, setFormState] = useState<Partial<ScoringRule>>({
        keyword: '',
        score: 100,
        category: 'Digital / Ops',
        matchType: 'contains',
        funFact: ''
    });

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        try {
            const res = await api.get('/scoring-rules');
            setRules(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        try {
            if (isCreateMode) {
                await api.post('/scoring-rules', formState);
            } else if (selectedRule) {
                await api.patch(`/scoring-rules/${selectedRule.id}`, formState);
            }
            setIsCreateMode(false);
            setSelectedRule(null);
            loadRules(); // Refresh
        } catch (err) {
            console.error("Failed to save rule", err);
        }
    };

    const handleDelete = async () => {
        if (!selectedRule) return;
        if (confirm('Are you sure you want to delete this term?')) {
            await api.delete(`/scoring-rules/${selectedRule.id}`);
            setSelectedRule(null);
            loadRules();
        }
    };

    const openCreate = () => {
        setFormState({ keyword: '', score: 100, category: 'Digital / Ops', matchType: 'contains', funFact: '' });
        setIsCreateMode(true);
        setSelectedRule(null);
    };

    const openEdit = (rule: ScoringRule) => {
        setFormState(rule);
        setSelectedRule(rule);
        setIsCreateMode(false);
    };

    // Filter Logic
    const filteredRules = rules.filter(r => r.keyword.toLowerCase().includes(searchQuery.toLowerCase()));

    const groupedRules = filteredRules.reduce((groups, rule) => {
        if (!groups[rule.category]) groups[rule.category] = [];
        groups[rule.category].push(rule);
        return groups;
    }, {} as Record<string, ScoringRule[]>);


    return (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col text-white font-sans overflow-hidden">
            {/* Header */}
            <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Book size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Nexus Almanac</h1>
                        <span className="text-xs text-zinc-500 font-mono">AGENCY CREATIVE MATRIX v1.0</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Matriste Ara / Search Index (VFX, Kurgu...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                    <button onClick={openCreate} className="bg-white text-black hover:bg-zinc-200 px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors">
                        <Plus size={16} /> Yeni Ekle / New
                    </button>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {Object.entries(groupedRules).sort().map(([category, items]) => (
                    <div key={category} className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-400">{category}</h2>
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-xs font-mono text-zinc-600 border border-white/5 px-2 py-1 rounded">{items.length} KEYWORDS</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {items.map(rule => (
                                <motion.div
                                    key={rule.id}
                                    layoutId={`rule-${rule.id}`}
                                    onClick={() => openEdit(rule)}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    className="bg-zinc-900 border border-white/5 rounded-xl p-5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-900/10 cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Sparkles size={14} className="text-indigo-400" />
                                    </div>

                                    <div className="mb-4">
                                        <span className={`text-2xl font-black ${rule.score >= 400 ? 'text-indigo-400' : rule.score >= 200 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                            {rule.score} <span className="text-xs font-bold text-zinc-600 align-top mt-1 inline-block">XP</span>
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-white mb-1 capitalize">{rule.keyword}</h3>

                                    {rule.funFact ? (
                                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed italic">{rule.funFact}</p>
                                    ) : (
                                        <p className="text-[10px] text-zinc-700 font-mono mt-2">MATCH: {rule.matchType.toUpperCase()}</p>
                                    )}

                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}

                {rules.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-50">
                        <Book size={64} className="mb-4" />
                        <span className="text-lg font-bold">Matriks Boş / Empty Matrix</span>
                        <span className="text-sm">Bilgi tabanına yeni terimler ekleyin.</span>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal (Slide-Over) */}
            <AnimatePresence>
                {(selectedRule || isCreateMode) && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 theme-transition"
                            onClick={() => { setSelectedRule(null); setIsCreateMode(false); }}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-[500px] bg-zinc-950 border-l border-white/10 z-[60] shadow-2xl flex flex-col"
                        >
                            <div className="h-20 flex items-center justify-between px-8 border-b border-white/10 bg-zinc-900">
                                <h2 className="text-lg font-bold">{isCreateMode ? 'Yeni Girdi / New Entry' : 'Düzenle / Edit'}</h2>
                                <button onClick={() => { setSelectedRule(null); setIsCreateMode(false); }} className="hover:text-red-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto space-y-6">
                                {/* Keyword Input */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Anahtar Kelime / Keyword</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={formState.keyword}
                                        onChange={e => setFormState({ ...formState, keyword: e.target.value })}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-4 text-xl font-bold text-white focus:outline-none focus:border-indigo-500/50"
                                        placeholder="Örn: Kinetic Typography"
                                    />
                                </div>

                                {/* Score Slider/Input */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Puan / Score (XP)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="0" max="1000" step="50"
                                            value={formState.score}
                                            onChange={e => setFormState({ ...formState, score: Number(e.target.value) })}
                                            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <input
                                            type="number"
                                            value={formState.score}
                                            onChange={e => setFormState({ ...formState, score: Number(e.target.value) })}
                                            className="w-24 bg-zinc-900 border border-white/10 rounded-lg p-2 text-center font-mono font-bold text-indigo-400"
                                        />
                                    </div>
                                </div>

                                {/* Category Select */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Kategori / Category</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Digital / Ops', 'Broadcast / Edit', 'Art / Design', 'Motion / Branding', 'High-End 3D', 'Special'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setFormState({ ...formState, category: cat })}
                                                className={`p-3 rounded-lg text-xs font-bold border transition-all text-left ${formState.category === cat
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                                    : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Fun Fact (Description) */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Ansiklopedi Notu / Info</label>
                                        <button className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 hover:text-indigo-300">
                                            <Wand2 size={10} /> Auto-Generate
                                        </button>
                                    </div>
                                    <textarea
                                        value={formState.funFact}
                                        onChange={e => setFormState({ ...formState, funFact: e.target.value })}
                                        className="w-full h-24 bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-white/20 resize-none"
                                        placeholder="Bu iş kalemi hakkında kısa bir not veya tanım..."
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 border-t border-white/10 bg-zinc-900 flex items-center justify-between">
                                {!isCreateMode ? (
                                    <button onClick={handleDelete} className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2 px-4 py-2 hover:bg-red-950/30 rounded-lg transition-colors">
                                        <Trash2 size={16} /> Sil / Delete
                                    </button>
                                ) : <div />}

                                <button
                                    onClick={handleSave}
                                    className="bg-white hover:bg-zinc-200 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl shadow-indigo-500/10 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Save size={16} /> Kaydet / Save
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
