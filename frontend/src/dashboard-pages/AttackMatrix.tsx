"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchAttackMatrix } from "../api";
import { TechniqueItem } from "../types";
import { Grid3x3, Search } from "lucide-react";

const TACTICS_ORDER = [
  "reconnaissance", "initial-access", "execution", "persistence",
  "privilege-escalation", "defense-evasion", "credential-access",
  "discovery", "lateral-movement", "collection", "exfiltration", "impact",
];

const TACTIC_LABELS: Record<string, string> = {
  "reconnaissance":      "Reconnaissance",
  "initial-access":      "Initial Access",
  "execution":           "Execution",
  "persistence":         "Persistence",
  "privilege-escalation":"Privilege Escalation",
  "defense-evasion":     "Defense Evasion",
  "credential-access":   "Credential Access",
  "discovery":           "Discovery",
  "lateral-movement":    "Lateral Movement",
  "collection":          "Collection",
  "exfiltration":        "Exfiltration",
  "impact":              "Impact",
};

const COUNT_HEAT = (n: number) => {
  if (n === 0) return { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", color: "var(--color-mute)" };
  if (n <= 2)  return { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)",  color: "#3b82f6" };
  if (n <= 5)  return { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)",    color: "#eab308" };
  if (n <= 10) return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)",   color: "#f97316" };
  return               { bg: "rgba(244,63,94,0.15)", border: "rgba(244,63,94,0.35)",   color: "#f43f5e" };
};

