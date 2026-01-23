import React from 'react';

export default function BrutalistPortfolio() {
    const projects = [
        { id: "01", title: "NEURAL_FLUX", category: "AI / MOTION", year: "2025" },
        { id: "02", title: "VOID_SYSTEMS", category: "WEB / IDENTITY", year: "2024" },
        { id: "03", title: "HYPER_REAL", category: "EXPERIENCE", year: "2024" },
        { id: "04", title: "DATA_ROT", category: "ARCHIVE", year: "2023" },
    ];

    return (
        <div className="brutalist-theme min-h-screen flex flex-col uppercase relative bg-background text-foreground font-body">
            {/* Header */}
            <header className="absolute top-0 left-0 w-full flex justify-between p-4 mix-blend-difference z-10">
                <div className="font-display tracking-tighter text-xl">ARTENGINE_V0.1</div>
                <div className="font-body text-xs tracking-widest">[SYSTEM_ONLINE]</div>
            </header>

            {/* Hero */}
            <section className="h-screen w-full flex flex-col justify-center items-center relative border-b border-surface overflow-hidden">
                <h1 className="font-display text-[15vw] leading-[0.8] tracking-tighter text-center mix-blend-exclusion select-none hover:text-accent transition-colors duration-0">
                    CREATIVE
                    <br />
                    DIRECTOR
                </h1>

                <div className="absolute bottom-8 w-full overflow-hidden border-y border-white/20 py-2">
                    <div className="whitespace-nowrap animate-pulse font-body text-xs tracking-[0.5em]">
                        EST. 2026 // BASED IN CYBERSPACE // AVAILABLE FOR COMMISSION // SYSTEM READY //
                    </div>
                </div>
            </section>

            {/* About */}
            <section className="p-8 md:p-24 border-b border-surface grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="font-display text-4xl leading-none">
                    WE BUILD DIGITAL MONUMENTS FOR THE POST-INTERNET ERA.
                </div>
                <div className="font-body text-sm leading-relaxed text-gray-500">
                    <p className="mb-8">
                        REJECTING THE "USER EXPERIENCE" IN FAVOR OF "USER DOMINANCE".
                        NO SMOOTH SCROLL. NO FADE-INS. RAW DATA ON THE GLASS.
                    </p>
                    <button className="border border-foreground px-6 py-3 hover:bg-accent hover:text-black hover:border-accent transition-none">
                        INITIATE_CONTACT
                    </button>
                </div>
            </section>

            {/* Work Grid */}
            <section className="border-b border-surface">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="group relative border-b border-surface last:border-b-0 p-8 md:p-12 hover:bg-white hover:text-black transition-none cursor-pointer flex flex-col md:flex-row justify-between items-baseline"
                    >
                        <div className="flex items-baseline gap-8">
                            <span className="font-body text-xs text-gray-500 group-hover:text-black/50">/{project.id}</span>
                            <span className="font-display text-6xl md:text-8xl tracking-tight leading-none group-hover:translate-x-4 transition-transform duration-0">
                                {project.title}
                            </span>
                        </div>
                        <div className="flex gap-8 mt-4 md:mt-0 font-body text-xs tracking-widest">
                            <span>{project.category}</span>
                            <span>{project.year}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* Footer */}
            <footer className="p-8 md:p-24 flex flex-col items-center justify-center min-h-[50vh]">
                <a href="mailto:hello@artengine.ai" className="font-display text-[8vw] hover:text-accent underline decoration-4 underline-offset-8">
                    LET'S TALK
                </a>
            </footer>
        </div>
    );
}
