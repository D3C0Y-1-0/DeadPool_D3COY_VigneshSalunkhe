"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Crosshair,
  ExternalLink,
  Filter,
  Flame,
  Gauge,
  Layers,
  LockKeyhole,
  PieChart as PieIcon,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart
} from "recharts";
import {
  fetchJson,
  type Agent,
  type AlertItem,
  type ApprovalItem,
  type DecoyItem,
  type EventItem,
  type OutboxItem
} from "@/lib/api";

const BAND_COLORS: Record<string, string> = {
  LOW: "#10b981",
  WATCH: "#0ea5e9",
  ELEVATED: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444"
};

const DECISION_COLORS: Record<string, string> = {
  ALLOW: "#10b981",
  BLOCK: "#ef4444",
  REVIEW: "#f59e0b",
  OBSERVE: "#3b82f6"
};

type ViewPerspective = "ALL" | "OVERVIEW" | "ATTACK_SURFACE" | "LENS_ENGINE" | "AGENTS";

export default function OverviewPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[] | null>(null);
  const [decoys, setDecoys] = useState<DecoyItem[] | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filter & perspective state
  const [perspective, setPerspective] = useState<ViewPerspective>("ALL");
  const [eventFilter, setEventFilter] = useState<"ALL" | "HIGH_RISK" | "BLOCK" | "REVIEW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineMode, setTimelineMode] = useState<"COMBINED" | "RISK" | "VOLUME">("COMBINED");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const requests = await Promise.allSettled([
        fetchJson<Agent[]>("/agents"),
        fetchJson<EventItem[]>("/events?limit=100"),
        fetchJson<AlertItem[]>("/alerts?limit=10"),
        fetchJson<ApprovalItem[]>("/approvals?status=pending"),
        fetchJson<DecoyItem[]>("/decoys"),
        fetchJson<OutboxItem>("/sim/outbox")
      ]);
      if (!active) return;
      const labels = ["Agents", "Events", "Alerts", "Approvals", "Decoys", "Outbox"];
      const failures: string[] = [];
      requests.forEach((result, index) => {
        if (result.status === "rejected") {
          failures.push(
            `${labels[index]}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`
          );
        }
      });
      const value = <T,>(index: number): T | null =>
        requests[index].status === "fulfilled" ? (requests[index].value as T) : null;

      setAgents(value<Agent[]>(0));
      setEvents(value<EventItem[]>(1));
      setAlerts(value<AlertItem[]>(2));
      setApprovals(value<ApprovalItem[]>(3));
      setDecoys(value<DecoyItem[]>(4));
      setOutbox(value<OutboxItem>(5));
      setErrors(failures);
      setLoading(false);
    }

    let refreshTimer: number | undefined;
    const onLiveEvent = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(), 250);
    };

    window.addEventListener("drishti:live-event", onLiveEvent);
    void load();

    return () => {
      active = false;
      window.removeEventListener("drishti:live-event", onLiveEvent);
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, []);

  // Aggregated analytical statistics
  const totalEvents = events?.length ?? 0;
  const highRiskEvents = useMemo(
    () => events?.filter((ev) => ["ELEVATED", "HIGH", "CRITICAL"].includes(ev.band)).length ?? 0,
    [events]
  );
  const blockedEvents = useMemo(
    () => events?.filter((ev) => ev.decision === "BLOCK").length ?? 0,
    [events]
  );
  const reviewEvents = useMemo(
    () => events?.filter((ev) => ev.decision === "REVIEW").length ?? 0,
    [events]
  );
  const allowedEvents = useMemo(
    () => events?.filter((ev) => ev.decision === "ALLOW").length ?? 0,
    [events]
  );

  const blockRate = totalEvents > 0 ? ((blockedEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const complianceRate =
    totalEvents > 0 ? (((allowedEvents) / totalEvents) * 100).toFixed(1) : "100.0";

  const totalDecoyHits = useMemo(
    () => decoys?.reduce((sum, d) => sum + (d.hits || 0), 0) ?? 0,
    [decoys]
  );

  const avgRisk = useMemo(() => {
    if (!events?.length) return 0;
    const sum = events.reduce((acc, ev) => acc + (ev.risk || 0), 0);
    return Math.round((sum / events.length) * 10) / 10;
  }, [events]);

  const maxRecordedRisk = useMemo(() => {
    if (!events?.length) return 0;
    return Math.round(Math.max(...events.map((ev) => ev.risk || 0)) * 10) / 10;
  }, [events]);

  // --- VISUALIZATION 1: Temporal Trajectory / Velocity Chart ---
  const trajectoryData = useMemo(() => {
    if (!events || events.length === 0) return [];
    const sorted = [...events].reverse();
    const bucketCount = Math.min(18, Math.max(6, Math.floor(sorted.length / 5)));
    const bucketSize = Math.max(1, Math.floor(sorted.length / bucketCount));

    const points: Array<{
      time: string;
      events: number;
      avgRisk: number;
      maxRisk: number;
      tool: string;
      band: string;
    }> = [];

    for (let i = 0; i < sorted.length; i += bucketSize) {
      const chunk = sorted.slice(i, i + bucketSize);
      if (chunk.length === 0) continue;
      const last = chunk[chunk.length - 1];
      const timeStr = new Date(last.ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const avg = Math.round((chunk.reduce((acc, e) => acc + e.risk, 0) / chunk.length) * 10) / 10;
      const max = Math.round(Math.max(...chunk.map((e) => e.risk)) * 10) / 10;
      const worstBand = chunk.some((e) => e.band === "CRITICAL")
        ? "CRITICAL"
        : chunk.some((e) => e.band === "HIGH")
        ? "HIGH"
        : chunk.some((e) => e.band === "ELEVATED")
        ? "ELEVATED"
        : chunk.some((e) => e.band === "WATCH")
        ? "WATCH"
        : "LOW";

      points.push({
        time: timeStr,
        events: chunk.length,
        avgRisk: avg,
        maxRisk: max,
        tool: chunk[0]?.tool || "runtime",
        band: worstBand
      });
    }
    return points;
  }, [events]);

  // --- VISUALIZATION 2: Policy Enforcement Donut Chart ---
  const decisionDonutData = useMemo(() => {
    if (!events || events.length === 0) {
      return [{ name: "ALLOW", value: 1, color: DECISION_COLORS.ALLOW }];
    }
    const counts: Record<string, number> = { ALLOW: 0, BLOCK: 0, REVIEW: 0, OBSERVE: 0 };
    events.forEach((e) => {
      const dec = e.decision || "ALLOW";
      if (dec in counts) counts[dec] += 1;
      else counts.OBSERVE += 1;
    });

    const data = [
      { name: "ALLOW", value: counts.ALLOW, color: DECISION_COLORS.ALLOW },
      { name: "BLOCK", value: counts.BLOCK, color: DECISION_COLORS.BLOCK },
      { name: "REVIEW", value: counts.REVIEW, color: DECISION_COLORS.REVIEW },
      { name: "OBSERVE", value: counts.OBSERVE, color: DECISION_COLORS.OBSERVE }
    ].filter((item) => item.value > 0);

    return data.length > 0 ? data : [{ name: "ALLOW", value: 1, color: DECISION_COLORS.ALLOW }];
  }, [events]);

  // --- VISUALIZATION 3: Agent Fleet Posture Donut Chart ---
  const agentPostureDonutData = useMemo(() => {
    if (!agents || agents.length === 0) {
      return [{ name: "Safe Fleet", value: 1, color: "#10b981" }];
    }
    let safe = 0;
    let monitored = 0;
    let elevated = 0;
    let critical = 0;

    agents.forEach((a) => {
      const risk = a.max_risk || a.last_risk || 0;
      if (a.status === "restricted" || risk >= 70) critical++;
      else if (risk >= 40) elevated++;
      else if (risk >= 20) monitored++;
      else safe++;
    });

    const data = [
      { name: "Safe Posture (<20)", value: safe, color: "#10b981" },
      { name: "Monitored Watch (20-40)", value: monitored, color: "#0ea5e9" },
      { name: "Elevated Caution (40-70)", value: elevated, color: "#f59e0b" },
      { name: "Quarantine / Crit (>70)", value: critical, color: "#ef4444" }
    ].filter((d) => d.value > 0);

    return data.length > 0 ? data : [{ name: "Safe Posture", value: agents.length, color: "#10b981" }];
  }, [agents]);

  // --- VISUALIZATION 4: Multi-Lens Threat Engine Attribution (Pie / Donut) ---
  const lensDistributionDonutData = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { name: "Baseline", value: 1, color: "#3b82f6" },
        { name: "Role Contract", value: 1, color: "#8b5cf6" },
        { name: "Provenance", value: 1, color: "#f59e0b" }
      ];
    }
    const totals = { baseline: 0, role: 0, provenance: 0, decoy: 0, drift: 0 };
    events.forEach((e) => {
      if (e.lens) {
        if (e.lens.baseline?.score) totals.baseline += Number(e.lens.baseline.score);
        if (e.lens.role?.score) totals.role += Number(e.lens.role.score);
        if (e.lens.provenance?.score) totals.provenance += Number(e.lens.provenance.score);
        if (e.lens.decoy?.score) totals.decoy += Number(e.lens.decoy.score);
        if (e.lens.drift?.score) totals.drift += Number(e.lens.drift.score);
      }
    });

    const sum = totals.baseline + totals.role + totals.provenance + totals.decoy + totals.drift;
    if (sum === 0) {
      return [
        { name: "Role Contract (Armed)", value: 40, color: "#10b981" },
        { name: "Baseline Profiling", value: 35, color: "#3b82f6" },
        { name: "Provenance Taint Guard", value: 25, color: "#8b5cf6" }
      ];
    }

    return [
      { name: "Baseline Variance", value: Math.max(1, Math.round(totals.baseline * 10) / 10), color: "#3b82f6" },
      { name: "Role Contract Violation", value: Math.max(0, Math.round(totals.role * 10) / 10), color: "#8b5cf6" },
      { name: "Data Provenance Taint", value: Math.max(0, Math.round(totals.provenance * 10) / 10), color: "#f59e0b" },
      { name: "Tripwire Honeytokens", value: Math.max(0, Math.round(totals.decoy * 10) / 10), color: "#ef4444" },
      { name: "Capability Drift", value: Math.max(0, Math.round(totals.drift * 10) / 10), color: "#06b6d4" }
    ].filter((d) => d.value > 0);
  }, [events]);

  // --- VISUALIZATION 5: Threat Severity Bands Distribution (Bar Chart) ---
  const bands = ["LOW", "WATCH", "ELEVATED", "HIGH", "CRITICAL"] as const;
  const bandCounts = useMemo(() => {
    const counts: Record<string, number> = { LOW: 0, WATCH: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 };
    events?.forEach((e) => {
      if (e.band in counts) counts[e.band] += 1;
    });
    return counts;
  }, [events]);

  const severityBarData = useMemo(() => {
    return [
      { band: "LOW", count: bandCounts.LOW, color: BAND_COLORS.LOW, range: "0 - 20 (Safe)" },
      { band: "WATCH", count: bandCounts.WATCH, color: BAND_COLORS.WATCH, range: "21 - 40 (Variance)" },
      { band: "ELEVATED", count: bandCounts.ELEVATED, color: BAND_COLORS.ELEVATED, range: "41 - 60 (Mismatch)" },
      { band: "HIGH", count: bandCounts.HIGH, color: BAND_COLORS.HIGH, range: "61 - 80 (Exfil Risk)" },
      { band: "CRITICAL", count: bandCounts.CRITICAL, color: BAND_COLORS.CRITICAL, range: "81 - 100 (Breach)" }
    ];
  }, [bandCounts]);

  // --- VISUALIZATION 6: Top Tools Attack Surface (Composed Dual Bar & Line Chart) ---
  const toolAttackSurfaceChartData = useMemo(() => {
    if (!events || events.length === 0) return [];
    const map = new Map<string, { calls: number; maxRisk: number; avgRiskSum: number }>();
    events.forEach((e) => {
      const cur = map.get(e.tool) || { calls: 0, maxRisk: 0, avgRiskSum: 0 };
      cur.calls += 1;
      if (e.risk > cur.maxRisk) cur.maxRisk = e.risk;
      cur.avgRiskSum += e.risk;
      map.set(e.tool, cur);
    });

    return Array.from(map.entries())
      .map(([tool, stats]) => ({
        tool: tool.length > 18 ? tool.substring(0, 16) + "…" : tool,
        fullTool: tool,
        calls: stats.calls,
        maxRisk: Math.round(stats.maxRisk * 10) / 10,
        avgRisk: Math.round((stats.avgRiskSum / stats.calls) * 10) / 10
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 6);
  }, [events]);

  // --- VISUALIZATION 7: Resource Class Sensitivity Exposure (Bar Chart) ---
  const resourceClassData = useMemo(() => {
    if (!events || events.length === 0) return [];
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const rc = e.resource_class || (e.resource ? "resources" : "general_runtime");
      counts[rc] = (counts[rc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({
        category: category.replace(/_/g, " "),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [events]);

  // --- VISUALIZATION 8: Agent Risk Ranking Comparison (Bar Chart) ---
  const agentRiskRankingData = useMemo(() => {
    if (!agents || agents.length === 0) return [];
    return [...agents]
      .map((a) => ({
        agent_id: a.agent_id.length > 15 ? a.agent_id.substring(0, 13) + "…" : a.agent_id,
        fullId: a.agent_id,
        role: a.role,
        events: a.event_count || 0,
        maxRisk: Math.round((a.max_risk || a.last_risk || 0) * 10) / 10
      }))
      .sort((a, b) => b.maxRisk - a.maxRisk)
      .slice(0, 7);
  }, [agents]);

  // Filtered live events for telemetry stream
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((ev) => {
      if (eventFilter === "HIGH_RISK" && !["ELEVATED", "HIGH", "CRITICAL"].includes(ev.band)) {
        return false;
      }
      if (eventFilter === "BLOCK" && ev.decision !== "BLOCK") {
        return false;
      }
      if (eventFilter === "REVIEW" && ev.decision !== "REVIEW") {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesAgent = ev.agent_id.toLowerCase().includes(query);
        const matchesTool = ev.tool.toLowerCase().includes(query);
        const matchesResource = (ev.resource || ev.destination || "").toLowerCase().includes(query);
        const matchesBand = ev.band.toLowerCase().includes(query);
        if (!matchesAgent && !matchesTool && !matchesResource && !matchesBand) {
          return false;
        }
      }
      return true;
    });
  }, [events, eventFilter, searchQuery]);

  return (
    <div className="page-content">
      {/* Executive Command Header */}
      <section className="page-heading command-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Radio size={12} className="text-emerald-500 animate-pulse" />
            AUTONOMOUS AGENT RUNTIME COMMAND & INTELLIGENCE
          </div>
          <h1>Security & Threat Analytics</h1>
          <p>
            Real-time multi-lens behavioral telemetry, policy enforcement decisions, attack surface
            exposure, and deception signals.
          </p>
        </div>
        <div className="heading-context">
          <div className="flex items-center gap-2">
            <span className="heading-live">
              <span className="health-dot" />
              Live Telemetry Stream
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              {totalEvents} records synced
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Avg Risk: <strong className="text-slate-800">{avgRisk}</strong> / 100</span>
            <span>·</span>
            <span>Peak Risk: <strong className="text-slate-800">{maxRecordedRisk}</strong> / 100</span>
          </div>
        </div>
      </section>

      {/* Perspective / Analytical View Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 pt-1 border-b border-slate-200/80 mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setPerspective("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              perspective === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Sparkles size={13} />
            Unified Command Center
          </button>
          <button
            type="button"
            onClick={() => setPerspective("OVERVIEW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              perspective === "OVERVIEW"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <PieIcon size={13} />
            Fleet & Governance Charts
          </button>
          <button
            type="button"
            onClick={() => setPerspective("ATTACK_SURFACE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              perspective === "ATTACK_SURFACE"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={13} />
            Tool Attack Surface & Invocations
          </button>
          <button
            type="button"
            onClick={() => setPerspective("LENS_ENGINE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              perspective === "LENS_ENGINE"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Layers size={13} />
            Multi-Lens Threat Engine
          </button>
          <button
            type="button"
            onClick={() => setPerspective("AGENTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              perspective === "AGENTS"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Cpu size={13} />
            Agent Health & Drift
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/dashboard/agent-graph"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
          >
            Interactive Agent Topology <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="notice notice-danger" role="alert">
          Some telemetry sources are unavailable: {errors.join(" · ")}
        </div>
      )}

      {/* KPI Metric Strip */}
      <section className="metric-strip">
        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Active Fleet</span>
            <span className="metric-icon tone-green">
              <Shield size={16} />
            </span>
          </div>
          <div className="kpi-value">{loading ? "…" : agents?.length ?? 0}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Monitored agents</span>
            <span className="text-emerald-600 font-semibold">100% Online</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Processed Invocations</span>
            <span className="metric-icon tone-blue">
              <Activity size={16} />
            </span>
          </div>
          <div className="kpi-value">{loading ? "…" : totalEvents}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>In latest window</span>
            <span className="text-blue-600 font-semibold">{complianceRate}% Compliant</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Enforcement Rate</span>
            <span className="metric-icon tone-purple">
              <ShieldCheck size={16} />
            </span>
          </div>
          <div className="kpi-value">
            {loading ? "…" : blockedEvents > 0 ? `${blockRate}%` : "0.0%"}
          </div>
          <div className="metric-detail flex items-center justify-between">
            <span>{blockedEvents} blocked · {reviewEvents} review</span>
            <span className={blockedEvents > 0 ? "text-rose-600 font-semibold" : "text-slate-500"}>
              {blockedEvents > 0 ? "Action Taken" : "Clean Run"}
            </span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">High-Risk Threats</span>
            <span className="metric-icon tone-amber">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="kpi-value">{loading ? "…" : highRiskEvents}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Score ≥ 40 threshold</span>
            <span className={highRiskEvents > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {highRiskEvents > 0 ? "Under Watch" : "Safe Posture"}
            </span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Tripwire Decoys</span>
            <span className="metric-icon tone-red">
              <LockKeyhole size={16} />
            </span>
          </div>
          <div className="kpi-value">{loading ? "…" : decoys?.length ?? 0}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Active canary traps</span>
            <span className={totalDecoyHits > 0 ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {totalDecoyHits} hits
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ANALYTICS ROW 1: TEMPORAL THREAT VELOCITY & POLICY ENFORCEMENT DONUT
          ========================================================================= */}
      {(perspective === "ALL" || perspective === "OVERVIEW") && (
        <section className="overview-grid">
          {/* Threat Trajectory / Velocity Chart */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Activity size={12} className="text-blue-500" />
                  TEMPORAL TELEMETRY
                </div>
                <h2 className="section-title">Threat Velocity & Risk Trajectory</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action frequency alongside peak risk score across execution timeline
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setTimelineMode("COMBINED")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      timelineMode === "COMBINED"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode("RISK")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      timelineMode === "RISK"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Risk Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode("VOLUME")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      timelineMode === "VOLUME"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Volume Only
                  </button>
                </div>
                <Link className="text-link ml-1" href="/dashboard/events">
                  Feed <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }} className="mt-2">
              {!mounted || loading ? (
                <div className="empty-state">Loading timeline trajectory…</div>
              ) : trajectoryData.length === 0 ? (
                <div className="empty-state">No temporal telemetry recorded yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trajectoryData}
                    margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="invocationsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      yAxisId="riskAxis"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    {timelineMode !== "RISK" && (
                      <YAxis
                        yAxisId="eventsAxis"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="custom-recharts-tooltip-title">
                              Time: {data.time}
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Sample Tool:</span>
                              <code className="text-blue-400 font-mono text-xs">{data.tool}</code>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Peak Risk:</span>
                              <span
                                className="font-bold text-xs"
                                style={{ color: BAND_COLORS[data.band] || "#10b981" }}
                              >
                                {data.maxRisk} ({data.band})
                              </span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Invocations in window:</span>
                              <span className="font-semibold text-slate-100">{data.events}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {timelineMode !== "RISK" && (
                      <Area
                        yAxisId="eventsAxis"
                        type="monotone"
                        dataKey="events"
                        name="Invocations"
                        stroke="#3b82f6"
                        strokeWidth={1.8}
                        fillOpacity={1}
                        fill="url(#invocationsFill)"
                      />
                    )}
                    {timelineMode !== "VOLUME" && (
                      <Area
                        yAxisId="riskAxis"
                        type="monotone"
                        dataKey="maxRisk"
                        name="Peak Risk"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#riskFill)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-4">
                {timelineMode !== "VOLUME" && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Peak Risk Score (0-100)
                  </span>
                )}
                {timelineMode !== "RISK" && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    Invocation Volume
                  </span>
                )}
              </div>
              <span>Adaptive sliding window · {totalEvents} events</span>
            </div>
          </div>

          {/* PIE / DONUT CHART 1: Policy Enforcement */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  GOVERNANCE ENGINE
                </div>
                <h2 className="section-title">Runtime Policy Enforcement</h2>
                <p className="text-xs text-slate-500 mt-0.5">Decision distribution across incoming actions</p>
              </div>
              <Link className="text-link" href="/dashboard/enforcement">
                Policies <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="relative flex items-center justify-center" style={{ height: 200 }}>
              {!mounted || loading ? (
                <div className="empty-state">Loading policy stats…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisionDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {decisionDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        const pct = totalEvents > 0 ? (((Number(item.value) || 0) / totalEvents) * 100).toFixed(1) : 0;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="font-semibold text-xs flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: item.payload.color }} />
                              {item.name}: {item.value} actions ({pct}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Donut Center KPI */}
              {mounted && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {complianceRate}%
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Compliant
                  </span>
                </div>
              )}
            </div>

            {/* Donut Decision Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ALLOW
                </span>
                <strong className="text-emerald-900">{allowedEvents}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                <span className="flex items-center gap-1.5 text-rose-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  BLOCK
                </span>
                <strong className="text-rose-900">{blockedEvents}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  REVIEW
                </span>
                <strong className="text-amber-900">{reviewEvents}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  OBSERVE
                </span>
                <strong className="text-slate-800">
                  {Math.max(0, totalEvents - (allowedEvents + blockedEvents + reviewEvents))}
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ANALYTICS ROW 2: PIE CHARTS FOR FLEET HEALTH & MULTI-LENS DEFENSE
          ========================================================================= */}
      {(perspective === "ALL" || perspective === "OVERVIEW" || perspective === "AGENTS" || perspective === "LENS_ENGINE") && (
        <section className="overview-grid-equal mt-4">
          {/* PIE / DONUT CHART 2: Agent Fleet Posture & Health Breakdown */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Cpu size={12} className="text-emerald-500" />
                  FLEET INTEGRITY BREAKDOWN
                </div>
                <h2 className="section-title">Agent Fleet Security Posture</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribution of monitored agents classified across security thresholds
                </p>
              </div>
              <Link className="text-link" href="/dashboard/agents">
                Roster ({agents?.length ?? 0}) <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="relative flex items-center justify-center" style={{ height: 210 }}>
              {!mounted || loading ? (
                <div className="empty-state">Calculating fleet posture…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agentPostureDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {agentPostureDonutData.map((entry, index) => (
                        <Cell key={`agent-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        const total = agents?.length || 1;
                        const pct = (((Number(item.value) || 0) / total) * 100).toFixed(0);
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="font-semibold text-xs flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: item.payload.color }} />
                              {item.name}: {item.value} agents ({pct}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Donut Center KPI */}
              {mounted && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {agents?.length ?? 0}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Agents Monitored
                  </span>
                </div>
              )}
            </div>

            {/* Posture Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/70">
                <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Safe Posture
                </span>
                <strong className="text-emerald-900">
                  {agents?.filter((a) => (a.max_risk || a.last_risk || 0) < 20).length ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100/70">
                <span className="flex items-center gap-1.5 text-sky-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Monitored Watch
                </span>
                <strong className="text-sky-900">
                  {agents?.filter((a) => {
                    const r = a.max_risk || a.last_risk || 0;
                    return r >= 20 && r < 40;
                  }).length ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100/70">
                <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Elevated Caution
                </span>
                <strong className="text-amber-900">
                  {agents?.filter((a) => {
                    const r = a.max_risk || a.last_risk || 0;
                    return r >= 40 && r < 70;
                  }).length ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100/70">
                <span className="flex items-center gap-1.5 text-rose-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Quarantine / Crit
                </span>
                <strong className="text-rose-900">
                  {agents?.filter((a) => (a.max_risk || a.last_risk || 0) >= 70 || a.status === "restricted").length ?? 0}
                </strong>
              </div>
            </div>
          </div>

          {/* PIE / DONUT CHART 3: Multi-Lens Threat Attribution */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Layers size={12} className="text-purple-500" />
                  MULTI-LENS RISK ENGINE
                </div>
                <h2 className="section-title">Threat Detection Lens Attribution</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signals generated by deterministic defense layers & behavioral baseline
                </p>
              </div>
              <span className="status-badge badge-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 5 Lenses Armed
              </span>
            </div>

            <div className="relative flex items-center justify-center" style={{ height: 210 }}>
              {!mounted || loading ? (
                <div className="empty-state">Aggregating lens telemetry…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lensDistributionDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {lensDistributionDonutData.map((entry, index) => (
                        <Cell key={`lens-cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="font-semibold text-xs flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: item.payload.color }} />
                              {item.name}: score index {item.value}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Donut Center KPI */}
              {mounted && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    100%
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Coverage
                  </span>
                </div>
              )}
            </div>

            {/* Lens Legend List */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100/70">
                <span className="flex items-center gap-1.5 text-blue-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Baseline Norms
                </span>
                <span className="text-blue-900 font-mono text-[11px]">Markov/CUSUM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/50 border border-purple-100/70">
                <span className="flex items-center gap-1.5 text-purple-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Role Contract
                </span>
                <span className="text-purple-900 font-mono text-[11px]">Deterministic</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100/70">
                <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Provenance Taint
                </span>
                <span className="text-amber-900 font-mono text-[11px]">Sink Guard</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100/70">
                <span className="flex items-center gap-1.5 text-rose-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Tripwire Decoys
                </span>
                <span className="text-rose-900 font-mono text-[11px]">{totalDecoyHits} alerts</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ANALYTICS ROW 3: BAR CHARTS FOR THREAT SEVERITY & TOOL ATTACK SURFACE
          ========================================================================= */}
      {(perspective === "ALL" || perspective === "ATTACK_SURFACE" || perspective === "OVERVIEW") && (
        <section className="overview-grid mt-4">
          {/* BAR CHART 1: Fleet Threat Severity Classification */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-500" />
                  RISK BAND CLASSIFICATION
                </div>
                <h2 className="section-title">Fleet Risk Severity Distribution</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action counts across the 5 deterministic severity thresholds (0-100)
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                {totalEvents} Actions
              </span>
            </div>

            <div style={{ width: "100%", height: 240 }} className="mt-2">
              {!mounted || loading ? (
                <div className="empty-state">Loading severity distribution…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        const pct = totalEvents > 0 ? ((data.count / totalEvents) * 100).toFixed(1) : 0;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="custom-recharts-tooltip-title">{data.band} Severity</div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Range:</span>
                              <span className="text-slate-200">{data.range}</span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Count:</span>
                              <span className="font-bold text-slate-100">{data.count} ({pct}%)</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {severityBarData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-slate-100 mt-2 text-center text-[11px]">
              {severityBarData.map((b) => (
                <div key={b.band} className="p-1 rounded bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-700">{b.band}</div>
                  <div className="font-bold text-slate-900 mt-0.5">{b.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* BAR / COMPOSED CHART 2: Top Invoked Tools vs Maximum Risk Exposure */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Zap size={12} className="text-blue-500" />
                  SURFACE EXPOSURE
                </div>
                <h2 className="section-title">Top Tools & Risk Score Exposure</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invocation frequency alongside maximum risk score observed
                </p>
              </div>
              <Link className="text-link" href="/dashboard/events">
                All Tools <ArrowUpRight size={13} />
              </Link>
            </div>

            <div style={{ width: "100%", height: 240 }} className="mt-2">
              {!mounted || loading ? (
                <div className="empty-state">Loading tool surface…</div>
              ) : toolAttackSurfaceChartData.length === 0 ? (
                <div className="empty-state">No tool activity recorded yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={toolAttackSurfaceChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="tool"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      angle={-15}
                      textAnchor="end"
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="callsAxis"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="riskAxis"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="custom-recharts-tooltip-title font-mono">{data.fullTool}</div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Total Invocations:</span>
                              <span className="font-bold text-blue-400">{data.calls}</span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Peak Risk Score:</span>
                              <span
                                className="font-bold"
                                style={{
                                  color: data.maxRisk >= 40 ? "#ef4444" : "#10b981"
                                }}
                              >
                                {data.maxRisk} / 100
                              </span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Avg Risk:</span>
                              <span className="text-slate-200">{data.avgRisk}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="callsAxis"
                      dataKey="calls"
                      name="Invocations"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="riskAxis"
                      type="monotone"
                      dataKey="maxRisk"
                      name="Max Risk"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#ef4444" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                  Calls Count
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Peak Risk (0-100)
                </span>
              </div>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> Anchor Enforced
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ANALYTICS ROW 4: RESOURCE SENSITIVITY & AGENT RISK RANKING
          ========================================================================= */}
      {(perspective === "ALL" || perspective === "ATTACK_SURFACE" || perspective === "AGENTS") && (
        <section className="overview-grid-equal mt-4">
          {/* BAR CHART 3: Resource Class Sensitivity & Access Frequency */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <Gauge size={12} className="text-sky-500" />
                  DATA SENSITIVITY MATRIX
                </div>
                <h2 className="section-title">Resource Target Categories</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Access distribution across tickets, documents, customer PII & supplier systems
                </p>
              </div>
              <span className="status-badge badge-normal">Air-Gapped</span>
            </div>

            <div style={{ width: "100%", height: 210 }} className="mt-2">
              {!mounted || loading ? (
                <div className="empty-state">Loading resource exposure…</div>
              ) : resourceClassData.length === 0 ? (
                <div className="empty-state">No resource telemetry available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={resourceClassData}
                    margin={{ top: 10, right: 20, left: 25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="custom-recharts-tooltip-title capitalize">{d.category}</div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Access Volume:</span>
                              <span className="font-bold text-sky-400">{d.count} requests</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <span>Provenance taint tracking active on sensitive sinks</span>
              <span className="font-semibold text-slate-700">Multi-tenant Isolation</span>
            </div>
          </div>

          {/* BAR CHART 4: Agent Risk Ranking & Event Volume */}
          <div className="panel command-panel">
            <div className="card-title">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-indigo-500" />
                  PER-AGENT EXPOSURE
                </div>
                <h2 className="section-title">Agent Risk & Event Volume Ranking</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparing maximum recorded risk score across fleet workloads
                </p>
              </div>
              <Link className="text-link" href="/dashboard/agents">
                Fleet Details <ArrowUpRight size={13} />
              </Link>
            </div>

            <div style={{ width: "100%", height: 210 }} className="mt-2">
              {!mounted || loading ? (
                <div className="empty-state">Loading agent risk comparison…</div>
              ) : agentRiskRankingData.length === 0 ? (
                <div className="empty-state">No agents registered.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={agentRiskRankingData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="agent_id"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      angle={-15}
                      textAnchor="end"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="custom-recharts-tooltip">
                            <div className="custom-recharts-tooltip-title font-mono">{d.fullId}</div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Role:</span>
                              <span className="text-slate-200">{d.role}</span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Peak Risk:</span>
                              <span
                                className="font-bold"
                                style={{ color: d.maxRisk >= 40 ? "#ef4444" : "#10b981" }}
                              >
                                {d.maxRisk} / 100
                              </span>
                            </div>
                            <div className="custom-recharts-tooltip-row">
                              <span className="text-slate-400">Processed Events:</span>
                              <span className="text-slate-200">{d.events}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="maxRisk" radius={[4, 4, 0, 0]}>
                      {agentRiskRankingData.map((entry, index) => (
                        <Cell
                          key={`agent-risk-bar-${index}`}
                          fill={
                            entry.maxRisk >= 70
                              ? "#ef4444"
                              : entry.maxRisk >= 40
                              ? "#f59e0b"
                              : entry.maxRisk >= 20
                              ? "#0ea5e9"
                              : "#10b981"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe (&lt;20)
                <span className="w-2 h-2 rounded-full bg-sky-500 ml-2" /> Watch (20-40)
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" /> Elevated (40-70)
              </span>
              <span className="text-slate-700 font-semibold">{agents?.length ?? 0} active nodes</span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          INTERACTIVE LIVE TELEMETRY FEED (Filterable Table)
          ========================================================================= */}
      <section className="panel command-panel mt-4">
        <div className="card-title flex-wrap gap-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <Activity size={12} className="text-emerald-500" />
              HIGH-PRECISION TELEMETRY
            </div>
            <h2 className="section-title">Live Telemetry & Policy Enforcement Stream</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological feed with automated risk banding and runtime gatekeeper decisions
            </p>
          </div>

          {/* Quick Filters and Search */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agent, tool, resource…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
              />
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setEventFilter("ALL")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  eventFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({totalEvents})
              </button>
              <button
                type="button"
                onClick={() => setEventFilter("HIGH_RISK")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  eventFilter === "HIGH_RISK"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                High Risk ({highRiskEvents})
              </button>
              <button
                type="button"
                onClick={() => setEventFilter("BLOCK")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  eventFilter === "BLOCK"
                    ? "bg-white text-rose-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Blocked ({blockedEvents})
              </button>
              <button
                type="button"
                onClick={() => setEventFilter("REVIEW")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  eventFilter === "REVIEW"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Review ({reviewEvents})
              </button>
            </div>

            <Link className="text-link ml-2" href="/dashboard/events">
              All 100 <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Table Content */}
        {filteredEvents.length > 0 ? (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agent & Role</th>
                  <th>Invoked Tool</th>
                  <th>Resource Target</th>
                  <th>Risk Score</th>
                  <th>Decision</th>
                  <th>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 10).map((event) => {
                  const isHigh = ["CRITICAL", "HIGH"].includes(event.band);
                  const isMedium = ["ELEVATED", "WATCH"].includes(event.band);
                  const badgeClass = isHigh
                    ? "badge-danger"
                    : isMedium
                    ? "badge-warning"
                    : "badge-normal";

                  return (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap font-mono text-xs text-slate-600">
                        {new Date(event.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/agents/${encodeURIComponent(event.agent_id)}`}
                          className="font-medium hover:underline text-slate-900"
                        >
                          {event.agent_id}
                        </Link>
                        {event.role && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            {event.role}
                          </div>
                        )}
                      </td>
                      <td>
                        <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200">
                          {event.tool}
                        </code>
                      </td>
                      <td className="text-slate-600 font-mono text-xs max-w-xs truncate">
                        {event.resource || event.destination || "—"}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`status-badge ${badgeClass}`}>
                            {event.band} · {Math.round(event.risk)}
                          </span>
                          <div
                            className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block"
                            title={`Risk: ${event.risk}/100`}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(5, event.risk))}%`,
                                background: BAND_COLORS[event.band] || "#10b981"
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            event.decision === "BLOCK"
                              ? "badge-danger"
                              : event.decision === "REVIEW"
                              ? "badge-warning"
                              : "badge-normal"
                          }`}
                        >
                          {event.decision ?? "ALLOW"}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/dashboard/events/${encodeURIComponent(event.id)}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                        >
                          Inspect <ArrowUpRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            {loading ? (
              "Loading event telemetry…"
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span>No events match the active filter criteria.</span>
                <button
                  type="button"
                  onClick={() => {
                    setEventFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-xs text-blue-600 font-medium underline"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          BOTTOM ROW: FLEET POSTURE ROSTER & TRIPWIRES
          ========================================================================= */}
      <section className="overview-grid mt-4">
        {/* Agent Fleet Roster */}
        <div className="panel command-panel">
          <div className="card-title">
            <div>
              <div className="eyebrow flex items-center gap-1.5">
                <Shield size={12} className="text-emerald-500" />
                SECURITY POSTURE
              </div>
              <h2 className="section-title">Fleet Agent Posture</h2>
              <p className="text-xs text-slate-500 mt-0.5">Runtime health, drift indices, and access bounds</p>
            </div>
            <Link className="text-link" href="/dashboard/agents">
              View roster <ArrowUpRight size={13} />
            </Link>
          </div>

          {agents?.length ? (
            <div className="posture-list">
              {agents.slice(0, 6).map((agent) => {
                const statusClass =
                  agent.status === "normal"
                    ? "badge-normal"
                    : agent.status === "restricted"
                    ? "badge-warning"
                    : "badge-danger";

                return (
                  <Link
                    className="posture-row"
                    href={`/dashboard/agents/${encodeURIComponent(agent.agent_id)}`}
                    key={agent.agent_id}
                  >
                    <span>
                      <strong className="text-slate-900">{agent.agent_id}</strong>
                      <small className="text-slate-500">
                        {agent.role} · {agent.event_count || 0} events · max risk{" "}
                        {Math.round(agent.max_risk || agent.last_risk || 0)}
                      </small>
                    </span>
                    <span className={`status-badge ${statusClass}`}>
                      {agent.status || "normal"}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              {loading ? "Loading agents…" : "No agents currently registered in runtime."}
            </div>
          )}
        </div>

        {/* Deception Honeytokens & Tripwires */}
        <div className="panel command-panel">
          <div className="card-title">
            <div>
              <div className="eyebrow flex items-center gap-1.5">
                <LockKeyhole size={12} className="text-rose-500" />
                ACTIVE DECEPTION
              </div>
              <h2 className="section-title">Decoy Honeytokens & Tripwires</h2>
              <p className="text-xs text-slate-500 mt-0.5">Synthetic traps planted to catch prompt injections</p>
            </div>
            <span className="status-badge badge-normal flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Armed
            </span>
          </div>

          {decoys?.length ? (
            <div className="posture-list">
              {decoys.slice(0, 5).map((decoy) => (
                <div className="posture-row" key={decoy.id}>
                  <span>
                    <strong className="text-slate-900 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono uppercase">
                        {decoy.kind}
                      </span>
                      {decoy.match}
                    </strong>
                    <small className="text-slate-500">{decoy.description}</small>
                  </span>
                  <span
                    className={`status-badge ${
                      decoy.hits && decoy.hits > 0 ? "badge-danger animate-pulse" : "badge-normal"
                    }`}
                  >
                    {decoy.hits || 0} hits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {loading ? "Loading tripwire traps…" : "No decoy honeytokens registered."}
            </div>
          )}
        </div>
      </section>

      {/* Incidents & Simulated Outbox */}
      <section className="overview-grid mt-4">
        {/* Incident Alerts */}
        <div className="panel command-panel">
          <div className="card-title">
            <div>
              <div className="eyebrow flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" />
                NEEDS OPERATOR ATTENTION
              </div>
              <h2 className="section-title">Security Incidents & Alerts</h2>
              <p className="text-xs text-slate-500 mt-0.5">Anomalous transitions, drift alerts, and policy blocks</p>
            </div>
            <Link className="text-link" href="/dashboard/incidents">
              Investigate <ArrowUpRight size={13} />
            </Link>
          </div>

          {alerts?.length ? (
            <div className="posture-list">
              {alerts.slice(0, 5).map((alert) => (
                <Link
                  href={`/dashboard/events/${encodeURIComponent(alert.event_id)}`}
                  className="alert-row"
                  key={alert.id}
                >
                  <span
                    className={`status-badge ${
                      alert.band === "HIGH" || alert.band === "CRITICAL"
                        ? "badge-danger"
                        : "badge-warning"
                    }`}
                  >
                    {alert.band}
                  </span>
                  <span>
                    <strong className="text-slate-900">{alert.agent_id}</strong>
                    <small className="text-slate-500">
                      {alert.message ?? alert.shadow_action ?? "Security policy violation"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {loading ? (
                "Loading alert stream…"
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                  <span className="font-medium text-slate-700">Zero active incidents</span>
                  <span className="text-xs text-slate-400">
                    No policy breaches or critical alarms detected in the recent telemetry window.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Simulated Outbox Egress */}
        <div className="panel command-panel">
          <div className="card-title">
            <div>
              <div className="eyebrow flex items-center gap-1.5">
                <Gauge size={12} className="text-blue-500" />
                EGRESS ISOLATION
              </div>
              <h2 className="section-title">Egress & Simulation Outbox</h2>
              <p className="text-xs text-slate-500 mt-0.5">Isolated communication sink preventing external data leak</p>
            </div>
            <span className="status-badge badge-info">Sandbox Sink</span>
          </div>

          {outbox ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="stat-label text-xs text-slate-500 font-medium">Intercepted Messages</div>
                <div className="kpi-value text-2xl font-bold text-slate-900 mt-1">
                  {outbox.messages}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Held in sandbox</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="stat-label text-xs text-slate-500 font-medium">Payload Volume</div>
                <div className="kpi-value text-2xl font-bold text-slate-900 mt-1">
                  {outbox.bytes >= 1024
                    ? `${(outbox.bytes / 1024).toFixed(1)} KB`
                    : `${outbox.bytes} B`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Blocked external egress</div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              {loading ? "Loading simulated outbox…" : "Outbox metrics currently unavailable."}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-4">
            <span>Air-gapped simulator destination</span>
            <Link className="text-link" href="/dashboard/scenarios">
              Run Scenarios <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
