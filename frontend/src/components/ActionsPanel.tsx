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
    <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-3.5 flex flex-col h-64">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2a3d]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4da3ff]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6edf7]">
            SOAR Response Recommendations
          </h3>
        </div>
        <div className="flex gap-1.5">
          <a
            href={`/api/incidents/${incidentId}/export/stix`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] bg-[#1f2a3d] hover:bg-[#4da3ff]/20 text-[#4da3ff] border border-[#4da3ff]/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" /> STIX 2.1
          </a>
          <a
            href={`/api/incidents/${incidentId}/export/csv`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] bg-[#1f2a3d] hover:bg-[#8a97ad]/20 text-[#e6edf7] border border-[#8a97ad]/40 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" /> CSV
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {actions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#8a97ad]">
            No response actions required.
          </div>
        ) : (
          actions.map((act) => {
            const isExecuted = act.status === "executed";
            const isDryRun = act.status === "dry_run";
            const resultMsg = actionResults[act.id] || act.result;

            return (
              <div
                key={act.id}
                className={`p-2.5 rounded border text-xs transition-all ${
                  isExecuted
                    ? "bg-[#3dd6a8]/10 border-[#3dd6a8]/40"
                    : "bg-[#0a0e17] border-[#1f2a3d]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#e6edf7] flex items-center gap-1.5">
                      {act.title}
                      {isExecuted && (
                        <span className="text-[10px] text-[#3dd6a8] font-bold uppercase mono bg-[#3dd6a8]/20 px-1 py-0.2 rounded">
                          EXECUTED
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8a97ad] mt-0.5">
                      {act.why}
                    </div>
                    {resultMsg && (
                      <div className="mt-1.5 p-1.5 rounded bg-[#111827] border border-[#1f2a3d] mono text-[11px] text-[#3dd6a8] break-all">
                        {resultMsg}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isExecuted ? (
                      <>
                        {["block_source", "isolate_host", "rotate_credentials"].includes(act.type) && (
                          <button
                            onClick={() => handleAction(act.id, "dry_run")}
                            disabled={loadingAction !== null}
                            className="px-2 py-1 bg-[#1f2a3d] hover:bg-slate-700 text-[#e6edf7] rounded text-[11px] font-medium border border-[#334155] cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-[#8a97ad]" />
                            {loadingAction === `${act.id}-dry_run` ? "Testing..." : "Dry-run"}
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(act.id, "approve")}
                          disabled={loadingAction !== null}
                          className="px-2.5 py-1 bg-[#ff3b5c] hover:bg-[#e02b4c] text-white rounded text-[11px] font-semibold cursor-pointer shadow-sm flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {loadingAction === `${act.id}-approve` ? "Applying..." : "Approve"}
                        </button>
                      </>
                    ) : (
                      <span className="text-[#3dd6a8] flex items-center gap-1 font-semibold text-xs mono">
                        <Check className="w-4 h-4" /> Enforced
                      </span>
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
