
"use client";

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AgentGrid from '@/components/console/AgentGrid';
import LogFeed from '@/components/console/LogFeed';
import Terminal from '@/components/console/Terminal';
import DirectorPanel from '@/components/console/DirectorPanel';
import FlowEditor from '@/components/flow/FlowEditor';
import Library from '@/components/library/Library';
import { useStore } from '@/lib/store';
import { ComfyClient } from '@/lib/comfy';
import { workflows } from '@/lib/workflows';
import { TerminalSquare, Workflow, Images, ArrowLeft } from 'lucide-react';

interface CreativeStudioProps {
    onExit: () => void;
}

export default function CreativeStudio({ onExit }: CreativeStudioProps) {
    const { addMessage, updateAgentStatus, activeAgentId, agents, memory, logGeneration } = useStore();
    const [showDirector, setShowDirector] = useState(false);
    const [viewMode, setViewMode] = useState<'terminal' | 'canvas' | 'library'>('terminal');
    const activeAgent = agents.find(a => a.id === activeAgentId);

    const handleCommand = async (text: string, files: File[], config: { width: number, height: number, strength: number }) => {
        // --- V0.4 DIRECTOR OVERRIDE ---
        try {
            let finalPrompt = text;
            const activeVibe = memory.activeVibe ? memory.savedStyles.find(s => s.id === memory.activeVibe) : null;

            if (activeVibe) {
                finalPrompt = `${text}, ${activeVibe.promptModifier}`;
                addMessage({
                    sender: 'Creative Director',
                    content: `Override applied: ${activeVibe.name} Protocol.`,
                    type: 'warning'
                });
            }

            addMessage({
                sender: 'User',
                content: text,
                type: 'user',
                attachments: files.map(f => ({
                    id: Math.random().toString(),
                    type: f.type.startsWith('image') ? 'image' : 'file',
                    url: URL.createObjectURL(f),
                    name: f.name
                }))
            });

            if (!activeAgent) return;

            updateAgentStatus(activeAgent.id, 'WORKING');
            addMessage({ sender: 'SYSTEM', content: `[${activeAgent.name}] Processing...`, type: 'info' });

            let workflow;
            let prompt_id;

            if (activeAgent.id === 'flux-context') {
                const file = files[0];
                if (!file) {
                    addMessage({ sender: 'SYSTEM', content: 'No image provided. Switching to Flux Standard.', type: 'warning' });
                    workflow = workflows.standard(text, config.width, config.height);
                } else {
                    const uploadedName = await ComfyClient.uploadImage(file);
                    workflow = workflows.context(text, uploadedName, config.strength);
                }
            } else if (activeAgent.id === 'qwen-edit') {
                const file1 = files[0];
                const file2 = files[1];
                if (!file1) throw new Error("Qwen Agent requires at least one image.");
                addMessage({ sender: 'SYSTEM', content: 'Uploading Reference Images...', type: 'info' });
                const name1 = await ComfyClient.uploadImage(file1);
                let name2 = undefined;
                if (file2) name2 = await ComfyClient.uploadImage(file2);
                workflow = workflows.qwenContext(text, name1, name2);
            } else {
                workflow = workflows.standard(text, config.width, config.height);
            }

            const res = await ComfyClient.queuePrompt(workflow);
            prompt_id = res.prompt_id;

            addMessage({ sender: 'SYSTEM', content: `Task ID: ${prompt_id}`, type: 'info' });

            const checkStatus = async () => {
                const history = await ComfyClient.getHistory(prompt_id);
                if (history && history.status.completed) {
                    updateAgentStatus(activeAgent.id, 'IDLE');
                    const outputs = history.outputs;
                    let imageUrl = null;
                    let filename = "generated.png";

                    for (const nodeId in outputs) {
                        if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                            const img = outputs[nodeId].images[0];
                            filename = img.filename;
                            imageUrl = ComfyClient.getImageUrl(filename);
                            break;
                        }
                    }

                    if (imageUrl) {
                        logGeneration({
                            id: prompt_id,
                            imageUrl: imageUrl,
                            prompt: finalPrompt,
                            timestamp: new Date().toISOString(),
                            agentId: activeAgent.id,
                            vibeId: memory.activeVibe || undefined,
                            filename: filename
                        });

                        addMessage({
                            sender: activeAgent.name,
                            content: `Generation Complete`,
                            type: 'success',
                            attachments: [{
                                id: Math.random().toString(),
                                type: 'image',
                                url: imageUrl,
                                name: filename
                            }]
                        });
                    }
                } else {
                    setTimeout(checkStatus, 1000);
                }
            };
            setTimeout(checkStatus, 1000);

        } catch (error) {
            console.error(error);
            addMessage({ sender: 'SYSTEM', content: `Error: ${String(error)}`, type: 'error' });
            if (activeAgent) updateAgentStatus(activeAgent.id, 'ERROR');
        }
    };

    return (
        <div className="h-full w-full bg-black overflow-hidden flex flex-col font-sans">
            {/* App Header */}
            <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-zinc-900/50 backdrop-blur-sm z-30">
                <div className="flex items-center gap-3">
                    <button onClick={onExit} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <TerminalSquare className="text-indigo-400" size={18} />
                        <span className="font-bold text-sm">Creative Studio</span>
                    </div>

                    <div className="flex bg-white/5 rounded-lg p-1 ml-4 border border-white/5">
                        <button onClick={() => setViewMode('terminal')} className={`px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-2 ${viewMode === 'terminal' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>
                            <TerminalSquare size={14} /> TERMINAL
                        </button>
                        <button onClick={() => setViewMode('canvas')} className={`px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-2 ${viewMode === 'canvas' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-white'}`}>
                            <Workflow size={14} /> CANVAS
                        </button>
                        <button onClick={() => setViewMode('library')} className={`px-3 py-1 text-xs font-mono rounded-md transition-all flex items-center gap-2 ${viewMode === 'library' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500 hover:text-white'}`}>
                            <Images size={14} /> LIBRARY
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setShowDirector(!showDirector)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showDirector || memory.activeVibe ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
                        <span className="font-mono">{memory.activeVibe ? 'DIRECTOR: ACTIVE' : 'DIRECTOR'}</span>
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-zinc-500 text-xs">{activeAgent?.name}</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {viewMode === 'terminal' && (
                    <>
                        <div className="w-64 border-r border-white/10 bg-black/20 hidden md:block">
                            <div className="p-4">
                                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">Active Agents</h2>
                                <div className="space-y-3"><AgentGrid /></div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col relative min-w-0">
                            <LogFeed />
                            <div className="p-6 pb-8"><Terminal onSubmit={handleCommand} /></div>
                        </div>
                    </>
                )}
                {viewMode === 'canvas' && (
                    <div className="flex-1 relative bg-zinc-950">
                        <FlowEditor />
                        <div className="absolute top-4 left-4 z-10 bg-zinc-900/80 p-3 rounded-lg border border-white/10 backdrop-blur pointer-events-none">
                            <h3 className="text-xs font-bold text-white mb-1">Workflow Canvas</h3>
                            <p className="text-[10px] text-zinc-500">Connect nodes to build custom pipelines.</p>
                        </div>
                    </div>
                )}
                {viewMode === 'library' && <Library />}
                <AnimatePresence>{showDirector && <DirectorPanel onClose={() => setShowDirector(false)} />}</AnimatePresence>
            </div>
        </div>
    );
}
