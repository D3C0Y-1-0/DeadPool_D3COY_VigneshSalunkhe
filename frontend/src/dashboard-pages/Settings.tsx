"use client";

import { useLive } from "../useLive";
import { Check, Cpu, Network, ShieldCheck, Sliders } from "lucide-react";

const STAGE_BASE_POINTS: Array<{ stage: string; points: number }> = [
  { stage: "recon", points: 10 },
  { stage: "credential_attack", points: 25 },
  { stage: "initial_access", points: 45 },
  { stage: "execution", points: 50 },
  { stage: "discovery", points: 60 },
  { stage: "collection", points: 75 },
  { stage: "exfiltration", points: 85 },
  { stage: "persistence", points: 85 },
  { stage: "lateral_movement", points: 90 },
  { stage: "impact", points: 80 }
];

const MODIFIERS: Array<{ label: string; points: number }> = [
  { label: "Human cadence", points: 10 },
  { label: "Two or more decoys", points: 10 },
  { label: "Crown-jewel access", points: 10 },
  { label: "Real asset touched", points: 25 },
  { label: "Honeytoken use", points: 30 },
  { label: "Return visit", points: 5 },
  { label: "Wordlist-only", points: -15 },
  { label: "Machine cadence", points: -10 },
  { label: "Drive-by", points: -10 }
];

const THRESHOLDS: Array<{ range: string; severity: string; color: string }> = [
  { range: "≥ 85", severity: "critical", color: "text-rose-600" },
  { range: "60 – 84", severity: "high", color: "text-orange-600" },
  { range: "30 – 59", severity: "medium", color: "text-amber-600" },
  { range: "< 30", severity: "low", color: "text-emerald-600" }
];

const SAFETY_GUARANTEES: string[] = [
  "Decoy services run only on the internal attacker_net network — no routable exposure.",
  "All compose networks are marked internal with no internet egress.",
  "Honeypot containers run with cap_drop ALL, no-new-privileges and memory/PID limits.",
  "Attacker-supplied commands and files are never executed.",
  "All telemetry and credentials are synthetic; bait domains use the reserved .example TLD."
];

export default function Settings() {
  const { connected } = useLive();

  return (
    <div className="page-content space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Platform</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Platform Settings</h1>
          <p className="text-sm text-mute mt-1">Read-only reference for MIRAGE safety guarantees, scoring model and network isolation.</p>
        </div>
        <div className="bg-panel-card border border-line rounded-lg px-4 py-2 flex items-center gap-2">
          <Sliders size={14} className="text-mute" />
          <span className="text-[10px] font-bold text-mute uppercase tracking-widest">Read-Only Mode</span>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-line">
            <h2 className="text-[10px] font-bold text-mute uppercase tracking-widest">Safety Guarantees</h2>
            <ShieldCheck size={18} className="text-low" />
          </div>
          <ul className="space-y-4">
            {SAFETY_GUARANTEES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[12px] text-mute group">
                <div className="mt-1 p-0.5 bg-low/10 rounded-full">
                  <Check size={12} className="text-low" />
                </div>
                <span className="group-hover:text-ink transition-colors leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-line">
            <h2 className="text-[10px] font-bold text-mute uppercase tracking-widest">Scoring Engine Policy</h2>
            <Cpu size={18} className="text-accent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[10px] font-bold text-ink uppercase tracking-widest mb-3 opacity-70">Stage Base Points</h4>
              <div className="space-y-2">
                {STAGE_BASE_POINTS.map((row) => (
                  <div key={row.stage} className="flex items-center justify-between text-[11px] py-1 border-b border-line/50">
                    <span className="mono uppercase text-mute">{row.stage.replace('_', ' ')}</span>
                    <span className="mono font-bold text-ink">{row.points}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-bold text-ink uppercase tracking-widest mb-3 opacity-70">Score Modifiers</h4>
                <div className="space-y-2">
                  {MODIFIERS.slice(0, 5).map((mod) => (
                    <div key={mod.label} className="flex items-center justify-between text-[11px]">
                      <span className="text-mute">{mod.label}</span>
                      <span className={`mono font-bold ${mod.points >= 0 ? "text-high" : "text-low"}`}>
                        {mod.points >= 0 ? `+${mod.points}` : mod.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-crit/5 border border-crit/20 rounded-lg text-[10px] leading-relaxed text-crit">
                <span className="font-bold uppercase block mb-1">Global Override</span>
                Honeytoken use OR real-asset touch forces CRITICAL severity regardless of base score.
              </div>
            </div>
          </div>
        </section>

        <section className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-line">
            <h2 className="text-[10px] font-bold text-mute uppercase tracking-widest">Network Topology</h2>
            <Network size={18} className="text-mute" />
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-panel border border-line rounded-lg">
                <div className="text-[11px] font-bold text-ink mono mb-1">attacker_net</div>
                <div className="text-[10px] text-mute uppercase tracking-tighter">Deception Fabric</div>
              </div>
              <div className="p-3 bg-panel border border-line rounded-lg">
                <div className="text-[11px] font-bold text-ink mono mb-1">prod_net</div>
                <div className="text-[10px] text-mute uppercase tracking-tighter">Production Core</div>
              </div>
              <div className="p-3 bg-panel border border-line rounded-lg">
                <div className="text-[11px] font-bold text-ink mono mb-1">mgmt_net</div>
                <div className="text-[10px] text-mute uppercase tracking-tighter">Control Plane</div>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-mute">
              The simulator is strictly isolated from <code className="text-ink bg-panel px-1 rounded">mgmt_net</code>. 
              Communication is unidirectional via a shared file volume <code className="text-ink bg-panel px-1 rounded">sim_cmd</code>, 
              preventing control path traversal into the deception network.
            </p>
          </div>
        </section>

        <section className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-line">
            <h2 className="text-[10px] font-bold text-mute uppercase tracking-widest">Runtime Intelligence</h2>
            <Cpu size={18} className="text-mute" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-mute uppercase tracking-widest mb-1">Platform</div>
                <div className="text-sm font-bold text-ink">MIRAGE v2.0</div>
              </div>
              <div>
                <div className="text-[10px] text-mute uppercase tracking-widest mb-1">Infrastructure</div>
                <div className="text-sm font-bold text-ink">FastAPI · PostgreSQL</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-mute uppercase tracking-widest mb-1">Telemetry Status</div>
                <div className={`flex items-center gap-2 text-sm font-bold ${connected ? "text-low" : "text-crit"}`}>
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-low shadow-[0_0_8px_rgba(61,214,168,0.5)]" : "bg-crit"}`} />
                  {connected ? "ACTIVE" : "DISCONNECTED"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-mute uppercase tracking-widest mb-1">System Load</div>
                <div className="text-sm font-bold text-ink">OPTIMAL</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
