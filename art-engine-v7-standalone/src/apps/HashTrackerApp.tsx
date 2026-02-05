
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, DollarSign, Calendar, TrendingUp, Clock, Search, Filter, Grid } from 'lucide-react';

interface Expense {
    id: string;
    item: string;
    amount: number;
    date: Date;
    category: CategoryType;
}

type CategoryType = 'food' | 'transport' | 'bills' | 'entertainment' | 'shopping' | 'other' | 'electric' | 'water' | 'gas' | 'internet' | 'mobile';

interface CategoryConfig {
    label: string;
    color: string;
    bg: string;
}

const CATEGORIES: Record<CategoryType, CategoryConfig> = {
    food: { label: 'Yemek', color: 'text-orange-400', bg: 'bg-orange-500' },
    transport: { label: 'Ulaşım', color: 'text-blue-400', bg: 'bg-blue-500' },
    bills: { label: 'Faturalar', color: 'text-red-400', bg: 'bg-red-500' },
    entertainment: { label: 'Eğlence', color: 'text-purple-400', bg: 'bg-purple-500' },
    shopping: { label: 'Alışveriş', color: 'text-pink-400', bg: 'bg-pink-500' },
    other: { label: 'Diğer', color: 'text-emerald-400', bg: 'bg-emerald-500' },
    electric: { label: 'Elektrik', color: 'text-yellow-400', bg: 'bg-yellow-500' },
    water: { label: 'Su', color: 'text-cyan-400', bg: 'bg-cyan-500' },
    gas: { label: 'Doğalgaz', color: 'text-rose-400', bg: 'bg-rose-500' },
    internet: { label: 'İnternet', color: 'text-indigo-400', bg: 'bg-indigo-500' },
    mobile: { label: 'Telefon', color: 'text-lime-400', bg: 'bg-lime-500' },
};

interface HashTrackerProps {
    onExit: () => void;
}

import { getExpenses, saveExpenses } from '@/actions/expenses';

import { getSettings, saveSettings } from '@/actions/settings';
import { getSubscriptions, saveSubscriptions, type Subscription } from '@/actions/subscriptions';

const BrandLogo = () => (
    <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Abstract Hexagon/Hash Shape */}
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
            <path d="M20 5 L35 12 V28 L20 35 L5 28 V12 Z" fill="none" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 16 L26 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 24 L26 24" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 13 L16 27" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M24 13 L22 27" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
        </svg>
    </div>
);

const BackgroundEffects = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[100px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/20 blur-[100px] rounded-full animate-pulse-slow delay-1000" />
    </div>
);

