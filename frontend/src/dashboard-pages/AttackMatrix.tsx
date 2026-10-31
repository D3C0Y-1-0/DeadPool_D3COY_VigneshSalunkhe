"use client";

import { useEffect, useState } from "react";
import { fetchAttackMatrix } from "../api";
import { TechniqueItem } from "../types";
import { Grid, ExternalLink, Target, Info, Search } from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";

export default function AttackMatrix() {
  const [matrix, setMatrix] = useState<TechniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAttackMatrix()
      .then((rows) => {
        setMatrix(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        setMatrix([]);
        setError(cause instanceof Error ? cause.message : "Could not load ATT&CK telemetry.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = matrix.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tactic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalHitCount = matrix.reduce((acc, t) => acc + (t.count || 1), 0);

  const getRisk = (count: number = 0) => {
    if (count > 20) return "critical";
    if (count > 10) return "high";
    if (count > 5) return "medium";
    return "low";
  };

  return (
    <div className="page-content space-y-6">
      {error && (
        <div role="alert" className="notice notice-danger">
          ATT&CK data unavailable: {error}
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Intelligence</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">MITRE ATT&CK Mapping</h1>
          <p className="text-sm text-mute mt-1">Tactic, techniques and threat intelligence mapping.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-panel-card border border-line rounded-lg px-4 py-2">
            <div className="text-[10px] text-mute uppercase tracking-widest mb-0.5">Techniques</div>
            <div className="text-lg font-bold text-ink">{matrix.length}</div>
          </div>
          <div className="bg-panel-card border border-line rounded-lg px-4 py-2">
            <div className="text-[10px] text-mute uppercase tracking-widest mb-0.5">Total Detections</div>
            <div className="text-lg font-bold text-low">{totalHitCount}</div>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-panel/30 p-4 rounded-xl border border-line">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={16} />
          <input
            type="text"
            placeholder="Search technique, ID or tactic..."
            className="w-full bg-panel-card border border-line rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mute font-bold uppercase tracking-widest">
          <Info size={12} className="text-accent" />
          Mapped to Enterprise Matrix v14
        </div>
      </div>

      <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-panel/50 border-b border-line">
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Tactic</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Technique</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest text-center">Events</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest text-right">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-mute animate-pulse italic">
                    Mapping adversary techniques...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-mute italic">
                    No techniques observed yet.
                  </td>
                </tr>
              ) : (
                filtered.map((tech) => (
                  <tr key={tech.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-panel border border-line text-[10px] font-bold text-ink uppercase tracking-wider">
                        {tech.tactic}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://attack.mitre.org/techniques/${tech.id.replace(".", "/")}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col group/link"
                      >
                        <span className="text-[12px] font-bold text-ink group-hover/link:text-accent transition-colors flex items-center gap-2">
                          {tech.id} — {tech.name}
                          <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-[10px] text-mute mt-0.5">Enterprise Technique</span>
                      </a>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="mono text-sm font-bold text-ink">
                        {tech.count || 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <SeverityBadge severity={getRisk(tech.count)} />
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
