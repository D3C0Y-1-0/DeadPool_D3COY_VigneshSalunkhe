"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchIncident } from "../api";
import { useLive } from "../useLive";
import { Incident } from "../types";
import KillChainBar from "../components/KillChainBar";
import AttackChainGraph from "../components/AttackChainGraph";
import Transcript from "../components/Transcript";
import ActionsPanel from "../components/ActionsPanel";
import SeverityBadge from "../components/SeverityBadge";
import { ArrowLeft, Crosshair, Globe, ShieldCheck, AlertCircle, ShieldAlert } from "lucide-react";

export default function IncidentPage({ id }: { id: string }) {
  const { incidents, refreshAll } = useLive();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchIncident(id);
      setIncident(data);
      setError(null);
    } catch (cause) {
      setIncident(null);
      setError(cause instanceof Error ? cause.message : "Could not load incident data.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [id, loadData]);

  // Live WebSocket update reflection
  useEffect(() => {
    if (id && incidents[id]) {
      const liveData = incidents[id] as Incident;
      if (liveData.timeline) {
        setIncident(liveData);
      }
    }
  }, [id, incidents]);

  if (loading && !incident) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        Loading adversary investigation telemetry...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="empty-state p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-muted">{error || `Incident ${id} was not found.`}</p>
        <a href="/" className="back-link mt-2 inline-flex">
          Return to Command Center
        </a>
      </div>
    );
  }

  const isContained = incident.status === "contained";

  return (
    <div className="page-content space-y-6 pb-12">
      {/* Top Breadcrumb & Incident Header */}
      <div className="bg-panel-card border border-line rounded-xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-6 relative z-10">
          <a
            href="/dashboard/incidents"
            className="p-2.5 bg-panel border border-line rounded-lg text-mute hover:text-ink hover:border-accent/50 transition-all shadow-lg"
            title="Back to Incidents"
          >
            <ArrowLeft size={18} />
          </a>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <SeverityBadge
                severity={incident.severity}
                score={incident.score}
                pulse={!isContained}
              />
              <h1 className="mono text-2xl font-bold text-ink tracking-tight">
                {incident.src_ip}
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-panel border border-line rounded-full">
                <Globe size={12} className="text-mute" />
                <span className="text-[11px] font-bold text-mute uppercase tracking-widest">
                  {incident.country} • {incident.asn}
                </span>
              </div>
              {incident.real_asset_touched && (
                <span className="px-3 py-1 rounded-full bg-crit/10 border border-crit/30 text-crit text-[10px] font-bold uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(255,59,92,0.2)]">
                  Critical: Production Breach Detected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-mute mt-4">
              <div className="flex items-center gap-2">
                {incident.verdict === "targeted" ? (
                  <span className="text-crit flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Crosshair size={14} /> Targeted Adversary (APT)
                  </span>
                ) : (
                  <span className="text-mute flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Globe size={14} /> Opportunistic Bot/Scanner
                  </span>
                )}
              </div>
              <div className="w-1 h-1 rounded-full bg-line" />
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-widest">Status:</span>
                <b className={`font-mono ${isContained ? "text-low" : "text-crit"}`}>
                  {incident.status.toUpperCase()}
                </b>
              </div>
              <div className="w-1 h-1 rounded-full bg-line" />
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-widest">Duration:</span>
                <b className="text-ink font-mono">{incident.duration_s}s</b>
              </div>
              <div className="w-1 h-1 rounded-full bg-line" />
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-widest">Actor Cadence:</span>
                <b className="text-ink font-mono">{incident.profile?.cadence || "unknown"}</b>
              </div>
            </div>
          </div>
        </div>

        {isContained ? (
          <div className="flex items-center gap-3 rounded-xl border border-low/30 bg-low/5 text-low px-5 py-3 text-xs font-bold shadow-[0_0_20px_rgba(61,214,168,0.1)] relative z-10">
            <ShieldCheck size={20} className="animate-pulse" />
            <div>
              <div className="uppercase tracking-widest text-[10px] opacity-70">Defense Active</div>
              <span>Adversary traffic dropped at edge firewall</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-crit/30 bg-crit/5 text-crit px-5 py-3 text-xs font-bold shadow-[0_0_20px_rgba(255,59,92,0.1)] relative z-10">
            <ShieldAlert size={20} className="animate-bounce" />
            <div>
              <div className="uppercase tracking-widest text-[10px] opacity-70">Action Required</div>
              <span>Active intrusion detected - recommend containment</span>
            </div>
          </div>
        )}
      </div>

      {/* Kill Chain Progress Bar */}
      <KillChainBar stage={incident.stage} />

      {/* Automated Narrative Strip */}
      <div className="bg-panel-card border border-line rounded-xl p-5 text-xs text-ink/80 leading-relaxed flex items-start gap-4 shadow-lg border-l-4 border-l-accent">
        <div className="p-2 bg-accent/10 rounded-lg text-accent">
          <Info size={18} />
        </div>
        <div>
          <span className="font-bold text-accent uppercase text-[10px] tracking-widest block mb-2">
            Automated Intelligence Narrative
          </span>
          <p className="text-[13px] leading-relaxed italic opacity-90">"{incident.narrative}"</p>
        </div>
      </div>

      {/* Attack Chain React Flow Graph */}
      <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl h-[400px]">
        <AttackChainGraph
          timeline={incident.timeline || []}
          realAssetTouched={incident.real_asset_touched}
        />
      </div>

      {/* 3-Column Correlation & Evidence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Why This Score */}
        <div className="bg-panel-card border border-line rounded-xl p-5 flex flex-col h-[320px] shadow-xl">
          <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest mb-4 pb-2 border-b border-line flex items-center justify-between">
            Risk Analysis Factors
            <span className="text-accent">Explainable AI</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {incident.factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] group">
                <span className="text-mute group-hover:text-ink transition-colors">{f.label}</span>
                <span
                  className={`mono font-bold px-2 py-0.5 rounded text-[10px] ${
                    f.points < 0
                      ? "bg-low/10 text-low border border-low/20"
                      : "bg-high/10 text-high border border-high/20"
                  }`}
                >
                  {f.points > 0 ? `+${f.points}` : f.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MITRE ATT&CK Techniques */}
        <div className="bg-panel-card border border-line rounded-xl p-5 flex flex-col h-[320px] shadow-xl">
          <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest mb-4 pb-2 border-b border-line flex items-center justify-between">
            ATT&CK Mappings
            <span className="text-accent">{incident.techniques.length} Detected</span>
          </h3>
          <div className="flex-1 overflow-y-auto flex flex-wrap gap-2 content-start pr-2 scrollbar-thin">
            {incident.techniques.map((t) => (
              <a
                key={t.id}
                href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/`}
                target="_blank"
                rel="noreferrer"
                title={`${t.name} (${t.tactic})`}
                className="text-[10px] bg-panel hover:bg-panel-card text-accent border border-line px-2.5 py-1.5 rounded-lg mono transition-all hover:border-accent/50 hover:shadow-[0_0_10px_rgba(77,163,255,0.1)] flex items-center gap-2"
              >
                <span className="font-bold">{t.id}</span>
                <span className="text-mute group-hover:text-ink truncate max-w-[120px]">{t.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Real-Asset Check Panel */}
        <div
          className={`rounded-xl p-5 flex flex-col h-[320px] border shadow-xl ${
            incident.real_asset_touched
              ? "bg-crit/5 border-crit/30"
              : "bg-panel-card border-line"
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-line">
            <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest">
              Critical Asset Contact
            </h3>
            {incident.real_asset_touched ? (
              <span className="px-2 py-0.5 rounded bg-crit/20 text-crit text-[9px] font-bold uppercase tracking-widest animate-pulse">Intrusion Alert</span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-low/20 text-low text-[9px] font-bold uppercase tracking-widest">No Contact</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {incident.real_asset_touched ? (
              incident.real_asset_events.map((ev, i) => (
                <div key={i} className="p-3 rounded-lg bg-panel border border-line group hover:border-crit/30 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] text-crit font-bold mono uppercase tracking-tighter">
                      {ev.ts.slice(11, 19)} UTC
                    </div>
                    <div className="text-[9px] text-mute font-mono">{ev.sensor}</div>
                  </div>
                  <div className="text-[11px] text-ink font-medium">
                    {ev.summary || `${ev.action}:${ev.outcome}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                <ShieldCheck size={40} className="text-low" />
                <p className="text-[11px] text-mute max-w-[180px]">No adversary contact observed against production assets.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Session Transcript & Response Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl min-h-[400px]">
          <Transcript transcript={incident.transcript || []} />
        </div>
        <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl min-h-[400px]">
          <ActionsPanel
            incidentId={incident.id}
            actions={incident.actions || []}
            onActionComplete={loadData}
          />
        </div>
      </div>
    </div>
  );
}
