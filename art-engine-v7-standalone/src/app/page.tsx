
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
  return (
    <main className="h-screen w-screen bg-black overflow-hidden font-sans">
      <JobTrackerApp onExit={() => { }} />
    </main>
  );
}
