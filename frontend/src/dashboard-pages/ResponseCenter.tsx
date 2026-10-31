"use client";

import { useMemo, useState } from "react";
import { useLive } from "../useLive";
import { executeAction } from "../api";
import { ActionItem, Incident } from "../types";
import { Eye, Info, Play, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

interface PendingGroup {
  incident: Incident;
  actions: ActionItem[];
}

function formatParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) return "no parameters";
  return entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("  ");
}

export default function ResponseCenter() {
  const { incidents, loading, error, refreshAll } = useLive();
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const groups = useMemo<PendingGroup[]>(() => {
    const collected: PendingGroup[] = [];
    Object.values(incidents).forEach((inc) => {
      if (!("actions" in inc)) return;
      const pending = inc.actions.filter((action) => action.status === "recommended");
      if (pending.length > 0) collected.push({ incident: inc, actions: pending });
    });
    return collected.sort((a, b) => b.incident.score - a.incident.score);
  }, [incidents]);

  const handleAction = async (incidentId: string, action: ActionItem, mode: "approve" | "dry_run") => {
    const key = `${incidentId}-${action.id}-${mode}`;
    setBusy(key);
    setActionError(null);
    try {
      const updated: ActionItem = await executeAction(incidentId, action.id, mode);
      const fallback = mode === "dry_run" ? "Dry run completed successfully." : "Action approved and applied to production.";
      setResults((prev) => ({ ...prev, [`${incidentId}-${action.id}`]: updated.result || fallback }));
      if (mode === "approve") await refreshAll();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? `${action.title}: ${cause.message}` : `${action.title}: request failed.`
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-content space-y-6">
      {error && (
        <div role="alert" className="notice notice-danger">
          Response telemetry unavailable: {error}
        </div>
      )}

      {actionError && (
        <div role="alert" className="notice notice-danger">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Operations</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Response Center</h1>
          <p className="text-sm text-mute mt-1">Review and approve recommended containment actions to protect production assets.</p>
        </div>
        <div className="bg-panel-card border border-line rounded-lg px-4 py-2">
          <div className="text-[10px] text-mute uppercase tracking-widest mb-0.5">Pending</div>
          <div className="text-lg font-bold text-high">{groups.length} <span className="text-xs font-normal text-mute">Incidents</span></div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-4 text-sm text-ink/80 shadow-[0_0_20px_rgba(77,163,255,0.05)]">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
        <p className="text-[12px] leading-relaxed">
          <strong>Safety Protocol:</strong> This is a defensive deception lab. Every production-affecting action (block, isolate, rotate) requires
          explicit human approval. Dry runs are simulated and will not affect the production firewall.
        </p>
      </div>

      {loading && groups.length === 0 ? (
        <div className="bg-panel-card border border-line rounded-xl p-12 text-center text-mute text-sm italic">
          Syncing pending response actions...
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-panel-card border border-line rounded-xl p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-low opacity-50" />
          <div className="text-ink font-bold">No Pending Actions</div>
          <div className="text-mute text-xs mt-1">All incidents are currently contained or monitored.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ incident, actions }) => (
            <div key={incident.id} className="overflow-hidden rounded-xl border border-line bg-panel-card shadow-2xl transition-all hover:border-accent/30">
              <div className="flex flex-col justify-between gap-4 border-b border-line bg-panel/50 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-ink mono">{incident.src_ip}</span>
                  <span className="text-[10px] text-mute mono bg-panel px-2 py-0.5 rounded border border-line">{incident.id}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-[10px] uppercase tracking-widest text-mute">
                    Risk Score: <span className="text-high font-bold">{incident.score}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-mute">
                    Verdict: <span className="text-ink font-bold">{incident.verdict}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-mute">
                    Stage: <span className="text-accent font-bold">{incident.stage}</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-line">
                {actions.map((action) => {
                  const dryKey = `${incident.id}-${action.id}-dry_run`;
                  const approveKey = `${incident.id}-${action.id}-approve`;
                  const result = results[`${incident.id}-${action.id}`] || action.result;
                  const isBusy = busy?.startsWith(`${incident.id}-${action.id}`);
                  
                  return (
                    <div key={action.id} className="flex flex-col justify-between gap-6 p-5 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-ink">{action.title}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-panel border border-line text-mute">
                            {action.type}
                          </span>
                        </div>
                        <p className="text-[12px] text-mute leading-relaxed">{action.why}</p>
                        <div className="bg-panel rounded-lg p-3 border border-line">
                          <div className="text-[9px] text-mute uppercase tracking-widest mb-1.5 font-bold">Parameters</div>
                          <code className="text-[11px] text-accent mono break-all">{formatParams(action.params)}</code>
                        </div>
                        {result && (
                          <div className="flex items-start gap-2 bg-low/10 border border-low/20 rounded-lg p-3 mt-3 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={14} className="text-low shrink-0 mt-0.5" />
                            <span className="text-[11px] text-low font-medium mono break-all">{result}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAction(incident.id, action, "dry_run")}
                          disabled={isBusy}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-[11px] font-bold text-ink transition-all hover:bg-panel-card hover:border-accent/50 disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Eye size={14} className="text-mute" />
                          {busy === dryKey ? "Simulating..." : "Dry Run"}
                        </button>
                        <button
                          onClick={() => handleAction(incident.id, action, "approve")}
                          disabled={isBusy}
                          className="flex cursor-pointer items-center gap-2 rounded-lg bg-crit px-4 py-2 text-[11px] font-bold text-white shadow-[0_0_15px_rgba(255,59,92,0.3)] transition-all hover:bg-crit/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Play size={14} className="fill-current" />
                          {busy === approveKey ? "Executing..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
