import React, { useState } from 'react';
import { X, AlertTriangle, Layers, Type, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RevisionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    taskTitle: string;
}

export const RevisionRequestModal: React.FC<RevisionRequestModalProps> = ({ isOpen, onClose, onSubmit, taskTitle }) => {
    const [type, setType] = useState('visual');
    const [severity, setSeverity] = useState('low');
    const [description, setDescription] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({ type, severity, description, attachmentUrl });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <Layers className="text-amber-500" size={24} />
                            REQUEST REVISION
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-widest">
                            {taskTitle}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Revision Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Type size={12} /> Revision Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['visual', 'logic', 'content', 'bug', 'other'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${type === t
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                            : 'bg-zinc-800/50 border-white/5 text-zinc-500 hover:border-white/20'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Severity */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle size={12} /> Severity Level
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { val: 'low', color: 'bg-blue-500' },
                                { val: 'medium', color: 'bg-amber-500' },
                                { val: 'high', color: 'bg-orange-600' },
                                { val: 'critical', color: 'bg-rose-600' }
                            ].map(({ val, color }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setSeverity(val)}
                                    className={`group relative px-2 py-3 rounded-lg border transition-all overflow-hidden ${severity === val
                                            ? 'border-white/20 text-white'
                                            : 'bg-zinc-800/30 border-white/5 text-zinc-500 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className={`absolute inset-0 opacity-10 ${severity === val ? color : ''}`} />
                                    <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{val}</span>
                                    {severity === val && (
                                        <div className={`absolute bottom-0 left-0 h-1 w-full ${color}`} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={12} /> Detailed Feedback
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe clearly what needs to be changed..."
                            rows={4}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Attachment URL (Optional) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Upload size={12} /> Reference URL (Optional)
                        </label>
                        <input
                            type="text"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-white/20"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black tracking-widest hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
                        >
                            {isSubmitting ? 'SENDING...' : 'SUBMIT REVISION'}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
};
