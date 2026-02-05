"use client";

import React from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Zap, Image as ImageIcon, Wand2, Video, Bot } from 'lucide-react';
import { AgentType } from '@/lib/types';

const ICONS: any = {
    'TEXT_GEN': Bot,
    'IMAGE_GEN': ImageIcon,
    'IMAGE_EDIT': Wand2,
    'VID_GEN': Video
};

export default function AgentGrid() {
    const { agents, activeAgentId, setActiveAgent } = useStore();

    return (
        <div className="space-y-2">
            {agents.map((agent) => {
                const Icon = ICONS[agent.type] || Zap;
                const isActive = activeAgentId === agent.id;

                return (
                    <motion.div
                        key={agent.id}
                        layoutId={`agent-${agent.id}`}
                        onClick={() => setActiveAgent(agent.id)}
                        className={`
              relative p-3 rounded-xl cursor-pointer border transition-all duration-200 group
              ${isActive
                                ? 'bg-white/10 border-white/20 shadow-lg'
                                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}
            `}
                    >
                        {/* Status Dot */}
                        <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${agent.status === 'WORKING' ? 'bg-yellow-500 animate-pulse' :
                            agent.status === 'ERROR' ? 'bg-red-500' :
                                isActive ? 'bg-green-500' : 'bg-white/20'
                            }`} />

                        <div className="flex items-start gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                style={{ backgroundColor: isActive ? agent.color : 'rgba(255,255,255,0.05)' }}
                            >
                                <Icon size={20} className={isActive ? 'text-white' : 'text-white/40'} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>
                                    {agent.name}
                                </div>
                                <div className="text-[10px] text-white/40 truncate font-mono">
                                    {agent.role}
                                </div>
                            </div>
                        </div>

                        {/* Description (Visible when active) */}
                        {isActive && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2 text-[10px] text-white/50 leading-relaxed border-t border-white/5 pt-2"
                            >
                                {agent.description}
                            </motion.div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
