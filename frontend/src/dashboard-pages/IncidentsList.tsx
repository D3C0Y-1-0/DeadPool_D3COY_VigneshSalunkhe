"use client";

import { useMemo, useState } from "react";
import { useLive } from "../useLive";
import SeverityBadge from "../components/SeverityBadge";
import { ArrowRight, Crosshair, Globe, Search } from "lucide-react";
import Link from "next/link";

type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
type VerdictFilter = "all" | "targeted" | "opportunistic";

const SEVERITIES: Array<Exclude<SeverityFilter, "all">> = ["critical", "high", "medium", "low"];
const VERDICTS: Array<Exclude<VerdictFilter, "all">> = ["targeted", "opportunistic"];

const SEVERITY_TEXT: Record<string, string> = {
  critical: "text-crit",
  high: "text-high",
  medium: "text-med",
  low: "text-low"
};

function formatTs(ts?: string): string {
  if (!ts) return "—";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function IncidentsList() {
  const { incidents, loading, error } = useLive();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [verdict, setVerdict] = useState<VerdictFilter>("all");

  const list = useMemo(
    () => Object.values(incidents).sort((a, b) => b.score - a.score),
    [incidents]
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    list.forEach((inc) => {
      if (inc.severity in base) base[inc.severity] += 1;
    });
    return base;
  }, [list]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return list.filter((inc) => {
      if (severity !== "all" && inc.severity !== severity) return false;
      if (verdict !== "all" && inc.verdict !== verdict) return false;
      if (!query) return true;
      return [inc.src_ip, inc.country, inc.asn, inc.stage]
        .map((value) => (value === undefined ? "" : String(value)))
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [list, search, severity, verdict]);

  return (
    <div className="page-content space-y-6">
      {error && (
        <div role="alert" className="notice notice-danger">
          Incident telemetry unavailable: {error}
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Operations</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Incident Queue</h1>
          <p className="text-sm text-mute mt-1">Every correlated attack chain on record, ranked by severity score.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((sev) => (
            <div key={sev} className="bg-panel-card border border-line rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                sev === 'critical' ? 'bg-crit' : 
                sev === 'high' ? 'bg-high' : 
                sev === 'medium' ? 'bg-med' : 'bg-low'
              }`} />
              <span className="text-[10px] font-bold text-ink uppercase tracking-widest">{sev}</span>
              <span className="text-xs font-bold text-mute">{counts[sev] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-panel/30 p-4 rounded-xl border border-line">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={16} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search IP, geo, ASN or stage…"
            className="w-full bg-panel-card border border-line rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-panel border border-line p-1 rounded-lg">
            {(["all", ...SEVERITIES] as SeverityFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setSeverity(key)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  severity === key
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-mute hover:text-ink hover:bg-panel-card"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-panel border border-line p-1 rounded-lg">
            {(["all", ...VERDICTS] as VerdictFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setVerdict(key)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  verdict === key
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-mute hover:text-ink hover:bg-panel-card"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-panel/50 border-b border-line">
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Source IP</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Geo / ASN</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest text-center">Score</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Verdict</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Stage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Last Seen</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-mute animate-pulse italic">
                    Loading security incidents...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-mute italic">
                    No incidents match your current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[12px] font-bold text-ink mono">{inc.src_ip}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-ink">{inc.country || "Unknown"}</span>
                        <span className="text-[9px] text-mute mono">{inc.asn || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={inc.severity} pulse={inc.status === "open"} />
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`mono font-bold text-sm ${SEVERITY_TEXT[inc.severity] || "text-ink"}`}>
                        {inc.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inc.verdict === "targeted" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-crit uppercase tracking-widest">
                          <Crosshair size={12} /> Targeted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-mute uppercase tracking-widest">
                          <Globe size={12} /> Opportunistic
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-panel border border-line text-[10px] text-ink mono uppercase">
                        {inc.stage || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-mute mono">{formatTs(inc.last_seen)}</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}
                        className="inline-flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all group-hover:shadow-[0_0_10px_rgba(77,163,255,0.2)]"
                      >
                        Investigate
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
