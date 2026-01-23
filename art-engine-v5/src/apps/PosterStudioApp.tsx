import React from 'react';
import { ArrowLeft, Palette, Image as ImageIcon, Type, Download } from 'lucide-react';

interface PosterStudioProps {
    onExit: () => void;
}

export default function PosterStudioApp({ onExit }: PosterStudioProps) {
    return (
        <div className="h-full w-full bg-zinc-950 text-white font-sans flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Palette className="text-pink-500" size={24} />
                        <h1 className="font-bold text-lg tracking-tight">PosterStudio</h1>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white text-black font-bold rounded-lg text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Tools */}
                <div className="w-20 border-r border-white/10 bg-zinc-900/30 flex flex-col items-center py-6 gap-6">
                    <ToolButton icon={<ImageIcon size={24} />} label="AI Art" active />
                    <ToolButton icon={<Type size={24} />} label="Text" />
                    <ToolButton icon={<Palette size={24} />} label="Shapes" />
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-zinc-950 flex items-center justify-center p-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)', backgroundSize: '40px 40px' }}
                    />

                    {/* The Poster Board */}
                    <div className="aspect-[2/3] h-full bg-white shadow-2xl shadow-purple-500/10 rounded-sm relative overflow-hidden group">
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                            <div className="text-center">
                                <p className="mb-2">Empty Canvas</p>
                                <p className="text-xs text-zinc-400">Drag items here or generate background</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Properties Panel */}
                <div className="w-80 border-l border-white/10 bg-zinc-900/30 p-6">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">AI Generator</h3>
                    <div className="space-y-4">
                        <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:border-pink-500/50 transition-colors"
                            placeholder="Describe your poster background... (e.g. 'Cyberpunk city with neon lights')"
                        />
                        <button className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-sm text-white transition-colors shadow-lg shadow-pink-500/20">
                            Generate Background
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToolButton({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`flex flex-col items-center gap-1 group ${active ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <div className={`p-3 rounded-xl transition-all ${active ? 'bg-pink-500/10' : 'bg-transparent group-hover:bg-white/5'}`}>
                {icon}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}
