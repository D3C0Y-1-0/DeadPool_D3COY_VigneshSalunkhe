import React from "react";
import { useNavigate } from "react-router-dom";
import { IncidentSummary } from "../types";
import SeverityBadge from "./SeverityBadge";
import { AlertTriangle, ShieldCheck, Crosshair, Globe, ExternalLink } from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

export default function AlertQueue({ incidents }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[#1f2a3d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#ff8a3d]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#e6edf7]">
            Priority Alert Queue
          </h2>
          <span className="text-xs bg-[#1f2a3d] text-[#8a97ad] px-2 py-0.5 rounded-full mono">
            {incidents.length}
          </span>
        </div>
        <span className="text-xs text-[#8a97ad]">Click row to investigate</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1f2a3d]/60">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-[#8a97ad] text-sm">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-[#3dd6a8]/50" />
            <p>No active incidents detected on the deception fabric.</p>
            <p className="text-xs text-[#8a97ad]/70 mt-1">
              "Nothing legitimate should ever land here."
            </p>
          </div>
        ) : (
          incidents.map((inc) => {
            const isContained = inc.status === "contained";
            const isCritical = inc.severity === "critical";

            return (
              <div
                key={inc.id}
                onClick={() => navigate(`/incident/${inc.id}`)}
                className={`p-3 hover:bg-[#162032] cursor-pointer transition-all flex items-center justify-between gap-3 group ${
                  isCritical && !isContained ? "bg-[#ff3b5c]/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SeverityBadge
                    severity={inc.severity}
                    score={inc.score}
                    pulse={!isContained}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="mono text-sm font-semibold text-[#e6edf7] group-hover:text-[#4da3ff] transition-colors">
                        {inc.src_ip}
                      </span>
                      <span className="text-xs text-[#8a97ad]">
                        ({inc.country} · {inc.asn})
                      </span>
                      {inc.real_asset_touched && (
                        <span className="text-[10px] bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/50 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                          REAL ASSET TOUCHED
                        </span>
                      )}
                      {inc.honeytoken_hit && (
                        <span className="text-[10px] bg-[#ff8a3d]/20 text-[#ff8a3d] border border-[#ff8a3d]/50 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          HONEYTOKEN HIT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#8a97ad] mt-0.5">
                      <span className="flex items-center gap-1">
                        {inc.verdict === "targeted" ? (
                          <span className="text-[#ff3b5c] flex items-center gap-1 font-medium">
                            <Crosshair className="w-3 h-3" /> TARGETED
                          </span>
                        ) : (
                          <span className="text-[#8a97ad] flex items-center gap-1">
                            <Globe className="w-3 h-3" /> OPPORTUNISTIC
                          </span>
                        )}
                      </span>
                      <span>•</span>
                      <span className="uppercase text-[11px] mono">
                        Stage: {inc.stage}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {isContained ? (
                    <span className="text-xs bg-[#3dd6a8]/15 text-[#3dd6a8] border border-[#3dd6a8]/40 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> CONTAINED
                    </span>
                  ) : (
                    <span className="text-xs bg-[#ff3b5c]/10 text-[#ff3b5c] border border-[#ff3b5c]/30 px-2 py-0.5 rounded font-medium">
                      OPEN
                    </span>
                  )}
                  <ExternalLink className="w-4 h-4 text-[#8a97ad] group-hover:text-[#4da3ff] transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
