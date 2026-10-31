import React, { useState } from "react";
import { ActionItem } from "../types";
import { executeAction } from "../api";
import { ShieldCheck, Play, Eye, Download, Check, AlertCircle } from "lucide-react";

interface Props {
  incidentId: string;
  actions: ActionItem[];
  onActionComplete: () => void;
}

export default function ActionsPanel({ incidentId, actions, onActionComplete }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, string>>({});

  const handleAction = async (actionId: string, mode: "approve" | "dry_run") => {
    setLoadingAction(`${actionId}-${mode}`);
    try {
      const updated = await executeAction(incidentId, actionId, mode);
      if (updated.result) {
        setActionResults((prev) => ({ ...prev, [actionId]: updated.result || "" }));
      }
      onActionComplete();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-panel-card">
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <ShieldCheck size={16} />
          </div>
          <h3 className="text-[10px] font-bold text-ink uppercase tracking-widest">
            SOAR Response Playbook
          </h3>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/incidents/${incidentId}/export/stix`}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] font-bold text-mute hover:text-ink flex items-center gap-1.5 transition-all bg-panel border border-line px-2 py-1 rounded-md"
          >
            <Download size={12} /> STIX 2.1
          </a>
          <a
            href={`/api/incidents/${incidentId}/export/csv`}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] font-bold text-mute hover:text-ink flex items-center gap-1.5 transition-all bg-panel border border-line px-2 py-1 rounded-md"
          >
            <Download size={12} /> CSV
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {actions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-mute italic opacity-50 space-y-3">
            <div className="w-12 h-12 rounded-full border border-line flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <span>No recommended actions available.</span>
          </div>
        ) : (
          actions.map((act) => {
            const isExecuted = act.status === "executed";
            const resultMsg = actionResults[act.id] || act.result;

            return (
              <div
                key={act.id}
                className={`p-4 rounded-xl border transition-all ${
                  isExecuted
                    ? "bg-low/5 border-low/30"
                    : "bg-panel border-line hover:border-accent/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[12px] font-bold ${isExecuted ? "text-low" : "text-ink"}`}>
                        {act.title}
                      </span>
                      {isExecuted && (
                        <span className="px-2 py-0.5 rounded bg-low/20 text-low text-[8px] font-bold uppercase tracking-widest">
                          Enforced
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-mute leading-relaxed">
                      {act.why}
                    </p>
                    {resultMsg && (
                      <div className="mt-3 p-2.5 rounded-lg bg-black/30 border border-line mono text-[10px] text-low break-all shadow-inner">
                        <div className="text-[8px] uppercase tracking-widest opacity-50 mb-1">Execution Output</div>
                        {resultMsg}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!isExecuted ? (
                      <>
                        <button
                          onClick={() => handleAction(act.id, "approve")}
                          disabled={loadingAction !== null}
                          className="w-full bg-crit text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-crit/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-crit/20 disabled:opacity-50"
                        >
                          <Play size={10} fill="currentColor" />
                          {loadingAction === `${act.id}-approve` ? "RUNNING..." : "APPROVE"}
                        </button>
                        {["block_source", "isolate_host", "rotate_credentials"].includes(act.type) && (
                          <button
                            onClick={() => handleAction(act.id, "dry_run")}
                            disabled={loadingAction !== null}
                            className="w-full bg-panel border border-line text-ink px-3 py-1.5 rounded-lg text-[10px] font-bold hover:border-accent/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Eye size={10} />
                            {loadingAction === `${act.id}-dry_run` ? "TESTING..." : "DRY-RUN"}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-low bg-low/10 px-3 py-1.5 rounded-lg border border-low/20">
                        <Check size={14} className="font-bold" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
