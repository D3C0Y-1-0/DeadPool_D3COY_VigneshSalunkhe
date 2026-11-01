"use client";

import React, { useState } from "react";
import { Radio, Shield, Server, Zap, Crosshair } from "lucide-react";

interface DecoyHub {
  id: string;
  name: string;
  port: string;
  protocol: string;
  status: "active" | "alert" | "monitoring";
  probes: number;
  lastTouch: string;
  x: number; // percentage in radar
  y: number; // percentage in radar
  color: string;
}

const DECOY_HUBS: DecoyHub[] = [
  {
    id: "cowrie",
    name: "db-prod-02",
    port: "2222",
    protocol: "SSH Decoy",
    status: "alert",
    probes: 14820,
    lastTouch: "203.0.113.50",
    x: 32,
    y: 28,
    color: "#ef4444",
  },
  {
    id: "portal",
    name: "customer-portal",
    port: "8080",
    protocol: "Web App Honeypot",
    status: "alert",
    probes: 3410,
    lastTouch: "198.51.100.14",
    x: 68,
    y: 35,
    color: "#f97316",
  },
  {
    id: "mysql",
    name: "fileserv-01",
    port: "3306",
    protocol: "OpenCanary MySQL",
    status: "monitoring",
    probes: 5120,
    lastTouch: "198.51.100.18",
    x: 24,
    y: 65,
    color: "#3b82f6",
  },
  {
    id: "ftp",
    name: "fileserv-01",
    port: "21",
    protocol: "OpenCanary FTP",
    status: "monitoring",
    probes: 1980,
    lastTouch: "198.51.100.20",
    x: 75,
    y: 68,
    color: "#10b981",
  },
  {
    id: "tripwire",
    name: "tripwire-grid",
    port: "445 / 3389",
    protocol: "Silent TCP Listeners",
    status: "monitoring",
    probes: 74,
    lastTouch: "198.51.100.7",
    x: 50,
    y: 78,
    color: "#8b5cf6",
  },
  {
    id: "prod",
    name: "prod-web-01",
    port: "22 / 80",
    protocol: "Real Asset Shielded",
    status: "alert",
    probes: 8,
    lastTouch: "203.0.113.50 (Pivot)",
    x: 50,
    y: 50,
    color: "#dc2626",
  },
];

export default function LiveRadarScan() {
  const [activeHub, setActiveHub] = useState<DecoyHub | null>(null);

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-emerald-500 animate-pulse" />
          <h2 className="font-display text-sm font-bold text-black tracking-tight">
            Live Honeynet Radar & Trap Mesh
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="rounded bg-black text-white px-2 py-0.5 font-bold uppercase tracking-wider">
            6 Deception Nodes
          </span>
          <span className="text-emerald-600 font-bold">100% Armed</span>
        </div>
      </div>

      {/* Radar Viewport */}
      <div className="relative mt-3 h-[250px] w-full overflow-hidden rounded-xl bg-[#03060f] border border-[#1b2a47] flex items-center justify-center">
        {/* Animated Radar Sweep */}
        <div
          className="absolute inset-0 origin-center pointer-events-none"
          style={{
            animation: "spin 6s linear infinite",
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(16, 185, 129, 0.28) 0deg, rgba(16, 185, 129, 0.05) 50deg, transparent 70deg)",
          }}
        />

        {/* Radar Concentric Circles */}
        <div className="absolute h-[85%] w-[85%] rounded-full border border-emerald-500/20" />
        <div className="absolute h-[65%] w-[65%] rounded-full border border-emerald-500/25" />
        <div className="absolute h-[45%] w-[45%] rounded-full border border-emerald-500/30" />
        <div className="absolute h-[25%] w-[25%] rounded-full border border-emerald-500/35" />

        {/* Crosshair Axes */}
        <div className="absolute h-full w-[1px] bg-emerald-500/20" />
        <div className="absolute w-full h-[1px] bg-emerald-500/20" />

        {/* Decoy Hub Blips */}
        {DECOY_HUBS.map((hub) => (
          <div
            key={hub.id}
            onClick={() => setActiveHub(hub)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
            style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
          >
            {/* Blip Ping */}
            <span
              className="absolute -inset-1.5 rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: hub.color }}
            />
            {/* Blip Dot */}
            <span
              className="relative block h-3 w-3 rounded-full border border-white shadow-md transition-transform group-hover:scale-150"
              style={{ backgroundColor: hub.color }}
            />
            {/* Blip Label */}
            <span className="absolute top-3.5 left-1/2 -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white whitespace-nowrap border border-white/20">
              {hub.name}:{hub.port}
            </span>
          </div>
        ))}

        {/* Selected Hub Card */}
        {activeHub && (
          <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/20 bg-black/90 p-2.5 text-xs text-white backdrop-blur z-20 flex items-center justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{activeHub.name}</span>
                <span className="font-mono text-[10px] text-sky-400">Port {activeHub.port} ({activeHub.protocol})</span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Probes: <strong className="text-white">{activeHub.probes.toLocaleString()}</strong> · Last IP: <span className="font-mono text-amber-300">{activeHub.lastTouch}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveHub(null)}
              className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-neutral-300 hover:text-white"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Radar Bottom Ticker */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-[#404040]">
          <Crosshair size={13} className="text-red-500" />
          <span>Active Honeynet Traps: <strong>5 Emulated</strong> + <strong>1 Prod Shield</strong></span>
        </span>
        <span className="font-mono text-[10px] text-neutral-500">SWEEP: 2.4 GHz</span>
      </div>
    </div>
  );
}
