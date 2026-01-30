
"use client";

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from '@/components/dashboard/Dashboard';
import CreativeStudio from '@/apps/CreativeStudio';
import OnyxApp from '@/apps/OnyxApp';
import HashTrackerApp from '@/apps/HashTrackerApp';
import PosterStudioApp from '@/apps/PosterStudioApp';
import JobTrackerApp from '@/apps/JobTrackerApp';

type AppId = 'dashboard' | 'studio' | 'onyx' | 'hashtracker' | 'poster' | 'jobtracker';

export default function Home() {
  const [activeApp, setActiveApp] = useState<AppId>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appParam = params.get('app');
    if (appParam && ['studio', 'onyx', 'hashtracker', 'poster', 'jobtracker'].includes(appParam)) {
      setActiveApp(appParam as AppId);
    }
  }, []);

  return (
    <main className="h-screen w-screen bg-black overflow-hidden font-sans">
      <AnimatePresence mode="wait">

        {/* DASHBOARD (Launcher) */}
        {activeApp === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <Dashboard onLaunch={(id) => setActiveApp(id as AppId)} />
          </motion.div>
        )}

        {/* CREATIVE STUDIO APP */}
        {activeApp === 'studio' && (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="h-full w-full fixed inset-0 z-50"
          >
            <CreativeStudio onExit={() => setActiveApp('dashboard')} />
          </motion.div>
        )}

        {/* POSTER STUDIO APP */}
        {activeApp === 'poster' && (
          <motion.div
            key="poster"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full w-full fixed inset-0 z-50 bg-black"
          >
            <PosterStudioApp onExit={() => setActiveApp('dashboard')} />
          </motion.div>
        )}

        {/* ONYX MONOLITH APP */}
        {activeApp === 'onyx' && (
          <motion.div
            key="onyx"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full fixed inset-0 z-50"
          >
            <OnyxApp />
            {/* Floating OS Home Button for specialized apps without nav */}
            <button
              onClick={() => setActiveApp('dashboard')}
              className="fixed bottom-8 right-8 z-[100] bg-white/10 hover:bg-white text-white hover:text-black px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold uppercase tracking-widest transition-all"
            >
              Exit Demo
            </button>
          </motion.div>
        )}

        {/* HASH TRACKER APP */}
        {activeApp === 'hashtracker' && (
          <motion.div
            key="hashtracker"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="h-full w-full fixed inset-0 z-50"
          >
            <HashTrackerApp onExit={() => setActiveApp('dashboard')} />
          </motion.div>
        )}

        {/* JOB TRACKER APP */}
        {activeApp === 'jobtracker' && (
          <motion.div
            key="jobtracker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full fixed inset-0 z-50 bg-black"
          >
            <JobTrackerApp onExit={() => setActiveApp('dashboard')} />
            {/* Temporary Back Button until JobTracker has integrated navigation */}
            <button
              onClick={() => setActiveApp('dashboard')}
              className="fixed top-4 right-4 z-[100] bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xl"
            >
              Back to OS
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </main >
  );
}
