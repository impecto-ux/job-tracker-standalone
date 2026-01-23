"use client";

import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    ControlBar,
    useTracks,
    useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { Copy, Hash, Mic, MicOff, Headphones, Settings, Monitor, PhoneOff, Video, VideoOff, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ActiveRoom({ roomName, username }: { roomName: string; username: string }) {
    const [token, setToken] = useState("");
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch(
                    `/api/token?room=${roomName}&username=${username}`
                );
                const data = await resp.json();
                setToken(data.token);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [roomName, username]);

    if (token === "") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#313338] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold">Authenticating...</p>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "100vh" }}
            onDisconnected={() => router.push("/")}
        >
            <div className="flex h-screen bg-[#313338] text-[#DBDEE1]">

                {/* 1. Server List (Leftmost) */}
                <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2 overflow-y-auto hidden md:flex shrink-0">
                    <div className="w-12 h-12 bg-[#5865F2] rounded-[16px] flex items-center justify-center text-white hover:rounded-[12px] transition-all cursor-pointer shadow-sm">
                        <img src="https://assets-global.website-files.com/6257adef93867e56f84d310a/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" className="w-7 h-7" />
                    </div>
                    <div className="w-8 h-[2px] bg-[#35363C] rounded-lg mx-auto" />

                    {/* Mock Servers */}
                    {[1, 2, 3].map(i => (
                        <div key={i} className="group relative w-12 h-12 bg-[#313338] hover:bg-[#5865F2] rounded-[24px] hover:rounded-[16px] transition-all cursor-pointer flex items-center justify-center font-bold text-white overflow-hidden">
                            {i === 1 ? 'E' : i === 2 ? 'TS' : 'JS'}
                        </div>
                    ))}
                </div>

                {/* 2. Channel List (Middle) */}
                <div className="w-60 bg-[#2B2D31] flex flex-col hidden md:flex shrink-0">
                    {/* Server Header */}
                    <div className="h-12 border-b border-[#1E1F22] flex items-center px-4 font-bold text-white shadow-sm hover:bg-[#35373C] cursor-pointer transition-colors">
                        Echo Server
                    </div>

                    {/* Channels */}
                    <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                        <div className="flex items-center gap-1.5 px-2 py-1 text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1] rounded cursor-pointer group">
                            <Hash size={20} />
                            <span className="font-medium">general</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1] rounded cursor-pointer group">
                            <Hash size={20} />
                            <span className="font-medium">memes</span>
                        </div>

                        <div className="mt-4 flex items-center gap-1 px-2 text-xs font-bold text-[#949BA4] uppercase hover:text-[#DBDEE1] cursor-pointer">
                            <span className="transform translate-y-[1px]">▼</span> VOICE CHANNELS
                        </div>

                        <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#404249] text-white rounded cursor-pointer">
                                <Volume2 size={20} />
                                <span className="font-medium">{roomName}</span>
                            </div>
                            <div className="pl-8 text-xs text-[#949BA4] flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] text-white border-2 border-[#2B2D31]">You</div>
                            </div>
                        </div>
                    </div>

                    {/* User Control Panel (Bottom) */}
                    <div className="h-[52px] bg-[#232428] flex items-center px-2 gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm font-bold text-white relative">
                            {username.substring(0, 2).toUpperCase()}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23A559] rounded-full border-2 border-[#232428]" />
                        </div>
                        <div className="flex flex-col min-w-0 mr-auto">
                            <span className="text-sm font-bold text-white truncate">{username}</span>
                            <span className="text-xs text-[#949BA4] truncate">Online</span>
                        </div>

                        <div className="flex items-center">
                            <button className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded transition-colors"><Mic size={18} /></button>
                            <button className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded transition-colors"><Headphones size={18} /></button>
                            <button className="w-8 h-8 flex items-center justify-center hover:bg-[#3F4147] rounded transition-colors"><Settings size={18} /></button>
                        </div>
                    </div>
                </div>

                {/* 3. Main Chat / Voice Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
                    {/* Header */}
                    <div className="h-12 border-b border-[#26272D] flex items-center px-4 justify-between shadow-sm shrink-0">
                        <div className="flex items-center gap-2 text-white">
                            <Hash size={24} className="text-[#949BA4]" />
                            <span className="font-bold">{roomName}</span>
                            <div className="w-px h-6 bg-[#3F4147] mx-2" />
                            <span className="text-xs text-[#949BA4]">Voice Connected</span>
                        </div>
                        <div className="flex items-center gap-4 text-[#B5BAC1]">
                            <PhoneOff size={24} className="text-[#F23F42] hover:text-white cursor-pointer" onClick={() => router.push('/')} />
                        </div>
                    </div>

                    {/* The Actual Video Grid (Black BG) */}
                    <div className="flex-1 bg-black p-4 overflow-y-auto custom-scrollbar">
                        <MyVideoConference />
                    </div>

                    {/* Bottom Controls (Voice/Video) */}
                    <div className="h-20 bg-black flex justify-center items-center gap-4 shrink-0 mb-4 rounded-xl mx-4">
                        <ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: true, chat: false }} />
                    </div>
                </div>
            </div>

        </LiveKitRoom>
    );
}

function MyVideoConference() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
            { source: Track.Source.Microphone, withPlaceholder: true }
        ],
        { onlySubscribed: false },
    );

    return (
        <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 160px)' }}>
            <ParticipantTile />
        </GridLayout>
    );
}
