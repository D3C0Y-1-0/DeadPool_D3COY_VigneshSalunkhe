import React from "react";
import ReactFlow, { Background, Node, Edge, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { TimelineItem } from "../types";

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
        x: i * 220 + 30,
        y: isProd ? 130 : 25
      },
      data: {
        label: (
          <div className="text-left text-xs p-1 select-none">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                isProd ? "bg-[#ff3b5c]/30 text-[#ff3b5c]" : "bg-[#4da3ff]/20 text-[#4da3ff]"
              }`}>
                {isProd ? "REAL ASSET" : "DECEPTION"}
              </span>
              <span className="mono text-[10px] text-[#8a97ad]">{s.sensor}</span>
            </div>
            <div className="font-bold text-[#e6edf7] truncate mb-0.5">{title}</div>
            {techniquesStr && (
              <div className="mono text-[10px] text-[#4da3ff] mb-1">{techniquesStr}</div>
            )}
            <div className="text-[11px] text-[#8a97ad] truncate">
              {s.summary.slice(0, 32)}
            </div>
          </div>
        )
      },
      style: {
        background: isProd ? "#2a0812" : "#111827",
        border: `1.5px solid ${isProd ? "#ff3b5c" : "#1f2a3d"}`,
        borderRadius: "8px",
        width: 190,
        color: "#e6edf7",
        boxShadow: isProd ? "0 0 15px rgba(255,59,92,0.3)" : "none"
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
        strokeWidth: isTransitionToProd ? 2.5 : 1.5
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isTransitionToProd ? "#ff3b5c" : "#4da3ff"
      }
    };
  });

  return (
    <div className="w-full h-64 bg-[#0a0e17] border border-[#1f2a3d] rounded-lg overflow-hidden relative">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-4 text-xs font-semibold tracking-wide pointer-events-none">
        <span className="text-[#4da3ff] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4da3ff]" /> TOP: DECEPTION FABRIC
        </span>
        <span className="text-[#ff3b5c] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff3b5c]" /> BOTTOM: REAL PRODUCTION REACH
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
        <Background color="#1f2a3d" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
