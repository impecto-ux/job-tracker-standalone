"use client";

import React from 'react';
import AgentGrid from '@/components/console/AgentGrid';
import LogFeed from '@/components/console/LogFeed';
import Terminal from '@/components/console/Terminal';
import { useStore } from '@/lib/store';

export default function Home() {
  const { addMessage, updateAgentStatus, activeQuote } = useStore();

  const handleCommand = async (text: string, files: File[], config: { width: number, height: number, strength: number }) => {
    try {
      // 1. Add User Message
      addMessage({
        sender: 'USER',
        content: text,
        type: 'user',
        attachments: files.map(f => ({
          id: Math.random().toString(),
          type: f.type.startsWith('image/') ? 'image' : 'file',
          url: URL.createObjectURL(f),
          name: f.name
        }))
      });

      // 2. Upload Files (if any)
      // Note: For now, we just upload; in Img2Img we would use the path
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await fetch('/api/upload', { method: 'POST', body: fd });
      }

      // 3. Trigger Agent (Flux)
      const agentId = '2'; // Flux Agent
      updateAgentStatus(agentId, 'WORKING');

      const dims = config ? `(${config.width}x${config.height})` : '';
      addMessage({ sender: 'SYSTEM', content: `Agent "Flux" Is processing: "${text}" ${dims}...`, type: 'info' });

      // 4. Generate Workflow & Queue
      const { generateFluxWorkflow, generateFluxImageToImageWorkflow } = await import('@/lib/workflows');
      const { ComfyClient } = await import('@/lib/comfy');

      let workflow;

      if (activeQuote) {
        // Image to Image Flow
        addMessage({ sender: 'SYSTEM', content: `Creating variant of: ${activeQuote.filename}`, type: 'info' });

        // Fetch original image to re-upload
        const imgRes = await fetch(activeQuote.url);
        const imgBlob = await imgRes.blob();
        const file = new File([imgBlob], activeQuote.filename, { type: "image/png" });

        const uploadedName = await ComfyClient.uploadImage(file);

        // Use user defined strength
        const denoise = config.strength || 0.6;
        addMessage({ sender: 'SYSTEM', content: `Refining with strength: ${denoise.toFixed(2)}`, type: 'info' });

        workflow = generateFluxImageToImageWorkflow(text || "enhance, detailed", uploadedName, denoise);
      } else {
        // Text to Image Flow
        workflow = generateFluxWorkflow(text, config.width, config.height);
      }

      const { prompt_id } = await ComfyClient.queuePrompt(workflow);

      addMessage({ sender: 'SYSTEM', content: `Queued Task ID: ${prompt_id}`, type: 'info' });

      // 5. Poll for Result
      const checkStatus = async () => {
        const history = await ComfyClient.getHistory(prompt_id);

        if (history && history.status.completed) {
          updateAgentStatus(agentId, 'IDLE');

          // Extract Image
          const outputs = history.outputs;
          let imageUrl = null;
          let filename = "generated.png";

          // Find first image output (usually from SaveImage node "9")
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
              sender: 'SYSTEM',
              content: `Generation Complete: ${filename}`,
              type: 'success',
              attachments: [{
                id: Math.random().toString(),
                type: 'image',
                url: imageUrl,
                name: filename
              }]
            });
          } else {
            addMessage({ sender: 'SYSTEM', content: 'Generation finished but no image found.', type: 'warning' });
          }
        } else {
          // Keep Polling
          setTimeout(checkStatus, 1000);
        }
      };

      // Start Polling
      setTimeout(checkStatus, 1000);

    } catch (error) {
      console.error(error);
      addMessage({ sender: 'SYSTEM', content: `Error: ${String(error)}`, type: 'error' });
      updateAgentStatus('2', 'ERROR');
    }
  };

  return (
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white font-mono">
            AE
          </div>
          <span className="font-mono text-sm tracking-wider font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
            ARTENGINE v0.2
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-white/40">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            ONLINE
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* Left: Agents */}
        <section className="w-72 flex flex-col glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 text-xs font-mono text-white/50 uppercase tracking-widest">
            Active Agents
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AgentGrid />
          </div>
        </section>

        {/* Center: Logic / Logs */}
        <section className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden relative">
          {/* Log Feed */}
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              <LogFeed />
            </div>
            {/* Gradient Overlay for Top */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/20 border-t border-white/5 backdrop-blur-md">
            <Terminal onSubmit={handleCommand} />
            <div className="text-[10px] text-white/20 font-mono mt-2 text-center">
              Press Enter to send • Shift+Enter for new line • Drag & Drop files supported
            </div>
          </div>
        </section>

        {/* Right: Artifacts (Placeholder for now) */}
        <section className="w-80 flex flex-col glass-panel rounded-2xl overflow-hidden opacity-50 pointer-events-none">
          <div className="p-4 border-b border-white/5 text-xs font-mono text-white/50 uppercase tracking-widest">
            Artifacts
          </div>
          <div className="flex-1 flex items-center justify-center text-white/20 font-mono text-xs">
            NO ARTIFACTS
          </div>
        </section>

      </div>
    </main>
  );
}
