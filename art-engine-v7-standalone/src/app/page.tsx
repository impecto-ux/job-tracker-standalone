
"use client";

import dynamic from 'next/dynamic';

// Dynamic import to avoid hydration mismatches caused by browser extensions
const JobTrackerApp = dynamic(() => import('@/apps/JobTrackerApp'), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-black flex items-center justify-center text-zinc-500">Loading...</div>
});

export default function Home() {
  return (
    <main className="h-screen w-screen bg-zinc-950 overflow-hidden font-sans">
      <JobTrackerApp onExit={() => { }} />
    </main>
  );
}
