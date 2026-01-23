import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import { ShieldAlert, User, Mail, Lock, Phone, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginModal() {
    const { auth } = useStore();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
            const payload = mode === 'login'
                ? { identifier: email, password }
                : { email, password, fullName, whatsappNumber: whatsapp };

            const res = await api.post(endpoint, payload);

            // Backend now returns { access_token, user: { ... } }
            const { access_token, user } = res.data;

            auth.login(access_token, {
                id: user.id,
                fullName: user.fullName || email.split('@')[0],
                role: user.role,
                email: user.email
            });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (auth.token) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {/* Header / Tabs */}
                <div className="flex border-b border-white/5 bg-zinc-900/50">
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'login' ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <LogIn size={16} />
                        Sign In
                    </button>
                    <button
                        onClick={() => { setMode('register'); setError(''); }}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'register' ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <UserPlus size={16} />
                        Create Account
                    </button>
                </div>

                <div className="p-8">
                    <h2 className="text-xl font-bold mb-2 text-white">
                        {mode === 'login' ? 'Welcome Back' : 'Join Job Tracker'}
                    </h2>
                    <p className="text-sm text-zinc-500 mb-6 font-medium">
                        {mode === 'login' ? 'Sign in to access your dashboard' : 'Start tracking your creative workflow today'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={mode}
                                initial={{ x: 10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -10, opacity: 0 }}
                                className="space-y-4"
                            >
                                {mode === 'register' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 ml-1">
                                            <User size={12} /> Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white text-sm transition-colors"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 ml-1">
                                        <Mail size={12} /> {mode === 'login' ? 'Email or Username' : 'Email Address'}
                                    </label>
                                    <input
                                        type={mode === 'login' ? 'text' : 'email'}
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder={mode === 'login' ? "Email or username" : "name@company.com"}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white text-sm transition-colors"
                                    />
                                    {mode === 'register' && fullName && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-2">
                                            <div className="p-1 bgColor-emerald-500/20 rounded text-emerald-400">
                                                <User size={12} />
                                            </div>
                                            <p className="text-[10px] text-emerald-400 font-bold">
                                                Your username will be: <span className="underline decoration-dotted">{fullName.toLowerCase().replace(/\s+/g, '')}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {mode === 'register' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 ml-1">
                                            <Phone size={12} /> WhatsApp (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={whatsapp}
                                            onChange={e => setWhatsapp(e.target.value)}
                                            placeholder="+123..."
                                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white text-sm transition-colors"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5 ml-1">
                                        <Lock size={12} /> Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white text-sm transition-colors"
                                    />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    {/* Developer Options */}
                    <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await api.post('/auth/login', { identifier: 'admin@studio.com', password: 'admin123' });
                                    auth.login(res.data.access_token, res.data.user || { id: 3, fullName: 'Admin', role: 'admin', email: 'admin@studio.com' });
                                } catch (e) {
                                    auth.login('mock-token', { id: 3, fullName: 'Admin', role: 'admin', email: 'admin@studio.com' });
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-xs border border-white/5"
                        >
                            <ShieldAlert size={14} className="text-zinc-500" />
                            Developer Bypass (Quick Access)
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