export default function AttackMatrix() {
  const [techniques, setTechniques] = useState<TechniqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);
  const [hoveredTech, setHoveredTech] = useState<TechniqueItem | null>(null);

  useEffect(() => {
    fetchAttackMatrix()
      .then(setTechniques)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load ATT&CK telemetry."))
      .finally(() => setLoading(false));
  }, []);

  const byTactic = useMemo(() => {
    const map: Record<string, TechniqueItem[]> = {};
    techniques.forEach((t) => {
      const tactic = (t.tactic ?? "").toLowerCase().replace(/ /g, "-");
      if (!map[tactic]) map[tactic] = [];
      map[tactic].push(t);
    });
    return map;
  }, [techniques]);

  const filteredTechs = useMemo(() => {
    if (!search) return techniques;
    const q = search.toLowerCase();
    return techniques.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.tactic.toLowerCase().includes(q));
  }, [techniques, search]);

  const totalHits = techniques.reduce((s, t) => s + (t.count ?? 0), 0);
  const tacticCounts = TACTICS_ORDER.map((t) => ({ tactic: t, count: (byTactic[t] ?? []).reduce((s, x) => s + (x.count ?? 0), 0) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>MITRE ATT&CK®</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Technique Matrix</h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>
            {techniques.length} techniques observed · {totalHits} total hits across {Object.keys(byTactic).length} tactics
          </p>
        </div>
        <div className="input-icon-wrap" style={{ width: 260 }}>
          <Search size={13} className="icon" />
          <input className="input" style={{ paddingLeft: "2.25rem" }} placeholder="Search technique or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <div className="notice notice-warning" role="status">ATT&amp;CK data unavailable: {error}</div>}

      {/* Tactic summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "0.6rem" }}>
        {tacticCounts.slice(0, 6).map(({ tactic, count }) => (
          <div key={tactic} className="card" style={{ padding: "0.75rem 0.85rem", cursor: "pointer", borderColor: selectedTactic === tactic ? "rgba(59,130,246,0.5)" : undefined, transition: "border-color 0.15s" }}
            onClick={() => setSelectedTactic(selectedTactic === tactic ? null : tactic)}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-mute)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TACTIC_LABELS[tactic] ?? tactic}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: count > 0 ? "#f43f5e" : "var(--color-mute)" }}>{count}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card empty-state" style={{ minHeight: 180 }}>Loading observed ATT&amp;CK techniques…</div>
      ) : search ? (
        /* Search results */
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Technique ID</th><th>Name</th><th>Tactic</th><th>Hits</th></tr></thead>
            <tbody>
              {filteredTechs.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--color-mute)", padding: "2rem" }}>No techniques match "{search}"</td></tr>
                : filteredTechs.map((t) => {
                    const h = COUNT_HEAT(t.count ?? 0);
                    return (
                      <tr key={t.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#93c5fd" }}>{t.id}</td>
                        <td style={{ fontWeight: 600, color: "var(--color-ink)" }}>{t.name}</td>
                        <td style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--color-mute)", letterSpacing: "0.06em" }}>{t.tactic}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 32, padding: "2px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 800, fontFamily: "var(--font-mono)", background: h.bg, color: h.color, border: `1px solid ${h.border}` }}>{t.count ?? 0}</span>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      ) : techniques.length === 0 ? (
        <div className="card empty-state" style={{ minHeight: 240 }}>
          <Grid3x3 size={22} />
          <p>No ATT&amp;CK techniques observed</p>
          <span>Technique counts appear after incidents are created from sensor events.</span>
        </div>
      ) : (
        /* ATT&CK Matrix Grid */
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${TACTICS_ORDER.length}, minmax(120px,1fr))`, gap: "0.5rem", minWidth: 1400 }}>
            {/* Tactic headers */}
            {TACTICS_ORDER.map((tactic) => (
              <div key={tactic} style={{
                padding: "0.6rem 0.65rem", borderRadius: "8px 8px 0 0", textAlign: "center",
                background: selectedTactic === tactic ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)",
                border: `1px solid ${selectedTactic === tactic ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.2)"}`,
                cursor: "pointer",
              }} onClick={() => setSelectedTactic(selectedTactic === tactic ? null : tactic)}>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#93c5fd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {TACTIC_LABELS[tactic] ?? tactic}
                </div>
                <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#3b82f6", marginTop: 2 }}>
                  {(byTactic[tactic] ?? []).length} techniques
                </div>
              </div>
            ))}

            {/* Technique cells */}
            {TACTICS_ORDER.map((tactic) => {
              const items = byTactic[tactic] ?? [];
              const isDimmed = selectedTactic && selectedTactic !== tactic;
              return (
                <div key={tactic} style={{ display: "flex", flexDirection: "column", gap: 3, opacity: isDimmed ? 0.35 : 1, transition: "opacity 0.2s" }}>
                  {items.length === 0 ? (
                    <div style={{ height: 44, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.6rem", color: "rgba(100,116,139,0.4)" }}>—</span>
                    </div>
                  ) : items.map((tech) => {
                    const h = COUNT_HEAT(tech.count ?? 0);
                    return (
                      <div key={tech.id}
                        style={{ padding: "0.45rem 0.55rem", borderRadius: 6, background: h.bg, border: `1px solid ${h.border}`, cursor: "pointer", transition: "all 0.15s", position: "relative" }}
                        onMouseEnter={() => setHoveredTech(tech)}
                        onMouseLeave={() => setHoveredTech(null)}
                      >
                        <div style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: h.color }}>{tech.id}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--color-ink)", lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {tech.name}
                        </div>
                        {(tech.count ?? 0) > 0 && (
                          <div style={{ position: "absolute", top: 4, right: 5, fontSize: "0.6rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: h.color }}>{tech.count}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Heat legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "0.75rem 1rem", background: "var(--color-panel-card)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: "0.72rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "var(--color-mute)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hit Frequency:</span>
        {[
          { label: "None (0)",  color: "rgba(255,255,255,0.04)" },
          { label: "Low (1-2)", color: "rgba(59,130,246,0.15)" },
          { label: "Med (3-5)", color: "rgba(234,179,8,0.18)" },
          { label: "High (6-10)",color: "rgba(249,115,22,0.18)" },
          { label: "Critical (10+)",color: "rgba(244,63,94,0.2)" },
        ].map((l) => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: "1px solid rgba(255,255,255,0.1)" }} />
            {l.label}
          </span>
        ))}
      </div>

      {hoveredTech && (
        <div style={{ position: "fixed", bottom: 60, right: 16, padding: "0.85rem 1rem", background: "var(--color-panel-card)", border: `1px solid ${COUNT_HEAT(hoveredTech.count ?? 0).border}`, borderRadius: 12, zIndex: 50, maxWidth: 280, boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, color: "#93c5fd" }}>{hoveredTech.id}</div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-ink)", marginTop: 4 }}>{hoveredTech.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-mute)", marginTop: 3 }}>{hoveredTech.tactic}</div>
          <div style={{ marginTop: 6, fontSize: "0.72rem" }}>
            <span style={{ color: "var(--color-mute)" }}>Hits: </span>
            <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: COUNT_HEAT(hoveredTech.count ?? 0).color }}>{hoveredTech.count ?? 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}
