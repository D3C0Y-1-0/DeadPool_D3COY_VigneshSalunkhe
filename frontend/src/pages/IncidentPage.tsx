import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchIncident } from "../api";
import { useLive } from "../useLive";
import { Incident } from "../types";
import KillChainBar from "../components/KillChainBar";
import AttackChainGraph from "../components/AttackChainGraph";
import Transcript from "../components/Transcript";
import ActionsPanel from "../components/ActionsPanel";
import SeverityBadge from "../components/SeverityBadge";
import mockIncident from "../mock/incident.json";
import { ArrowLeft, Crosshair, Globe, ShieldCheck, AlertCircle, ShieldAlert } from "lucide-react";

export default function IncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { incidents, refreshAll } = useLive();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchIncident(id);
      setIncident(data);
    } catch {
      // Offline fallback
      if (id === mockIncident.id || !incident) {
        setIncident(mockIncident as unknown as Incident);
      }
    } finally {
      setLoading(false);
    }
  }, [id, incident]);

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
      <div className="h-full flex items-center justify-center text-[#8a97ad] text-sm">
        Loading adversary investigation telemetry...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center text-[#8a97ad]">
        <AlertCircle className="w-8 h-8 text-[#ff3b5c] mx-auto mb-2" />
        <p>Incident {id} was not found.</p>
        <Link to="/" className="text-xs text-[#4da3ff] hover:underline mt-2 inline-block">
          Return to Command Center
        </Link>
      </div>
    );
  }

  const isContained = incident.status === "contained";

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto pb-6">
      {/* Top Breadcrumb & Incident Header */}
      <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/"
            className="p-2 rounded bg-[#0a0e17] border border-[#1f2a3d] text-[#8a97ad] hover:text-[#e6edf7] transition-colors"
            title="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-3">
              <SeverityBadge
                severity={incident.severity}
                score={incident.score}
                pulse={!isContained}
              />
              <span className="mono text-lg font-bold text-[#e6edf7]">
                {incident.src_ip}
              </span>
              <span className="text-xs text-[#8a97ad]">
                ({incident.country} • {incident.asn})
              </span>
              {incident.real_asset_touched && (
                <span className="text-[10px] bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/50 font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  CRITICAL: REAL ASSET TOUCHED
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#8a97ad] mt-1.5">
              <span className="flex items-center gap-1 font-medium">
                {incident.verdict === "targeted" ? (
                  <span className="text-[#ff3b5c] flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" /> 🎯 TARGETED ATTACKER (APT Profile)
                  </span>
                ) : (
                  <span className="text-[#8a97ad] flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> 🌐 OPPORTUNISTIC NOISE
                  </span>
                )}
              </span>
              <span>•</span>
              <span>Status: <b className={isContained ? "text-[#3dd6a8]" : "text-[#ff3b5c]"}>{incident.status.toUpperCase()}</b></span>
              <span>•</span>
              <span>Duration: <b className="text-[#e6edf7] mono">{incident.duration_s}s</b></span>
              <span>•</span>
              <span>Cadence: <b className="text-[#e6edf7] mono">{incident.profile?.cadence || "unknown"} ({incident.profile?.median_gap_s || 0}s median)</b></span>
            </div>
          </div>
        </div>

        {isContained && (
          <div className="flex items-center gap-2 bg-[#3dd6a8]/15 border border-[#3dd6a8]/50 text-[#3dd6a8] px-3 py-1.5 rounded-lg text-xs font-semibold self-start md:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>CONTAINMENT ACTIVE: Attacker traffic dropped at prod firewall</span>
          </div>
        )}
      </div>

      {/* Kill Chain Progress Bar */}
      <KillChainBar stage={incident.stage} />

      {/* Automated Narrative Strip */}
      <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-3 text-xs text-[#e6edf7] leading-relaxed flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-[#ff8a3d] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#4da3ff] uppercase text-[11px] block mb-0.5">
            Automated Incident Narrative
          </span>
          {incident.narrative}
        </div>
      </div>

      {/* Attack Chain React Flow Graph */}
      <AttackChainGraph
        timeline={incident.timeline || []}
        realAssetTouched={incident.real_asset_touched}
      />

      {/* 3-Column Correlation & Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Why This Score */}
        <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-3.5 flex flex-col h-60">
          <h3 className="text-xs font-semibold text-[#8a97ad] uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#1f2a3d]">
            Why This Score (Explainable Factors)
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {incident.factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate pr-2">{f.label}</span>
                <span
                  className={`mono font-bold px-1.5 py-0.2 rounded text-[11px] ${
                    f.points < 0
                      ? "bg-[#3dd6a8]/15 text-[#3dd6a8]"
                      : "bg-[#ff8a3d]/15 text-[#ff8a3d]"
                  }`}
                >
                  {f.points > 0 ? `+${f.points}` : f.points}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MITRE ATT&CK Techniques */}
        <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-3.5 flex flex-col h-60">
          <h3 className="text-xs font-semibold text-[#8a97ad] uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#1f2a3d]">
            ATT&CK Techniques Mapped ({incident.techniques.length})
          </h3>
          <div className="flex-1 overflow-y-auto flex flex-wrap gap-1.5 content-start pr-1">
            {incident.techniques.map((t) => (
              <a
                key={t.id}
                href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/`}
                target="_blank"
                rel="noreferrer"
                title={`${t.name} (${t.tactic})`}
                className="text-xs bg-[#0a0e17] hover:bg-[#4da3ff]/15 text-[#4da3ff] border border-[#4da3ff]/40 px-2 py-1 rounded mono transition-colors flex items-center gap-1"
              >
                <span>{t.id}</span>
                <span className="text-[10px] text-[#8a97ad] truncate max-w-[120px]">{t.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Real-Asset Check Panel */}
        <div
          className={`rounded-lg p-3.5 flex flex-col h-60 border ${
            incident.real_asset_touched
              ? "bg-[#ff3b5c]/10 border-[#ff3b5c]/50"
              : "bg-[#111827] border-[#1f2a3d]"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-[#1f2a3d]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6edf7]">
              Real-Asset Touch Check
            </h3>
            {incident.real_asset_touched ? (
              <span className="text-[10px] bg-[#ff3b5c] text-white font-bold px-1.5 py-0.5 rounded uppercase">
                Hostile Pivot
              </span>
            ) : (
              <span className="text-[10px] bg-[#3dd6a8]/20 text-[#3dd6a8] font-bold px-1.5 py-0.5 rounded uppercase">
                Clean
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mono text-xs">
            {incident.real_asset_touched ? (
              incident.real_asset_events.map((ev, i) => (
                <div key={i} className="p-1.5 rounded bg-[#0a0e17] border border-[#ff3b5c]/30 text-slate-300">
                  <div className="text-[10px] text-[#ff3b5c] font-bold">
                    {ev.ts.slice(11, 19)} • {ev.sensor}
                  </div>
                  <div className="truncate text-white font-medium mt-0.5">
                    {ev.summary || `${ev.action}:${ev.outcome}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-[#3dd6a8] text-xs">
                No adversary contact observed against production assets.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Session Transcript & Response Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Transcript transcript={incident.transcript || []} />
        <ActionsPanel
          incidentId={incident.id}
          actions={incident.actions || []}
          onActionComplete={loadData}
        />
      </div>
    </div>
  );
}
