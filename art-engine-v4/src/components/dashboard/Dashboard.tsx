"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TerminalSquare, Box, Settings, Cpu, Grid, Hash, Palette, Briefcase, Book } from 'lucide-react';

interface AppDef {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    devStatus: 'stable' | 'beta' | 'alpha';
}

const INSTALLED_APPS: AppDef[] = [
    {
        id: 'hashtracker',
        name: 'Hash Tracker',
        description: 'Personal Finance OS & Crypto Analytics',
        icon: Hash,
        color: 'text-indigo-400',
        devStatus: 'stable'
    },
    {
        id: 'poster',
        name: 'PosterStudio',
        description: 'AI-Powered Graphic Design Canvas',
        icon: Palette,
        color: 'text-pink-400',
        devStatus: 'alpha'
    },
    {
        id: 'jobtracker',
        name: 'Job Tracker',
        description: 'Work OS: Tasks, Assignments & Audit Logs',
        icon: Briefcase,
        color: 'text-emerald-400',
        devStatus: 'beta'
    },
    {
        id: 'studio',
        name: 'Creative Terminal',
        description: 'Legacy Command Line Interface',
        icon: TerminalSquare,
        color: 'text-zinc-500',
        devStatus: 'stable'
    }
];

interface DashboardProps {
    onLaunch: (appId: string) => void;
}

export default function Dashboard({ onLaunch }: DashboardProps) {

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-white/20 relative overflow-hidden">
            {/* OS Header */}
            <header className="flex justify-between items-center mb-16 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                        <Grid size={16} />
                    </div>
                    <h1 className="font-bold tracking-tight">ArtEngine OS <span className="text-zinc-500 font-mono text-xs">v0.5</span></h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                    <span className="flex items-center gap-2"><Cpu size={12} /> SYSTEM: ONLINE</span>
                    <span>MEM: 24%</span>
                </div>
            </header>

            {/* App Grid */}
            <main className="max-w-5xl mx-auto">
                <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">Installed Applications</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {INSTALLED_APPS.map((app, i) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => onLaunch(app.id)}
                            className="group relative bg-zinc-900/50 border border-white/5 hover:border-white/20 rounded-xl p-6 cursor-pointer hover:bg-zinc-900 transition-all overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className={`p-3 rounded-lg bg-white/5 ${app.color}`}>
                                    <app.icon size={24} />
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white">
                                    <Settings size={14} />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">{app.name}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed mb-4">{app.description}</p>

                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-white/5 ${app.devStatus === 'stable' ? 'text-emerald-400 bg-emerald-500/10' :
                                    app.devStatus === 'beta' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400'
                                    }`}>
                                    {app.devStatus}
                                </span>
                            </div>

                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </motion.div>
                    ))}

                    {/* Add New App Placeholder */}
                    <div className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center opacity-50 hover:opacity-80 transition-opacity cursor-not-allowed">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="text-2xl text-zinc-500 font-light">+</span>
                        </div>
                        <span className="text-sm text-zinc-500 font-medium">New App...</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
