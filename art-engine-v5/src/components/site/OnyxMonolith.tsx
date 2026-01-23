
"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const PROJECTS = [
    { id: '01', title: 'NEURAL_SILENCE', tags: ['AI', 'AUDIO'], img: 'https://picsum.photos/seed/onyx1/800/600' },
    { id: '02', title: 'VOID_STRUCT', tags: ['ARCH', 'WEBGL'], img: 'https://picsum.photos/seed/onyx2/800/600' },
    { id: '03', title: 'ACID_PROTOCOL', tags: ['BRAND', 'SYSTEM'], img: 'https://picsum.photos/seed/onyx3/800/600' },
    { id: '04', title: 'ECHO_ZERO', tags: ['MOTION', 'LAB'], img: 'https://picsum.photos/seed/onyx4/800/600' },
];

export default function OnyxMonolith() {
    const { scrollYProgress } = useScroll();
    const yHero = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

    // Custom Cursor Logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const cursorX = useSpring(mouseX, { stiffness: 500, damping: 28 });
    const cursorY = useSpring(mouseY, { stiffness: 500, damping: 28 });

    React.useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            mouseX.set(e.clientX - 16);
            mouseY.set(e.clientY - 16);
        }
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, []);

    return (
        <div className="bg-[#050505] min-h-screen text-[#e5e5e5] font-sans selection:bg-[#ccff00] selection:text-black cursor-none">
            {/* Custom Cursor */}
            <motion.div
                style={{ x: cursorX, y: cursorY }}
                className="fixed top-0 left-0 w-8 h-8 bg-[#ccff00] rounded-full mix-blend-difference pointer-events-none z-50"
            />

            {/* Nav */}
            <nav className="fixed top-0 left-0 w-full p-8 flex justify-between z-40 mix-blend-difference">
                <span className="font-bold tracking-tighter text-xl">ONYX [MONOLITH]</span>
                <button className="uppercase text-sm font-bold tracking-widest hover:line-through decoration-[#ccff00]">Menu [00]</button>
            </nav>

            {/* Hero */}
            <section className="h-screen w-full relative flex items-center justify-center overflow-hidden border-b border-white/10">
                <motion.div style={{ y: yHero }} className="absolute inset-0 flex items-center justify-center opacity-30">
                    {/* Placeholder for Flux Asset */}
                    <div className="w-[40vw] h-[40vw] bg-zinc-800 rounded-full blur-[100px]" />
                </motion.div>

                <div className="z-10 w-full px-8 relative mix-blend-difference">
                    <motion.h1
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                        className="text-[12vw] leading-[0.85] font-black tracking-tighter text-left"
                    >
                        CREATIVE
                    </motion.h1>
                    <motion.h1
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
                        className="text-[12vw] leading-[0.85] font-black tracking-tighter text-right text-[#ccff00]" // Concrete/Acid
                    >
                        ENGINEER
                    </motion.h1>
                </div>
            </section>

            {/* Work Grid */}
            <section className="w-full px-4 py-32">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {PROJECTS.map((item, i) => (
                        <div key={item.id} className="md:col-span-12 group border-t border-white/20 py-12 relative overflow-hidden transition-colors hover:bg-white hover:text-black">
                            <div className="flex flex-col md:flex-row items-baseline justify-between px-4 z-10 relative">
                                <span className="text-sm font-mono text-white/50 group-hover:text-black/50 mb-4 md:mb-0">{item.id}</span>
                                <h2 className="text-[8vw] md:text-[6vw] font-bold leading-none tracking-tighter uppercase">{item.title}</h2>
                                <div className="hidden md:flex gap-4">
                                    {item.tags.map(t => <span key={t} className="text-xs border border-current px-2 py-1 rounded-full">{t}</span>)}
                                </div>
                                <ArrowUpRight className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                            </div>

                            {/* Hover Image Reveal */}
                            <motion.img
                                src={item.img}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-auto opacity-0 group-hover:opacity-20 pointer-events-none grayscale transition-opacity duration-0"
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Manifesto */}
            <section className="min-h-[50vh] flex items-center border-t border-b border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 w-full h-full">
                    <div className="hidden md:block border-r border-white/10 bg-[#1a1a1a]" />
                    <div className="p-12 flex flex-col justify-center">
                        <p className="text-3xl md:text-5xl font-bold leading-tight max-w-xl">
                            "WE BUILD IN THE DARK TO SERVE THE LIGHT."
                        </p>
                        <p className="mt-8 text-white/50 max-w-sm">
                            No component libraries. No templates. Just raw code and creative intent.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#ccff00] text-black py-40 px-8">
                <h2 className="text-[15vw] font-black leading-none tracking-tighter text-center hover:scale-[1.02] transition-transform cursor-pointer">
                    LETS TALK
                </h2>
                <div className="flex justify-between mt-20 font-mono text-sm uppercase border-t border-black/20 pt-8">
                    <span>ArtEngine v0.5</span>
                    <span>Onyx Monolith</span>
                    <span>2026</span>
                </div>
            </footer>
        </div>
    );
}
