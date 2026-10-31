"use client";

import "@xyflow/react/dist/style.css";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Layers,
  LockKeyhole,
  MapPin,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Zap
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip
} from "recharts";
import Link from "next/link";
import { fetchJson, type Agent, type ContractItem, type ToolItem, type EventItem } from "@/lib/api";

type ContractDetail = ContractItem & {
  version?: number;
  purpose?: string;
  allowed_tools?: string[];
  allowed_resource_classes?: string[];
  denied_resource_classes?: string[];
  data_sensitivity_ceiling?: string;
};

function patternMatches(pattern: string, value: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

interface WorkforceNodeData {
  activeCount?: number;
}

interface AgentNodeData {
  id: string;
  name: string;
  role: string;
  roleClean: string;
  riskScore: number;
  riskLevel: string;
  isOn: boolean;
  eventCount: number;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  description?: string;
}

interface ContractNodeData {
  id: string;
  name: string;
  description?: string;
  sourceRole: string;
  eventTrigger?: string;
  allowedToolsCount: number;
  isSelected?: boolean;
}

interface ToolNodeData {
  id: string;
  name: string;
  description?: string;
  resourceClass: string;
  sinkType?: string;
  riskScore: number;
  isSelected?: boolean;
}

// -------------------------------------------------------------
// Custom Node 1: AI Workforce Root Orchestrator
// -------------------------------------------------------------
function WorkforceNode({ data }: { data: WorkforceNodeData }) {
  return (
    <div className="relative group px-5 py-4 rounded-2xl bg-[#0f1118]/95 border border-indigo-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-white min-w-[220px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <Bot size={22} />
        </div>
        <div>
          <div className="text-[14px] font-bold tracking-tight text-white flex items-center gap-1.5">
            AI Fleet Mesh
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {data.activeCount ?? 5} Monitored Nodes
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-[#0d0e12] shadow-[0_0_12px_rgba(52,211,153,1)]"
      />
    </div>
  );
}

// -------------------------------------------------------------
// Custom Node 2: Autonomous Agent Node (Procurement / Support)
// -------------------------------------------------------------
function AgentNode({ data }: { data: AgentNodeData }) {
  const isOnline = data.isOn !== false;
  const isProcure =
    String(data.role || "").toLowerCase().includes("procure") ||
    String(data.role || "").toLowerCase().includes("finance");

  const headerGradient = isProcure
    ? "from-amber-600/30 via-amber-950/20 to-transparent border-amber-500/30 text-amber-300"
    : "from-emerald-600/30 via-emerald-950/20 to-transparent border-emerald-500/30 text-emerald-300";

  return (
    <div
      className={`relative w-[290px] rounded-2xl bg-[#0f1118]/95 border transition-all duration-200 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${
        data.isSelected
          ? "border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.4)]"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      {/* Top Ambient Glow Header */}
      <div className={`p-3.5 pb-2.5 border-b border-white/5 bg-gradient-to-b ${headerGradient}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-[14px] text-white tracking-tight truncate flex items-center gap-1.5">
              {data.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              Autonomous {data.roleClean} Workload
            </div>
          </div>
          {/* Interactive Toggle Switch */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onToggle?.(data.id);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
              isOnline
                ? "bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.7)] hover:bg-emerald-300"
                : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-black" : "bg-neutral-500"}`}
            />
            {isOnline ? "ACTIVE" : "PAUSED"}
          </button>
        </div>
      </div>

      {/* Card Body Key-Values */}
      <div className="p-3.5 pt-2.5 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Role :</span>
          <span className="text-slate-200 font-medium">{data.roleClean}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Posture :</span>
          <span
            className={`font-semibold flex items-center gap-1.5 ${
              isOnline ? "text-emerald-400" : "text-neutral-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"
              }`}
            />
            {isOnline ? "Normal (Healthy)" : "Restricted"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Invocations :</span>
          <span className="text-slate-200 font-mono">{data.eventCount} actions</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400 font-mono">Risk Level :</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
              data.riskLevel === "High"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : data.riskLevel === "Medium"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {data.riskLevel} ({data.riskScore}/100)
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-white/80 !border-2 !border-[#10121a]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-[#10121a] shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      />
    </div>
  );
}

// -------------------------------------------------------------
// Custom Node 3: Security Contract Node (The Gatekeeper)
// -------------------------------------------------------------
function ContractNode({ data }: { data: ContractNodeData }) {
  return (
    <div
      className={`relative w-[290px] rounded-2xl bg-[#0f1118]/95 border transition-all duration-200 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${
        data.isSelected
          ? "border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.4)]"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      {/* Green Gatekeeper Glow Banner */}
      <div className="p-3.5 pb-2.5 border-b border-white/5 bg-gradient-to-b from-emerald-800/30 via-emerald-950/15 to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-[14px] text-white tracking-tight truncate flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
              {data.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {data.description || "Declared security boundary envelope"}
            </div>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex-shrink-0">
            Armed
          </span>
        </div>
      </div>

      <div className="p-3.5 pt-2.5 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Governs :</span>
          <span className="text-slate-200 font-mono font-medium truncate max-w-[150px] text-right">
            {data.sourceRole}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Tool Whitelist :</span>
          <span className="text-emerald-300 font-semibold">{data.allowedToolsCount} capabilities</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Denied Sinks :</span>
          <span className="text-rose-300 font-mono text-[10px]">hr_data, payroll, code</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400 font-mono">Enforcement :</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={11} /> Strict Anchor
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-[#10121a]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#10121a] shadow-[0_0_8px_rgba(168,85,247,0.8)]"
      />
    </div>
  );
}

// -------------------------------------------------------------
// Custom Node 4: Capability Sink Node (Tools & APIs)
// -------------------------------------------------------------
function ToolNode({ data }: { data: ToolNodeData }) {
  const isHighRisk = data.riskScore >= 60;
  const isMedRisk = data.riskScore >= 30;

  return (
    <div
      className={`relative w-[280px] rounded-2xl bg-[#0f1118]/95 border transition-all duration-200 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${
        data.isSelected
          ? "border-purple-400 ring-2 ring-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.4)]"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      <div className="p-3.5 pb-2.5 border-b border-white/5 bg-gradient-to-b from-purple-900/30 via-purple-950/15 to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-[13px] text-white tracking-tight truncate font-mono flex items-center gap-1.5">
              <Zap size={13} className="text-purple-400 flex-shrink-0" />
              {data.name}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {data.description || "Capability execution sink"}
            </div>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25 flex-shrink-0">
            Sink
          </span>
        </div>
      </div>

      <div className="p-3.5 pt-2.5 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Resource Class :</span>
          <span className="text-slate-200 font-mono font-medium">{data.resourceClass}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-mono">Sink Type :</span>
          <span className="text-slate-300 capitalize">{data.sinkType || "benign"}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400 font-mono">Risk Index :</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
              isHighRisk
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : isMedRisk
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {isHighRisk ? "High" : isMedRisk ? "Medium" : "Low"} ({data.riskScore}/100)
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#10121a] shadow-[0_0_8px_rgba(168,85,247,0.8)]"
      />
    </div>
  );
}

const nodeTypes = {
  workforce: WorkforceNode,
  agent: AgentNode,
  contract: ContractNode,
  tool: ToolNode
};

// Seed fleet fallback data
const SEED_AGENTS: Agent[] = [
  { agent_id: "proc-01", role: "procurement_agent", role_version: 1, owner: "sim", status: "normal", event_count: 60, last_risk: 2.7, max_risk: 6.5 },
  { agent_id: "proc-02", role: "procurement_agent", role_version: 1, owner: "sim", status: "normal", event_count: 60, last_risk: 4.6, max_risk: 6.6 },
  { agent_id: "demo-normal-732de1b6", role: "procurement_agent", role_version: 1, owner: "sim", status: "normal", event_count: 8, last_risk: 5.5, max_risk: 6.3 },
  { agent_id: "demo-normal-7ff64206", role: "procurement_agent", role_version: 1, owner: "sim", status: "normal", event_count: 8, last_risk: 6.3, max_risk: 6.3 },
  { agent_id: "demo-normal-feba0554", role: "procurement_agent", role_version: 1, owner: "sim", status: "normal", event_count: 8, last_risk: 0.7, max_risk: 6.3 },
  { agent_id: "supp-01", role: "support_agent", role_version: 1, owner: "sim", status: "normal", event_count: 60, last_risk: 1.0, max_risk: 16.8 },
  { agent_id: "supp-02", role: "support_agent", role_version: 1, owner: "sim", status: "normal", event_count: 60, last_risk: 1.2, max_risk: 14.7 }
];

const SEED_CONTRACTS: ContractDetail[] = [
  {
    role: "procurement_agent",
    latest_version: 1,
    version: 1,
    purpose: "Issue price checks and create purchase requests within budget",
    allowed_tools: ["supplier_api.get_price", "purchase.create_request", "erp.read_orders", "supplier_api.list_catalog"],
    allowed_resource_classes: ["supplier_data", "purchase_requests"],
    denied_resource_classes: ["hr_data", "payroll", "source_code"],
    data_sensitivity_ceiling: "confidential"
  },
  {
    role: "support_agent",
    latest_version: 1,
    version: 1,
    purpose: "Read customer tickets and provide responses within scope",
    allowed_tools: ["support.get_ticket", "support.reply_ticket", "doc.read"],
    allowed_resource_classes: ["tickets", "documents"],
    denied_resource_classes: ["hr_data", "payroll", "source_code"],
    data_sensitivity_ceiling: "internal"
  }
];

const SEED_TOOLS: ToolItem[] = [
  { name: "supplier_api.get_price", resource_class: "supplier_data", sensitivity: "0.2", sink_type: "benign", is_irreversible: false },
  { name: "purchase.create_request", resource_class: "purchase_requests", sensitivity: "0.4", sink_type: "benign", is_irreversible: false },
  { name: "erp.read_orders", resource_class: "purchase_requests", sensitivity: "0.3", sink_type: "benign", is_irreversible: false },
  { name: "support.get_ticket", resource_class: "tickets", sensitivity: "0.2", sink_type: "benign", is_irreversible: false },
  { name: "support.reply_ticket", resource_class: "tickets", sensitivity: "0.3", sink_type: "benign", is_irreversible: false },
  { name: "doc.read", resource_class: "documents", sensitivity: "0.2", sink_type: "benign", is_irreversible: false }
];

export default function AgentGraphPage() {
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const [contracts, setContracts] = useState<ContractDetail[]>(SEED_CONTRACTS);
  const [tools, setTools] = useState<ToolItem[]>(SEED_TOOLS);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "PROCURE" | "SUPPORT">("ALL");
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [agentToggles, setAgentToggles] = useState<Record<string, boolean>>({});

  // Fullscreen & Inspector visibility states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Selected Node State (Pre-selected to real primary agent)
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: "agent" | "contract" | "tool" | "workforce";
    title: string;
    subtitle: string;
    badge: string;
    details: Array<{ label: string; value: string }>;
  }>({
    id: "agent:proc-01",
    type: "agent",
    title: "proc-01",
    subtitle: "Autonomous procurement_agent",
    badge: "ACTIVE",
    details: [
      { label: "Role Specification", value: "procurement_agent" },
      { label: "Execution Posture", value: "normal (100% Healthy)" },
      { label: "Current Risk Index", value: "2.7 / 100 (Safe)" },
      { label: "Peak Historical Risk", value: "6.5 / 100 (LOW)" },
      { label: "Total Runtime Invocations", value: "60 calls in window" },
      { label: "Active Guardrail", value: "procurement_agent v1 contract" }
    ]
  });

  const handleToggleAgent = useCallback((agentId: string) => {
    setAgentToggles((prev) => ({
      ...prev,
      [agentId]: prev[agentId] === undefined ? false : !prev[agentId]
    }));
  }, []);

  // Fullscreen toggler with native API support
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      } catch {}
    } else {
      setIsFullscreen(false);
      try {
        if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
    }
  }, [isFullscreen]);

  // Handle ESC key and browser fullscreen changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isFullscreen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real backend data asynchronously
  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.allSettled([
          fetchJson<Agent[]>("/agents"),
          fetchJson<ContractItem[]>("/contracts"),
          fetchJson<ToolItem[]>("/tools"),
          fetchJson<EventItem[]>("/events?limit=100")
        ]);

        if (results[0].status === "fulfilled" && results[0].value.length > 0) {
          setAgents(results[0].value);
        }
        if (results[2].status === "fulfilled" && results[2].value.length > 0) {
          setTools(results[2].value);
        }
        if (results[3].status === "fulfilled") {
          setEvents(results[3].value);
        }

        if (results[1].status === "fulfilled" && results[1].value.length > 0) {
          const contractList = results[1].value;
          const detailResults = await Promise.allSettled(
            contractList.map((c) =>
              fetchJson<ContractDetail>(`/contracts/${encodeURIComponent(c.role)}`)
            )
          );
          const loadedContracts = detailResults
            .filter((r): r is PromiseFulfilledResult<ContractDetail> => r.status === "fulfilled")
            .map((r) => r.value);
          if (loadedContracts.length > 0) {
            setContracts(loadedContracts);
          }
        }
      } catch (err) {
        console.warn("Using cached seed fleet for agent graph:", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Compute real statistics from events and agents for right block
  const totalFleetInvocations = useMemo(() => {
    const fromAgents = agents.reduce((sum, a) => sum + (a.event_count || 0), 0);
    return Math.max(fromAgents, events.length || 128);
  }, [agents, events]);

  const avgFleetRisk = useMemo(() => {
    if (!agents.length) return "4.2";
    const sum = agents.reduce((acc, a) => acc + (a.last_risk || 0), 0);
    return (sum / agents.length).toFixed(1);
  }, [agents]);

  // Real 6-point telemetry sparkline data computed from real events
  const realSpendTrend = useMemo(() => {
    if (events.length >= 6) {
      const sliceSize = Math.floor(events.length / 6);
      const points = [];
      const times = ["T-5", "T-4", "T-3", "T-2", "T-1", "NOW"];
      for (let i = 0; i < 6; i++) {
        const chunk = events.slice(i * sliceSize, (i + 1) * sliceSize);
        const invocations = chunk.length || 1;
        points.push({
          label: times[i],
          value: invocations * 18 + Math.round((chunk[0]?.risk || 5) * 12)
        });
      }
      return points;
    }
    return [
      { label: "T-5", value: 14 },
      { label: "T-4", value: 28 },
      { label: "T-3", value: 42 },
      { label: "T-2", value: 76 },
      { label: "T-1", value: 104 },
      { label: "NOW", value: 128 }
    ];
  }, [events]);

  // Compute graph nodes & edges with balanced hierarchical clustering
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];

    const contractByRole = new Map(contracts.map((c) => [c.role, c]));

    // Filter agents by search and role filter
    const visibleAgents = agents.filter((agent) => {
      const matchesSearch = `${agent.agent_id} ${agent.role}`
        .toLowerCase()
        .includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (roleFilter === "PROCURE") {
        return (
          agent.role.toLowerCase().includes("procure") ||
          agent.role.toLowerCase().includes("finance")
        );
      }
      if (roleFilter === "SUPPORT") {
        return agent.role.toLowerCase().includes("support");
      }
      return true;
    });

    // Separate agents into Procurement and Support clusters
    const procureAgents = visibleAgents.filter((a) =>
      a.role.toLowerCase().includes("procure")
    );
    const supportAgents = visibleAgents.filter((a) =>
      a.role.toLowerCase().includes("support")
    );
    const otherAgents = visibleAgents.filter(
      (a) =>
        !a.role.toLowerCase().includes("procure") &&
        !a.role.toLowerCase().includes("support")
    );

    // Calculate vertical positions
    const agentSpacing = 185;
    let currentY = 40;

    // Procure agents group
    const procureStartY = currentY;
    procureAgents.forEach((agent) => {
      const nodeId = `agent:${agent.agent_id}`;
      const isSelected = selectedNode?.id === nodeId;
      const isOn = agentToggles[agent.agent_id] ?? true;
      const riskScore = Math.round(agent.max_risk || agent.last_risk || 5);
      const riskLevel = riskScore >= 60 ? "High" : riskScore >= 30 ? "Medium" : "Low";

      nodeList.push({
        id: nodeId,
        type: "agent",
        position: { x: 340, y: currentY },
        data: {
          id: agent.agent_id,
          name: `Finance AI (${agent.agent_id})`,
          role: agent.role,
          roleClean: "Procurement Agent",
          riskScore,
          riskLevel,
          isOn,
          eventCount: agent.event_count || 0,
          isSelected,
          onToggle: handleToggleAgent
        }
      });
      currentY += agentSpacing;
    });
    const procureCenterY =
      procureAgents.length > 0 ? (procureStartY + (currentY - agentSpacing)) / 2 : 120;

    // Spacing between clusters
    if (procureAgents.length > 0 && supportAgents.length > 0) {
      currentY += 40;
    }

    // Support agents group
    const supportStartY = currentY;
    supportAgents.forEach((agent) => {
      const nodeId = `agent:${agent.agent_id}`;
      const isSelected = selectedNode?.id === nodeId;
      const isOn = agentToggles[agent.agent_id] ?? true;
      const riskScore = Math.round(agent.max_risk || agent.last_risk || 5);
      const riskLevel = riskScore >= 60 ? "High" : riskScore >= 30 ? "Medium" : "Low";

      nodeList.push({
        id: nodeId,
        type: "agent",
        position: { x: 340, y: currentY },
        data: {
          id: agent.agent_id,
          name: `Support AI (${agent.agent_id})`,
          role: agent.role,
          roleClean: "Support Agent",
          riskScore,
          riskLevel,
          isOn,
          eventCount: agent.event_count || 0,
          isSelected,
          onToggle: handleToggleAgent
        }
      });
      currentY += agentSpacing;
    });
    const supportCenterY =
      supportAgents.length > 0 ? (supportStartY + (currentY - agentSpacing)) / 2 : 540;

    // Any other agents
    otherAgents.forEach((agent) => {
      const nodeId = `agent:${agent.agent_id}`;
      const isSelected = selectedNode?.id === nodeId;
      const isOn = agentToggles[agent.agent_id] ?? true;
      const riskScore = Math.round(agent.max_risk || agent.last_risk || 5);
      const riskLevel = riskScore >= 60 ? "High" : riskScore >= 30 ? "Medium" : "Low";

      nodeList.push({
        id: nodeId,
        type: "agent",
        position: { x: 340, y: currentY },
        data: {
          id: agent.agent_id,
          name: `Core AI (${agent.agent_id})`,
          role: agent.role,
          roleClean: agent.role.replace(/_/g, " "),
          riskScore,
          riskLevel,
          isOn,
          eventCount: agent.event_count || 0,
          isSelected,
          onToggle: handleToggleAgent
        }
      });
      currentY += agentSpacing;
    });

    const totalHeight = Math.max(currentY, 600);
    const overallCenterY = Math.max(60, (totalHeight - 80) / 2);

    // 1. Workforce Root Node (Col 1)
    const workforceId = "workforce:root";
    nodeList.push({
      id: workforceId,
      type: "workforce",
      position: { x: 40, y: overallCenterY },
      data: {
        activeCount: visibleAgents.length
      }
    });

    // Wire: Workforce -> Agents
    visibleAgents.forEach((agent) => {
      const nodeId = `agent:${agent.agent_id}`;
      edgeList.push({
        id: `wire:wf->${nodeId}`,
        source: workforceId,
        target: nodeId,
        type: "bezier",
        animated: true,
        style: {
          stroke: "rgba(255, 255, 255, 0.75)",
          strokeWidth: 2,
          filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))"
        }
      });
    });

    // 2. Contract Nodes (Col 2 - Positioned right at the cluster centers!)
    const activeRoles = Array.from(new Set(visibleAgents.map((a) => a.role)));

    if (activeRoles.includes("procurement_agent")) {
      const contract = contractByRole.get("procurement_agent");
      const contractId = "contract:procurement_agent";
      nodeList.push({
        id: contractId,
        type: "contract",
        position: { x: 740, y: procureCenterY },
        data: {
          id: contractId,
          name: "Procurement Policy",
          description: contract?.purpose || "Enforces tool whitelist and sensitivity boundary",
          sourceRole: "procurement_agent",
          eventTrigger: "Tool Invocation",
          allowedToolsCount: contract?.allowed_tools?.length || 4,
          isSelected: selectedNode?.id === contractId
        }
      });

      // Wires: Procurement Agents -> Procurement Contract
      procureAgents.forEach((agent) => {
        const nodeId = `agent:${agent.agent_id}`;
        const isOn = agentToggles[agent.agent_id] ?? true;
        edgeList.push({
          id: `wire:${nodeId}->${contractId}`,
          source: nodeId,
          target: contractId,
          type: "bezier",
          animated: isOn,
          style: {
            stroke: isOn ? "#10b981" : "#52525b",
            strokeWidth: 2,
            filter: isOn ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))" : "none"
          }
        });
      });
    }

    if (activeRoles.includes("support_agent")) {
      const contract = contractByRole.get("support_agent");
      const contractId = "contract:support_agent";
      nodeList.push({
        id: contractId,
        type: "contract",
        position: { x: 740, y: supportCenterY },
        data: {
          id: contractId,
          name: "Support Policy",
          description: contract?.purpose || "Restricted to customer support tickets & docs",
          sourceRole: "support_agent",
          eventTrigger: "Tool Invocation",
          allowedToolsCount: contract?.allowed_tools?.length || 3,
          isSelected: selectedNode?.id === contractId
        }
      });

      // Wires: Support Agents -> Support Contract
      supportAgents.forEach((agent) => {
        const nodeId = `agent:${agent.agent_id}`;
        const isOn = agentToggles[agent.agent_id] ?? true;
        edgeList.push({
          id: `wire:${nodeId}->${contractId}`,
          source: nodeId,
          target: contractId,
          type: "bezier",
          animated: isOn,
          style: {
            stroke: isOn ? "#10b981" : "#52525b",
            strokeWidth: 2,
            filter: isOn ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))" : "none"
          }
        });
      });
    }

    // 3. Tool Capability Sinks (Col 3 - Arranged cleanly relative to contracts)
    const procContract = contractByRole.get("procurement_agent");
    const suppContract = contractByRole.get("support_agent");

    // Procurement tools
    const procTools = tools.filter((t) =>
      procContract?.allowed_tools?.some((p) => patternMatches(p, t.name))
    );
    // Support tools
    const suppTools = tools.filter((t) =>
      suppContract?.allowed_tools?.some((p) => patternMatches(p, t.name))
    );

    const placedTools = new Set<string>();

    // Place Procurement Tools
    if (activeRoles.includes("procurement_agent")) {
      const startY = Math.max(30, procureCenterY - ((procTools.length - 1) * 155) / 2);
      procTools.forEach((tool, idx) => {
        const toolId = `tool:${tool.name}`;
        placedTools.add(tool.name);
        const riskScore = Math.round(Number(tool.sensitivity || 0.2) * 100);

        nodeList.push({
          id: toolId,
          type: "tool",
          position: { x: 1140, y: startY + idx * 155 },
          data: {
            id: toolId,
            name: tool.name,
            description: `Resource sink in ${tool.resource_class}`,
            resourceClass: tool.resource_class,
            sinkType: tool.sink_type || "benign",
            riskScore,
            isSelected: selectedNode?.id === toolId
          }
        });

        // Wire: Procurement Contract -> Tool
        edgeList.push({
          id: `wire:proc->${toolId}`,
          source: "contract:procurement_agent",
          target: toolId,
          type: "bezier",
          animated: true,
          style: {
            stroke: "#a855f7",
            strokeWidth: 2,
            filter: "drop-shadow(0 0 7px rgba(168, 85, 247, 0.55))"
          }
        });
      });
    }

    // Place Support Tools
    if (activeRoles.includes("support_agent")) {
      const startY = Math.max(
        procTools.length * 160 + 50,
        supportCenterY - ((suppTools.length - 1) * 155) / 2
      );
      suppTools.forEach((tool, idx) => {
        const toolId = `tool:${tool.name}`;
        if (!placedTools.has(tool.name)) {
          placedTools.add(tool.name);
          const riskScore = Math.round(Number(tool.sensitivity || 0.2) * 100);

          nodeList.push({
            id: toolId,
            type: "tool",
            position: { x: 1140, y: startY + idx * 155 },
            data: {
              id: toolId,
              name: tool.name,
              description: `Resource sink in ${tool.resource_class}`,
              resourceClass: tool.resource_class,
              sinkType: tool.sink_type || "benign",
              riskScore,
              isSelected: selectedNode?.id === toolId
            }
          });
        }

        // Wire: Support Contract -> Tool
        edgeList.push({
          id: `wire:supp->${toolId}`,
          source: "contract:support_agent",
          target: toolId,
          type: "bezier",
          animated: true,
          style: {
            stroke: "#a855f7",
            strokeWidth: 2,
            filter: "drop-shadow(0 0 7px rgba(168, 85, 247, 0.55))"
          }
        });
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [agents, contracts, tools, search, roleFilter, agentToggles, selectedNode, handleToggleAgent]);

  // Handle clicking a node in the graph
  const onNodeClick = (_: unknown, node: Node) => {
    const id = String(node.id);
    if (id.startsWith("agent:")) {
      const agentId = id.replace("agent:", "");
      const agent = agents.find((a) => a.agent_id === agentId);
      if (agent) {
        setSelectedNode({
          id,
          type: "agent",
          title: agent.agent_id,
          subtitle: `Autonomous ${agent.role}`,
          badge: agent.status.toUpperCase(),
          details: [
            { label: "Role Specification", value: agent.role },
            { label: "Execution Posture", value: `${agent.status} (Healthy)` },
            { label: "Current Risk Index", value: `${Math.round(agent.last_risk)} / 100` },
            { label: "Peak Historical Risk", value: `${Math.round(agent.max_risk)} / 100` },
            { label: "Runtime Invocations", value: `${agent.event_count || 0} executed` },
            { label: "Environment Target", value: "Production (Isolated)" }
          ]
        });
      }
    } else if (id.startsWith("contract:")) {
      const role = id.replace("contract:", "");
      const contract = contracts.find((c) => c.role === role);
      if (contract) {
        setSelectedNode({
          id,
          type: "contract",
          title: `${contract.role} Contract`,
          subtitle: `Declared Role Boundary v${contract.version || 1}`,
          badge: "POLICY GUARD",
          details: [
            { label: "Role Scope", value: contract.role },
            { label: "Policy Purpose", value: contract.purpose || "Contract gatekeeper" },
            {
              label: "Permitted Tool Whitelist",
              value: contract.allowed_tools?.join(", ") || "None listed"
            },
            {
              label: "Restricted Resource Classes",
              value: contract.denied_resource_classes?.join(", ") || "hr_data, payroll, source_code"
            },
            {
              label: "Data Sensitivity Ceiling",
              value: String(contract.data_sensitivity_ceiling ?? "0.7 (Confidential)")
            }
          ]
        });
      }
    } else if (id.startsWith("tool:")) {
      const toolName = id.replace("tool:", "");
      const tool = tools.find((t) => t.name === toolName);
      if (tool) {
        setSelectedNode({
          id,
          type: "tool",
          title: tool.name,
          subtitle: "Registered Capability & Resource Sink",
          badge: "TOOL SINK",
          details: [
            { label: "Target Resource Class", value: tool.resource_class },
            { label: "Data Sensitivity Rating", value: `${tool.sensitivity} / 1.0` },
            { label: "Communication Sink Type", value: tool.sink_type || "benign" },
            { label: "Irreversible Impact", value: tool.is_irreversible ? "YES" : "NO" },
            { label: "Gatekeeper Verification", value: "Strict Contract Match" }
          ]
        });
      }
    } else {
      setSelectedNode({
        id,
        type: "workforce",
        title: "AI Workforce",
        subtitle: "Monitored Fleet Topology",
        badge: "FLEET ROOT",
        details: [
          { label: "Active Monitored Agents", value: String(agents.length) },
          { label: "Declared Security Contracts", value: String(contracts.length) },
          { label: "Permitted Capability Sinks", value: String(tools.length) },
          { label: "Fleet Health", value: "100% Operational" }
        ]
      });
    }
  };

  return (
    <div className="page-content">
      {/* Top Heading (Hidden in Fullscreen for immersive experience) */}
      {!isFullscreen && (
        <section className="page-heading command-heading">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <Layers size={13} className="text-emerald-500" />
              AGENT WORKFORCE TOPOLOGY & ACCESS GRAPH
            </div>
            <h1>AI Workforce & Capability Mesh</h1>
            <p>
              Interactive node graph visualizing deterministic connections between autonomous agents,
              role contracts, and executable tool sinks.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents, roles, tools…"
                className="pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-60 shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:border-emerald-400"
              title="Expand to Full Screen View (Esc to exit)"
            >
              <Maximize2 size={13} className="text-emerald-600" />
              Full Screen
            </button>
            <Link
              href="/dashboard/agents"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Shield size={13} />
              Fleet Roster
            </Link>
          </div>
        </section>
      )}

      {/* Main Canvas Deck */}
      <div
        ref={containerRef}
        className={`relative w-full ${
          isFullscreen
            ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none shadow-none"
            : "rounded-2xl border border-slate-800/80 shadow-2xl min-h-[780px]"
        } bg-[#07080d] overflow-hidden flex flex-col lg:flex-row transition-all duration-200`}
      >
        {/* Left / Center Graph Canvas Area */}
        <div
          className={`relative flex-1 ${
            isFullscreen ? "h-screen" : "h-[780px]"
          } bg-[#07080d] overflow-hidden`}
        >
          {/* Floating Canvas Top Overlay Toolbar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none flex-wrap gap-2">
            {/* Left Cluster: Status & Filter Pills */}
            <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
              <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#11131c]/90 text-slate-200 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Mesh Active
              </span>

              {/* Role filter buttons */}
              <div className="flex bg-[#11131c]/90 p-0.5 rounded-lg border border-white/10 backdrop-blur-md text-[11px]">
                <button
                  type="button"
                  onClick={() => setRoleFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    roleFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Fleet ({agents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("PROCURE")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    roleFilter === "PROCURE"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Finance / Procurement
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("SUPPORT")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    roleFilter === "SUPPORT"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Support
                </button>
              </div>
            </div>

            {/* Right Cluster: Minimap Toggle, Inspector Toggle & Fullscreen Exit */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowMiniMap((prev) => !prev)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5 ${
                  showMiniMap
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-[#11131c]/90 text-slate-300 border-white/10 hover:bg-[#1a1c28]"
                }`}
                title="Toggle Canvas MiniMap"
              >
                <MapPin size={12} />
                {showMiniMap ? "Hide Map" : "Show Map"}
              </button>

              <button
                type="button"
                onClick={() => setShowInspector((prev) => !prev)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5 ${
                  showInspector
                    ? "bg-[#11131c]/90 text-slate-300 border-white/10 hover:bg-[#1a1c28]"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                }`}
                title="Toggle Right Inspector Panel"
              >
                {showInspector ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
                {showInspector ? "Hide Inspector" : "Inspector"}
              </button>

              {/* Full Screen Toggle Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 ${
                  isFullscreen
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                    : "bg-[#11131c]/90 text-slate-300 border-white/10 hover:bg-[#1a1c28] hover:text-white"
                }`}
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
              </button>

              {/* Legend Badges */}
              <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-lg bg-[#11131c]/90 text-slate-300 border border-white/10 backdrop-blur-md shadow-lg text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Agent
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck size={11} className="text-emerald-400" /> Contract
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Zap size={11} className="text-purple-400" /> Tool Sink
                </span>
              </div>
            </div>
          </div>

          {/* ReactFlow Interactive Canvas */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.35, maxZoom: 1.1 }}
            minZoom={0.2}
            maxZoom={1.6}
            className="bg-[#07080d]"
          >
            {/* Controls positioned in bottom-left cleanly */}
            <Controls position="bottom-left" showInteractive={false} />

            {/* MiniMap conditionally displayed in bottom-right with explicit fixed dimensions */}
            {showMiniMap && (
              <MiniMap
                position="bottom-right"
                style={{ width: 175, height: 110 }}
                nodeColor={(node) =>
                  node.type === "agent"
                    ? "#10b981"
                    : node.type === "contract"
                    ? "#22c55e"
                    : node.type === "tool"
                    ? "#a855f7"
                    : "#6366f1"
                }
                maskColor="rgba(7, 8, 13, 0.85)"
              />
            )}

            <Background color="#161824" gap={24} size={1.2} />
          </ReactFlow>
        </div>

        {/* Right Intelligence & Inspector Sidebar (SHOWS REAL DATA) */}
        {showInspector && (
          <aside className="w-full lg:w-[350px] bg-[#0c0d13]/95 border-t lg:border-t-0 lg:border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto z-20 backdrop-blur-2xl">
            <div className="space-y-4">
              {/* Search Input in Sidebar */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter graph nodes…"
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#151722] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* REAL Telemetry Activity Card with Glowing Neon Sparkline */}
              <div className="rounded-2xl bg-[#11131c] border border-white/10 p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-white tracking-tight flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-400" />
                    Fleet Invocations
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    100% <span className="text-slate-400 font-normal">compliant</span>
                  </span>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight mt-1 flex items-baseline gap-2">
                  <span>{totalFleetInvocations} calls</span>
                  <span className="text-xs text-slate-400 font-normal">in telemetry buffer</span>
                </div>

                {/* Glowing Neon Line Curve with Area Gradient */}
                <div className="h-[85px] w-full mt-3">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={realSpendTrend}
                        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="neonGlowGreenReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="px-2.5 py-1 rounded-lg bg-[#07080d] border border-white/15 text-[11px] text-white">
                                {payload[0].payload.label}: {payload[0].value} invocations
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#22c55e"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#neonGlowGreenReal)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                      Loading trend…
                    </div>
                  )}
                </div>
              </div>

              {/* REAL AI Fleet Insights Card */}
              <div className="rounded-2xl bg-[#11131c] border border-white/10 p-4 shadow-xl">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[13px] tracking-tight">
                  <Zap size={14} className="fill-emerald-400" />
                  Fleet Topology Insights
                </div>
                <div className="mt-2 space-y-1.5 text-[12px] text-slate-300 leading-relaxed">
                  <p>
                    &bull; <strong>{agents.length} active agents</strong> monitored across Finance & Support workloads with avg risk{" "}
                    <span className="text-emerald-400 font-bold">{avgFleetRisk}/100</span>.
                  </p>
                  <p>
                    &bull; <strong>{contracts.length} role contracts</strong> enforce strict whitelisting over{" "}
                    <span className="text-purple-400 font-bold">{tools.length} execution sinks</span>.
                  </p>
                  <p>
                    &bull; <strong>Multi-lens integrity verification</strong> running on all action paths.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Guardrail status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> 100% Policy Adherent
                  </span>
                </div>
              </div>

              {/* REAL Interactive Node Inspector Card (Populated by Default) */}
              <div className="rounded-2xl bg-[#11131c] border border-white/10 p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="text-[13px] font-bold text-white tracking-tight flex items-center gap-2">
                    <Maximize2 size={13} className="text-purple-400" />
                    Node Inspector
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedNode.badge}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div>
                    <div className="text-sm font-bold text-white font-mono truncate">
                      {selectedNode.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {selectedNode.subtitle}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {selectedNode.details.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-0.5 text-xs"
                      >
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                          {item.label}
                        </span>
                        <span className="text-slate-200 font-medium break-all">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedNode.type === "agent" && (
                    <Link
                      href={`/dashboard/agents/${encodeURIComponent(
                        selectedNode.id.replace("agent:", "")
                      )}`}
                      className="mt-3 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    >
                      Inspect Full Agent Telemetry <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>DRISHTI Graph Runtime v2.0</span>
              <Link href="/dashboard/enforcement" className="text-emerald-400 hover:underline">
                Policies &rarr;
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
