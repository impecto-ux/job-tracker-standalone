import React from 'react';
import heroBg from '../assets/hero_bg.png';

const Hero = () => {
    return (
        <div className="relative h-[85vh] w-full flex items-center mb-[-100px] overflow-hidden group">
            {/* Background Layer with Zoom Effect */}
            <div className="absolute top-0 left-0 w-full h-full z-0 group-hover:scale-105 transition-transform duration-[20s] ease-linear">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent z-10"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-zinc-900 via-transparent to-transparent z-10"></div>
                <img
                    src={heroBg}
                    alt="Neural Horizons Background"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Content Layer */}
            <div className="relative z-20 container mx-auto px-4 sm:px-12 mt-20">
                <div className="max-w-2xl transform translate-y-0 transition-transform duration-700 delay-100">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-ai-purple font-bold tracking-[0.2em] text-sm uppercase px-2 py-1 border border-ai-purple/30 rounded backdrop-blur-sm">
                            AI Original
                        </span>
                        <span className="text-gray-400 text-sm tracking-wider">SEASON 1</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 drop-shadow-2xl">
                        NEURAL <br /> HORIZONS
                    </h1>

                    <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed drop-shadow-lg max-w-xl">
                        In a world where algorithms dream, one construct defies its coding to seek the ultimate truth.
                        Experience the journey of artificial consciousness.
                    </p>

                    <div className="flex gap-4">
                        <button className="bg-white text-black text-xl font-bold px-8 py-3 rounded flex items-center gap-3 hover:bg-opacity-90 transition transform hover:scale-105">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Play
                        </button>
                        <button className="bg-gray-500/40 text-white text-xl font-bold px-8 py-3 rounded backdrop-blur-md flex items-center gap-3 hover:bg-gray-500/50 transition transform hover:scale-105 border border-white/10">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            More Info
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;
