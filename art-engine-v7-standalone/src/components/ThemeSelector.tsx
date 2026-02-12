'use client';

import { useStore } from '@/lib/store';
import { Check } from 'lucide-react';

const THEMES = [
    { id: 'echo', name: 'Echo', colors: ['bg-zinc-900', 'bg-emerald-500'] },
    { id: 'ocean', name: 'Ocean', colors: ['bg-slate-900', 'bg-blue-500'] },
    { id: 'midnight', name: 'Midnight', colors: ['bg-neutral-900', 'bg-violet-500'] },
    { id: 'rose', name: 'Rose', colors: ['bg-stone-900', 'bg-rose-500'] },
];

export function ThemeSelector() {
    const { theme, setTheme } = useStore();

    return (
        <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
                <button
                    key={t.id}
                    onClick={() => {
                        console.log('ThemeSelector: clicked', t.id);
                        setTheme(t.id);
                    }}
                    className={`relative flex items-center gap-3 p-2 rounded-lg border transition-all ${theme === t.id
                        ? 'bg-white/5 border-emerald-500/50 ring-1 ring-emerald-500/50'
                        : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'
                        }`}
                >
                    <div className="flex -space-x-1 shrink-0">
                        <div className={`w-4 h-4 rounded-full ${t.colors[0]} ring-1 ring-white/10`} />
                        <div className={`w-4 h-4 rounded-full ${t.colors[1]} ring-1 ring-white/10`} />
                    </div>
                    <span className="text-xs font-medium text-zinc-300">{t.name}</span>
                    {theme === t.id && (
                        <div className="absolute right-2 text-emerald-500">
                            <Check size={14} />
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}
