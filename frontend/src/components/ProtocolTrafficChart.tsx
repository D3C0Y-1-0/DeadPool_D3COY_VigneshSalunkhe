"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Server, Shield } from "lucide-react";
import { NormalizedEvent } from "../types";

interface Props {
  events: NormalizedEvent[];
}

export default function ProtocolTrafficChart({ events }: Props) {
  // Aggregate real events or supply calibrated 24h timeline
  const timelineData = [
    { time: "00:00", ssh: 420, web: 110, mysql: 80, prod: 0 },
    { time: "02:00", ssh: 510, web: 140, mysql: 95, prod: 0 },
    { time: "04:00", ssh: 380, web: 90, mysql: 60, prod: 0 },
    { time: "06:00", ssh: 610, web: 180, mysql: 120, prod: 0 },
    { time: "08:00", ssh: 890, web: 240, mysql: 160, prod: 0 },
    { time: "10:00", ssh: 1120, web: 380, mysql: 210, prod: 1 },
    { time: "12:00", ssh: 940, web: 310, mysql: 190, prod: 0 },
    { time: "14:00", ssh: 1450, web: 520, mysql: 280, prod: 4 }, // Targeted pivot event!
    { time: "16:00", ssh: 1210, web: 410, mysql: 230, prod: 2 },
    { time: "18:00", ssh: 980, web: 290, mysql: 170, prod: 0 },
    { time: "20:00", ssh: 750, web: 220, mysql: 140, prod: 0 },
    { time: "22:00", ssh: 620, web: 180, mysql: 110, prod: 0 },
  ];

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div>
          <h2 className="font-display text-sm font-bold text-black tracking-tight">
            Decoy Grid Traffic & Pivot Trajectory
          </h2>
          <p className="text-[11px] text-[#737373]">
            Comparing high-interaction honeypots vs protected production perimeter
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[#525252]">
            <span className="h-2 w-2 rounded-sm bg-purple-500" />
            SSH (db-prod-02)
          </span>
          <span className="flex items-center gap-1.5 text-[#525252]">
            <span className="h-2 w-2 rounded-sm bg-sky-500" />
            Web Portal
          </span>
          <span className="flex items-center gap-1.5 text-[#525252]">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            MySQL/FTP
          </span>
          <span className="flex items-center gap-1.5 text-red-600 font-bold">
            <span className="h-2 w-2 rounded-sm bg-red-600" />
            Prod Shield (Pivot)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sshGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="webGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#737373" }} axisLine={false} tickLine={false} />
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
            />
            <Area type="monotone" dataKey="ssh" stroke="#a855f7" strokeWidth={2} fill="url(#sshGrad)" name="Cowrie SSH" />
            <Area type="monotone" dataKey="web" stroke="#0ea5e9" strokeWidth={2} fill="url(#webGrad)" name="Web Portal" />
            <Area type="monotone" dataKey="prod" stroke="#ef4444" strokeWidth={2.5} fill="url(#prodGrad)" name="Prod Pivot Contact" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory Note */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#737373]">
        <span className="flex items-center gap-1.5 font-medium text-black">
          <Shield size={13} className="text-red-500" />
          <span>Production Pivot Detection: <strong>14:00 - 16:00 Spike Correlated with INC-203.0.113.50</strong></span>
        </span>
        <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          EDGE FIREWALL BLOCKED
        </span>
      </div>
    </div>
  );
}
