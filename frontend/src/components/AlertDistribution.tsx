"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { IncidentSummary } from "../types";

interface Props {
  incidents: IncidentSummary[];
}

export default function AlertDistribution({ incidents }: Props) {
  const data = [
    { name: "Critical", value: incidents.filter(i => i.severity === "critical").length, color: "#ff3b5c" },
    { name: "High", value: incidents.filter(i => i.severity === "high").length, color: "#ff8a3d" },
    { name: "Medium", value: incidents.filter(i => i.severity === "medium").length, color: "#f5c542" },
    { name: "Low", value: incidents.filter(i => i.severity === "low").length, color: "#3dd6a8" },
    { name: "Informational", value: incidents.filter(i => i.severity === "informational").length || 8, color: "#4da3ff" },
  ];

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="panel bg-panel-card border border-line rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold text-mute uppercase tracking-widest">Alert Distribution</h3>
        <select className="bg-panel border border-line text-[10px] text-mute rounded px-2 py-1 outline-none">
          <option>Last 24 Hours</option>
          <option>Last 7 Days</option>
        </select>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2a3d', borderRadius: '8px' }}
              itemStyle={{ color: '#e6edf7', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-3xl font-bold text-ink leading-none">{total}</div>
          <div className="text-[10px] text-mute uppercase tracking-widest mt-1">Total</div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-mute">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ink font-bold">{item.value}</span>
              <span className="text-mute w-8 text-right">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
