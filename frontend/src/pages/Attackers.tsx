import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLive } from "../useLive";
import SeverityBadge from "../components/SeverityBadge";
import { Users, Crosshair, Globe, ShieldCheck, Filter, ArrowRight } from "lucide-react";
import { IncidentSummary } from "../types";

export default function Attackers() {
  const { incidents } = useLive();
  const [filter, setFilter] = useState<"all" | "targeted" | "opportunistic" | "contained">("all");

  const list = Object.values(incidents) as IncidentSummary[];

  const filtered = list.filter((i) => {
    if (filter === "targeted") return i.verdict === "targeted";
    if (filter === "opportunistic") return i.verdict === "opportunistic";
    if (filter === "contained") return i.status === "contained";
    return true;
  });

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto">
      <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4da3ff]" />
          <div>
            <h1 className="text-base font-bold text-[#e6edf7] uppercase tracking-wide">
              Adversary Profiles & Threat Actors
            </h1>
            <p className="text-xs text-[#8a97ad]">
              Track and compare all discovered attacker profiles, cadences and lateral movement attempts.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0a0e17] p-1 rounded-lg border border-[#1f2a3d] text-xs">
          {(["all", "targeted", "opportunistic", "contained"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded font-medium capitalize cursor-pointer transition-colors ${
                filter === k
                  ? "bg-[#4da3ff] text-black font-semibold"
                  : "text-[#8a97ad] hover:text-[#e6edf7]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e17] text-[#8a97ad] uppercase border-b border-[#1f2a3d] mono text-[11px]">
              <tr>
                <th className="p-3">Adversary Source IP</th>
                <th className="p-3">Geo / ASN</th>
                <th className="p-3">Threat Severity</th>
                <th className="p-3">Behavioral Verdict</th>
                <th className="p-3">Kill Chain Stage</th>
                <th className="p-3">Prod Interaction</th>
                <th className="p-3">Containment Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2a3d]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8a97ad]">
                    No adversaries matching filter '{filter}'.
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => {
                  const isContained = inc.status === "contained";
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-[#162032] transition-colors"
                    >
                      <td className="p-3 font-semibold mono text-[#e6edf7]">
                        {inc.src_ip}
                      </td>
                      <td className="p-3 text-[#8a97ad]">
                        {inc.country} • {inc.asn}
                      </td>
                      <td className="p-3">
                        <SeverityBadge severity={inc.severity} score={inc.score} pulse={!isContained} />
                      </td>
                      <td className="p-3">
                        {inc.verdict === "targeted" ? (
                          <span className="text-[#ff3b5c] font-semibold flex items-center gap-1">
                            <Crosshair className="w-3.5 h-3.5" /> TARGETED
                          </span>
                        ) : (
                          <span className="text-[#8a97ad] flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" /> OPPORTUNISTIC
                          </span>
                        )}
                      </td>
                      <td className="p-3 uppercase mono text-[11px]">
                        {inc.stage}
                      </td>
                      <td className="p-3">
                        {inc.real_asset_touched ? (
                          <span className="text-[#ff3b5c] font-bold bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 px-2 py-0.5 rounded text-[10px]">
                            TOUCHED REAL ASSET
                          </span>
                        ) : (
                          <span className="text-[#3dd6a8] text-[11px]">Deception Only</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isContained ? (
                          <span className="text-[#3dd6a8] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> CONTAINED
                          </span>
                        ) : (
                          <span className="text-[#ff3b5c]">ACTIVE</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          to={`/incident/${inc.id}`}
                          className="px-2.5 py-1 bg-[#1f2a3d] hover:bg-[#4da3ff]/20 text-[#4da3ff] border border-[#4da3ff]/30 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Investigate</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
