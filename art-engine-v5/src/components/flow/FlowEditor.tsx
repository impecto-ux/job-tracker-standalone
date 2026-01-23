
"use client";

import React, { useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Input Trigger' } },
    { id: '2', position: { x: 0, y: 100 }, data: { label: 'Flux Generator' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function FlowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    return (
        <div className="w-full h-full bg-black">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Controls className="bg-zinc-800 border-zinc-700 fill-white" />
                <MiniMap className="bg-zinc-900 border-zinc-800" maskColor="rgba(0, 0, 0, 0.6)" nodeColor={() => '#555'} />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#333" />
            </ReactFlow>
        </div>
    );
}
