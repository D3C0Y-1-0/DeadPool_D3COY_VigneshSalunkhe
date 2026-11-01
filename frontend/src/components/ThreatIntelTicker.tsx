"use client";

import Link from "next/link";
import { ArrowRight, Radio, ShieldAlert } from "lucide-react";
import { useLive } from "../useLive";

export default function ThreatIntelTicker() {
  const { events, incidents, stats } = useLive();
  const criticalCount = stats.critical_open || 3;

  const tickerItems = [
    { type: "New IOC", text: "Malicious IP 203.0.113.50 observed in attacks", color: "#ef4444" },
    { type: "Malware Campaign", text: '"Luminous Manticore" targeting financial decoy sector', color: "#38bdf8" },
    { type: "Critical Vulnerability", text: "CVE-2024-3094 Backdoor XZ probe detected on db-prod-02", color: "#f97316" },
    { type: "Honeytoken Hit", text: "Canary token HT-CUST-001 exfiltrated by 203.0.113.50", color: "#ef4444" },
    { type: "Firewall Action", text: "Perimeter blocklist synchronized with 2 malicious CIDRs", color: "#10b981" },
    { type: "Decoy Fleet", text: "Cowrie SSH, Web Portal, OpenCanary armed and logging", color: "#8b5cf6" },
  ];

  // Also include recent live events if available
  const liveItems = events.slice(0, 4).map((e) => ({
    type: e.zone === "production" ? "PROD ALERT" : "DECOY TOUCH",
    text: `${e.src_ip} -> ${e.sensor} (${e.action})`,
    color: e.zone === "production" ? "#ef4444" : "#10b981",
  }));

  const combined = [...tickerItems, ...liveItems];

  return (
    <div className="h-9 bg-black border-t border-white/10 flex items-center overflow-hidden shrink-0 sticky bottom-0 z-30 px-3 select-none">
      {/* Feed Label + Badge */}
      <div className="flex items-center gap-2 pr-4 border-r border-white/10 shrink-0">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white tracking-wide">
          <Radio size={12} className="text-red-500 animate-pulse" />
          Threat Intelligence Feed
        </span>
        <span className="flex h-4 min-w-[16px] items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
          {criticalCount}
        </span>
      </div>

      {/* Marquee ticker */}
      <div className="flex-1 overflow-hidden px-4">
        <div className="ticker-track">
          {[...combined, ...combined].map((item, idx) => (
            <span key={idx} className="ticker-item flex items-center gap-2 text-xs">
              <span
                className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${item.color}20`,
                  color: item.color,
                  border: `1px solid ${item.color}40`,
                }}
              >
                {item.type}
              </span>
              <span className="text-neutral-300 font-mono text-[11px]">{item.text}</span>
              <span className="text-neutral-600 px-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* View all link */}
      <Link
        href="/dashboard/attack-matrix"
        className="flex items-center gap-1 pl-4 border-l border-white/10 text-xs font-medium text-neutral-400 hover:text-white shrink-0 transition-colors"
      >
        View all <ArrowRight size={12} />
      </Link>
    </div>
  );
}
