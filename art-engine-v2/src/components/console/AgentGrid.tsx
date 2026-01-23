"use client";

import React from 'react';
import { useStore } from '@/lib/store';
import { Bot, Zap, Image as ImageIcon, Code, Terminal, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const SkillIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'IMAGE_GEN': return <ImageIcon size={14} />;
        case 'CODE_GEN': return <Code size={14} />;
        case 'TEXT_GEN': return <Terminal size={14} />;
        default: return <Zap size={14} />;
    }
};

export default function AgentGrid() {
    const { agents, activeAgentId } = useStore();

    return (
        <div className="grid grid-cols-1 gap-3 p-4">
            {agents.map((agent) => (
                <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`
            relative p-4 rounded-xl border border-white/5 backdrop-blur-md transition-all duration-300
            ${activeAgentId === agent.id ? 'bg-white/10 border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 hover:bg-white/10'}
          `}
                >
                    {/* Status Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/40">{agent.status}</span>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${agent.status === 'IDLE' ? 'bg-white/20' :
                                agent.status === 'WORKING' ? 'bg-green-500' :
                                    agent.status === 'THINKING' ? 'bg-yellow-500' :
                                        agent.status === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'
                            }`} />
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg"
                            style={{ backgroundColor: agent.color }}
                        >
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide">{agent.name}</h3>
                            <p className="text-xs text-white/50">{agent.role}</p>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                        {agent.skills.map((skill) => (
                            <span
                                key={skill.id}
                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-black/20 border border-white/5 text-white/70"
                            >
                                <SkillIcon type={skill.type} />
                                {skill.name}
                            </span>
                        ))}
                    </div>
                </motion.div>
            ))}

            {/* Add New Agent Button Placeholder */}
            <button className="p-4 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm">
                <Brain size={16} />
                Initialize New Agent
            </button>
        </div>
    );
}
