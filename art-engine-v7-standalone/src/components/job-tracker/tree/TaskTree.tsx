
import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    BackgroundVariant,
    Panel,
    Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import TaskNode from './TaskNode';
import { useStore } from '@/lib/store';

const nodeTypes = {
    task: TaskNode,
};

// Layout helpers
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 300, height: 200 }); // Estimating node size
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? 'left' : 'top';
        node.sourcePosition = isHorizontal ? 'right' : 'bottom';

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - 150,
            y: nodeWithPosition.y - 100,
        };

        return node;
    });

    return { nodes, edges };
};

export default function TaskTree({ tasks, onTaskClick }: { tasks: any[], onTaskClick: (task: any) => void }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Transform Tasks -> Nodes/Edges
    useEffect(() => {
        if (!tasks || tasks.length === 0) return;

        const initialNodes: any[] = [];
        const initialEdges: any[] = [];
        const groups = new Set<string>();

        // 1. Identify Groups
        tasks.forEach(t => {
            const groupName = t.group || 'General';
            groups.add(groupName);
        });

        // 2. Create Group Nodes (Central Hubs)
        Array.from(groups).forEach((group, index) => {
            const groupId = `group-${group}`;
            initialNodes.push({
                id: groupId,
                type: 'default', // Standard node for Group Name
                data: { label: group },
                position: { x: 0, y: 0 },
                style: {
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid #3f3f46',
                    width: 150,
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    padding: '10px',
                    fontSize: '12px'
                },
            });
        });

        // 3. Create Task Nodes
        tasks.forEach(t => {
            const nodeId = t.id.toString();
            const groupName = t.group || 'General';

            initialNodes.push({
                id: nodeId,
                type: 'task',
                data: { task: t },
                position: { x: 0, y: 0 },
            });

            // Link to Group
            initialEdges.push({
                id: `e-group-${groupName}-${nodeId}`,
                source: `group-${groupName}`,
                target: nodeId,
                animated: true,
                style: { stroke: '#52525b' },
            });
        });

        // 4. Calculate Layout
        const layouted = getLayoutedElements(initialNodes, initialEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

    }, [tasks, setNodes, setEdges]); // Re-run when tasks change

    const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    return (
        <div className="w-full h-full bg-zinc-950">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes as any}
                onNodeClick={(_, node) => {
                    if (node.type === 'task') {
                        onTaskClick(node.data.task);
                    }
                }}
                fitView
                minZoom={0.1}
            >
                <Controls className="bg-zinc-800 border-zinc-700 fill-white" />
                <MiniMap className="bg-zinc-900 border-zinc-800" maskColor="rgba(0, 0, 0, 0.6)" nodeColor={() => '#555'} />
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#333" />

                <Panel position="top-right" className="bg-zinc-900 p-2 rounded border border-white/10 text-xs text-zinc-400">
                    Interactive Tree View
                </Panel>
            </ReactFlow>
        </div>
    );
}
