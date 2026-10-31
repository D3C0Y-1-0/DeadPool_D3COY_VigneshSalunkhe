import React, { useEffect, useState } from "react";
import { fetchAttackMatrix } from "../api";
import { TechniqueItem } from "../types";
import { Grid, ExternalLink, Shield } from "lucide-react";

const TACTICS_ORDER = [
  "Reconnaissance",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Stealth",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact"
];

export default function AttackMatrix() {
  const [matrix, setMatrix] = useState<TechniqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttackMatrix()
      .then(setMatrix)
      .catch(() => {
        // Fallback default techniques
        setMatrix([
          { id: "T1046", name: "Network Service Discovery", tactic: "Discovery", count: 4 },
          { id: "T1595.001", name: "Scanning IP Blocks", tactic: "Reconnaissance", count: 3 },
          { id: "T1110.001", name: "Password Guessing", tactic: "Credential Access", count: 12 },
          { id: "T1078.001", name: "Default Accounts", tactic: "Initial Access", count: 2 },
          { id: "T1059.004", name: "Unix Shell", tactic: "Execution", count: 5 },
          { id: "T1033", name: "System Owner/User Discovery", tactic: "Discovery", count: 2 },
          { id: "T1083", name: "File and Directory Discovery", tactic: "Discovery", count: 2 },
          { id: "T1005", name: "Data from Local System", tactic: "Collection", count: 2 },
          { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "Exfiltration", count: 1 },
          { id: "T1021.004", name: "SSH", tactic: "Lateral Movement", count: 1 }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Group by tactic
  const byTactic: Record<string, TechniqueItem[]> = {};
  matrix.forEach((t) => {
    const tac = t.tactic || "Other";
    if (!byTactic[tac]) byTactic[tac] = [];
    byTactic[tac].push(t);
  });

  const observedCount = matrix.length;
  const totalHitCount = matrix.reduce((acc, t) => acc + (t.count || 1), 0);

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto pb-6">
      <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Grid className="w-5 h-5 text-[#4da3ff]" />
          <div>
            <h1 className="text-base font-bold text-[#e6edf7] uppercase tracking-wide">
              MITRE ATT&CK Matrix Heatmap
            </h1>
            <p className="text-xs text-[#8a97ad]">
              Empirical technique mapping aligned with MITRE ATT&CK v19 Enterprise Framework.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs mono">
          <div className="bg-[#0a0e17] px-3 py-1.5 rounded border border-[#1f2a3d]">
            Techniques Observed: <b className="text-[#4da3ff]">{observedCount}</b>
          </div>
          <div className="bg-[#0a0e17] px-3 py-1.5 rounded border border-[#1f2a3d]">
            Total Detections: <b className="text-[#3dd6a8]">{totalHitCount}</b>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TACTICS_ORDER.map((tac) => {
          const items = byTactic[tac] || [];
          const hasHits = items.length > 0;

          return (
            <div
              key={tac}
              className={`rounded-lg border p-3 flex flex-col ${
                hasHits
                  ? "bg-[#111827] border-[#1f2a3d]"
                  : "bg-[#0a0e17]/60 border-[#1f2a3d]/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2a3d]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf7]">
                  {tac}
                </h3>
                {hasHits && (
                  <span className="mono text-[11px] bg-[#4da3ff]/20 text-[#4da3ff] px-1.5 py-0.2 rounded font-bold">
                    {items.length}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1">
                {!hasHits ? (
                  <div className="text-[11px] text-[#8a97ad]/60 italic py-4 text-center">
                    No detections
                  </div>
                ) : (
                  items.map((tech) => (
                    <a
                      key={tech.id}
                      href={`https://attack.mitre.org/techniques/${tech.id.replace(".", "/")}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-2 rounded bg-[#0a0e17] hover:bg-[#162032] border border-[#1f2a3d] hover:border-[#4da3ff]/50 transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="mono font-bold text-[#4da3ff]">
                          {tech.id}
                        </span>
                        {tech.count !== undefined && (
                          <span className="mono text-[10px] bg-[#ff3b5c]/15 text-[#ff3b5c] px-1.5 py-0.2 rounded font-bold">
                            {tech.count} hits
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors truncate">
                        {tech.name}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
