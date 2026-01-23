import React, { useState } from 'react';

interface TerminalProps {
    onSubmit: (command: string) => void;
    disabled?: boolean;
}

export default function Terminal({ onSubmit, disabled }: TerminalProps) {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                onSubmit(input);
                setInput('');
            }
        }
    };

    return (
        <div className="border border-white/20 bg-black p-4 font-mono text-xs flex flex-col h-full">
            <div className="text-gray-500 mb-2">ArtEngine Console [v0.1.0]</div>
            <div className="flex-1 overflow-y-auto">
                {/* History could go here */}
            </div>
            <div className="flex gap-2 items-center mt-2 border-t border-white/10 pt-2">
                <span className="text-accent">{'>'}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    autoFocus
                    className="bg-transparent outline-none flex-1 text-foreground placeholder:text-gray-700"
                    placeholder="Enter command..."
                />
            </div>
        </div>
    );
}
