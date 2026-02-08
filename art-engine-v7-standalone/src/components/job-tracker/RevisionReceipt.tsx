import React from 'react';
import { motion } from 'framer-motion';
import { Layers, AlertTriangle, FileText, ExternalLink, Calendar, User, Hash } from 'lucide-react';

interface RevisionReceiptProps {
    revision: {
        id: number;
        revisionNumber: number;
        type: string;
        severity: string;
        description: string;
        attachmentUrl?: string;
        createdAt: string;
        requestedBy?: any;
    };
    taskTitle: string;
}

export const RevisionReceipt: React.FC<RevisionReceiptProps> = ({ revision, taskTitle }) => {
    const severityColors: any = {
        low: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
        medium: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        high: 'text-orange-500 border-orange-500/20 bg-orange-500/5',
        critical: 'text-red-500 border-red-500/20 bg-red-500/5',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
        >
            {/* Texture / Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* Receipt Header */}
            <div className="p-6 border-b border-dashed border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Layers size={120} />
                </div>

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-amber-500 p-1 rounded shadow-lg shadow-amber-500/20">
                                <Layers size={16} className="text-black" />
                            </div>
                            <h3 className="text-lg font-black text-white tracking-widest uppercase italic">REVISION RECEIPT</h3>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">Official Modification Request</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase">Version</div>
                        <div className="text-xl font-black text-amber-500 font-mono tracking-tighter">V{revision.revisionNumber}.0</div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 relative z-10">
                {/* Task Reference */}
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <Hash size={10} /> Task Reference
                    </div>
                    <div className="text-sm font-bold text-zinc-200 border-l-2 border-amber-500/50 pl-3 py-1 bg-white/5 rounded-r">
                        {taskTitle}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Metadata Items */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <Layers size={10} /> Category
                        </div>
                        <div className="text-xs font-black text-zinc-300 uppercase tracking-widest bg-zinc-900 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {revision.type}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <AlertTriangle size={10} /> Severity
                        </div>
                        <div className={`text-xs font-black uppercase tracking-widest border px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${severityColors[revision.severity] || severityColors.low}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]`} style={{ backgroundColor: 'currentColor' }} />
                            {revision.severity}
                        </div>
                    </div>
                </div>

                {/* Feedback Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <FileText size={10} /> Detailed Feedback
                    </div>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed font-medium">
                        {revision.description}
                    </div>
                </div>

                {/* Technical / Footer Info */}
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-[10px]">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <User size={12} />
                        <span className="font-bold">REQUESTED BY:</span>
                        <span className="text-zinc-300">{revision.requestedBy?.fullName || revision.requestedBy || 'SYSTEM'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 justify-end">
                        <Calendar size={12} />
                        <span className="font-bold uppercase">{new Date(revision.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Accent / Perforation style */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-600 to-orange-600 opacity-50" />

            {revision.attachmentUrl && (
                <a
                    href={revision.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-all group"
                    title="View Reference"
                >
                    <ExternalLink size={14} className="text-zinc-400 group-hover:text-white" />
                </a>
            )}
        </motion.div>
    );
};
