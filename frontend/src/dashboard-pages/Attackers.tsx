"use client";

import { useState } from "react";
import Link from "next/link";
import { useLive } from "../useLive";
import SeverityBadge from "../components/SeverityBadge";
import { Crosshair, Globe, ShieldCheck, ArrowRight, Filter, Search } from "lucide-react";
import { IncidentSummary } from "../types";

export default function Attackers() {
  const { incidents } = useLive();
  const [filter, setFilter] = useState<"all" | "targeted" | "opportunistic" | "contained">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const list = Object.values(incidents) as IncidentSummary[];

  const filtered = list.filter((i) => {
    const matchesSearch = i.src_ip.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         i.asn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         i.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filter === "targeted") return i.verdict === "targeted";
    if (filter === "opportunistic") return i.verdict === "opportunistic";
    if (filter === "contained") return i.status === "contained";
    return true;
  });

  return (
    <div className="page-content space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Adversaries</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Threat Actor Profiles</h1>
          <p className="text-sm text-mute mt-1">Track and compare all discovered attacker profiles, cadences and behavioral patterns.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search IP, ASN or Country..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-panel-card border border-line rounded-lg text-xs text-ink w-full sm:w-[240px] focus:border-accent/50 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-panel border border-line p-1 rounded-lg">
            {(["all", "targeted", "opportunistic", "contained"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filter === k
                    ? "bg-accent text-white shadow-[0_0_10px_rgba(77,163,255,0.3)]"
                    : "text-mute hover:text-ink hover:bg-panel-card"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel/30">
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Source IP</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Origin / ASN</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Risk Level</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Verdict</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Kill Chain</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Containment</th>
                <th className="px-5 py-4 text-[10px] font-bold text-mute uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-mute text-xs italic">
                    No threat actors matching current criteria
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => {
                  const isContained = inc.status === "contained";
                  return (
                    <tr key={inc.id} className="hover:bg-panel/50 transition-colors group">
                      <td className="px-5 py-4 text-[12px] font-bold text-ink mono">{inc.src_ip}</td>
                      <td className="px-5 py-4">
                        <div className="text-[11px] text-ink">{inc.country}</div>
                        <div className="text-[9px] text-mute mono">{inc.asn}</div>
                      </td>
                      <td className="px-5 py-4">
                        <SeverityBadge severity={inc.severity} score={inc.score} pulse={!isContained} />
                      </td>
                      <td className="px-5 py-4">
                        {inc.verdict === "targeted" ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-crit uppercase">
                            <Crosshair size={12} /> Targeted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-mute uppercase">
                            <Globe size={12} /> Opportunistic
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded bg-panel border border-line text-[10px] text-ink mono uppercase">
                          {inc.stage}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isContained ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-low uppercase">
                            <ShieldCheck size={12} /> Contained
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-crit uppercase animate-pulse">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}
                          className="inline-flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all group-hover:shadow-[0_0_10px_rgba(77,163,255,0.2)]"
                        >
                          Investigate
                          <ArrowRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
