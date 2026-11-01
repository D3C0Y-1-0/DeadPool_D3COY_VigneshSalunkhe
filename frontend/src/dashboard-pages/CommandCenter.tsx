"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Crosshair,
  Download,
  Flame,
  Globe,
  Layers,
  Radio,
  RotateCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { useLive } from "../useLive";
import KpiCards from "../components/KpiCards";
import AlertQueue from "../components/AlertQueue";
import ThreatMap from "../components/ThreatMap";
import AlertDistribution from "../components/AlertDistribution";
import AttackEventsTrend from "../components/AttackEventsTrend";
import SystemStatus from "../components/SystemStatus";
import KillChainProgress from "../components/KillChainProgress";
import IncidentAttackGraph from "../components/IncidentAttackGraph";
import LiveRadarScan from "../components/LiveRadarScan";
import AdversaryCadenceChart from "../components/AdversaryCadenceChart";
import ProtocolTrafficChart from "../components/ProtocolTrafficChart";
import { IncidentSummary } from "../types";
import { Network } from "lucide-react";

type Perspective = "UNIFIED" | "ATTACK_GRAPH" | "RADAR_MESH" | "CADENCE_TRENDS";

export default function CommandCenter() {
  const { events, incidents, stats, refreshAll } = useLive();
  const incidentList = Object.values(incidents) as IncidentSummary[];
  const [perspective, setPerspective] = useState<Perspective>("UNIFIED");
  const [attackVisualMode, setAttackVisualMode] = useState<"graph" | "chain">("graph");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Executive Command Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e5e5e5]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#737373] uppercase tracking-wider mb-0.5">
            <Radio size={12} className="text-emerald-500 animate-pulse" />
            <span>MIRAGE SOC · DECEPTION-DRIVEN DETECTION & ACTIVE CONTAINMENT</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-black">
            SOC Analyst Command Center
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Real-time multi-sensor honeynet telemetry, kill chain correlation, and human-approved SOAR
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-xs font-semibold text-[#404040] shadow-sm transition hover:bg-neutral-50 hover:text-black"
          >
            <RotateCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Sync Live</span>
          </button>
          <Link
            href="/dashboard/demo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-sm transition hover:bg-purple-100"
          >
            <Zap size={13} />
            <span>Simulate Scenario</span>
          </Link>
          <Link
            href="/dashboard/response"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"
          >
            <ShieldCheck size={13} />
            <span>Response Center</span>
          </Link>
        </div>
      </div>

      {/* ── Perspective Filter Tabs (from reference theme) ──────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: "UNIFIED", label: "Unified SOC Command", icon: Sparkles },
            { id: "ATTACK_GRAPH", label: "Incident Attack Graph", icon: Network },
            { id: "RADAR_MESH", label: "Live Radar & Honeynet Traps", icon: Radio },
            { id: "CADENCE_TRENDS", label: "Behavioral Timing & Cadence", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = perspective === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPerspective(tab.id as Perspective)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-black text-white shadow-sm"
                    : "bg-neutral-100 text-[#525252] hover:bg-neutral-200 hover:text-black"
                }`}
              >
                <Icon size={13} className={active ? "text-white" : "text-[#737373]"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#737373]">
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {stats.raw_events.toLocaleString()} Events Recorded
          </span>
          <span>·</span>
          <span>{incidentList.length.toLocaleString()} Incidents in View</span>
        </div>
      </div>

      {/* ── Top Metric Strip with Sparklines ─────────────────────── */}
      <KpiCards stats={stats} />

      {/* ── Attack Visual: Incident Attack Graph (Default) or Kill Chain Pipeline ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              {attackVisualMode === "graph" ? "Live Incident Attack Graph" : "Kill Chain Progression Pipeline"}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#e5e5e5] bg-neutral-100 p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setAttackVisualMode("graph")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                attackVisualMode === "graph" ? "bg-white text-black shadow-sm font-bold" : "text-[#737373] hover:text-black"
              }`}
            >
              <Network size={11} /> Incident Attack Graph
            </button>
            <button
              onClick={() => setAttackVisualMode("chain")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                attackVisualMode === "chain" ? "bg-white text-black shadow-sm font-bold" : "text-[#737373] hover:text-black"
              }`}
            >
              <Crosshair size={11} /> Kill Chain
            </button>
          </div>
        </div>

        {attackVisualMode === "graph" ? (
          <IncidentAttackGraph allIncidents={incidentList} height={420} />
        ) : (
          <KillChainProgress incidents={incidentList} />
        )}
      </div>

      {/* ── Perspective View 1: UNIFIED COMMAND CENTER ───────────── */}
      {perspective === "UNIFIED" && (
        <>
          {/* Row 2: Real-time Attack Map + Alert Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 min-h-[440px]">
              <ThreatMap incidents={incidentList} />
            </div>
            <div className="lg:col-span-4 min-h-[440px]">
              <AlertDistribution incidents={incidentList} />
            </div>
          </div>

          {/* Row 3: Live Radar Scan + System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-h-[360px]">
              <LiveRadarScan />
            </div>
            <div className="lg:col-span-5 min-h-[360px]">
              <SystemStatus />
            </div>
          </div>

          {/* Row 4: Event Activity Trend + Cadence Profiling */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 min-h-[340px]">
              <AttackEventsTrend events={events} />
            </div>
            <div className="lg:col-span-6 min-h-[340px]">
              <AdversaryCadenceChart />
            </div>
          </div>

          {/* Row 5: Recent Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-12 min-h-[340px]">
              <AlertQueue incidents={incidentList} />
            </div>
          </div>
        </>
      )}

      {/* ── Perspective View 2: INCIDENT ATTACK GRAPH ─────────────── */}
      {perspective === "ATTACK_GRAPH" && (
        <div className="flex flex-col gap-5">
          <IncidentAttackGraph allIncidents={incidentList} height={560} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-h-[380px]">
              <ThreatMap incidents={incidentList} />
            </div>
            <div className="lg:col-span-5 min-h-[380px]">
              <ProtocolTrafficChart events={events} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-12 min-h-[340px]">
              <AlertQueue incidents={incidentList} />
            </div>
          </div>
        </div>
      )}

      {/* ── Perspective View 3: LIVE RADAR & DECOY MESH ──────────── */}
      {perspective === "RADAR_MESH" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-h-[400px]">
              <LiveRadarScan />
            </div>
            <div className="lg:col-span-5 min-h-[400px]">
              <SystemStatus />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 min-h-[340px]">
              <ProtocolTrafficChart events={events} />
            </div>
            <div className="lg:col-span-6 min-h-[340px]">
              <AlertDistribution incidents={incidentList} />
            </div>
          </div>
        </div>
      )}

      {/* ── Perspective View 4: BEHAVIORAL TIMING & CADENCE ──────── */}
      {perspective === "CADENCE_TRENDS" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 min-h-[380px]">
              <AdversaryCadenceChart />
            </div>
            <div className="lg:col-span-6 min-h-[380px]">
              <AttackEventsTrend events={events} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 min-h-[360px]">
              <ProtocolTrafficChart events={events} />
            </div>
            <div className="lg:col-span-5 min-h-[360px]">
              <AlertDistribution incidents={incidentList} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
