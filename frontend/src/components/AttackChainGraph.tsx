"use client";

import { Background, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import type { TimelineItem } from "../types";

interface Props {
  timeline: TimelineItem[];
  realAssetTouched: boolean;
}

export default function AttackChainGraph({ timeline, realAssetTouched }: Props) {
  // Collapse timeline to one node per stage/action step
  const steps: TimelineItem[] = [];
  const seen = new Set<string>();

  for (const t of timeline) {
    const key = `${t.zone}_${t.stage || t.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      steps.push(t);
    }
  }

  const nodes: Node[] = steps.map((s, i) => {
    const isProd = s.zone === "production";
    const title = (s.stage || s.action).replace("_", " ").toUpperCase();
    const techniquesStr = (s.techniques || []).slice(0, 2).join(" ");

    return {
      id: String(i),
      position: {
        x: i * 240 + 40,
        y: isProd ? 150 : 30
      },
      data: {
        label: (
          <div className="text-left text-xs p-1 select-none">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                isProd ? "bg-crit/20 text-crit border-crit/30" : "bg-accent/20 text-accent border-accent/30"
              }`}>
                {isProd ? "REAL ASSET" : "DECEPTION"}
              </span>
              <span className="mono text-[9px] text-mute">{s.sensor}</span>
            </div>
            <div className="font-bold text-ink truncate mb-1 text-[11px] uppercase tracking-wider">{title}</div>
            {techniquesStr && (
              <div className="mono text-[9px] text-mute mb-2 bg-black/30 px-1.5 py-0.5 rounded border border-line">{techniquesStr}</div>
            )}
            <div className="text-[10px] text-mute leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
              {s.summary.slice(0, 40)}...
            </div>
          </div>
        )
      },
      style: {
        background: isProd ? "#1a0b0b" : "#0f172a",
        border: `1.5px solid ${isProd ? "#ff3b5c" : "#1f2a3d"}`,
        borderRadius: "12px",
        width: 210,
        color: "#e6edf7",
        boxShadow: isProd ? "0 0 25px rgba(255,59,92,0.15)" : "0 4px 12px rgba(0,0,0,0.2)"
      }
    };
  });

  const edges: Edge[] = nodes.slice(1).map((n, i) => {
    const sourceNode = nodes[i];
    const isTransitionToProd = sourceNode.position.y < 100 && n.position.y > 100;

    return {
      id: `e-${i}`,
      source: String(i),
      target: n.id,
      animated: true,
      style: {
        stroke: isTransitionToProd ? "#ff3b5c" : "#4da3ff",
        strokeWidth: isTransitionToProd ? 3 : 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isTransitionToProd ? "#ff3b5c" : "#4da3ff"
      }
    };
  });

  return (
    <div className="w-full h-full bg-panel border border-line rounded-xl overflow-hidden relative shadow-inner">
      <div className="absolute top-4 left-5 z-10 flex items-center gap-6 text-[9px] font-bold tracking-widest pointer-events-none uppercase">
        <span className="text-mute flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(77,163,255,0.5)]" /> 
          Deception Layer
        </span>
        <span className="text-crit flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-crit shadow-[0_0_8px_rgba(255,59,92,0.5)] animate-pulse" /> 
          Production Breach
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1f2a3d" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
