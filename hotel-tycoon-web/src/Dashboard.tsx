import React from 'react';
import { useGame } from './hooks/useGame';
import { GAME_DATA, EVENTS, MarketingLevel, StaffLevel, RenovationLevel, calculatePurchasePrice } from './lib/gameLogic';

const Dashboard: React.FC = () => {
    const { state, actions } = useGame();
    const {
        balance, currentTurn, currentMonth, region, segmentIndex,
        priceSlider, ownership, renovation, marketing, staffing,
        reputation, turnsLeftOnReno, activeEvents, lastResult, isIdleMode
    } = state;

    const currentSegment = GAME_DATA.segments[segmentIndex];
    const nextSegment = GAME_DATA.segments[segmentIndex + 1];

    const currentEvent = activeEvents.length > 0 ? EVENTS.find(e => e.id === activeEvents[0].id) : null;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30">

            {/* --- TOP HUD --- */}
            <div className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-2xl border-b border-slate-800/50 shadow-2xl">
                <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
                            H
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-white uppercase">Hotel Tycoon</h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                <span className={`w-2 h-2 rounded-full ${isIdleMode ? 'bg-amber-500 font-black' : 'bg-emerald-500'} animate-pulse`}></span>
                                {isIdleMode ? 'OTOMATİK SİMÜLASYON' : 'MANUEL MOD'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">Bakiye</p>
                            <p className="text-2xl font-mono font-black text-emerald-400">
                                {Math.floor(balance).toLocaleString('tr-TR')} <span className="text-sm font-sans font-normal opacity-70">₺</span>
                            </p>
                        </div>
                        <div className="h-12 w-[1px] bg-slate-800"></div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1">Takvim</p>
                            <p className="text-xl font-bold text-slate-200">
                                Ay {currentMonth} <span className="text-slate-500 mx-1">/</span> Gün {currentTurn}
                            </p>
                        </div>
                        <button
                            onClick={actions.resetGame}
                            className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                            title="Sıfırla"
                        >
                            🔄
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

                {/* --- LEFT COLUMN: Operations (8 cols) --- */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Main Visualizer */}
                    <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden group border border-slate-800/50 shadow-2xl bg-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>

                        {/* Background Style based on Segment */}
                        <div className={`absolute inset-0 transition-all duration-1000 ${segmentIndex > 3 ? 'bg-indigo-950/20' : 'bg-emerald-950/20'}`}></div>

                        <div className="absolute inset-0 flex items-center justify-center flex-col z-20 text-center scale-100 group-hover:scale-105 transition-transform duration-[2s]">
                            <div className="text-8xl mb-6 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {segmentIndex === 0 ? '🏚️' : segmentIndex === 1 ? '🏠' : segmentIndex === 2 ? '🏨' : segmentIndex === 3 ? '🏢' : segmentIndex === 4 ? '🏬' : '🏰'}
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">{currentSegment.name}</h2>
                            <div className="mt-4 px-6 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-4">
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">📍 {region}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">🛏️ {currentSegment.roomCount} Oda</span>
                            </div>
                        </div>

                        {/* Renovation Overlay */}
                        {turnsLeftOnReno > 0 && (
                            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-30 flex items-center justify-center flex-col">
                                <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-6"></div>
                                <h3 className="text-3xl font-black text-white">YENİLENİYOR: {renovation}</h3>
                                <p className="text-orange-400 font-bold uppercase tracking-widest mt-2">{turnsLeftOnReno} TURN KALDI</p>
                            </div>
                        )}

                        {/* Event Notification */}
                        {currentEvent && (
                            <div className="absolute top-6 left-6 z-40 animate-bounce">
                                <div className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full shadow-lg flex items-center gap-2 border border-amber-400 font-bold">
                                    ⚡ {currentEvent.name}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Price Control */}
                        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-xl flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">Fiyatlandırma</h3>
                                    <p className="text-xs text-slate-500 font-medium">Birim fiyat: {Math.round(currentSegment.baseADR * priceSlider).toLocaleString()} ₺</p>
                                </div>
                                <div className="text-3xl font-mono font-black text-indigo-400">%{Math.round(priceSlider * 100)}</div>
                            </div>

                            <input
                                type="range" min="0.5" max="1.5" step="0.05"
                                value={priceSlider}
                                onChange={(e) => actions.setPriceSlider(parseFloat(e.target.value))}
                                className="w-full h-4 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 mb-6"
                            />

                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Ekonomik</span>
                                <span>İdeal</span>
                                <span>Premium</span>
                            </div>
                        </div>

                        {/* Reputation Level */}
                        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-xl flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">İtibar / Kalite</h3>
                                    <p className="text-xs text-slate-500 font-medium">Uzun vadeli büyüme anahtarı</p>
                                </div>
                                <div className="text-3xl font-mono font-black text-emerald-400">%{reputation.toFixed(0)}</div>
                            </div>

                            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${reputation}%` }}
                                ></div>
                            </div>
                            <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {reputation > 80 ? '👑 Kusursuz İşletme' : reputation > 50 ? '⭐ İyi Servis' : '⚠️ Şikayet Geliyor'}
                            </p>
                        </div>
                    </div>

                    {/* New Insight Section: Potential Guest Feed */}
                    <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800/50 shadow-xl">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Gelen Müşteri Akışı (AI)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lastResult?.guestDecisions?.map((gd, idx) => (
                                <div key={idx} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">
                                            {gd.type === 'Business' ? '💼' : gd.type === 'Tourist' ? '🎒' : '🎒'}
                                        </span>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400">{gd.type}</p>
                                            <p className={`text-[9px] font-bold ${gd.accepted ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {gd.accepted ? 'Giriş Yaptı ✓' : gd.reason}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${gd.accepted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                                </div>
                            ))}
                            {!lastResult && <div className="col-span-3 py-8 text-center text-slate-600 italic font-bold">GÜNÜ BAŞLATIN...</div>}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: Reports & Big Actions (4 cols) --- */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Simulation Toggle */}
                    <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-slate-800/50 flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-white">Otomatik Simülasyon</h4>
                            <p className="text-[9px] text-slate-500">3 saniyede bir turn ilerler</p>
                        </div>
                        <button
                            onClick={() => actions.setIsIdleMode(!isIdleMode)}
                            className={`w-14 h-8 rounded-full transition-all relative ${isIdleMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isIdleMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {/* Last Day Summary */}
                    <div className="bg-gradient-to-br from-slate-900 to-[#1e1e2e] p-8 rounded-[3rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Finansal Rapor</h3>

                        {lastResult ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 text-xs font-bold uppercase">Doluluk</span>
                                    <span className="text-3xl font-mono font-black text-white">%{lastResult.occupancy.toFixed(1)}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${lastResult.occupancy}%` }}></div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 pt-4 font-mono font-bold">
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex justify-between">
                                        <span className="text-emerald-500/60 text-[10px] font-black uppercase">Brüt Gelir</span>
                                        <span className="text-emerald-400">+{Math.round(lastResult.revenue).toLocaleString('tr-TR')} ₺</span>
                                    </div>
                                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex justify-between">
                                        <span className="text-rose-500/60 text-[10px] font-black uppercase">Toplam Gider</span>
                                        <span className="text-rose-400">-{Math.round(lastResult.expense).toLocaleString('tr-TR')} ₺</span>
                                    </div>
                                    <div className={`p-6 rounded-2xl text-center border mt-2 transition-all ${lastResult.revenue - lastResult.expense > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                        <p className="text-[10px] uppercase font-black tracking-[0.2em] mb-1">Günlük Kar/Zarar</p>
                                        <p className="text-3xl font-black">
                                            {(lastResult.revenue - lastResult.expense > 0 ? '+' : '')}{Math.round(lastResult.revenue - lastResult.expense).toLocaleString('tr-TR')} ₺
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-600 font-bold italic border-2 border-dashed border-slate-800 rounded-3xl">
                                HAZIR OLUN...
                            </div>
                        )}
                    </div>

                    {/* Management Cards (Strategy) */}
                    <div className="space-y-4">
                        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800/50">
                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Pazarlama: {marketing}</h5>
                            <div className="grid grid-cols-4 gap-2">
                                {(['None', 'SocialMedia', 'Influencer', 'TV'] as MarketingLevel[]).map(m => (
                                    <button
                                        key={m} onClick={() => actions.setMarketing(m)}
                                        className={`h-10 rounded-lg flex items-center justify-center text-xs transition-all ${marketing === m ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        title={m}
                                    >
                                        {m[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800/50">
                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Personel: {staffing}</h5>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Minimum', 'Balanced', 'Premium'] as StaffLevel[]).map(s => (
                                    <button
                                        key={s} onClick={() => actions.setStaffing(s)}
                                        className={`h-10 rounded-lg flex items-center justify-center text-xs transition-all ${staffing === s ? 'bg-emerald-500 text-black font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        title={s}
                                    >
                                        {s[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* BIG ACTION BUTTON */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={actions.endTurn}
                            disabled={turnsLeftOnReno > 0 || isIdleMode}
                            className="w-full py-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[3rem] text-3xl font-black text-black tracking-tighter uppercase italic shadow-[0_30px_60px_-15px_rgba(16,185,129,0.5)] hover:scale-[1.02] hover:-translate-y-2 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                        >
                            Günü Bitir
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => actions.buyHotel()}
                                disabled={ownership === 'Own' || balance < calculatePurchasePrice(region, segmentIndex)}
                                className="p-4 bg-slate-900 border border-slate-800 rounded-3xl text-[9px] font-black uppercase tracking-widest hover:border-slate-500 transition-all disabled:opacity-30"
                            >
                                {ownership === 'Own' ? 'Mülk Sizin ✓' : 'Satın Al'}
                            </button>
                            <button
                                onClick={actions.upgradeSegment}
                                disabled={!nextSegment || balance < calculatePurchasePrice(region, segmentIndex + 1) * 0.2}
                                className="p-4 bg-slate-900 border border-slate-800 rounded-3xl text-[9px] font-black uppercase tracking-widest hover:border-slate-500 transition-all disabled:opacity-30"
                            >
                                Yükselt
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            {/* Region Selector Float */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 p-2 bg-slate-900/90 backdrop-blur-xl rounded-full border border-slate-800 shadow-2xl z-50">
                {(['Taksim', 'Sultanahmet', 'Besiktas'] as const).map(r => (
                    <button
                        key={r}
                        onClick={() => actions.setRegion(r)}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${region === r ? 'bg-white text-black shadow-lg shadow-white/30 scale-105' : 'text-slate-500 hover:text-white'}`}
                    >
                        {r}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
