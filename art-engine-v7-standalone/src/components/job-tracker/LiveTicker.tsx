import React, { useMemo, useState, useEffect } from 'react';
import { Clock, TrendingUp, Calendar, Zap, CheckCircle2, AlertCircle, Monitor, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';


interface LiveTickerProps {
    tasks: any[];
}

export const LiveTicker: React.FC<LiveTickerProps> = ({ tasks }) => {

    // EFFICIENCY STATS (Local fetch for ticker)
    const [efficiency, setEfficiency] = useState<any>(null);

    useEffect(() => {
        fetchEfficiency();
    }, []);

    const fetchEfficiency = async () => {
        try {
            const res = await api.get('/tasks/stats/efficiency');
            setEfficiency(res.data);
        } catch (err) {
            // console.error("Failed to fetch efficiency stats for ticker", err);
        }
    };

    // 7. Stats for Ticker
    const [tickerConfig, setTickerConfig] = useState<any[]>([]);

    useEffect(() => {
        const fetchTickerConfig = async () => {
            try {
                const res = await api.get('/ticker/active');
                setTickerConfig(res.data);
            } catch (error) {
                console.error("Failed to fetch ticker config", error);
            }
        };
        fetchTickerConfig();
    }, []);

    const tickerSlides = useMemo(() => {
        const slides: any[] = [];
        const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const todaysTasks = tasks.filter(t =>
            t.status === 'done' &&
            t.completedAt &&
            new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === todayStr
        );

        // Baseline presets (the "old data")
        const baseline = [
            { id: 'def-summary', type: 'preset', presetFunction: 'daily_summary', label: 'GÜNLÜK ÜRETİM', isActive: true, duration: 3 },
            { id: 'def-performer', type: 'preset', presetFunction: 'top_performer', label: 'HAFTANIN YILDIZI', isActive: true, duration: 3 },
            { id: 'def-latest', type: 'preset', presetFunction: 'latest_activity', label: 'SON TAMAMLANAN', isActive: true, duration: 3 },
            { id: 'def-efficiency', type: 'preset', presetFunction: 'efficiency', label: 'SİSTEM VERİMİ', isActive: true, duration: 3 }
        ];

        // Merge logic: Baseline + (TickerConfig items not in baseline) + TickerConfig overrides
        const effectiveConfigs = [...baseline];

        tickerConfig.forEach(dbConfig => {
            if (dbConfig.type === 'custom') {
                if (dbConfig.isActive) effectiveConfigs.push(dbConfig);
            } else if (dbConfig.type === 'preset') {
                const index = effectiveConfigs.findIndex(b => b.presetFunction === dbConfig.presetFunction);
                if (index !== -1) {
                    if (!dbConfig.isActive) {
                        effectiveConfigs.splice(index, 1); // User explicitly disabled a default
                    } else {
                        effectiveConfigs[index] = { ...effectiveConfigs[index], ...dbConfig }; // User renamed/updated a default
                    }
                } else if (dbConfig.isActive) {
                    effectiveConfigs.push(dbConfig); // New preset type not in baseline
                }
            }
        });

        effectiveConfigs.forEach(config => {
            if (config.type === 'custom') {
                slides.push({
                    id: `custom-${config.id}`,
                    icon: <Monitor size={16} className="text-zinc-400" />,
                    label: config.label || 'ANNOUNCEMENT',
                    text: (config as any).customMessage,
                    duration: config.duration
                });
            } else if (config.type === 'preset') {
                switch (config.presetFunction) {
                    case 'daily_summary':
                        const todayScore = todaysTasks.reduce((acc, t) => acc + (t.score || 0), 0);
                        slides.push({
                            id: `summary-${config.id}`,
                            icon: <Calendar size={16} className="text-blue-400" />,
                            label: config.label || "GÜNLÜK ÜRETİM",
                            text: `${todaysTasks.length} Görev Tamamlandı • ${todayScore} XP Kazanıldı`,
                            duration: config.duration
                        });
                        break;
                    case 'top_performer':
                        const performerMap: Record<string, number> = {};
                        todaysTasks.forEach(t => {
                            const rawName = t.owner;
                            const name = (typeof rawName === 'object' ? (rawName?.fullName || rawName?.username || rawName?.email) : rawName) || 'Unassigned';
                            performerMap[name] = (performerMap[name] || 0) + (t.score || 0);
                        });
                        const topPerformerEntry = Object.entries(performerMap).sort((a, b) => b[1] - a[1])[0];
                        if (topPerformerEntry) {
                            slides.push({
                                id: `performer-${config.id}`,
                                icon: <Zap size={16} className="text-amber-400" />,
                                label: config.label || "HAFTANIN YILDIZI",
                                text: `${topPerformerEntry[0]} bugün ${topPerformerEntry[1]} XP ile lider!`,
                                duration: config.duration
                            });
                        }
                        break;
                    case 'latest_activity':
                        const sortedRecent = [...tasks]
                            .filter(t => t.status === 'done' && t.completedAt)
                            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                        const latest = sortedRecent[0];
                        if (latest) {
                            slides.push({
                                id: `latest-${config.id}`,
                                icon: <CheckCircle2 size={16} className="text-emerald-400" />,
                                label: config.label || "SON TAMAMLANAN",
                                text: `${latest.title} (+${latest.score} XP)`,
                                duration: config.duration
                            });
                        }
                        break;
                    case 'efficiency':
                        if (efficiency) {
                            slides.push({
                                id: `wait-${config.id}`,
                                icon: <History size={16} className="text-orange-400" />,
                                label: config.label || "ORT. BEKLEME",
                                text: `${efficiency.avgWaitTime} dakika`,
                                duration: config.duration
                            });
                            slides.push({
                                id: `cycle-${config.id}`,
                                icon: <Zap size={16} className="text-cyan-400" />,
                                label: config.label || "ORT. DÖNGÜ",
                                text: `${efficiency.avgCycleTime} dakika`,
                                duration: config.duration
                            });
                        }
                        break;
                }
            }
        });

        if (slides.length === 0) {
            slides.push({
                id: 'stable',
                icon: <Monitor size={16} className="text-zinc-600" />,
                label: "SYSTEM STATUS",
                text: "LIVE FEED OPERATIONAL • ALL SYSTEMS STABLE"
            });
        }

        return slides;
    }, [tasks, efficiency, tickerConfig]);


    // Ticker State
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const slidesRef = React.useRef(tickerSlides);

    // Keep ref updated
    useEffect(() => {
        slidesRef.current = tickerSlides;
    }, [tickerSlides]);

    // Independent Timer (Dynamic duration)
    useEffect(() => {
        if (!tickerSlides || tickerSlides.length <= 1) return;

        const currentSlide = tickerSlides[currentSlideIndex];
        const duration = (currentSlide?.duration || 3) * 1000;

        const timeout = setTimeout(() => {
            setCurrentSlideIndex((prev) => (prev + 1) % tickerSlides.length);
        }, duration);

        return () => clearTimeout(timeout);
    }, [currentSlideIndex, tickerSlides]);

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
        const isRecent = diff < 15000; // 15s window

        // Initialize ref on first load
        if (!lastProcessedTaskRef.current) {
            if (isRecent) {
                triggerFlash(latest);
            }
            lastProcessedTaskRef.current = latest.id;
            return;
        }

        // Detect NEW completion
        if (latest.id !== lastProcessedTaskRef.current) {
            if (isRecent) {
                triggerFlash(latest);
            }
            lastProcessedTaskRef.current = latest.id;
        }
    }, [tasks]);

    const triggerFlash = (task: any) => {
        setFlashMessage({
            id: `flash-${Date.now()}`,
            icon: <AlertCircle size={16} className="text-white animate-pulse" />,
            label: "SICAK GELİŞME",
            text: `görev tamamlandı: ${task.title}`, // Simplified for space
            xp: `+${task.score} XP`,
            type: 'flash'
        });
        setTimeout(() => setFlashMessage(null), 8000);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-black border-y border-red-900/30 py-3 flex items-center overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] h-12 z-[50]">
            {/* DOT MATRIX OVERLAY */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(30,30,30,0.5)_1px,transparent_1px)] bg-[length:3px_3px] pointer-events-none z-0 opacity-50"></div>

            {/* GLOW EFFECT */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10 pointer-events-none"></div>

            <div className="flex items-center gap-3 px-6 border-r border-red-900/30 z-20 bg-black/80 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] h-full">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,1)]" />
                <span className="text-[10px] font-mono font-bold text-red-500 tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">
                    LIVE FEED
                </span>
            </div>

            <div className="flex-1 px-6 relative h-6 overflow-hidden z-10 flex items-center mask-image-gradient">
                <AnimatePresence mode="wait">
                    {tickerSlides && tickerSlides.length > 0 && (
                        <motion.div
                            key={tickerSlides[currentSlideIndex]?.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="absolute inset-0 flex items-center gap-4 w-full"
                        >
                            <div className="text-red-500/80 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                                {tickerSlides[currentSlideIndex]?.icon}
                            </div>
                            <span className="text-xs font-mono font-bold text-red-500/60 uppercase tracking-widest leading-none mt-0.5 whitespace-nowrap">
                                [{tickerSlides[currentSlideIndex]?.label}]
                            </span>
                            <span className="text-sm font-mono font-bold text-red-100 uppercase tracking-wide drop-shadow-[0_0_4px_rgba(220,38,38,0.5)] truncate opacity-80">
                                {tickerSlides[currentSlideIndex]?.text}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* RIGHT: FLASH NEWS POP-OUT */}
            <AnimatePresence>
                {flashMessage && (
                    <motion.div
                        initial={{ width: 0, opacity: 0, marginRight: 0 }}
                        animate={{ width: 'auto', opacity: 1, marginRight: 16 }}
                        exit={{ width: 0, opacity: 0, marginRight: 0 }}
                        className="h-full z-20 flex items-center overflow-hidden"
                    >
                        <div className="flex items-center gap-3 bg-red-600/20 border border-red-500/50 px-4 py-1 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(220,38,38,0.3)] whitespace-nowrap">
                            <AlertCircle size={14} className="text-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">BREAKING NEWS</span>
                            <div className="w-px h-3 bg-red-500/50" />
                            <span className="text-xs font-bold text-white uppercase">{flashMessage.text}</span>
                            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{flashMessage.xp}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
