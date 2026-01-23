import React, { useEffect, useRef } from 'react';

interface Log {
    id: string;
    source: string;
    message: string;
    timestamp: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

interface LogFeedProps {
    logs: Log[];
}

export default function LogFeed({ logs }: LogFeedProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-full overflow-y-auto font-mono text-xs p-4 bg-black border border-white/10">
            {logs.map((log) => (
                <div key={log.id} className="mb-1 opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                    <span className={`font-bold mr-2 ${log.source === 'SYSTEM' ? 'text-purple-400' :
                            log.source === 'CD' ? 'text-yellow-400' :
                                log.source === 'BUILDER' ? 'text-blue-400' :
                                    'text-green-400'
                        }`}>
                        {log.source}:
                    </span>
                    <span className={log.type === 'success' ? 'text-green-400' : 'text-foreground'}>
                        {log.message}
                    </span>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
