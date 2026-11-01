"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, Clock, Cpu, UserCheck } from "lucide-react";

const CADENCE_DATA = [
  { delay: "<50ms", botnet: 14200, human: 0, label: "Mirai Botnet Bursts" },
  { delay: "50-100ms", botnet: 8600, human: 2, label: "Automated Scripts" },
  { delay: "100-500ms", botnet: 1200, human: 14, label: "Rapid Scanners" },
  { delay: "0.5-2.0s", botnet: 120, human: 68, label: "Semi-Automated" },
  { delay: "2.0-5.0s", botnet: 10, human: 210, label: "Deliberate Keystrokes (Targeted)" },
  { delay: ">5.0s", botnet: 4, human: 145, label: "Manual Analysis (Targeted)" },
];

export default function AdversaryCadenceChart() {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div>
          <h2 className="font-display text-sm font-bold text-black tracking-tight">
            Adversary Cadence & Behavioral Timing
          </h2>
          <p className="text-[11px] text-[#737373]">
            Separating automated botnet radiation from human hands-on-keyboard APTs
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-neutral-500">
            <span className="h-2 w-2 rounded-sm bg-neutral-400" />
            Botnet Noise (-10 pts)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            Human Hands (+10 pts)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={CADENCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="delay" tick={{ fontSize: 10, fill: "#737373" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#737373" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#000",
                color: "#fff",
                borderRadius: 8,
                fontSize: "11px",
                border: "none",
                padding: "8px 12px",
              }}
              formatter={(val: any, name: any) => [
                val.toLocaleString(),
                name === "human" ? "Human Commands (Targeted)" : "Botnet Probes (Noise)",
              ]}
            />
            <Bar dataKey="botnet" fill="#a3a3a3" radius={[4, 4, 0, 0]} name="botnet" />
            <Bar dataKey="human" fill="#10b981" radius={[4, 4, 0, 0]} name="human" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cadence Summary Footer */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
            <Cpu size={14} />
          </div>
          <div>
            <span className="font-bold text-black block">Machine Cadence (&lt;100ms)</span>
            <span className="text-[11px] text-[#737373]">
              99.9% of attacks suppressed as background scanning
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-200">
            <UserCheck size={14} />
          </div>
          <div>
            <span className="font-bold text-emerald-700 block">Human Cadence (2.5 - 5.0s)</span>
            <span className="text-[11px] text-[#737373]">
              Median keystroke pause triggered Targeted verdict
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
