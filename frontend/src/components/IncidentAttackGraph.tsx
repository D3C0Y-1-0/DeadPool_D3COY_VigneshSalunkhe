"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Crosshair,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Key,
  Server,
  Zap,
  Globe,
  Radio,
  ExternalLink,
  Lock,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Info,
  Clock,
  Flame,
  CheckCircle2,
  X,
} from "lucide-react";
import { Incident, IncidentSummary, TimelineItem } from "../types";
import { fetchIncident } from "../api";
import { useLive } from "../useLive";

// ============================================================
// CUSTOM NODE COMPONENTS (Styled to White-and-Black Reference Theme)
// ============================================================

interface AttackerNodeData extends Record<string, unknown> {
  ip: string;
  country: string;
  asn: string;
  score: number;
  severity: string;
  verdict: string;
  cadence: string;
  isSelected?: boolean;
}

function AttackerNode({ data }: NodeProps<Node<AttackerNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[230px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-red-600 ring-4 ring-red-500/20 shadow-red-500/20" : "border-red-500/60 hover:border-red-600"
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          Threat Actor
        </span>
        <span className="font-mono text-[10px] font-bold text-red-600 bg-red-100/60 px-1.5 py-0.5 rounded">
          {data.score}/100 Risk
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 border border-red-200 shrink-0">
          <Crosshair size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-bold text-black tracking-tight truncate">{data.ip}</div>
          <div className="text-[11px] text-neutral-500 truncate">{data.country} · {data.asn}</div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px]">
        <span className="text-neutral-500 uppercase tracking-wider font-semibold">Verdict:</span>
        <span className="font-bold uppercase text-red-600">{data.verdict}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-red-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface ReconNodeData extends Record<string, unknown> {
  title: string;
  services: string[];
  cadence: string;
  technique: string;
  isSelected?: boolean;
}

function ReconNode({ data }: NodeProps<Node<ReconNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[220px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-amber-600 ring-4 ring-amber-500/20" : "border-amber-500/60 hover:border-amber-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-neutral-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          <Radio size={10} className="text-amber-600" />
          Recon & Probes
        </span>
        <span className="font-mono text-[9px] text-neutral-500 font-semibold">{data.technique}</span>
      </div>

      <div className="text-xs font-bold text-black">{data.title}</div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {data.services.map((svc) => (
          <span key={svc} className="font-mono text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
            {svc}
          </span>
        ))}
      </div>

      <div className="mt-2 text-[10px] text-neutral-500 font-medium">
        Cadence: <span className="font-bold text-neutral-800">{data.cadence}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-amber-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface DecoyNodeData extends Record<string, unknown> {
  sensor: string;
  port: string;
  service: string;
  credsTried: string[];
  isSelected?: boolean;
}

function DecoyNode({ data }: NodeProps<Node<DecoyNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[230px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-purple-600 ring-4 ring-purple-500/20" : "border-purple-500/60 hover:border-purple-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-amber-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          <Server size={10} className="text-purple-600" />
          Honeypot Decoy
        </span>
        <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
          Port {data.port}
        </span>
      </div>

      <div className="font-bold text-xs text-black">{data.sensor}</div>
      <div className="text-[11px] text-neutral-500">{data.service} · Isolated Net</div>

      <div className="mt-2 rounded bg-neutral-50 p-1.5 border border-neutral-200/60">
        <div className="text-[9px] uppercase font-bold text-neutral-500">Captured Credentials:</div>
        <div className="font-mono text-[10px] text-purple-700 truncate font-semibold mt-0.5">
          {data.credsTried.slice(0, 2).join(" · ") || "root:root · admin:123456"}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-purple-600 !border-2 !border-white shadow"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-purple-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface CommandNodeData extends Record<string, unknown> {
  commands: string[];
  technique: string;
  status: string;
  isSelected?: boolean;
}

function CommandNode({ data }: NodeProps<Node<CommandNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[240px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-sky-600 ring-4 ring-sky-500/20" : "border-sky-500/60 hover:border-sky-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-purple-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
          <Terminal size={10} className="text-sky-600" />
          Emulated Shell
        </span>
        <span className="font-mono text-[9px] text-neutral-500 font-semibold">{data.technique}</span>
      </div>

      <div className="rounded-lg bg-black p-2 font-mono text-[10px] text-emerald-400 space-y-0.5 shadow-inner">
        {data.commands.map((cmd, idx) => (
          <div key={idx} className="truncate">
            <span className="text-neutral-500 select-none">$ </span>
            {cmd}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
        <span>Execution status:</span>
        <span className="font-bold text-sky-700">{data.status}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-sky-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface HoneytokenNodeData extends Record<string, unknown> {
  tokenId: string;
  lurePath: string;
  impactPoints: number;
  isSelected?: boolean;
}

function HoneytokenNode({ data }: NodeProps<Node<HoneytokenNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[230px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-orange-600 ring-4 ring-orange-500/20" : "border-orange-500/60 hover:border-orange-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-amber-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
          <Key size={10} className="text-orange-600" />
          Honeytoken Tripwire
        </span>
        <span className="font-mono text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
          +{data.impactPoints} Critical
        </span>
      </div>

      <div className="font-mono text-xs font-bold text-black">{data.tokenId}</div>
      <div className="text-[11px] text-neutral-500 truncate">Lure: {data.lurePath}</div>

      <div className="mt-2 text-[10px] text-orange-700 font-bold bg-orange-50/70 p-1.5 rounded border border-orange-200">
        Canary Token Exfiltration Captured
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-orange-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface LateralNodeData extends Record<string, unknown> {
  targetAsset: string;
  targetPort: string;
  zone: string;
  shieldOutcome: string;
  impactPoints: number;
  isSelected?: boolean;
}

function LateralNode({ data }: NodeProps<Node<LateralNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[240px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-red-600 ring-4 ring-red-500/20" : "border-red-500/60 hover:border-red-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-red-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
          <ShieldAlert size={10} className="text-red-600" />
          Prod Pivot Alert
        </span>
        <span className="font-mono text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
          +{data.impactPoints} pts
        </span>
      </div>

      <div className="font-mono text-xs font-bold text-black truncate">{data.targetAsset}</div>
      <div className="text-[11px] text-neutral-500">Target Port: {data.targetPort} · Zone: {data.zone}</div>

      <div className="mt-2 rounded bg-neutral-900 p-1.5 text-[10px] text-white flex items-center justify-between">
        <span className="font-semibold text-neutral-400">Prod Shield:</span>
        <span className="font-bold text-red-400">{data.shieldOutcome}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-red-600 !border-2 !border-white shadow"
      />
    </div>
  );
}

interface ResponseNodeData extends Record<string, unknown> {
  action: string;
  status: string;
  zeroFP: boolean;
  isSelected?: boolean;
}

function ResponseNode({ data }: NodeProps<Node<ResponseNodeData>>) {
  const isSelected = data.isSelected;
  return (
    <div
      className={`relative min-w-[220px] rounded-xl bg-white border-2 p-3.5 shadow-lg transition-all ${
        isSelected ? "border-emerald-600 ring-4 ring-emerald-500/20" : "border-emerald-500/60 hover:border-emerald-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-emerald-600 !border-2 !border-white shadow"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck size={10} className="text-emerald-600" />
          SOAR Quarantine
        </span>
        <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
          Contained
        </span>
      </div>

      <div className="font-bold text-xs text-black">{data.action}</div>
      <div className="text-[11px] text-neutral-500 mt-0.5">Automated Perimeter Containment</div>

      <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 p-1 rounded">
        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        Zero False-Positive Confidence
      </div>
    </div>
  );
}

const nodeTypes = {
  attacker: AttackerNode,
  recon: ReconNode,
  decoy: DecoyNode,
  command: CommandNode,
  honeytoken: HoneytokenNode,
  lateral: LateralNode,
  response: ResponseNode,
  activity: ActivityNode,
};

interface ActivityNodeData extends Record<string, unknown> {
  sensor: string;
  zone: string;
  action: string;
  outcome: string;
  timestamp: string;
  summary: string;
  techniques: string[];
  isSelected?: boolean;
}

function ActivityNode({ data }: NodeProps<Node<ActivityNodeData>>) {
  const isSelected = data.isSelected;
  const production = data.zone === "production";

  return (
    <div className={`relative min-w-[240px] max-w-[260px] rounded-xl border-2 bg-white p-3.5 shadow-lg transition-all ${
      isSelected
        ? "border-sky-600 ring-4 ring-sky-500/20"
        : production ? "border-red-500/60 hover:border-red-600" : "border-purple-500/60 hover:border-purple-600"
    }`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-neutral-600 shadow" />
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
          production ? "border-red-200 bg-red-50 text-red-700" : "border-purple-200 bg-purple-50 text-purple-700"
        }`}>{data.zone} · {data.action}</span>
        <span className="shrink-0 font-mono text-[9px] text-neutral-500">{data.outcome}</span>
      </div>
      <div className="truncate text-xs font-bold text-black">{data.sensor || "Unknown sensor"}</div>
      <div className="mt-1 font-mono text-[9px] text-neutral-500">{data.timestamp}</div>
      <div className="mt-2 max-h-20 overflow-hidden break-words text-[11px] leading-relaxed text-neutral-700">{data.summary}</div>
      {data.techniques.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.techniques.map((technique) => (
            <span key={technique} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] text-neutral-700">
              {technique}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-sky-600 shadow" />
    </div>
  );
}

function FitGraphToIncident({ eventCount }: { eventCount: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    void fitView({ padding: 0.2, duration: 200 });
  }, [eventCount, fitView]);

  return null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface Props {
  incident?: Incident | IncidentSummary | null;
  allIncidents?: IncidentSummary[];
  onSelectIncident?: (id: string) => void;
  height?: number | string;
}

export default function IncidentAttackGraph({
  incident,
  allIncidents = [],
  onSelectIncident,
  height = 540,
}: Props) {
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incident?.id || allIncidents[0]?.id || ""
  );
  const [loadedIncident, setLoadedIncident] = useState<Incident | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { incidents: liveIncidents, connected } = useLive();

  useEffect(() => {
    const nextId = incident?.id || allIncidents[0]?.id || "";
    if (nextId && !allIncidents.some((item) => item.id === selectedIncidentId) && incident?.id !== selectedIncidentId) {
      setSelectedIncidentId(nextId);
    } else if (incident?.id) {
      setSelectedIncidentId(incident.id);
    }
  }, [incident?.id, allIncidents, selectedIncidentId]);

  const activeSummary = useMemo(() => {
    if (incident?.id === selectedIncidentId) return incident;
    return allIncidents.find((item) => item.id === selectedIncidentId) ?? null;
  }, [incident, allIncidents, selectedIncidentId]);

  const liveIncident = liveIncidents[selectedIncidentId];
  const liveDetail = liveIncident && "timeline" in liveIncident ? liveIncident as Incident : null;
  const propDetail = incident?.id === selectedIncidentId && "timeline" in incident ? incident as Incident : null;
  const activeDetail = liveDetail ?? propDetail ?? (loadedIncident?.id === selectedIncidentId ? loadedIncident : null);

  useEffect(() => {
    if (!selectedIncidentId || activeDetail) {
      setLoadingDetail(false);
      return;
    }

    let current = true;
    setLoadingDetail(true);
    setDetailError(null);
    fetchIncident(selectedIncidentId)
      .then((result) => {
        if (current) setLoadedIncident(result);
      })
      .catch((error: unknown) => {
        if (current) {
          setDetailError(error instanceof Error ? error.message : "Could not load incident timeline.");
        }
      })
      .finally(() => {
        if (current) setLoadingDetail(false);
      });

    return () => {
      current = false;
    };
  }, [selectedIncidentId, activeDetail]);

  const nodes: Node[] = useMemo(() => {
    if (!activeSummary) return [];
    const cadence = activeDetail?.profile?.median_gap_s == null
      ? activeDetail?.profile?.cadence ?? "unknown"
      : `${activeDetail.profile.cadence} · ${activeDetail.profile.median_gap_s}s median`;
    const timeline = [...(activeDetail?.timeline ?? [])].sort((a, b) => a.ts.localeCompare(b.ts));
    return [
      {
        id: "attacker",
        type: "attacker",
        position: { x: 30, y: 130 },
        data: {
          ip: activeSummary.src_ip,
          country: activeSummary.country || "Unknown",
          asn: activeSummary.asn || "Unknown",
          score: activeSummary.score,
          severity: activeSummary.severity,
          verdict: activeSummary.verdict,
          cadence,
        },
      },
      ...timeline.map((item: TimelineItem, index) => ({
        id: `event-${index}`,
        type: "activity",
        position: { x: 340 + index * 300, y: 130 },
        data: {
          sensor: item.sensor,
          zone: item.zone,
          action: item.action,
          outcome: item.outcome,
          timestamp: item.ts,
          summary: item.summary,
          techniques: item.techniques ?? [],
        },
      })),
    ];
  }, [activeDetail, activeSummary]);

  const edges: Edge[] = useMemo(() => {
    const timeline = [...(activeDetail?.timeline ?? [])].sort((a, b) => a.ts.localeCompare(b.ts));
    return timeline.map((item, index) => {
      const source = index === 0 ? "attacker" : `event-${index - 1}`;
      const target = `event-${index}`;
      const color = item.zone === "production" ? "#ef4444" : "#8b5cf6";
      return {
        id: `edge-${index}`,
        source,
        target,
        animated: connected,
        label: `${item.action} · ${item.outcome}`,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });
  }, [activeDetail, connected]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeData(node);
  }, []);

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* Incident Attack Graph Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#f0f0f0] bg-neutral-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-black text-white text-xs font-bold">
              G
            </span>
            <h2 className="font-display text-sm font-bold text-black tracking-tight">
              Interactive Incident Attack Graph
            </h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              connected ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-neutral-200 bg-neutral-100 text-neutral-600"
            }`}>
              {connected ? "Live updates" : "Stream offline"}
            </span>
          </div>
          <p className="text-[11px] text-[#737373] mt-0.5">
            Recorded events for this incident, ordered by timestamp. Edges show sequence, not inferred causality.
          </p>
        </div>

        {/* Switch Incident Dropdown */}
        {allIncidents.length > 0 && (
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold text-neutral-600">Incident Dossier:</label>
          <select
            value={selectedIncidentId}
            onChange={(e) => {
              setSelectedIncidentId(e.target.value);
              if (onSelectIncident) onSelectIncident(e.target.value);
            }}
            aria-label="Select Incident Attack Graph"
            className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-xs font-mono font-bold text-black shadow-sm outline-none focus:border-black"
          >
            {allIncidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} · {inc.src_ip} ({inc.verdict})
              </option>
            ))}
          </select>
        </div>
        )}
      </div>

      {/* React Flow Canvas Container */}
      <div className="relative w-full" style={{ height }}>
        {activeSummary && (
          <div className="absolute left-3 top-3 z-10 rounded-md border border-neutral-200 bg-white/95 px-2 py-1 text-[10px] font-mono text-neutral-600 shadow-sm">
            {activeSummary.id} · {activeDetail?.timeline.length ?? 0} recorded events
          </div>
        )}
        {loadingDetail && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-white/75 text-sm text-neutral-600">
            Loading incident telemetry…
          </div>
        )}
        {!loadingDetail && detailError && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-white/90 p-6 text-center text-sm text-red-700" role="alert">
            Could not load this incident’s telemetry: {detailError}
          </div>
        )}
        {!loadingDetail && !detailError && activeSummary && activeDetail?.timeline.length === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/80 p-6 text-center text-sm text-neutral-600">
            No timeline events are recorded for this incident yet.
          </div>
        )}
        {!activeSummary && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white p-6 text-center text-sm text-neutral-600">
            No incidents are available to graph.
          </div>
        )}
        <ReactFlow
          key={selectedIncidentId}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <FitGraphToIncident eventCount={activeDetail?.timeline.length ?? 0} />
          <Background color="#d4d4d4" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-white !border !border-[#e5e5e5] !rounded-lg !shadow-md !text-black" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "attacker") return "#ef4444";
              if (n.type === "activity") {
                return (n.data as ActivityNodeData).zone === "production" ? "#ef4444" : "#8b5cf6";
              }
              return "#ef4444";
            }}
            className="!bg-white/90 !border !border-[#e5e5e5] !rounded-lg"
          />
        </ReactFlow>

        {/* Selected Node Forensics Inspector Drawer */}
        {selectedNodeData && (
          <div className="absolute top-3 right-3 z-30 w-[300px] rounded-xl border border-[#e5e5e5] bg-white/95 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-neutral-100">
              <span className="font-bold text-xs text-black uppercase tracking-wider flex items-center gap-1.5">
                <Info size={13} className="text-black" />
                Node Forensics Detail
              </span>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="grid h-5 w-5 place-items-center rounded text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X size={13} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Node ID:</span>
                <span className="font-mono font-bold text-black">{selectedNodeData.id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Node Type:</span>
                <span className="font-semibold text-neutral-800 capitalize">{selectedNodeData.type} Node</span>
              </div>
              <div className="p-2 rounded bg-neutral-50 border border-neutral-100">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                  Correlated Telemetry:
                </span>
                <pre className="font-mono text-[10px] text-neutral-700 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                  {JSON.stringify(selectedNodeData.data, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedNodeData(null)}
              className="mt-3 w-full rounded-lg bg-black py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition"
            >
              Close Inspector
            </button>
          </div>
        )}
      </div>

      {/* Graph Legend & Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[#f0f0f0] bg-neutral-50/70 text-xs text-[#737373]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-black">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Attacker Node
          </span>
          <span className="flex items-center gap-1.5 font-medium text-black">
            <span className="h-2 w-2 rounded-full bg-purple-600" /> Deception event
          </span>
          <span className="flex items-center gap-1.5 font-medium text-black">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Production event
          </span>
        </div>

        <span className={`font-mono text-[11px] font-semibold ${connected ? "text-emerald-700" : "text-neutral-500"}`}>
          {connected ? "● Receiving live incident updates" : "● Showing latest incident snapshot"}
        </span>
      </div>
    </div>
  );
}
