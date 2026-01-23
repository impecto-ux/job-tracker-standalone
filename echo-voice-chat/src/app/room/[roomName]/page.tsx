"use client";

import ActiveRoom from "@/components/ActiveRoom";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation"; // Correct hook for [roomName]

export default function RoomPage() {
    const params = useParams();
    const roomName = params.roomName as string;

    // For now, generate a random username if not known, or ask later. 
    // For MVP speed: "CyberDrifter_" + Random
    const username = "Operative_" + Math.floor(Math.random() * 1000);

    return (
        <main className="h-screen w-screen bg-black overflow-hidden relative">
            <div className="scanline" />
            <ActiveRoom roomName={roomName} username={username} />
        </main>
    );
}
