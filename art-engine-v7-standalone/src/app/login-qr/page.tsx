"use client";

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export default function LoginQRPage() {
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState("Waiting for connection...");
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Generate Random Session ID
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);

        // Connect to Backend
        const newSocket = io('http://localhost:3005', {
            transports: ['websocket'],
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log("Connected to Auth Gateway");
            setStatus("Scan this code with the Nexus Mobile App");
            newSocket.emit('join_auth_session', newSessionId);
        });

        newSocket.on('session_authenticated', (data: { token: string; user: any }) => {
            console.log("Authenticated!", data);
            setStatus("Authenticated! Redirecting...");

            // Save Token (Adjust implementation based on project's auth storage)
            // Using localStorage for simplicity in this demo, or verify how app handles it
            localStorage.setItem('accessToken', data.token);
            document.cookie = `accessToken=${data.token}; path=/;`; // Fallback for middleware

            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [router]);

    return (
        <div className="flex min-h-screen bg-black text-white items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    Nexus Web
                </h1>
                <p className="text-zinc-400 mb-8">
                    Open Nexus on your phone and scan the code.
                </p>

                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-8 shadow-inner">
                    {sessionId ? (
                        <QRCodeSVG value={sessionId} size={240} />
                    ) : (
                        <div className="w-[240px] h-[240px] flex items-center justify-center text-black">
                            Loading...
                        </div>
                    )}
                </div>

                <div className="space-y-4 text-left px-8 text-zinc-500 text-sm">
                    <p className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">1</span>
                        Open Nexus Mobile App
                    </p>
                    <p className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">2</span>
                        Go to Login Screen &gt; Link Device
                    </p>
                    <p className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">3</span>
                        Point your camera at this screen
                    </p>
                </div>

                <p className="mt-8 text-emerald-500 font-medium animate-pulse">
                    {status}
                </p>
            </div>
        </div>
    );
}