export default function HashTrackerApp({ onExit }: HashTrackerProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [mode, setMode] = useState<'view' | 'form' | 'subscriptions' | 'stats'>('view');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [inputItem, setInputItem] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [inputDate, setInputDate] = useState('');
    const [inputCategory, setInputCategory] = useState<CategoryType>('other');

    // Filter State
    const [searchText, setSearchText] = useState('');
    const [filterCategory, setFilterCategory] = useState<CategoryType | 'all'>('all');

    // Calendar State
    const [viewDate, setViewDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState<'classic' | 'modern'>('modern'); // Default to modern to show it off
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const [budget, setBudget] = useState(0);

    // Load from Server DB on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [expenseData, settingsData, subsData] = await Promise.all([
                    getExpenses(),
                    getSettings(),
                    getSubscriptions()
                ]);

                // Expenses
                if (!Array.isArray(expenseData)) throw new Error("Invalid expense data");
                const parsedExpenses = expenseData.map((e: any) => ({
                    ...e,
                    date: new Date(e.date),
                    category: e.category && CATEGORIES[e.category as CategoryType] ? e.category : 'other'
                }));

                // Auto-Process Subscriptions
                const today = new Date();
                const currentMonthStr = today.toISOString().slice(0, 7); // "YYYY-MM"
                const currentDay = today.getDate();

                let newExpenses: Expense[] = [];
                let updatedSubs: Subscription[] = [];
                let hasUpdates = false;

                const processedSubs = subsData.map((sub: Subscription) => {
                    if (sub.isActive && sub.lastProcessedMonth !== currentMonthStr && currentDay >= sub.renewalDay) {
                        // Create Expense
                        const newEx: Expense = {
                            id: Math.random().toString(36).substring(7),
                            item: sub.name + ' (Abonelik)',
                            amount: sub.amount,
                            date: new Date(), // Today
                            category: sub.category as CategoryType
                        };
                        newExpenses.push(newEx);
                        hasUpdates = true;
                        return { ...sub, lastProcessedMonth: currentMonthStr };
                    }
                    return sub;
                });

                if (hasUpdates) {
                    setExpenses([...newExpenses, ...parsedExpenses]);
                    setSubscriptions(processedSubs);
                    // Persist updates immediately
                    await Promise.all([
                        saveExpenses([...newExpenses, ...parsedExpenses]),
                        saveSubscriptions(processedSubs)
                    ]);
                } else {
                    setExpenses(parsedExpenses);
                    setSubscriptions(subsData);
                }

                // Settings
                setBudget(settingsData.monthlyBudget || 0);

            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleSaveBudget = async (amount: number) => {
        setBudget(amount);
        await saveSettings({ monthlyBudget: amount, currency: 'TRY' });
    };

    const getBudgetColor = (spent: number, total: number) => {
        if (total === 0) return 'text-zinc-500';
        const percent = spent / total;
        if (percent < 0.5) return 'text-emerald-400';
        if (percent < 0.8) return 'text-amber-400';
        return 'text-rose-500';
    };

    // Save to Server DB
    useEffect(() => {
        if (isLoading) return; // Don't save empty state during loading

        const save = async () => {
            setSaveStatus('saving');
            await saveExpenses(expenses);
            setTimeout(() => setSaveStatus('saved'), 800);
        };

        // Debounce slightly to avoid excessive file writes
        const timeout = setTimeout(save, 500);
        return () => clearTimeout(timeout);
    }, [expenses, isLoading]);

    const handleSave = () => {
        if (!inputItem || !inputAmount || !inputDate) return;

        const dateObj = new Date(inputDate);
        // Preserve time if editing today, otherwise default to noon to avoid timezone shift issues on simple date display
        if (editingId) {
            setExpenses(expenses.map(e => e.id === editingId ? {
                ...e,
                item: inputItem,
                amount: parseFloat(inputAmount),
                date: dateObj,
                category: inputCategory
            } : e));
            setEditingId(null);
        } else {
            const newExpense: Expense = {
                id: Math.random().toString(36).substring(7),
                item: inputItem,
                amount: parseFloat(inputAmount),
                date: dateObj,
                category: inputCategory
            };
            setExpenses([newExpense, ...expenses]);
        }

        resetForm();
        setMode('view');
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu harcamayı silmek istediğine emin misin?')) {
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    const startEdit = (expense: Expense) => {
        setInputItem(expense.item);
        setInputAmount(expense.amount.toString());
        // Format date for input type="date"
        setInputDate(expense.date.toISOString().split('T')[0]);
        // Default to 'other' if for some reason category is missing in state
        setInputCategory(expense.category || 'other');
        setEditingId(expense.id);
        setMode('form');
    };

    const startNew = () => {
        resetForm();
        setInputDate(new Date().toISOString().split('T')[0]); // Default to today
        setMode('form');
    };

    const resetForm = () => {
        setInputItem('');
        setInputAmount('');
        setInputDate('');
        setEditingId(null);
    };

    // Analytics
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const sortedExpenses = [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Filter Logic
    const filteredExpenses = sortedExpenses.filter(ex => {
        const matchesSearch = ex.item.toLowerCase().includes(searchText.toLowerCase());
        const matchesCategory = filterCategory === 'all' || ex.category === filterCategory;
        // Optional: Filter by Date (currently ViewDate is handled separately in calendar, but list shows all recent)
        // For "Detailed Filtering", we might want to restrict the list to the selected month too, 
        // but typically "Recent Transactions" implies a history feed. 
        // Let's keep it global for now to find old stuff easily.
        return matchesSearch && matchesCategory;
    });

    // Calculate Burn Rate based on date range
    // Calculate Burn Rate based on date range (Filtered)
    let dailyBurn = 0;
    // Use filtered expenses for calculation to show category specific burn
    const expensesToCalculate = filteredExpenses.length > 0 ? filteredExpenses : [];
    // If we are filtering, we want the burn rate OF THAT CATEGORY

    if (expensesToCalculate.length > 0) {
        const dates = expensesToCalculate.map(e => e.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = new Date().getTime(); // Always burn util now
        const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
        // Sum only the filtered expenses
        const filteredTotal = expensesToCalculate.reduce((acc, curr) => acc + curr.amount, 0);
        dailyBurn = filteredTotal / daysDiff;
    }

    // Calendar Helper
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sun

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

        const days = [];
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 md:h-10" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month, d);
            const offsetDate = new Date(currentDayDate.getTime() - (currentDayDate.getTimezoneOffset() * 60000));
            const dateStr = offsetDate.toISOString().split('T')[0];

            const dailyExpenses = expenses.filter(e => {
                const isDateMatch = e.date.toISOString().split('T')[0] === dateStr;
                const isCategoryMatch = filterCategory === 'all' || e.category === filterCategory;
                return isDateMatch && isCategoryMatch;
            });
            const dailyTotal = dailyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
            const hasExpense = dailyExpenses.length > 0;
            const hasSubscription = subscriptions.some(s => {
                const isRenewalMatch = s.isActive && s.renewalDay === d;
                const isCategoryMatch = filterCategory === 'all' || s.category === filterCategory;
                return isRenewalMatch && isCategoryMatch;
            });
            const isToday = new Date().toDateString() === currentDayDate.toDateString();

            if (calendarView === 'modern') {
                days.push(
                    <div
                        key={d}
                        onClick={() => {
                            resetForm();
                            setInputDate(dateStr);
                            setMode('form');
                        }}
                        className="h-10 flex flex-col items-center justify-start pt-1 relative cursor-pointer group"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                            <span className="text-[10px] font-bold">{d}</span>
                        </div>
                        <div className="flex gap-0.5 mt-1 h-1">
                            {hasExpense && <div className="w-1 h-1 rounded-full bg-rose-500" />}
                            {hasSubscription && <div className="w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.5)]" />}
                        </div>
                    </div>
                );
            } else {
                days.push(
                    <div
                        key={d}
                        onClick={() => {
                            resetForm();
                            setInputDate(dateStr);
                            setMode('form');
                        }}
                        className={`h-8 md:h-10 flex flex-col items-center justify-center rounded-lg relative border cursor-pointer ${isToday ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-transparent hover:bg-white/10 active:bg-white/20'} transition-all group`}
                    >
                        <span className={`text-[10px] ${isToday ? 'text-indigo-400 font-bold' : 'text-zinc-500 group-hover:text-white'}`}>{d}</span>

                        <div className="absolute bottom-1 flex gap-0.5">
                            {hasExpense && <div className="w-1 h-1 rounded-full bg-rose-500" />}
                            {hasSubscription && <div className="w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.5)]" />}
                        </div>
                        {hasExpense && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 bg-zinc-900 border border-white/10 p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="text-center font-bold text-xs text-white border-b border-white/10 pb-1 mb-1">
                                    {dailyTotal.toLocaleString('tr-TR')} ₺
                                </div>
                                <div className="space-y-1 max-h-32 overflow-hidden">
                                    {dailyExpenses.map((e, i) => (
                                        <div key={i} className="flex justify-between text-[10px] text-zinc-400">
                                            <span className="truncate max-w-[70%]">{e.item}</span>
                                            <span>{e.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
        }
        return days;
    };

    const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>('mobile');

    return (
        <div className="h-full w-full bg-zinc-950 text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-500">
            {/* Header */}
            <div className="p-6 pt-10 flex items-center justify-between z-10 shrink-0">
                <button onClick={onExit} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>

                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <BrandLogo />
                        <div className="text-left">
                            <h1 className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400">
                                HashTracker
                            </h1>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] block">
                                Finance OS
                            </span>
                        </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${saveStatus === 'saved' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10' : 'border-amber-500/20 text-amber-500 bg-amber-500/10'} transition-all`}>
                        {saveStatus === 'saved' ? 'Sistem Çevrimiçi' : 'Senkronize Ediliyor...'}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setLayoutMode(m => m === 'mobile' ? 'desktop' : 'mobile')}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-[10px] font-bold uppercase text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                    >
                        {layoutMode === 'mobile' ? <Grid size={14} /> : <Filter size={14} />}
                        {layoutMode === 'mobile' ? 'Dashboard' : 'Mobil'}
                    </button>
                    <div className="w-8 md:hidden" />
                </div>
            </div>

            <BackgroundEffects />

            {/* Layout Container */}
            <div className={`flex-1 overflow-hidden relative z-10 ${layoutMode === 'desktop' ? 'p-8 pt-0' : 'px-6 pb-20'}`}>

                <AnimatePresence mode="wait">
                    {mode === 'stats' ? (
                        <StatsView key="stats" expenses={expenses} onBack={() => setMode('view')} />
                    ) : mode === 'subscriptions' ? (
                        <SubscriptionsView
                            key="subscriptions"
                            subscriptions={subscriptions}
                            setSubscriptions={setSubscriptions}
                            onBack={() => setMode('view')}
                        />
                    ) : mode === 'view' ? (
                        /* VIEW MODE (Dashboard or Mobile List) */
                        <motion.div
                            key="view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`h-full ${layoutMode === 'desktop' ? 'grid grid-cols-12 gap-8 max-w-7xl mx-auto' : 'flex flex-col max-w-md mx-auto w-full overflow-y-auto'}`}
                        >
                            {/* LEFT COLUMN (Control Center / Mobile Header) */}
                            <div className={`${layoutMode === 'desktop' ? 'col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar' : 'space-y-6'}`}>

                                {/* Calendar Widget */}
                                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest pl-1">
                                            {viewDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                                        </h3>
                                        <div className="flex gap-2 items-center">
                                            <button
                                                onClick={() => setCalendarView(v => v === 'classic' ? 'modern' : 'classic')}
                                                className="text-[10px] bg-white/5 px-2 py-1 rounded text-zinc-500 hover:text-white transition-colors"
                                            >
                                                {calendarView === 'modern' ? 'Klasik' : 'Yeni'}
                                            </button>
                                            <div className="space-x-1">
                                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded">&lt;</button>
                                                <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded">&gt;</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                                            <span key={d} className="text-[9px] text-zinc-600 font-bold uppercase">{d}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {renderCalendar()}
                                    </div>
                                </div>

                                {/* Stats & Budget Gauge */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Fuel Tank (Budget Gauge) */}
                                    <div
                                        className="bg-zinc-900 border border-white/5 p-4 rounded-2xl relative overflow-hidden group cursor-pointer"
                                        onClick={() => {
                                            const newBudget = prompt("Aylık Bütçe Hedefin (TL):", budget.toString());
                                            if (newBudget && !isNaN(parseFloat(newBudget))) {
                                                handleSaveBudget(parseFloat(newBudget));
                                            }
                                        }}
                                    >
                                        <div className="relative z-10">
                                            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1 flex justify-between">
                                                <span>Bütçe Durumu</span>
                                                <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">DÜZENLE</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className={`text-2xl font-bold ${getBudgetColor(totalSpent, budget)}`}>
                                                    %{Math.min(100, Math.round((totalSpent / (budget || 1)) * 100))}
                                                </span>
                                                <span className="text-xs text-zinc-500 mb-1.5">
                                                    / {budget.toLocaleString('tr-TR')} ₺
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar Background */}
                                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-zinc-800">
                                            <div
                                                className={`h-full transition-all duration-1000 ${getBudgetColor(totalSpent, budget).replace('text-', 'bg-')}`}
                                                style={{ width: `${Math.min(100, (totalSpent / (budget || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                                        <div>
                                            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">
                                                {filterCategory === 'all' ? 'Toplam Harcama' : `${CATEGORIES[filterCategory].label} Toplam`}
                                            </div>
                                            <div className="text-xl font-bold text-zinc-100 truncate">
                                                {(filterCategory === 'all' ? totalSpent : filteredExpenses.reduce((acc, c) => acc + c.amount, 0)).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                                            </div>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                                                {filterCategory === 'all' ? 'Günlük' : 'Günlük Ort.'}
                                            </div>
                                            <div className="text-sm font-bold text-indigo-400">
                                                {dailyBurn.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={startNew}
                                        className="py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-bold text-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Plus size={24} /> Yeni Harcama
                                    </button>
                                    <button
                                        onClick={() => setMode('subscriptions')}
                                        className="py-6 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-zinc-300 font-bold text-sm flex flex-col items-center justify-center gap-1"
                                    >
                                        <Clock size={20} className="text-indigo-400" />
                                        Abonelikler
                                    </button>
                                    <button
                                        onClick={() => setMode('stats')}
                                        className="col-span-2 py-4 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors text-zinc-400 font-bold text-xs flex items-center justify-center gap-2"
                                    >
                                        <TrendingUp size={16} />
                                        Harcama Analizi
                                    </button>
                                </div>
                            </div>


                            {/* RIGHT COLUMN (Feed & Filters) */}
                            <div className={`${layoutMode === 'desktop' ? 'col-span-8 flex flex-col h-full overflow-hidden bg-zinc-900/20 border border-white/5 rounded-3xl' : 'mt-6 mb-20'}`}>

                                <div className={`${layoutMode === 'desktop' ? 'p-6 flex-1 overflow-y-auto custom-scrollbar' : ''}`}>
                                    {/* Recent List Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{layoutMode === 'desktop' ? 'Harcama Akışı' : 'Son İşlemler'}</h3>
                                        {layoutMode === 'desktop' && (
                                            <div className="text-xs text-zinc-600 font-mono">
                                                {filteredExpenses.length} kayıt gösteriliyor
                                            </div>
                                        )}
                                    </div>

                                    {/* Search & Filter Bar */}
                                    <div className={`mb-6 space-y-3 ${layoutMode === 'desktop' ? 'sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-20 py-2 -mx-2 px-2' : ''}`}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Harcama ara..."
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 pb-2">
                                            <button
                                                onClick={() => setFilterCategory('all')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors border ${filterCategory === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/20 hover:text-zinc-300'}`}
                                            >
                                                Hepsi
                                            </button>
                                            {(Object.entries(CATEGORIES) as [CategoryType, { label: string, bg: string }][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setFilterCategory(key)}
                                                    onDoubleClick={() => {
                                                        resetForm();
                                                        setInputCategory(key);
                                                        setInputDate(new Date().toISOString().split('T')[0]);
                                                        setMode('form');
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors border ${filterCategory === key ? `${config.bg} text-white border-transparent` : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/20 hover:text-zinc-300'}`}
                                                >
                                                    {config.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {filteredExpenses.length === 0 ? (
                                        <div className="text-center py-10 text-zinc-600 italic">
                                            {searchText || filterCategory !== 'all' ? 'Kriterlere uygun harcama bulunamadı.' : 'Henüz veri yok.'}
                                        </div>
                                    ) : (
                                        <div className={`${layoutMode === 'desktop' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
                                            {filteredExpenses.map(ex => (
                                                <div
                                                    key={ex.id}
                                                    className="group bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer"
                                                    onClick={() => startEdit(ex)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Category Indicator */}
                                                        <div className={`w-1 h-8 rounded-full ${CATEGORIES[ex.category].bg}`} />

                                                        <div>
                                                            <div className="font-medium text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                                                                {ex.item}
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 ${CATEGORIES[ex.category].color}`}>
                                                                    {CATEGORIES[ex.category].label}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                                <Calendar size={10} />
                                                                {ex.date.toLocaleDateString('tr-TR')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="font-mono font-bold text-zinc-300">
                                                            -{ex.amount} ₺
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* FORM MODE */
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto">
                                <div className="max-w-md mx-auto">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-xl font-bold">{editingId ? 'Harcama Düzenle' : 'Yeni Harcama'}</h2>
                                        <button onClick={() => { resetForm(); setMode('view'); }} className="p-2 hover:bg-white/10 rounded-full">
                                            <ArrowLeft size={20} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block mb-2">Harcama İsmi</label>
                                            <input
                                                className="w-full bg-zinc-900 border border-white/5 p-4 rounded-2xl text-lg font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                                placeholder="Örn: Kahve, Market..."
                                                value={inputItem}
                                                onChange={(e) => setInputItem(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block mb-2">Tutar (TL)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₺</span>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-zinc-900 border border-white/5 p-4 pl-8 rounded-2xl text-lg font-mono font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                                        placeholder="0.00"
                                                        value={inputAmount}
                                                        onChange={(e) => setInputAmount(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block mb-2">Tarih</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-zinc-900 border border-white/5 p-4 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors text-white scheme-dark"
                                                    value={inputDate}
                                                    onChange={(e) => setInputDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block mb-2">Kategori</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(Object.entries(CATEGORIES) as [CategoryType, CategoryConfig][]).map(([key, config]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setInputCategory(key)}
                                                        className={`p-3 rounded-xl border text-xs font-bold transition-all relative overflow-hidden ${inputCategory === key ? `${config.bg} text-white border-transparent shadow-lg scale-105` : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                                    >
                                                        {config.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-4 flex gap-3">
                                            {editingId && (
                                                <button
                                                    onClick={() => handleDelete(editingId)}
                                                    className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold transition-all"
                                                >
                                                    Sil
                                                </button>
                                            )}
                                            <button
                                                onClick={handleSave}
                                                className="flex-1 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                            >
                                                {editingId ? 'Güncelle' : 'Kaydet'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function SubscriptionsView({ subscriptions, setSubscriptions, onBack }: { subscriptions: Subscription[], setSubscriptions: (s: Subscription[]) => void, onBack: () => void }) {
    const [subName, setSubName] = useState('');
    const [subAmount, setSubAmount] = useState('');
    const [subDay, setSubDay] = useState('1');
    const [subCategory, setSubCategory] = useState<CategoryType>('bills');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!subName || !subAmount) return;
        const newSub: Subscription = {
            id: Math.random().toString(36).substring(7),
            name: subName,
            amount: parseFloat(subAmount),
            category: subCategory,
            renewalDay: parseInt(subDay),
            isActive: true
        };
        const updated = [...subscriptions, newSub];
        setSubscriptions(updated);
        await saveSubscriptions(updated);
        setIsAdding(false);
        setSubName('');
        setSubAmount('');
    };

    const toggleStatus = async (id: string) => {
        const updated = subscriptions.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
        setSubscriptions(updated);
        await saveSubscriptions(updated);
    };

    const deleteSub = async (id: string) => {
        if (!confirm('Aboneliği silmek istiyor musunuz?')) return;
        const updated = subscriptions.filter(s => s.id !== id);
        setSubscriptions(updated);
        await saveSubscriptions(updated);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
        >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Clock className="text-indigo-400" />
                Abonelik Yöneticisi
            </h2>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {subscriptions.length === 0 && !isAdding && (
                    <div className="text-zinc-500 italic text-center py-10">
                        Henüz abonelik eklenmedi.
                    </div>
                )}
                {subscriptions.map(sub => (
                    <div key={sub.id} className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                {sub.name}
                                {!sub.isActive && <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1 rounded">PASİF</span>}
                            </div>
                            <div className="text-xs text-zinc-500 flex gap-1 items-center mt-1">
                                <span className={`w-2 h-2 rounded-full ${CATEGORIES[sub.category as CategoryType]?.bg || 'bg-zinc-500'}`} />
                                Her ayın {sub.renewalDay}. günü
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="font-mono text-zinc-300">{sub.amount} ₺</div>
                            <button onClick={() => toggleStatus(sub.id)} className={`w-8 h-5 rounded-full p-1 transition-colors ${sub.isActive ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${sub.isActive ? 'translate-x-3' : ''}`} />
                            </button>
                            <button onClick={() => deleteSub(sub.id)} className="text-zinc-600 hover:text-red-400 px-2">X</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-zinc-900 border border-indigo-500/30 p-4 rounded-xl mb-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-3">
                        <label className="text-xs text-zinc-500 font-bold ml-1">Hızlı Seçim</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                { name: 'Netflix', cat: 'entertainment', price: '229.99' },
                                { name: 'Adobe CC', cat: 'bills', price: '1288.00' },
                                { name: 'Spotify', cat: 'entertainment', price: '60.00' },
                                { name: 'ChatGPT', cat: 'bills', price: '700.00' },
                                { name: 'LinkedIn', cat: 'bills', price: '1200.00' },
                                { name: 'Behance', cat: 'bills', price: '350.00' }
                            ].map(quick => (
                                <button
                                    key={quick.name}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSubName(quick.name);
                                        setSubCategory(quick.cat as CategoryType);
                                        setSubAmount(quick.price);
                                    }}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-full text-xs text-zinc-300 whitespace-nowrap transition-all active:scale-95"
                                >
                                    {quick.name}
                                </button>
                            ))}
                        </div>

                        <input type="text" placeholder="Abonelik Adı" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" value={subName} onChange={e => setSubName(e.target.value)} />
                        <div className="flex gap-2">
                            <input type="number" placeholder="Tutar" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm" value={subAmount} onChange={e => setSubAmount(e.target.value)} />
                            <select className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-400" value={subDay} onChange={e => setSubDay(e.target.value)}>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Gün: {d}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {(Object.entries(CATEGORIES) as [CategoryType, { label: string, bg: string }][]).map(([key, config]) => (
                                <button key={key} onClick={() => setSubCategory(key)} className={`text-[10px] p-1 rounded border ${subCategory === key ? `${config.bg} text-white border-transparent` : 'border-white/10 text-zinc-500'}`}>
                                    {config.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleAdd} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold">Ekle</button>
                            <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2 rounded-lg text-sm font-bold">İptal</button>
                        </div>
                    </div>
                </div>
            )}

            {!isAdding && (
                <div className="flex gap-2">
                    <button onClick={onBack} className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-zinc-400">Geri Dön</button>
                    <button onClick={() => setIsAdding(true)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20"> Yeni Abonelik</button>
                </div>
            )}
        </motion.div>
    );
}

function StatsView({ expenses, onBack }: { expenses: Expense[], onBack: () => void }) {
    // 1. Category Breakdown
    const categoryTotals = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    // Prepare segments for Pie Chart
    let currentAngle = 0;
    const pieSegments = Object.entries(categoryTotals).map(([cat, amount]) => {
        const percentage = amount / total;
        const angle = percentage * 360;

        // Calculate SVG path
        const x1 = 50 + 40 * Math.cos(Math.PI * (currentAngle - 90) / 180);
        const y1 = 50 + 40 * Math.sin(Math.PI * (currentAngle - 90) / 180);
        const x2 = 50 + 40 * Math.cos(Math.PI * (currentAngle + angle - 90) / 180);
        const y2 = 50 + 40 * Math.sin(Math.PI * (currentAngle + angle - 90) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = total === 0 ? "" : (Object.keys(categoryTotals).length === 1
            ? "M 50 10 A 40 40 0 1 1 49.99 10" // Full RequestClose
            : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
        );

        const segment = { cat, amount, path: pathData, color: CATEGORIES[cat as CategoryType]?.color || 'text-zinc-500' };
        currentAngle += angle;
        return segment;
    });

    // 2. Trend Line (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const dailyTotals = last7Days.map(dateStr => {
        return expenses
            .filter(e => e.date.toISOString().split('T')[0] === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);
    });

    const maxVal = Math.max(...dailyTotals, 100);
    const minVal = 0;
    const points = dailyTotals.map((val, i) => {
        const x = (i / 6) * 100;
        const y = 100 - ((val - minVal) / (maxVal - minVal)) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
        >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="text-pink-500" />
                Harcama Analizi
            </h2>

            {/* Charts Grid */}
            <div className="space-y-6">

                {/* Donut Chart */}
                <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl flex flex-col items-center relative">
                    <div className="absolute top-4 left-4 text-xs font-bold text-zinc-500 tracking-widest uppercase">Kategori Dağılımı</div>
                    <div className="w-48 h-48 relative mt-6">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            {pieSegments.map((seg, i) => (
                                <path
                                    key={i}
                                    d={seg.path}
                                    fill="currentColor"
                                    className={`${seg.color.replace('text-', '') === 'white' ? 'text-zinc-500' : seg.color}`}
                                    stroke="#18181b"
                                    strokeWidth="2"
                                />
                            ))}
                            {/* Inner Circle for Donut Effect */}
                            <circle cx="50" cy="50" r="25" fill="#18181b" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-xs text-zinc-500 font-bold">TOPLAM</span>
                            <span className="text-lg font-bold text-white">{total.toLocaleString('tr-TR')} ₺</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="w-full grid grid-cols-2 gap-2 mt-6">
                        {pieSegments.sort((a, b) => b.amount - a.amount).map(seg => (
                            <div key={seg.cat} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${CATEGORIES[seg.cat as CategoryType].bg}`} />
                                    <span className="text-zinc-400 capitalize">{CATEGORIES[seg.cat as CategoryType].label}</span>
                                </div>
                                <span className="font-mono text-zinc-200">{Math.round((seg.amount / total) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
                    <div className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">Son 7 Günlük Trend</div>
                    <div className="h-32 w-full flex items-end relative">
                        {/* Bars for volume representation */}
                        {dailyTotals.map((val, i) => (
                            <div
                                key={i}
                                className="flex-1 mx-1 bg-zinc-800 rounded-t hover:bg-indigo-500/50 transition-colors relative group"
                                style={{ height: `${Math.max(5, (val / maxVal) * 100)}%` }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-zinc-800 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                    {val} ₺
                                </div>
                            </div>
                        ))}

                        {/* Line Overlay */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                            <polyline
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2"
                                points={points}
                                vectorEffect="non-scaling-stroke"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] text-zinc-600 uppercase font-bold">
                        <span>7 Gün Önce</span>
                        <span>Bugün</span>
                    </div>
                </div>

            </div>

            <div className="mt-6">
                <button onClick={onBack} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-zinc-400">Geri Dön</button>
            </div>
        </motion.div>
    );
}
