
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node,
    Edge,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
    Handle,
    Position,
    NodeMouseHandler,
    useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, Server, Activity, HardDrive, Shield, CheckCircle, RefreshCw, Cpu, Layers, AlertTriangle, Users, Archive, Bot, X, Zap, Layout, Terminal, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useStore } from '@/lib/store';
import { AdminDetailsPanel } from './AdminDetailsPanel';
import { UserManagementPanel } from './UserManagementPanel';
import { TickerManagementPanel } from './TickerManagementPanel';
import { SquadManagementPanel } from './SquadManagementPanel';

const BOT_NODE_TYPE = 'bot';
const TICKER_NODE_TYPE = 'ticker';
const SQUAD_AI_NODE_TYPE = 'squad_ai';

interface StatsData {
    dbSize: string;
    latency: string;
    activeConnections: number;
    uptime: string;
    realCounts?: {
        tasks: number;
        users: number;
        activeTasks: number;
        completedTasks: number;
    }
}

// ─── CUSTOM NODES ────────────────────────────────────────────────────────────

const DatabaseNode = ({ data }: { data: StatsData }) => {
    return (
        <div className="min-w-[280px] bg-zinc-950/90 border-2 border-emerald-500/30 rounded-2xl p-0 shadow-2xl backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors">
            {/* Header */}
            <div className="h-10 bg-emerald-500/10 border-b border-emerald-500/20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs tracking-wider uppercase">
                    <Database size={14} />
                    <span>PostgreSQL Core</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] text-emerald-500/70 font-mono">SYNCED</span>
                </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Records</div>
                    <div className="text-xl font-mono font-bold text-white">{data.realCounts?.tasks || 0}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Latency</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">{data.latency || '...'}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Uptime</div>
                    <div className="text-xs font-mono text-zinc-300">{data.uptime || '...'}</div>
                </div>
                <div className="space-y-1 text-right">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Size</div>
                    <div className="text-xs font-mono text-zinc-300">{data.dbSize || '...'}</div>
                </div>
            </div>

            {/* Micro-activity bar */}
            <div className="h-1 bg-white/5 mx-4 mb-3 rounded-full overflow-hidden">
                <motion.div
                    animate={{ x: [-200, 280] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-full bg-emerald-500/40"
                />
            </div>
        </div>
    );
};

const UserNode = ({ data }: { data: any }) => {
    return (
        <div className="min-w-[280px] bg-zinc-950/90 border-2 border-indigo-500/30 rounded-2xl p-0 shadow-2xl backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors">
            {/* Header */}
            <div className="h-10 bg-indigo-500/10 border-b border-indigo-500/20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-wider uppercase">
                    <Users size={14} />
                    <span>Identity Cluster</span>
                </div>
            </div>

            <div className="p-4 flex gap-4 items-center">
                <div className="flex-1">
                    <div className="text-3xl font-mono font-bold text-white mb-1">{data.userCount}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Active Members</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users size={24} />
                </div>
            </div>
            <div className="px-4 pb-2 text-[9px] text-zinc-600 font-mono uppercase">Role Policy: RBACv2-RESTRICTED</div>
        </div>
    );
};

const ArchiveNode = ({ data }: { data: any }) => {
    return (
        <div className="min-w-[280px] bg-zinc-950/90 border-2 border-amber-500/30 rounded-2xl p-0 shadow-2xl backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:border-amber-500 transition-colors">
            {/* Header */}
            <div className="h-10 bg-amber-500/10 border-b border-amber-500/20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs tracking-wider uppercase">
                    <Archive size={14} />
                    <span>Long-Term Storage</span>
                </div>
            </div>

            <div className="p-4 flex gap-4 items-center">
                <div className="flex-1">
                    <div className="text-3xl font-mono font-bold text-white mb-1">{data.archiveCount}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Archived Groups</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Archive size={24} />
                </div>
            </div>
            <div className="px-4 pb-2 text-[9px] text-zinc-600 font-mono uppercase">Retention: 6 Months</div>
        </div>
    );
};

// ─── BOT NODE ────────────────────────────────────────────────────────────────
const BotNode = ({ data }: { data: any }) => {
    return (
        <div className="min-w-[280px] bg-zinc-950/90 border-2 border-indigo-500/30 rounded-2xl p-0 shadow-2xl backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors">
            {/* Header */}
            <div className="h-10 bg-indigo-500/10 border-b border-indigo-500/20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-wider uppercase">
                    <Bot size={14} />
                    <span>{data.label || 'Chat Bot'}</span>
                </div>
            </div>

            <div className="p-4 flex gap-4 items-center">
                <div className="flex-1">
                    <div className="text-3xl font-mono font-bold text-white mb-1">{data.botCount || 0}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Active Units</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Bot size={24} />
                </div>
            </div>
        </div>
    );
};

// ─── TICKER NODE ─────────────────────────────────────────────────────────────
const TickerNode = ({ data }: { data: any }) => {
    return (
        <div className="min-w-[280px] bg-zinc-950/90 border-2 border-amber-500/30 rounded-2xl p-0 shadow-2xl backdrop-blur-xl relative group overflow-hidden cursor-pointer hover:border-amber-500 transition-colors">
            {/* Header */}
            <div className="h-10 bg-amber-500/10 border-b border-amber-500/20 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs tracking-wider uppercase">
                    <Activity size={14} />
                    <span>Live Ticker System</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
            </div>

            <div className="p-4 flex gap-4 items-center">
                <div className="flex-1">
                    <div className="text-3xl font-mono font-bold text-white mb-1">{data.activeTickers || 0}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Active Slides</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Activity size={24} />
                </div>
            </div>
            <div className="px-4 pb-2 text-[9px] text-zinc-600 font-mono uppercase">Status: Broadcasting</div>
        </div>
    );
};

interface AdminDashboardProps {
    onClose: () => void;
    initialNode?: string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, initialNode = null }) => {

    // Memoize nodeTypes to separate them from render cycle, avoiding React Flow warning
    const nodeTypes = useMemo(() => ({
        database: DatabaseNode,
        user: UserNode,
        archive: ArchiveNode,
        [BOT_NODE_TYPE]: BotNode,
        [TICKER_NODE_TYPE]: TickerNode,
        [SQUAD_AI_NODE_TYPE]: BotNode, // Reuse BotNode style for now
    }), []);

    const { auth } = useStore();
    const [selectedNode, setSelectedNode] = useState<string | null>(initialNode);

    // Flow Setup
    const [nodes, setNodes, onNodesChange] = useNodesState([
        {
            id: 'db-1',
            type: 'database',
            position: { x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 200 },
            data: {
                dbSize: 'Checking...',
                latency: '...',
                activeConnections: 0,
                uptime: '...',
                realCounts: { tasks: 0, users: 0, activeTasks: 0, completedTasks: 0 }
            }
        },
        {
            id: 'user-1',
            type: 'user',
            position: { x: window.innerWidth / 2 + 50, y: window.innerHeight / 2 - 200 },
            data: { userCount: 0 }
        },
        {
            id: 'archive-1',
            type: 'archive',
            position: { x: window.innerWidth / 2 + 50, y: window.innerHeight / 2 + 50 },
            data: { archiveCount: 0 }
        },
        {
            id: 'bot-1',
            type: BOT_NODE_TYPE,
            position: { x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 + 50 },
            data: { label: 'Chat Bot', botCount: 0 }
        },
        {
            id: 'ticker-1',
            type: TICKER_NODE_TYPE,
            position: { x: window.innerWidth / 2 + 50, y: window.innerHeight / 2 + 300 },
            data: { activeTickers: '...' }
        },
        {
            id: 'squad-ai-1',
            type: SQUAD_AI_NODE_TYPE,
            position: { x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 + 300 },
            data: { label: 'AI Squad', botCount: 0 }
        },
    ]);

    // Load initial layout
    useEffect(() => {
        if (auth.user?.dashboardLayout) {
            try {
                const savedLayout = JSON.parse(auth.user.dashboardLayout);
                if (Array.isArray(savedLayout)) {
                    setNodes((nds) =>
                        nds.map((node) => {
                            const savedNode = savedLayout.find((s: any) => s.id === node.id);
                            if (savedNode && savedNode.position) {
                                return { ...node, position: savedNode.position };
                            }
                            return node;
                        })
                    );
                }
            } catch (e) {
                console.error("Failed to parse dashboard layout", e);
            }
        }
    }, [auth.user?.dashboardLayout]);

    const onNodeDragStop = useCallback(
        async (_: any, node: Node) => {
            if (!auth.user) return;

            // Get all current nodes and their positions
            // We use a functional update or refs to get the latest state reliably if needed,
            // but for simplicity in this context we'll construct the layout from current state
            setNodes((currentNodes) => {
                const layout = currentNodes.map(n => ({
                    id: n.id,
                    position: n.id === node.id ? node.position : n.position
                }));

                const layoutString = JSON.stringify(layout);

                // Auto-save to backend
                api.patch(`/users/${auth.user!.id}`, { dashboardLayout: layoutString })
                    .then(res => {
                        auth.setUser(res.data);
                    })
                    .catch(e => console.error("Failed to save dashboard layout", e));

                return currentNodes;
            });
        },
        [auth]
    );

    const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNode(node.id);
    }, []);

    // Fetch Logic
    const fetchSystemStats = async () => {
        try {
            const [statsRes, archivedRes, usersRes, agentsRes] = await Promise.all([
                api.get('/tasks/stats/system'),
                api.get('/groups?archived=true'),
                api.get('/users'),
                api.get('/squad-agents')
            ]);

            const sysBots = usersRes.data.filter((u: any) => u.isSystemBot).length;
            const activeAgents = agentsRes.data.filter((a: any) => a.isActive).length;

            if (statsRes.data) {
                const newData = {
                    dbSize: statsRes.data.dbSize,
                    totalRecords: statsRes.data.totalTasks,
                    cacheHitRate: '94%',
                    uptime: statsRes.data.uptime,
                    activeConnections: 42,
                    latency: statsRes.data.latency,
                    realCounts: {
                        tasks: statsRes.data.totalTasks,
                        users: statsRes.data.totalUsers,
                        activeTasks: statsRes.data.activeTasks,
                        completedTasks: statsRes.data.completedTasks
                    }
                };

                // Update Node Data
                setNodes((nds) => nds.map((node) => {
                    if (node.id === 'db-1') {
                        return { ...node, data: newData };
                    }
                    if (node.id === 'user-1') {
                        return { ...node, data: { userCount: statsRes.data.totalUsers } };
                    }
                    if (node.id === 'archive-1') {
                        return { ...node, data: { archiveCount: archivedRes.data?.length || 0 } };
                    }
                    if (node.id === 'bot-1') {
                        return { ...node, data: { ...node.data, botCount: sysBots } };
                    }
                    if (node.id === 'squad-ai-1') {
                        return { ...node, data: { ...node.data, botCount: activeAgents } };
                    }
                    return node;
                }));
            }
        } catch (error) {
            console.error("Failed to fetch node stats", error);
        }
    };

    useEffect(() => {
        fetchSystemStats();
        const interval = setInterval(fetchSystemStats, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full bg-[#050505] text-zinc-100 flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-50 flex items-center justify-between px-8">
                <div className="pointer-events-auto bg-black/50 backdrop-blur border border-white/5 px-4 py-2 rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-300">SYSTEM NODES ONLINE</span>
                    <span className="text-[10px] text-zinc-600 border-l border-white/10 pl-3">v4.0.0</span>
                </div>

                <button
                    onClick={onClose}
                    className="pointer-events-auto px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors shadow-lg z-50"
                >
                    CLOSE DASHBOARD
                </button>
            </div>

            {/* FLOW CANVAS */}
            <div className="flex-1 w-full h-full">
                <ReactFlow
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    onNodeClick={onNodeClick}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.5}
                    maxZoom={2}
                    className="bg-[#050505]"
                >
                    <Background color="#222" gap={24} size={1} />
                    <Controls className="!bg-zinc-900 !border-white/10 !fill-white" />
                </ReactFlow>
            </div>

            {/* DETAILS OVERLAY */}
            <AnimatePresence>
                {selectedNode === 'db-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <AdminDetailsPanel onClose={() => setSelectedNode(null)} />
                    </motion.div>
                )}
                {selectedNode === 'user-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <UserManagementPanel onClose={() => setSelectedNode(null)} initialView="root" />
                    </motion.div>
                )}
                {selectedNode === 'archive-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <UserManagementPanel onClose={() => setSelectedNode(null)} initialView="archives_root" />
                    </motion.div>
                )}
                {selectedNode === 'bot-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <UserManagementPanel onClose={() => setSelectedNode(null)} initialView={'bots_root' as any} />
                    </motion.div>
                )}
                {selectedNode === 'ticker-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <TickerManagementPanel onClose={() => setSelectedNode(null)} />
                    </motion.div>
                )}
                {selectedNode === 'squad-ai-1' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                            <div className="w-full max-w-5xl bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white z-50 bg-white/5 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                                <SquadManagementPanel />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
