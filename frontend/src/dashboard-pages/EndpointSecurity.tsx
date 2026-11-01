"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Crosshair,
  Download,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  HardDrive,
  Key,
  Laptop,
  Layers,
  Lock,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  EndpointAgent,
  EndpointSecurityEvent,
  EndpointSummary,
  fetchAgents,
  fetchEndpointEvents,
  fetchEndpointSummary,
  registerEndpointAgent,
  revokeEndpointAgent,
  rotateEndpointAgent,
  simulateEndpointScenario,
} from "../api";
import { useLive } from "../useLive";

export default function EndpointSecurity() {
  const { incidents } = useLive();
  const [summary, setSummary] = useState<EndpointSummary | null>(null);
  const [agents, setAgents] = useState<EndpointAgent[]>([]);
  const [events, setEvents] = useState<EndpointSecurityEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeTab, setActiveTab] = useState<"fleet" | "logs" | "correlation" | "deploy">("fleet");
  const [fleetViewMode, setFleetViewMode] = useState<"cards" | "table">("cards");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<EndpointAgent | null>(null);
  const [inspectedEvent, setInspectedEvent] = useState<EndpointSecurityEvent | null>(null);

  // Modal & Enrollment state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollingOs, setEnrollingOs] = useState<"windows" | "linux">("windows");
  const [enrollingHost, setEnrollingHost] = useState("");
  const [enrollResult, setEnrollResult] = useState<{ agent: EndpointAgent; credential: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulation loading / toast
  const [simulating, setSimulating] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopologyNode, setSelectedTopologyNode] = useState<string | null>("DESKTOP-33S79SL");

  // Show toast notification
  const showToast = (text: string, type: "success" | "info" | "error" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Load all telemetry
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [sum, agList, evRes] = await Promise.all([
        fetchEndpointSummary().catch(() => null),
        fetchAgents().catch(() => []),
        fetchEndpointEvents({ limit: 150 }).catch(() => ({ total: 0, events: [] })),
      ]);

      if (sum) setSummary(sum);
      setAgents(agList);
      setEvents(evRes.events);
      setTotalEvents(evRes.total);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to refresh telemetry", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh poll every 2 seconds for ultra-low latency real-time updates
  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData(true);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (severityFilter !== "all" && ev.severity.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = ev.message.toLowerCase().includes(q);
        const matchesHost = ev.hostname.toLowerCase().includes(q);
        const matchesType = ev.eventType.toLowerCase().includes(q);
        const matchesIp = ev.sourceIp ? ev.sourceIp.toLowerCase().includes(q) : false;
        if (!matchesMsg && !matchesHost && !matchesType && !matchesIp) {
          return false;
        }
      }
      return true;
    });
  }, [events, severityFilter, searchQuery]);

  // Lateral movement / deception-correlated incidents
  const lateralIncidents = useMemo(() => {
    return Object.values(incidents).filter((inc) => {
      const anyInc = inc as any;
      return (
        inc.id.includes("ENDPOINT") ||
        inc.stage === "lateral_movement" ||
        inc.real_asset_touched ||
        (anyInc.techniques || []).some(
          (t: any) => t.id === "T1021" || (typeof t.id === "string" && t.id.startsWith("T1110"))
        )
      );
    });
  }, [incidents]);

  // Trigger Scenario Simulation
  const handleTriggerScenario = async (
    scenario: "windows_brute_force" | "linux_account_creation" | "honeypot_pivot",
    label: string,
    hostTarget?: string
  ) => {
    try {
      setSimulating(scenario);
      showToast(`Injecting scenario: ${label}...`, "info");
      const res = await simulateEndpointScenario(scenario, hostTarget);
      showToast(`⚡ ${res.title}: ${res.eventsGenerated} events logged, ${res.alertsTriggered} alert triggered!`, "success");
      await loadData(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Simulation failed", "error");
    } finally {
      setSimulating(null);
    }
  };

  // Enroll Agent
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hostname = enrollingHost.trim() || (enrollingOs === "windows" ? "WIN-ENDPOINT-DEMO" : "UBUNTU-SRV-DEMO");
    try {
      setRefreshing(true);
      const res = await registerEndpointAgent({
        hostname,
        operatingSystem: enrollingOs === "windows" ? "Windows" : "Linux",
        osVersion: enrollingOs === "windows" ? "Windows 11 Enterprise (23H2)" : "Ubuntu Linux 22.04 LTS",
        agentVersion: "1.2.0",
      });
      setEnrollResult({ agent: res, credential: res.credential });
      showToast(`Device ${hostname} provisioned successfully!`, "success");
      loadData(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Enrollment failed", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // Revoke Agent
  const handleRevoke = async (agentId: string, hostname: string) => {
    if (!confirm(`Are you sure you want to revoke endpoint ${hostname}? It will be blocked from sending logs.`)) return;
    try {
      await revokeEndpointAgent(agentId);
      showToast(`Endpoint ${hostname} revoked`, "success");
      loadData(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Revocation failed", "error");
    }
  };

  // Rotate Credential
  const handleRotate = async (agentId: string, hostname: string) => {
    try {
      const res = await rotateEndpointAgent(agentId);
      prompt(`New authentication credential for ${hostname} (save immediately):`, res.credential);
      showToast(`Credential rotated for ${hostname}`, "success");
      loadData(true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Rotation failed", "error");
    }
  };

  const onlineAgentsCount = agents.filter((a) => a.status === "online").length;
  const windowsCount = agents.filter((a) => a.operatingSystem.toLowerCase().includes("win")).length;
  const linuxCount = agents.filter((a) => a.operatingSystem.toLowerCase().includes("linux")).length;

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* ── Toast Notification ─────────────────────────────── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-100 border-emerald-500/50"
              : toastMessage.type === "error"
              ? "bg-rose-950/90 text-rose-100 border-rose-500/50"
              : "bg-blue-950/90 text-blue-100 border-blue-500/50"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          {toastMessage.type === "error" && <AlertTriangle size={16} className="text-rose-400 shrink-0" />}
          {toastMessage.type === "info" && <Sparkles size={16} className="text-blue-400 shrink-0" />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white ml-2 p-0.5 rounded"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Executive Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-0.5">
            <Radio size={12} className="text-emerald-500 animate-pulse" />
            <span>TrapNet SOC · DISTRIBUTED ENDPOINT TELEMETRY & EDR DECEPTION</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-black flex items-center gap-2.5">
            <span>Remote Endpoint Fleet</span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE 2s SYNC
            </span>
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Zero-trust outbound TLS log collection across remote offices, employee laptops, and cloud nodes — zero inbound open ports required.
          </p>
        </div>

        {/* Action Controls & Simulator Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-xs font-semibold text-[#404040] shadow-sm transition hover:bg-neutral-50 hover:text-black"
            title="Refresh Fleet Telemetry"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          {/* Quick Scenario 1: Windows 4625 */}
          <button
            onClick={() => handleTriggerScenario("windows_brute_force", "Windows 4625 Brute-Force Spray")}
            disabled={simulating !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
          >
            <Play size={13} />
            <span>Spray Event 4625</span>
          </button>

          {/* Quick Scenario 2: Linux Useradd */}
          <button
            onClick={() => handleTriggerScenario("linux_account_creation", "Linux Unauthorized Useradd")}
            disabled={simulating !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Flame size={13} />
            <span>Backdoor User</span>
          </button>

          {/* Quick Scenario 3: Honeypot-to-Endpoint Pivot */}
          <button
            onClick={() => handleTriggerScenario("honeypot_pivot", "Honeypot-to-Endpoint Lateral Pivot")}
            disabled={simulating !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 shadow-sm transition hover:bg-purple-100 disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span>Deception Pivot</span>
          </button>

          {/* Enroll New Endpoint */}
          <button
            onClick={() => {
              setEnrollResult(null);
              setEnrollModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"
          >
            <Plus size={13} />
            <span>Enroll Endpoint</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Fleet */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#737373]">
              Monitored Fleet
            </span>
            <Laptop size={16} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tracking-tight text-black">
              {summary?.totalEndpoints ?? agents.length}
            </span>
            <span className="text-xs font-mono text-[#737373]">
              {windowsCount} Win · {linuxCount} Linux
            </span>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-blue-600 h-full"
              style={{ width: `${(windowsCount / Math.max(1, agents.length)) * 100}%` }}
              title={`Windows: ${windowsCount}`}
            />
            <div
              className="bg-orange-500 h-full"
              style={{ width: `${(linuxCount / Math.max(1, agents.length)) * 100}%` }}
              title={`Linux: ${linuxCount}`}
            />
          </div>
        </div>

        {/* Card 2: Live Status */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#737373]">
              Active Fleet Health
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tracking-tight text-emerald-600">
              {onlineAgentsCount} / {agents.length} Online
            </span>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
              Sub-3s SLA
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#737373]">
            <span>Outbound TLS Encrypted</span>
            <span className="font-mono text-emerald-600 font-semibold">100% Armed</span>
          </div>
        </div>

        {/* Card 3: Events Ingested */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#737373]">
              Security Events Ingested
            </span>
            <Activity size={16} className="text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tracking-tight text-black">
              {totalEvents}
            </span>
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
              ECS-Lite Schema
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#737373]">
            <span>Event 4625 / 4720 / 7045</span>
            <span className="font-mono font-semibold text-black">Audited</span>
          </div>
        </div>

        {/* Card 4: Deception Correlation */}
        <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#737373]">
              Deception Lateral Pivots
            </span>
            <Crosshair size={16} className="text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tracking-tight text-rose-600">
              {lateralIncidents.length} Detected
            </span>
            <span className="text-xs font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
              MITRE T1021 / T1110
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#737373]">
            <span>Honeypot Decoy Touch</span>
            <span className="font-mono font-semibold text-rose-600">Cross-Referenced</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Live Fleet Topology & Radar Mesh ───────────── */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-[#f0f0f0] bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-black text-white">
              <Network size={16} />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-black tracking-tight">
                Distributed Endpoint & Deception Mesh Topology
              </h2>
              <p className="text-[11px] text-[#737373]">
                Live visualization of outbound TLS beacons connecting remote employee laptops and honeynet traps to central SOC
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-white border border-[#e5e5e5] px-2.5 py-1 rounded-md text-[#525252]">
              <Wifi size={12} className="text-emerald-500" />
              <span>Zero Inbound Ports</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-black text-white px-2.5 py-1 rounded-md">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>TLS 1.3 Pinning</span>
            </span>
          </div>
        </div>

        {/* Visual Cyber Mesh Canvas */}
        <div className="relative h-[280px] w-full bg-[#030712] overflow-hidden flex items-center justify-center p-4">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Radar Sweep Effect */}
          <div
            className="absolute inset-0 origin-center pointer-events-none opacity-40"
            style={{
              animation: "spin 8s linear infinite",
              background:
                "conic-gradient(from 0deg at 50% 50%, rgba(59, 130, 246, 0.25) 0deg, rgba(59, 130, 246, 0.04) 45deg, transparent 70deg)",
            }}
          />

          {/* Concentric Signal Rings */}
          <div className="absolute w-[220px] h-[220px] rounded-full border border-blue-500/20" />
          <div className="absolute w-[360px] h-[360px] rounded-full border border-blue-500/10" />
          <div className="absolute w-[500px] h-[500px] rounded-full border border-blue-500/5" />

          {/* Center Hub: Central TrapNet Gateway */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border-2 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center text-white">
              <Shield size={28} />
            </div>
            <span className="mt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
              TrapNet SOC HUB
            </span>
          </div>

          {/* Node 1: Mohit's Real Laptop (Top-Left) */}
          <div
            onClick={() => setSelectedTopologyNode("DESKTOP-33S79SL")}
            className="absolute left-[12%] top-[18%] z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="relative">
              <span className="absolute -inset-1 rounded-xl bg-emerald-500 opacity-60 animate-ping" />
              <div className="relative w-11 h-11 rounded-xl bg-[#09152e] border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Laptop size={18} />
              </div>
            </div>
            <div className="mt-1.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono font-bold text-emerald-300 group-hover:text-white">
                DESKTOP-33S79SL
              </span>
              <span className="text-[9px] font-mono text-emerald-400/80">Windows 11 (Real PC)</span>
            </div>
          </div>

          {/* Node 2: Linux Production Server (Top-Right) */}
          <div
            onClick={() => setSelectedTopologyNode("SRV-PROD-APP01")}
            className="absolute right-[14%] top-[18%] z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-11 h-11 rounded-xl bg-[#1a1208] border-2 border-orange-400 flex items-center justify-center text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
              <Server size={18} />
            </div>
            <div className="mt-1.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono font-bold text-orange-300 group-hover:text-white">
                SRV-PROD-APP01
              </span>
              <span className="text-[9px] font-mono text-orange-400/80">Ubuntu 22.04 LTS</span>
            </div>
          </div>

          {/* Node 3: Dev Laptop (Bottom-Left) */}
          <div
            onClick={() => setSelectedTopologyNode("LAPTOP-SEC-DEV")}
            className="absolute left-[15%] bottom-[16%] z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-11 h-11 rounded-xl bg-[#140a24] border-2 border-purple-400 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Laptop size={18} />
            </div>
            <div className="mt-1.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono font-bold text-purple-300 group-hover:text-white">
                LAPTOP-SEC-DEV
              </span>
              <span className="text-[9px] font-mono text-purple-400/80">SecOps Dev (Pivot Target)</span>
            </div>
          </div>

          {/* Node 4: Decoy Honeypot Trap (Bottom-Right) */}
          <div
            onClick={() => setSelectedTopologyNode("db-prod-02")}
            className="absolute right-[14%] bottom-[16%] z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="relative">
              <span className="absolute -inset-1 rounded-xl bg-rose-500 opacity-60 animate-ping" />
              <div className="relative w-11 h-11 rounded-xl bg-[#21090d] border-2 border-rose-500 flex items-center justify-center text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Terminal size={18} />
              </div>
            </div>
            <div className="mt-1.5 flex flex-col items-center text-center">
              <span className="text-[11px] font-mono font-bold text-rose-300 group-hover:text-white">
                db-prod-02 (DECOY)
              </span>
              <span className="text-[9px] font-mono text-rose-400/80">Cowrie SSH Trap (2222)</span>
            </div>
          </div>

          {/* Node 5: Finance Workstation (Top-Center) */}
          <div
            onClick={() => setSelectedTopologyNode("CORP-W11-FINANCE")}
            className="absolute left-[50%] -translate-x-1/2 top-[8%] z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-9 h-9 rounded-lg bg-[#07192c] border border-blue-400/60 flex items-center justify-center text-blue-300">
              <Laptop size={15} />
            </div>
            <span className="mt-1 text-[10px] font-mono font-bold text-blue-200">
              CORP-W11-FINANCE
            </span>
          </div>

          {/* SVG Animated Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Center to DESKTOP-33S79SL */}
            <line
              x1="50%"
              y1="50%"
              x2="17%"
              y2="28%"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="animate-pulse"
              opacity="0.6"
            />
            {/* Center to SRV-PROD-APP01 */}
            <line
              x1="50%"
              y1="50%"
              x2="80%"
              y2="28%"
              stroke="#f97316"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            {/* Center to LAPTOP-SEC-DEV */}
            <line
              x1="50%"
              y1="50%"
              x2="20%"
              y2="76%"
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            {/* Center to db-prod-02 Decoy */}
            <line
              x1="50%"
              y1="50%"
              x2="80%"
              y2="76%"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="animate-pulse"
              opacity="0.8"
            />
            {/* Lateral Movement Line: Honeypot to LAPTOP-SEC-DEV */}
            <line
              x1="80%"
              y1="76%"
              x2="20%"
              y2="76%"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="6 3"
              opacity="0.7"
            />
          </svg>
        </div>

        {/* Selected Node HUD Banner */}
        <div className="px-4 py-2.5 bg-neutral-900 text-white flex flex-wrap items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">SELECTED NODE:</span>
            <span className="font-bold text-emerald-400">{selectedTopologyNode}</span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-300">
              {selectedTopologyNode === "DESKTOP-33S79SL"
                ? "Active Remote Windows 11 Enterprise (Outbound TLS Active · Live Heartbeat)"
                : selectedTopologyNode === "db-prod-02"
                ? "High-Interaction Honeypot Decoy (Captured Lateral Adversary)"
                : "Monitored Enterprise Infrastructure Node"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerScenario("windows_brute_force", "Attack on " + selectedTopologyNode, selectedTopologyNode || undefined)}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
            >
              Simulate Intrusion
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold"
            >
              View Node Logs
            </button>
          </div>
        </div>
      </div>

      {/* ── Perspective Tab Navigation ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {/* Tab 1: Fleet Overview */}
          <button
            onClick={() => setActiveTab("fleet")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "fleet"
                ? "bg-black text-white shadow-sm"
                : "text-[#525252] hover:text-black hover:bg-neutral-100"
            }`}
          >
            <Laptop size={14} />
            <span>Fleet Overview</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "fleet" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-800"}`}>
              {agents.length}
            </span>
          </button>

          {/* Tab 2: Live Security Log Stream */}
          <button
            onClick={() => setActiveTab("logs")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "logs"
                ? "bg-black text-white shadow-sm"
                : "text-[#525252] hover:text-black hover:bg-neutral-100"
            }`}
          >
            <Terminal size={14} />
            <span>Live Security Log Stream</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === "logs" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-800"}`}>
              {totalEvents}
            </span>
          </button>

          {/* Tab 3: Deception Correlation */}
          <button
            onClick={() => setActiveTab("correlation")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "correlation"
                ? "bg-black text-white shadow-sm"
                : "text-[#525252] hover:text-black hover:bg-neutral-100"
            }`}
          >
            <Crosshair size={14} />
            <span>Deception Pivot Correlation</span>
            {lateralIncidents.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-600 text-white animate-pulse">
                {lateralIncidents.length} APT
              </span>
            )}
          </button>

          {/* Tab 4: Agent Deployment Guide */}
          <button
            onClick={() => setActiveTab("deploy")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "deploy"
                ? "bg-black text-white shadow-sm"
                : "text-[#525252] hover:text-black hover:bg-neutral-100"
            }`}
          >
            <Download size={14} />
            <span>Deployment Guide & One-Liners</span>
          </button>
        </div>

        {/* View Switcher for Fleet tab */}
        {activeTab === "fleet" && (
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-[#e5e5e5]">
            <button
              onClick={() => setFleetViewMode("cards")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${fleetViewMode === "cards" ? "bg-white text-black shadow-sm" : "text-[#737373]"}`}
            >
              Grid Cards
            </button>
            <button
              onClick={() => setFleetViewMode("table")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${fleetViewMode === "table" ? "bg-white text-black shadow-sm" : "text-[#737373]"}`}
            >
              Dense Table
            </button>
          </div>
        )}
      </div>

      {/* ── Tab 1: Fleet Overview ─────────────────────────────── */}
      {activeTab === "fleet" && (
        <div className="flex flex-col gap-4">
          {fleetViewMode === "cards" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((ag) => {
                const isOnline = ag.status === "online";
                const isRevoked = ag.status === "revoked";
                const isWindows = ag.operatingSystem.toLowerCase().includes("win");
                const isMohit = ag.hostname === "DESKTOP-33S79SL";

                return (
                  <div
                    key={ag.agentId}
                    className={`rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                      isMohit ? "border-emerald-400 ring-2 ring-emerald-500/10" : "border-[#e5e5e5]"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#f0f0f0]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isWindows ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                            }`}
                          >
                            {isWindows ? <Laptop size={20} /> : <Server size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-bold text-sm text-black">
                                {ag.hostname}
                              </span>
                              {isMohit && (
                                <span className="text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                  Real Host
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-[#737373] block truncate max-w-[170px]">
                              {ag.osVersion}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isOnline
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isRevoked
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? "bg-emerald-500 animate-pulse" : isRevoked ? "bg-rose-500" : "bg-neutral-400"
                            }`}
                          />
                          {ag.status}
                        </span>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 py-3 text-xs border-b border-[#f0f0f0]">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#737373] block">Agent ID</span>
                          <span className="font-mono text-black font-semibold truncate block" title={ag.agentId}>
                            {ag.agentId.slice(0, 12)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#737373] block">Agent Version</span>
                          <span className="font-mono text-blue-600 font-semibold">
                            v{ag.agentVersion}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#737373] block">Last Heartbeat</span>
                          <span className="font-mono text-black">
                            {ag.lastHeartbeat ? new Date(ag.lastHeartbeat).toLocaleTimeString() : "Never"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#737373] block">Last Event</span>
                          <span className={`font-mono ${ag.lastEvent ? "text-emerald-600 font-semibold" : "text-[#737373]"}`}>
                            {ag.lastEvent ? new Date(ag.lastEvent).toLocaleTimeString() : "No events"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          handleTriggerScenario(
                            isWindows ? "windows_brute_force" : "linux_account_creation",
                            `Attack on ${ag.hostname}`,
                            ag.hostname
                          )
                        }
                        disabled={isRevoked}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-black py-1.5 text-xs font-bold transition disabled:opacity-40"
                      >
                        <Play size={12} className="text-amber-600" />
                        <span>Simulate</span>
                      </button>

                      <button
                        onClick={() => handleRotate(ag.agentId, ag.hostname)}
                        disabled={isRevoked}
                        className="p-1.5 rounded-lg border border-[#e5e5e5] text-[#525252] hover:text-black hover:bg-neutral-50 transition disabled:opacity-40"
                        title="Rotate TLS Credential"
                      >
                        <Key size={14} />
                      </button>

                      <button
                        onClick={() => handleRevoke(ag.agentId, ag.hostname)}
                        disabled={isRevoked}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
                        title="Revoke Device Access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Dense Table View */
            <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-neutral-50 text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                    <th className="py-3 px-4 font-bold">Hostname</th>
                    <th className="py-3 px-4 font-bold">OS Platform</th>
                    <th className="py-3 px-4 font-bold">Agent ID / Ver</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Last Heartbeat</th>
                    <th className="py-3 px-4 font-bold">Last Event</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {agents.map((ag) => {
                    const isOnline = ag.status === "online";
                    const isRevoked = ag.status === "revoked";
                    const isWindows = ag.operatingSystem.toLowerCase().includes("win");

                    return (
                      <tr key={ag.agentId} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isWindows ? <Laptop size={15} className="text-blue-600" /> : <Server size={15} className="text-orange-500" />}
                            <span className="font-bold text-black font-display">{ag.hostname}</span>
                            {ag.hostname === "DESKTOP-33S79SL" && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1 rounded">
                                Real
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#525252]">{ag.osVersion}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className="text-neutral-500">{ag.agentId.slice(0, 10)}...</span>{" "}
                          <span className="text-blue-600 font-bold">v{ag.agentVersion}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isOnline
                                ? "bg-emerald-50 text-emerald-700"
                                : isRevoked
                                ? "bg-rose-50 text-rose-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                            {ag.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#525252]">
                          {ag.lastHeartbeat ? new Date(ag.lastHeartbeat).toLocaleTimeString() : "Never"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {ag.lastEvent ? (
                            <span className="text-emerald-600 font-bold">{new Date(ag.lastEvent).toLocaleTimeString()}</span>
                          ) : (
                            <span className="text-neutral-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleTriggerScenario(
                                  isWindows ? "windows_brute_force" : "linux_account_creation",
                                  `Attack on ${ag.hostname}`,
                                  ag.hostname
                                )
                              }
                              disabled={isRevoked}
                              className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-black font-bold text-[11px] disabled:opacity-40"
                            >
                              Simulate
                            </button>
                            <button
                              onClick={() => handleRotate(ag.agentId, ag.hostname)}
                              disabled={isRevoked}
                              className="p-1 rounded text-neutral-500 hover:text-black"
                              title="Rotate Token"
                            >
                              <Key size={13} />
                            </button>
                            <button
                              onClick={() => handleRevoke(ag.agentId, ag.hostname)}
                              disabled={isRevoked}
                              className="p-1 rounded text-rose-500 hover:text-rose-700"
                              title="Revoke Access"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Live Security Log Stream ─────────────────────── */}
      {activeTab === "logs" && (
        <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden shadow-sm flex flex-col">
          {/* Stream Filter Bar */}
          <div className="p-3.5 border-b border-[#e5e5e5] bg-neutral-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter logs by message, host, IP, event type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#e5e5e5] bg-white pl-9 pr-8 py-1.5 text-xs text-black outline-none focus:border-black transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#737373] text-[11px] font-mono uppercase">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1 text-xs text-black outline-none font-semibold"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Only</option>
                  <option value="medium">Medium Only</option>
                  <option value="info">Info / Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#737373]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Showing {filteredEvents.length} of {totalEvents} events</span>
            </div>
          </div>

          {/* Events Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-white text-[11px] font-mono uppercase tracking-wider text-[#737373]">
                  <th className="py-2.5 px-4 font-bold">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4 font-bold">Host</th>
                  <th className="py-2.5 px-4 font-bold">Source / Event Type</th>
                  <th className="py-2.5 px-4 font-bold">Severity</th>
                  <th className="py-2.5 px-4 font-bold">Security Message</th>
                  <th className="py-2.5 px-4 font-bold">Remote IP</th>
                  <th className="py-2.5 px-4 font-bold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] font-mono text-[12px]">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400 font-sans">
                      <Terminal size={32} className="mx-auto text-neutral-300 mb-2" />
                      <p className="font-semibold text-neutral-600">No events match your current filter</p>
                      <p className="text-xs text-neutral-400">Run a scenario or trigger a failed logon on Mohit&apos;s laptop</p>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const sev = ev.severity.toLowerCase();
                    const isMohit = ev.hostname === "DESKTOP-33S79SL";

                    return (
                      <tr key={ev.id || ev.eventId} className="hover:bg-neutral-50/80 transition">
                        {/* Timestamp */}
                        <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>

                        {/* Hostname */}
                        <td className="py-2.5 px-4 font-bold text-black whitespace-nowrap font-display">
                          <span className={isMohit ? "text-blue-600 underline decoration-blue-300 underline-offset-2" : ""}>
                            {ev.hostname}
                          </span>
                        </td>

                        {/* Source / Event Type */}
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-neutral-900">{ev.eventType}</div>
                          <div className="text-[10px] text-neutral-400 font-sans">{ev.source}</div>
                        </td>

                        {/* Severity */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sev === "critical"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : sev === "high"
                                ? "bg-orange-100 text-orange-800 border border-orange-300"
                                : sev === "medium"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </td>

                        {/* Message */}
                        <td className="py-2.5 px-4 font-sans text-neutral-700 max-w-[340px] truncate" title={ev.message}>
                          {ev.message}
                        </td>

                        {/* Source IP */}
                        <td className="py-2.5 px-4 font-mono text-neutral-600 whitespace-nowrap">
                          {ev.sourceIp ? (
                            <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] text-neutral-800">
                              {ev.sourceIp}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        {/* Inspect Raw Button */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectedEvent(ev)}
                            className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold transition"
                          >
                            Raw JSON
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 3: Deception Pivot Correlation ───────────────────── */}
      {activeTab === "correlation" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                <Crosshair size={18} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-rose-950">
                  Cross-Network Lateral Movement & Honeypot Pivot Engine
                </h3>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  When an adversary probes our deception honeynet (e.g. Cowrie SSH decoy <code className="font-mono bg-rose-100 px-1 rounded">db-prod-02</code>) and subsequently attempts an intrusion on a real remote employee laptop, TrapNet cross-references the source IP to issue a high-confidence <span className="font-bold underline">TARGETED APT alert</span> with near-zero false positive rate.
                </p>
              </div>
            </div>
          </div>

          {/* Lateral Incidents Cards */}
          <div className="grid grid-cols-1 gap-4">
            {lateralIncidents.length === 0 ? (
              <div className="rounded-xl border border-[#e5e5e5] bg-white p-12 text-center text-neutral-400">
                <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-neutral-700">No Active Lateral Pivots Currently Detected</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Click the &quot;Deception Pivot&quot; button in the header to trigger a live cross-network lateral movement simulation!
                </p>
              </div>
            ) : (
              lateralIncidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span className="font-display font-bold text-base text-black">{inc.id}</span>
                      <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded uppercase">
                        {inc.severity} ({inc.score}/100)
                      </span>
                      <span className="font-mono text-xs bg-black text-white px-2 py-0.5 rounded font-bold uppercase">
                        {inc.verdict}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/incidents`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <span>Open in Command Center</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Incident Narrative */}
                  <p className="text-xs text-neutral-700 mt-3 leading-relaxed">
                    {(inc as any).narrative || "Host intrusion detected on monitored endpoint. Cross-correlated against decoy honeypot trap touchpoint."}
                  </p>

                  {/* Explainable Factor Pills */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-500 uppercase">Explainable Factors:</span>
                    {((inc as any).factors || [
                      { label: "Honeypot Decoy Trap touch confirmed", points: 30 },
                      { label: "Real remote employee endpoint touched", points: 25 },
                      { label: "Cross-network lateral movement attempt", points: 25 },
                    ]).map((f: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200"
                      >
                        <span className="text-rose-600 font-bold">+{f.points}</span>
                        <span>{f.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Agent Deployment Guide ────────────────────────── */}
      {activeTab === "deploy" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Windows Deployment */}
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-black">Windows 10 / 11 / Server</h3>
                    <p className="text-[11px] text-[#737373]">EventLog 4624, 4625, 4720, 7045</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  PowerShell 5.1+
                </span>
              </div>

              <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                Single copy-paste command to download, extract, and start the read-only monitoring agent on any external Windows machine:
              </p>

              <div className="mt-3 relative rounded-lg bg-[#0a0f1d] p-3 text-neutral-200 font-mono text-xs overflow-x-auto border border-[#1e293b]">
                <code>
                  Invoke-WebRequest -Uri &quot;https://mandarin-mutation-accuracy.ngrok-free.dev/api/agents/download&quot; -OutFile &quot;$env:TEMP\agent.zip&quot;; Expand-Archive -Path &quot;$env:TEMP\agent.zip&quot; -DestinationPath &quot;$env:USERPROFILE\mirage-agent&quot; -Force; cd &quot;$env:USERPROFILE\mirage-agent&quot;; python -m mirage_agent.main run --server https://mandarin-mutation-accuracy.ngrok-free.dev --token &quot;AB-AkP8g9fsjdEPrP8jo2E5tt3BNtcUB3NqQ--MzCks&quot;
                </code>
              </div>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  'Invoke-WebRequest -Uri "https://mandarin-mutation-accuracy.ngrok-free.dev/api/agents/download" -OutFile "$env:TEMP\\agent.zip"; Expand-Archive -Path "$env:TEMP\\agent.zip" -DestinationPath "$env:USERPROFILE\\mirage-agent" -Force; cd "$env:USERPROFILE\\mirage-agent"; python -m mirage_agent.main run --server https://mandarin-mutation-accuracy.ngrok-free.dev --token "AB-AkP8g9fsjdEPrP8jo2E5tt3BNtcUB3NqQ--MzCks"',
                  "win-cmd"
                )
              }
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-black text-white py-2 text-xs font-bold hover:bg-neutral-800 transition"
            >
              {copiedKey === "win-cmd" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedKey === "win-cmd" ? "Copied PowerShell One-Liner!" : "Copy PowerShell Setup Command"}</span>
            </button>
          </div>

          {/* Linux Deployment */}
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-black">Ubuntu / Debian / RHEL</h3>
                    <p className="text-[11px] text-[#737373]">journald / auth.log / sudo / SSH</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                  Python 3.10+
                </span>
              </div>

              <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                Standard Linux curl-based deployment for corporate EC2 instances, production nodes, and container hosts:
              </p>

              <div className="mt-3 relative rounded-lg bg-[#0a0f1d] p-3 text-neutral-200 font-mono text-xs overflow-x-auto border border-[#1e293b]">
                <code>
                  curl -fsSL &quot;https://mandarin-mutation-accuracy.ngrok-free.dev/api/agents/download&quot; -o /tmp/agent.zip &amp;&amp; unzip -o /tmp/agent.zip -d ~/mirage-agent &amp;&amp; cd ~/mirage-agent &amp;&amp; python3 -m mirage_agent.main run --server https://mandarin-mutation-accuracy.ngrok-free.dev --token &quot;AB-AkP8g9fsjdEPrP8jo2E5tt3BNtcUB3NqQ--MzCks&quot;
                </code>
              </div>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  'curl -fsSL "https://mandarin-mutation-accuracy.ngrok-free.dev/api/agents/download" -o /tmp/agent.zip && unzip -o /tmp/agent.zip -d ~/mirage-agent && cd ~/mirage-agent && python3 -m mirage_agent.main run --server https://mandarin-mutation-accuracy.ngrok-free.dev --token "AB-AkP8g9fsjdEPrP8jo2E5tt3BNtcUB3NqQ--MzCks"',
                  "linux-cmd"
                )
              }
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-black text-white py-2 text-xs font-bold hover:bg-neutral-800 transition"
            >
              {copiedKey === "linux-cmd" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedKey === "linux-cmd" ? "Copied Linux One-Liner!" : "Copy Bash Setup Command"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Raw Event Inspection Modal ─────────────────────────────── */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#090d16] border border-[#1e293b] p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-blue-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Forensic ECS-Lite Event Payload
                </h3>
              </div>
              <button
                onClick={() => setInspectedEvent(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Event ID: <strong className="text-blue-300">{inspectedEvent.eventId}</strong></span>
              <span>Host: <strong className="text-emerald-300">{inspectedEvent.hostname}</strong></span>
            </div>

            <pre className="p-4 rounded-xl bg-[#03060f] border border-[#1b253b] text-emerald-400 font-mono text-xs overflow-y-auto max-h-[380px] leading-relaxed">
              {JSON.stringify(inspectedEvent, null, 2)}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleCopy(JSON.stringify(inspectedEvent, null, 2), "modal-json")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold transition"
              >
                {copiedKey === "modal-json" ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === "modal-json" ? "Copied JSON!" : "Copy Forensic JSON"}</span>
              </button>
              <button
                onClick={() => setInspectedEvent(null)}
                className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Provision Endpoint Modal ───────────────────────────────── */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e5e5e5] p-6 shadow-2xl flex flex-col gap-4 text-black">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                <h3 className="font-display font-bold text-base text-black">
                  Enroll External Endpoint
                </h3>
              </div>
              <button onClick={() => setEnrollModalOpen(false)} className="text-neutral-400 hover:text-black p-1">
                <X size={16} />
              </button>
            </div>

            {!enrollResult ? (
              <form onSubmit={handleEnrollSubmit} className="flex flex-col gap-4">
                <p className="text-xs text-neutral-600">
                  Provision zero-trust authorization credentials for an external PC, developer laptop, or production server.
                </p>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Operating System Platform
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollingOs("windows")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                        enrollingOs === "windows"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <Laptop size={16} />
                      <span>Windows 10 / 11</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollingOs("linux")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                        enrollingOs === "linux"
                          ? "border-orange-600 bg-orange-50 text-orange-700"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <Server size={16} />
                      <span>Linux (Ubuntu/Debian)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Endpoint Hostname / Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LAPTOP-DEV-01 or SRV-BACKUP"
                    value={enrollingHost}
                    onChange={(e) => setEnrollingHost(e.target.value)}
                    className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-xs text-black outline-none focus:border-black font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnrollModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <p className="font-bold">Endpoint Registered Successfully!</p>
                  <p className="text-[11px] mt-0.5">Save this bearer authorization token. It will not be shown again.</p>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 text-emerald-400 font-mono text-xs break-all">
                  {enrollResult.credential}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleCopy(enrollResult.credential, "enroll-token")}
                    className="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800 transition inline-flex items-center gap-1.5"
                  >
                    {copiedKey === "enroll-token" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === "enroll-token" ? "Copied!" : "Copy Token"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEnrollResult(null);
                      setEnrollModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-bold hover:bg-neutral-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
