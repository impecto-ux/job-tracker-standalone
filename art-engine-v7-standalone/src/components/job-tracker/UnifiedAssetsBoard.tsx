import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Image as ImageIcon,
    FileText,
    Video as VideoIcon,
    Download,
    ExternalLink,
    X,
    LayoutGrid,
    List,
    FolderOpen,
    Clock,
    User as UserIcon,
    ChevronDown,
    MoreVertical
} from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

interface FileAsset {
    id: number;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    thumbnailUrl?: string; // We'll map the backend response
    createdAt: string;
    channel: { id: number; name: string };
    uploader: { id: number; fullName: string };
}

export const UnifiedAssetsBoard: React.FC = () => {
    const [assets, setAssets] = useState<FileAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'document' | 'video'>('all');
    const [selectedChannel, setSelectedChannel] = useState<number | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [lightboxAsset, setLightboxAsset] = useState<FileAsset | null>(null);

    const { chat } = useStore();

    useEffect(() => {
        fetchAssets();
    }, [activeTab, selectedChannel, search]);

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (activeTab !== 'all') params.type = activeTab;
            if (selectedChannel !== 'all') params.channelId = selectedChannel;
            if (search) params.search = search;

            const res = await api.get('/files', { params });
            // Map backend schema to UI props
            const mappedAssets = res.data.map((f: any) => ({
                ...f,
                url: `/api/uploads/${f.filename}`,
                thumbnailUrl: f.thumbnailPath ? `/api/uploads/${f.thumbnailPath.replace('./uploads/', '')}` : null
            }));
            setAssets(mappedAssets);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mime: string) => {
        if (mime.startsWith('image/')) return <ImageIcon size={20} />;
        if (mime.startsWith('video/')) return <VideoIcon size={20} />;
        return <FileText size={20} />;
    };

    return (
        <div className="flex flex-col h-full bg-[#0b141a] text-[#e9edef] overflow-hidden font-sans">
            {/* TOOLBAR */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0 backdrop-blur-md z-10">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-bold tracking-tight whitespace-nowrap">FILE VAULT</h2>

                    {/* Filters */}
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 gap-1">
                        {[
                            { id: 'all', label: 'All', icon: <LayoutGrid size={14} /> },
                            { id: 'image', label: 'Photos', icon: <ImageIcon size={14} /> },
                            { id: 'video', label: 'Videos', icon: <VideoIcon size={14} /> },
                            { id: 'document', label: 'Docs', icon: <FileText size={14} /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Channel Selector */}
                    <div className="relative">
                        <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="bg-black/40 border border-white/5 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none hover:bg-zinc-800 cursor-pointer min-w-[140px]"
                        >
                            <option value="all">All Groups</option>
                            {chat.channels.map(c => (
                                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-1 justify-end">
                    {/* Search */}
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find an asset..."
                            className="w-full bg-black/40 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-[#e9edef] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-zinc-900 transition-all"
                        />
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-500'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-500'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative bg-[#0b141a]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                </div>

                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-sm font-mono tracking-widest uppercase">Indexing Vault...</span>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <FolderOpen size={64} className="mb-4 text-emerald-500/20" />
                        <h3 className="text-xl font-bold mb-2">No assets found</h3>
                        <p className="text-sm max-w-xs">Files and media shared in your groups will appear here automatically.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 relative z-10">
                        <AnimatePresence mode="popLayout">
                            {assets.map((asset) => (
                                <motion.div
                                    key={asset.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4 }}
                                    className="group relative bg-[#111b21] rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all shadow-lg"
                                >
                                    {/* Thumbnail / Placeholder */}
                                    <div
                                        className="aspect-square bg-[#202c33] flex items-center justify-center overflow-hidden cursor-pointer"
                                        onClick={() => setLightboxAsset(asset)}
                                    >
                                        {asset.mimetype.startsWith('image/') ? (
                                            <img
                                                src={asset.thumbnailUrl || (asset as any).url}
                                                alt={asset.originalname}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : asset.mimetype.startsWith('video/') ? (
                                            <div className="w-full h-full relative">
                                                <video src={(asset as any).url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                                                        <VideoIcon size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-500">
                                                    <FileText size={40} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase text-zinc-500">{asset.mimetype.split('/')[1]}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Overlay */}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className="text-xs font-bold text-[#e9edef] truncate flex-1" title={asset.originalname}>
                                                {asset.originalname}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-[#8696a0]">
                                            <span className="px-1.5 py-0.5 rounded-sm bg-black/40 font-mono text-emerald-500 uppercase">
                                                {asset.channel.name}
                                            </span>
                                            <span>•</span>
                                            <span>{formatSize(asset.size)}</span>
                                        </div>
                                    </div>

                                    {/* Quick Actions (Hover) */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                                        <a
                                            href={(asset as any).url}
                                            download={asset.originalname}
                                            className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl hover:bg-emerald-500 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Download size={14} />
                                        </a>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setLightboxAsset(asset); }}
                                            className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center shadow-xl hover:bg-zinc-700 transition-colors"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col gap-2">
                        {assets.map((asset) => (
                            <motion.div
                                key={asset.id}
                                layout
                                className="flex items-center gap-4 p-3 bg-[#111b21] rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-[#202c33] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {asset.mimetype.startsWith('image/') ? (
                                        <img src={asset.thumbnailUrl || (asset as any).url} className="w-full h-full object-cover" />
                                    ) : getFileIcon(asset.mimetype)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold truncate">{asset.originalname}</h4>
                                    <div className="flex items-center gap-3 text-xs text-[#8696a0] mt-0.5">
                                        <span className="flex items-center gap-1"><UserIcon size={12} /> {asset.uploader?.fullName || 'System'}</span>
                                        <span className="flex items-center gap-1"><FolderOpen size={12} /> {asset.channel.name}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(asset.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-4 text-xs font-mono text-zinc-500">
                                    {formatSize(asset.size)}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                    <a
                                        href={(asset as any).url}
                                        download={asset.originalname}
                                        className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
                                    >
                                        <Download size={18} />
                                    </a>
                                    <button className="p-2 text-zinc-400 hover:text-white">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* LIGHTBOX */}
            <AnimatePresence>
                {lightboxAsset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxAsset(null)}
                        className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm"
                    >
                        {/* Header */}
                        <div className="h-16 flex items-center justify-between px-6 shrink-0 relative z-10">
                            <div className="flex flex-col">
                                <span className="font-bold text-white">{lightboxAsset.originalname}</span>
                                <span className="text-xs text-zinc-500">Shared in {lightboxAsset.channel.name} • {formatSize(lightboxAsset.size)}</span>
                            </div>
                            <button className="p-3 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full ring-1 ring-white/10">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="max-w-full max-h-full flex items-center justify-center"
                            >
                                {lightboxAsset.mimetype.startsWith('image/') ? (
                                    <img
                                        src={(lightboxAsset as any).url}
                                        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10"
                                    />
                                ) : lightboxAsset.mimetype.startsWith('video/') ? (
                                    <video
                                        src={(lightboxAsset as any).url}
                                        controls
                                        autoPlay
                                        className="max-w-full max-h-full shadow-2xl rounded-lg border border-white/10"
                                    />
                                ) : (
                                    <div className="bg-[#111b21] p-12 rounded-3xl border border-white/10 flex flex-col items-center gap-6 shadow-2xl">
                                        <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                            <FileText size={48} />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-xl font-bold mb-1 tracking-tight">{lightboxAsset.originalname}</h4>
                                            <p className="text-zinc-500 font-mono text-sm">{lightboxAsset.mimetype.toUpperCase()}</p>
                                        </div>
                                        <a
                                            href={(lightboxAsset as any).url}
                                            download={lightboxAsset.originalname}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                                        >
                                            <Download size={20} />
                                            DOWNLOAD FILE
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Meta / Footer */}
                        <div className="p-6 bg-gradient-to-t from-black/80 to-transparent shrink-0">
                            <div className="flex items-center justify-center gap-8 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <UserIcon size={14} className="text-emerald-500" /> {lightboxAsset.uploader?.fullName || 'System'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-emerald-500" /> {new Date(lightboxAsset.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
