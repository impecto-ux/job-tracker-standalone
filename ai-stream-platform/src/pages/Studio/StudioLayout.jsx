import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const StudioLayout = () => {
    return (
        <div className="flex h-screen bg-neutral-900 text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-neutral-800 bg-black/50 backdrop-blur-md p-6 flex flex-col">
                <div className="mb-10">
                    <Link to="/" className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                        AI.STREAM
                        <span className="block text-xs font-normal text-neutral-500 tracking-widest mt-1">STUDIO</span>
                    </Link>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavLink to="/studio" label="Dashboard" icon={<LayoutGridIcon />} />
                    <NavLink to="/studio/videos" label="Videos" icon={<VideoIcon />} />
                    <NavLink to="/studio/analytics" label="Analytics" icon={<BarChartIcon />} disabled />
                    <NavLink to="/studio/settings" label="Settings" icon={<SettingsIcon />} disabled />
                </nav>

                <div className="mt-auto pt-6 border-t border-neutral-800">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                            A
                        </div>
                        <div>
                            <p className="text-sm font-medium">Admin</p>
                            <p className="text-xs text-neutral-500">Log out</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-neutral-950 p-8">
                <Outlet />
            </main>
        </div>
    );
};

// Sub-components for local use
const NavLink = ({ to, label, icon, disabled }) => (
    <Link
        to={disabled ? '#' : to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-neutral-800 hover:text-white text-neutral-400'
            }`}
    >
        {icon}
        {label}
    </Link>
);

const LayoutGridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
);

const VideoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
);

const BarChartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>
);

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default StudioLayout;
