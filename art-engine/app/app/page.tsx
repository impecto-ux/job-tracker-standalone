"use client";

import React, { useState, useEffect, useRef } from 'react';
import Terminal from '@/components/console/Terminal';
import AgentGrid from '@/components/console/AgentGrid';
import LogFeed from '@/components/console/LogFeed';
import BrutalistPortfolio from '@/components/demos/BrutalistPortfolio';
import { comfy } from '@/lib/comfy';
import fluxWorkflow from '@/workflows/flux.json';

// Types
type AgentRole = 'CD' | 'BRAND' | 'UI' | 'BUILDER' | 'QA' | 'IMAGE';
type AgentStatus = 'IDLE' | 'THINKING' | 'WORKING' | 'DONE' | 'ERROR';

interface Log {
  id: string;
  source: string;
  message: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export default function ArtEngineDashboard() {
  // State
  const [agents, setAgents] = useState([
    { id: '1', name: 'Creative Director', role: 'STRATEGY', status: 'IDLE' as AgentStatus },
    { id: '2', name: 'Brand Systems', role: 'VISUALS', status: 'IDLE' as AgentStatus },
    { id: '3', name: 'UI/UX Agent', role: 'STRUCTURE', status: 'IDLE' as AgentStatus },
    { id: '4', name: 'Motion Agent', role: 'VIBE', status: 'IDLE' as AgentStatus },
    { id: '5', name: 'Builder Agent', role: 'CODE', status: 'IDLE' as AgentStatus },
    { id: '6', name: 'Image Agent', role: 'GEN_AI', status: 'IDLE' as AgentStatus },
  ]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<'PORTFOLIO' | 'IMAGE' | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nodeProgress, setNodeProgress] = useState<number>(0);

  // ComfyUI Connection
  useEffect(() => {
    const initComfy = async () => {
      try {
        addLog('SYSTEM', 'Connecting to ComfyUI (127.0.0.1:8000)...', 'info');
        await comfy.connect();
        addLog('SYSTEM', 'ComfyUI Connected Successfully.', 'success');

        // Listen for progress
        comfy.on('progress', (data) => {
          setNodeProgress(data.value / data.max * 100);
        });

        // Listen for execution start
        comfy.on('execution_start', (data) => {
          addLog('IMAGE_AGENT', 'Starting workflow execution...', 'info');
          updateAgent('Image Agent', 'WORKING');
        });

        comfy.on('executing', (data) => {
          if (data.node) {
            addLog('IMAGE_AGENT', `Processing Node: ${data.node}`, 'info');
          } else {
            // Finish
            updateAgent('Image Agent', 'DONE');
          }
        });

      } catch (err) {
        addLog('SYSTEM', 'Failed to connect to ComfyUI. Is it running?', 'error');
        updateAgent('Image Agent', 'ERROR');
      }
    };
    initComfy();
  }, []);

  // Helper to add log
  const addLog = (source: string, message: string, type: Log['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { id: Math.random().toString(), source, message, timestamp, type }]);
  };

  // Helper to update agent
  const updateAgent = (role: string, status: AgentStatus) => {
    setAgents(prev => prev.map(a => a.name.includes(role) ? { ...a, status } : a));
  };

  const handleCommand = async (command: string) => {
    if (command.startsWith('ArtEngine: theme=')) {
      await runPortfolioSimulation(command);
    } else if (command.startsWith('ArtEngine: generate')) {
      const prompt = command.split('generate')[1].trim();
      await runImageGeneration(prompt);
    } else {
      addLog('SYSTEM', `Unknown command: ${command}`, 'warning');
    }
  };

  // 1. Portfolio Simulation (Existing)
  const runPortfolioSimulation = async (command: string) => {
    setIsProcessing(true);
    setActiveArtifact(null);
    setLogs([]);

    addLog('SYSTEM', `Recieved Command: ${command}`, 'info');

    updateAgent('Creative Director', 'THINKING');
    await wait(1000);
    addLog('CD', 'Analyzing aesthetic requirements...', 'info');
    await wait(1500);
    updateAgent('Creative Director', 'DONE');
    addLog('CD', 'Creative Brief Generated: Brutalist/Dark/Experimental', 'success');

    updateAgent('Brand', 'WORKING');
    await wait(1000);
    addLog('BRAND', 'Generating tokens.json...', 'info');
    await wait(1000);
    updateAgent('Brand', 'DONE');
    addLog('BRAND', 'Color Palette: #050505 (Background), #FF3300 (Accent)', 'success');

    updateAgent('UI', 'WORKING');
    await wait(1200);
    addLog('UI', 'Constructing sitemap and component tree...', 'info');
    updateAgent('UI', 'DONE');

    updateAgent('Builder', 'WORKING');
    addLog('BUILDER', 'Initializing Next.js environment...', 'info');
    await wait(1000);
    addLog('BUILDER', 'Compiling React components...', 'info');
    await wait(1500);
    updateAgent('Builder', 'DONE');
    addLog('BUILDER', 'Build Complete. Deployment Ready.', 'success');

    await wait(500);
    addLog('SYSTEM', 'Opening Preview...', 'success');
    setActiveArtifact('PORTFOLIO');
    setIsProcessing(false);
  };

  // 2. Image Generation (New)
  const runImageGeneration = async (userPrompt: string) => {
    setIsProcessing(true);
    setActiveArtifact(null);
    setGeneratedImageUrl(null);

    addLog('SYSTEM', `Recieved Generation Command: "${userPrompt}"`, 'info');
    updateAgent('Image Agent', 'THINKING');

    try {
      // Prepare Workflow
      const workflow = JSON.parse(JSON.stringify(fluxWorkflow)); // Clone

      // Inject Prompt (Node 6 = CLIP Text Encode Positive)
      if (workflow["6"]) {
        workflow["6"].inputs.text = userPrompt;
      }
      // Inject Seed (Node 3 = KSampler)
      if (workflow["3"]) {
        workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);
      }

      addLog('IMAGE_AGENT', 'Workflow prepared. Sending to ComfyUI...', 'info');

      const result = await comfy.queuePrompt(workflow);
      const promptId = result.prompt_id;
      addLog('SYSTEM', `Queued Prompt ID: ${promptId}`, 'success');

      // Wait for result logic is handled by socket listeners roughly, 
      // but we need to fetch the image when done. 
      // For simplicity, we'll poll or wait for specific socket event "executed".
      // In a production app, we'd match the promptId.

      // Listen for 'executed' event via ComfyClient logic connection
      comfy.on('executed', async (data) => {
        if (data.prompt_id === promptId) {
          const filename = data.output.images[0].filename;
          const subfolder = data.output.images[0].subfolder;
          addLog('IMAGE_AGENT', `Generation Complete: ${filename}`, 'success');

          const url = await comfy.getImage(filename, subfolder);
          setGeneratedImageUrl(url);
          setActiveArtifact('IMAGE');
          setIsProcessing(false);
          updateAgent('Image Agent', 'IDLE');
        }
      });

    } catch (err) {
      addLog('IMAGE_AGENT', `Generation Failed: ${err}`, 'error');
      updateAgent('Image Agent', 'ERROR');
      setIsProcessing(false);
    }
  };

  return (
    <main className="h-screen w-full bg-[#111] text-white overflow-hidden flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-mono text-sm font-bold tracking-widest">ARTENGINE CONSOLE</span>
        </div>
        <div className="font-mono text-xs text-gray-500">Connected: localhost:3000 | AI: 127.0.0.1:8000</div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Agents */}
        <aside className="w-64 border-r border-white/10 bg-black/50 p-4 flex flex-col gap-4">
          <div className="text-xs text-gray-500 uppercase font-mono mb-2">Active Agents</div>
          <AgentGrid agents={agents} />
        </aside>

        {/* Center: Logic / Logs */}
        <section className={`flex-1 flex flex-col transition-all duration-500 ${activeArtifact ? 'w-1/3 max-w-[400px]' : 'w-full'}`}>
          <div className="flex-1 overflow-hidden relative">
            <LogFeed logs={logs} />
            {logs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-mono text-sm pointer-events-none">
                Waiting for command...
              </div>
            )}
          </div>
          <div className="h-48">
            <Terminal onSubmit={handleCommand} disabled={isProcessing} />
          </div>
        </section>

        {/* Right: Preview (Conditional) */}
        {activeArtifact && (
          <aside className="flex-[2] border-l border-white/10 relative shadow-2xl animate-in slide-in-from-right duration-700 bg-black">
            <div className="absolute top-0 right-0 bg-black text-white text-xs px-2 py-1 z-50 font-mono border-b border-l border-white/20">
              ARTIFACT PREVIEW: {activeArtifact}
            </div>

            {activeArtifact === 'PORTFOLIO' && (
              <div className="w-full h-full overflow-y-auto bg-white/5">
                <BrutalistPortfolio />
              </div>
            )}

            {activeArtifact === 'IMAGE' && generatedImageUrl && (
              <div className="w-full h-full flex items-center justify-center p-8">
                <img
                  src={generatedImageUrl}
                  alt="Generated Output"
                  className="max-w-full max-h-full border border-white/20 shadow-2xl"
                />
              </div>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

// Utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
