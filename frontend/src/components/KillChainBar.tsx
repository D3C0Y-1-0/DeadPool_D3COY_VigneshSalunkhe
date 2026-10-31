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
    <div className="w-full bg-[#111827] border border-[#1f2a3d] rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-[#8a97ad] mb-2 px-1">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-[#4da3ff]">
          Adversary Kill Chain Progression
        </span>
        <span>
          Current Stage: <b className="text-[#e6edf7] uppercase font-mono">{stage ? stage.replace("_", " ") : "RECON"}</b>
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STAGES.map(([k, label], i) => {
          const isPassed = currentIndex !== -1 && i < currentIndex;
          const isCurrent = currentIndex !== -1 && i === currentIndex;
          const isPending = currentIndex === -1 || i > currentIndex;

          let blockStyle = "border-[#1f2a3d] text-[#8a97ad] bg-[#0a0e17]/50";
          if (isCurrent) {
            blockStyle = "bg-[#ff3b5c]/20 border-[#ff3b5c] text-[#ff3b5c] font-bold ring-1 ring-[#ff3b5c]/50";
          } else if (isPassed) {
            blockStyle = "bg-[#ff8a3d]/15 border-[#ff8a3d]/50 text-[#ff8a3d] font-medium";
          }

          return (
            <div
              key={k}
              className={`flex-1 min-w-[100px] rounded px-2 py-2 text-center text-xs border transition-all duration-300 ${blockStyle}`}
            >
              <div className="text-[10px] opacity-70 mb-0.5 mono">0{i + 1}</div>
              <div className="truncate">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
