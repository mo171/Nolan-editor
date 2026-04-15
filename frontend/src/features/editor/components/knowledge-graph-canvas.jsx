"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

import CharacterNode from './nodes/CharacterNode';
import LocationNode from './nodes/LocationNode';
import SceneNode from './nodes/SceneNode';

const nodeTypes = {
  Character: CharacterNode,
  Location: LocationNode,
  Scene: SceneNode,
  Lore: SceneNode,
};

const KnowledgeGraphCanvas = ({ projectId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const session = useAuthStore(state => state.session);
  const token = session?.access_token;

  // Fetch Graph Data
  const fetchGraph = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const data = await apiFetch(`/api/projects/${projectId}/visual-graph`, {}, token);
      
      // Basic Grid Layout for nodes with 0,0 position
      const processedNodes = data.nodes.map((node, index) => {
        if (node.position.x === 0 && node.position.y === 0) {
          return {
            ...node,
            position: { x: (index % 4) * 300, y: Math.floor(index / 4) * 400 }
          };
        }
        return node;
      });

      // Enhance edges with consistent Styling
      const processedEdges = data.edges.map(edge => ({
        ...edge,
        style: { stroke: '#ba9eff44', strokeWidth: 2 },
        labelStyle: { fill: '#ba9eff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#ba9eff44',
        },
      }));

      setNodes(processedNodes);
      setEdges(processedEdges);
    } catch (err) {
      console.error("Failed to fetch knowledge graph:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setNodes, setEdges]);

  useEffect(() => {
    if (projectId) fetchGraph();
  }, [projectId, fetchGraph]);

  // Sync Positions to DB (Debounced)
  const syncPositions = useCallback(async (currentNodes) => {
    const updates = currentNodes.map(n => ({
      node_id: n.id,
      x: n.position.x,
      y: n.position.y
    }));

    try {
      await apiFetch(`/api/projects/${projectId}/visual-graph/positions`, {
        method: 'PATCH',
        body: JSON.stringify({ positions: updates })
      }, token);
    } catch (err) {
      console.error("Failed to sync positions:", err);
    }
  }, [projectId]);

  const onNodeDragStop = useCallback((_, node) => {
    syncPositions(nodes);
  }, [nodes, syncPositions]);

  return (
    <div className="w-full h-full bg-[#0e0e11] relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#ba9eff] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#ba9eff] font-bold tracking-widest text-xs uppercase animate-pulse">
              Summoning Narrative Web...
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0e0e11]"
      >
        <Background color="#1a1a20" gap={40} size={1} />
        <Controls 
          className="bg-[#131316] border border-white/10" 
          buttonClassName="hover:bg-white/5 text-[#ba9eff]"
        />
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'Character') return '#ba9eff';
            if (n.type === 'Location') return '#69ffca';
            return '#ff9d69';
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="bg-[#131316] border border-white/10 rounded-lg overflow-hidden"
          style={{ height: 120 }}
        />
      </ReactFlow>

      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-6 p-4 bg-[#131316]/80 backdrop-blur-md rounded-xl border border-white/5 pointer-events-none">
        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Knowledge Key</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ba9eff]" />
            <span className="text-[10px] text-white tracking-widest uppercase">Characters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#69ffca]" />
            <span className="text-[10px] text-white tracking-widest uppercase">Locations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff9d69]" />
            <span className="text-[10px] text-white tracking-widest uppercase">Scenes & Lore</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphCanvas;
