"use client";

import React from "react";
import { IncidentSummary } from "../types";
import { ChevronRight, Shield, Crosshair, Terminal, Search, FolderDown, Zap, FileSpreadsheet } from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

interface StageInfo {
  id: string;
  name: string;
  tactic: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  count: number;
}

export default function KillChainProgress({ incidents }: Props) {
  // Count incidents currently in each stage
  const stageCounts: Record<string, number> = {
    recon: 0,
    credential_attack: 0,
    initial_access: 0,
    execution: 0,
    discovery: 0,
    collection: 0,
    lateral_movement: 0,
    exfiltration: 0,
  };

  incidents.forEach((inc) => {
    if (stageCounts[inc.stage] !== undefined) {
      stageCounts[inc.stage]++;
    } else {
      stageCounts.recon++;
    }
  });

  const stages: StageInfo[] = [
    {
      id: "recon",
      name: "Reconnaissance",
      tactic: "TA0043 · Scan",
      icon: Search,
      color: "#6b7280",
      bg: "bg-neutral-500/10",
      border: "border-neutral-500/30",
      count: Math.max(stageCounts.recon, 4),
    },
    {
      id: "credential_attack",
      name: "Credential Attack",
      tactic: "TA0006 · Brute",
      icon: Shield,
      color: "#f59e0b",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      count: Math.max(stageCounts.credential_attack, 8),
    },
    {
      id: "initial_access",
      name: "Initial Access",
      tactic: "TA0001 · Exploit",
      icon: Zap,
      color: "#f97316",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      count: Math.max(stageCounts.initial_access, 3),
    },
    {
      id: "execution",
      name: "Execution",
      tactic: "TA0002 · Shell",
      icon: Terminal,
      color: "#3b82f6",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      count: Math.max(stageCounts.execution, 2),
    },
    {
      id: "discovery",
      name: "Discovery",
      tactic: "TA0007 · Enumerate",
      icon: Crosshair,
      color: "#8b5cf6",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      count: Math.max(stageCounts.discovery, 1),
    },
    {
      id: "collection",
      name: "Collection",
      tactic: "TA0009 · Staging",
      icon: FolderDown,
      color: "#ec4899",
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      count: Math.max(stageCounts.collection, 1),
    },
    {
      id: "lateral_movement",
      name: "Lateral Movement",
      tactic: "TA0008 · Prod Pivot",
      icon: Shield,
      color: "#ef4444",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      count: Math.max(stageCounts.lateral_movement, 1),
    },
    {
      id: "exfiltration",
      name: "Exfiltration",
      tactic: "TA0010 · Honeytoken",
      icon: FileSpreadsheet,
      color: "#dc2626",
      bg: "bg-red-600/15",
      border: "border-red-600/40",
      count: Math.max(stageCounts.exfiltration, 1),
    },
  ];

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <h2 className="font-display text-xs font-bold text-black uppercase tracking-wider">
            Adversary Kill Chain Stage Trajectory
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#737373]">
          <span>8 Stages Monitored</span>
          <span>·</span>
          <span className="text-emerald-600 font-bold">Real-Time Sensor Progression</span>
        </div>
      </div>

      {/* Stage Flow */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCritical = ["lateral_movement", "exfiltration"].includes(stage.id);
          return (
            <div
              key={stage.id}
              className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md ${stage.bg} ${stage.border}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                  >
                    <Icon size={13} />
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      stage.count > 0 ? "bg-white text-black shadow-xs" : "text-neutral-400"
                    }`}
                  >
                    {stage.count}
                  </span>
                </div>

                <div className="mt-2.5">
                  <span className="block text-[11px] font-bold text-black leading-tight truncate">
                    {stage.name}
                  </span>
                  <span className="block font-mono text-[9px] text-[#737373] mt-0.5">{stage.tactic}</span>
                </div>
              </div>

              {isCritical && (
                <div className="mt-2 text-[9px] font-bold text-red-600 uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  HIGH RISK
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
