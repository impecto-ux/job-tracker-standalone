"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Hash } from "lucide-react";

export default function Home() {
  const [roomName, setRoomName] = useState("");
  const router = useRouter();

  const handleConnect = () => {
    if (roomName) {
      router.push(`/room/${roomName}`);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f3f5] relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="z-10 w-full max-w-[440px] bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transform rotate-3">
            <Hash size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Join a Room</h1>
          <p className="text-gray-500 text-base leading-relaxed">
            Enter a room name to start your voice session. <br /> Simple, fast, and high quality.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Room Name</label>
            <div className="relative">
              <input
                type="text"
                value={roomName}
                placeholder="e.g. daily-standup"
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          <button
            disabled={!roomName}
            onClick={handleConnect}
            className="w-full h-12 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg shadow-gray-900/20"
          >
            Join Room
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 font-medium">
            Powered by <span className="text-indigo-600">Echo Voice Engine</span>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
