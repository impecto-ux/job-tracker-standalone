import React from 'react';

type AgentStatus = 'IDLE' | 'THINKING' | 'WORKING' | 'DONE';

interface AgentCardProps {
    name: string;
    role: string;
    status: AgentStatus;
}

const AgentCard = ({ name, role, status }: AgentCardProps) => {
    const getStatusColor = (s: AgentStatus) => {
        switch (s) {
            case 'IDLE': return 'bg-white/10 text-gray-500';
            case 'THINKING': return 'bg-yellow-500/20 text-yellow-500 animate-pulse';
            case 'WORKING': return 'bg-blue-500/20 text-blue-500 animate-pulse';
            case 'DONE': return 'bg-green-500/20 text-green-500';
        }
    };

    return (
        <div className={`border border-white/10 p-4 flex items-center justify-between font-mono transition-all duration-300 ${status !== 'IDLE' ? 'border-white/40' : ''}`}>
            <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest">{role}</div>
                <div className="text-sm font-bold">{name}</div>
            </div>
            <div className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(status)}`}>
                {status}
            </div>
        </div>
    );
};

interface AgentGridProps {
    agents: Array<{ id: string; name: string; role: string; status: AgentStatus }>;
}

export default function AgentGrid({ agents }: AgentGridProps) {
    return (
        <div className="grid grid-cols-1 gap-2">
            {agents.map((agent) => (
                <AgentCard key={agent.id} {...agent} />
            ))}
        </div>
    );
}
