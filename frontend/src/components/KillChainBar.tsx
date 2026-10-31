import React from "react";

const STAGES = [
  ["recon", "Recon"],
  ["initial_access", "Initial Access"],
  ["execution", "Execution"],
  ["discovery", "Discovery"],
  ["collection", "Collection"],
  ["exfiltration", "Exfiltration"],
  ["lateral_movement", "Lateral Movement"]
];

const GROUP: Record<string, string> = {
  credential_attack: "initial_access",
  persistence: "execution",
  impact: "exfiltration"
};

export default function KillChainBar({ stage }: { stage: string }) {
  const normStage = GROUP[stage] || stage;
  const currentIndex = STAGES.findIndex(([k]) => k === normStage);

  return (
    <div className="bg-panel-card border border-line rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between text-xs mb-3 px-1">
        <span className="font-bold uppercase tracking-widest text-[10px] text-mute">
          Adversary Kill Chain Progression
        </span>
        <span className="text-mute text-[10px] uppercase">
          Current Stage: <b className="text-ink font-mono ml-1">{stage ? stage.replace("_", " ") : "RECON"}</b>
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {STAGES.map(([k, label], i) => {
          const isPassed = currentIndex !== -1 && i < currentIndex;
          const isCurrent = currentIndex !== -1 && i === currentIndex;

          let blockStyle = "border-line text-mute bg-panel/30";
          if (isCurrent) {
            blockStyle = "bg-crit/10 border-crit/40 text-crit font-bold shadow-[0_0_15px_rgba(255,59,92,0.1)]";
          } else if (isPassed) {
            blockStyle = "bg-high/10 border-high/40 text-high font-medium";
          }

          return (
            <div
              key={k}
              className={`flex-1 min-w-[120px] rounded-lg px-3 py-3 text-center border transition-all duration-500 ${blockStyle}`}
            >
              <div className="text-[9px] opacity-60 mb-1 mono tracking-tighter">PHASE 0{i + 1}</div>
              <div className="text-[11px] uppercase tracking-wider truncate">{label}</div>
              {isCurrent && (
                <div className="mt-2 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-crit animate-ping" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
