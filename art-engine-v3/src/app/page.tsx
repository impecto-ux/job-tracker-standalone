"use client";

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AgentGrid from '@/components/console/AgentGrid';
import LogFeed from '@/components/console/LogFeed';
import Terminal from '@/components/console/Terminal';
import DirectorPanel from '@/components/console/DirectorPanel';
import { useStore } from '@/lib/store';
import { ComfyClient } from '@/lib/comfy';
import { workflows } from '@/lib/workflows';

export default function Home() {
  const { addMessage, updateAgentStatus, activeAgentId, agents, memory } = useStore();
  const [showDirector, setShowDirector] = useState(false);
  const activeAgent = agents.find(a => a.id === activeAgentId);

  const handleCommand = async (text: string, files: File[], config: { width: number, height: number, strength: number }) => {
    // --- V0.4 DIRECTOR OVERRIDE ---
    try {
      let finalPrompt = text;
      const activeVibe = memory.activeVibe ? memory.savedStyles.find(s => s.id === memory.activeVibe) : null;

      if (activeVibe) {
        finalPrompt = `${text}, ${activeVibe.promptModifier}`;
        // Log the intervention
        addMessage({
          sender: 'Creative Director',
          content: `Override applied: ${activeVibe.name} Protocol.`,
          type: 'warning',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      // ------------------------------

      addMessage({
        sender: 'User',
        content: text, // Show original text for clarity
        type: 'user',
        timestamp: new Date().toLocaleTimeString(),
        attachments: files.map(f => ({
          id: Math.random().toString(),
          type: f.type.startsWith('image') ? 'image' : 'file',
          url: URL.createObjectURL(f),
          name: f.name
        }))
      });

      // 2. Identify Agent & Workflow
      if (!activeAgent) return;

      updateAgentStatus(activeAgent.id, 'WORKING');
      addMessage({ sender: 'SYSTEM', content: `[${activeAgent.name}] Processing...`, type: 'info' });

      let workflow;
      let prompt_id;

      if (activeAgent.id === 'flux-context') {
        // --- FLUX CONTEXT AGENT ---
        const file = files[0];

        if (!file) {
          // Auto-fallback to Standard if no image provided
          addMessage({ sender: 'SYSTEM', content: 'No image provided. Switching to Flux Standard (Text-to-Image)...', type: 'warning' });
          workflow = workflows.standard(text, config.width, config.height);
        } else {
          // Upload
          const uploadedName = await ComfyClient.uploadImage(file);
          // Generate Workflow
          workflow = workflows.context(text, uploadedName, config.strength);
        }

      } else if (activeAgent.id === 'qwen-edit') {
        // --- QWEN CONTEXT AGENT ---
        const file1 = files[0];
        const file2 = files[1];

        if (!file1) throw new Error("Qwen Agent requires at least one image (Source).");

        addMessage({ sender: 'SYSTEM', content: 'Uploading Reference Images...', type: 'info' });

        const name1 = await ComfyClient.uploadImage(file1);
        let name2 = undefined;

        if (file2) {
          name2 = await ComfyClient.uploadImage(file2);
        }

        workflow = workflows.qwenContext(text, name1, name2);

      } else {
        // --- FLUX STANDARD AGENT ---
        workflow = workflows.standard(text, config.width, config.height);
      }

      // 3. Execute
      const res = await ComfyClient.queuePrompt(workflow);
      prompt_id = res.prompt_id;

      addMessage({ sender: 'SYSTEM', content: `Task ID: ${prompt_id}`, type: 'info' });

      // 4. Poll Results
      const checkStatus = async () => {
        const history = await ComfyClient.getHistory(prompt_id);

        if (history && history.status.completed) { // Corrected 'comple' to 'completed'
          updateAgentStatus(activeAgent.id, 'IDLE');

          // Extract Image
          const outputs = history.outputs;
          let imageUrl = null;
          let filename = "generated.png";

          // Find first image output
          for (const nodeId in outputs) {
            if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
              const img = outputs[nodeId].images[0];
              filename = img.filename;
              imageUrl = ComfyClient.getImageUrl(filename);
              break;
            }
          }

          if (imageUrl) {
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
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col font-sans">
      {/* Header / Top Bar */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-zinc-900/50 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            {/* Use a simple brain icon for Director v0.4 branding */}
            <DirectorPanel onClose={() => { }} />
            {/* Note: In real implementation, DirectorPanel is an overlay, this is just the icon wrapper, we'll fix the icon below */}
            <span className="font-bold text-lg">ArtEngine</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Director Toggle */}
          <button
            onClick={() => setShowDirector(!showDirector)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${showDirector || memory.activeVibe ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}
          >
            <span className="font-mono">{memory.activeVibe ? 'DIRECTOR: ACTIVE' : 'DIRECTOR'}</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          {/* Agent Selector (Simplified for now) */}
          <span className="text-zinc-500 text-xs">{activeAgent?.name}</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left: Agent Status Sidebar */}
        <div className="w-64 border-r border-white/10 bg-black/20 hidden md:block">
          <div className="p-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              Active Agents
            </h2>
            <div className="space-y-3">
              <AgentGrid /> {/* Reusing AgentGrid logic for list */}
            </div>
          </div>
        </div>

        {/* Center: Command Feed */}
        <div className="flex-1 flex flex-col relative min-w-0">
          <LogFeed />

          <div className="p-6 pb-8">
            <Terminal onSubmit={handleCommand} />
          </div>
        </div>

        {/* Right: Director Panel */}
        <AnimatePresence>
          {showDirector && <DirectorPanel onClose={() => setShowDirector(false)} />}
        </AnimatePresence>

      </div>
    </main>
  );
}
