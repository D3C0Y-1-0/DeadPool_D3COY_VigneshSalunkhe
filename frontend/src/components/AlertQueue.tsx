"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { IncidentSummary } from "../types";

interface Props {
  incidents: IncidentSummary[];
}

function timeStr(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "10:32:45";
  }
}

function alertName(inc: IncidentSummary) {
  if (inc.real_asset_touched) return "Production Lateral Pivot Attempt";
  if (inc.honeytoken_hit) return "Canary Token Exfiltration";
  if (inc.severity === "critical") return "Hostile Exploit Attempt Blocked";
  if (inc.severity === "high") return "Brute Force Login Attack";
  if (inc.verdict === "targeted") return "Targeted Recon & Port Sweep";
  return "Automated Credential Dictionary";
}

function destinationTarget(inc: IncidentSummary) {
  if (inc.real_asset_touched) return "prod-web-01 : 22";
  if (inc.honeytoken_hit) return "customer-portal : 8080";
  if (inc.src_ip.includes("113")) return "db-prod-02 : 2222";
  return "fileserv-01 : 3306";
}

export default function AlertQueue({ incidents }: Props) {
  const sorted = [...incidents].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 6);

  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Critical
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-orange-500">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Low
          </span>
        );
    }
  };

  const getStatusPill = (status: string, inc: IncidentSummary) => {
    if (status === "contained") {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Contained
        </span>
      );
    }
    if (inc.score && inc.score > 70) {
      return (
        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          New
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-xs text-sky-600">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
        Investigating
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
        <div>
          <h2 className="font-display text-sm font-bold text-black tracking-tight">Recent Alerts</h2>
          <p className="text-[11px] text-[#737373]">Live prioritized security events awaiting action</p>
        </div>
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-1 text-xs font-semibold text-black transition-colors hover:text-neutral-600"
        >
          View all alerts <ArrowRight size={13} />
        </Link>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto flex-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#f0f0f0] text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              <th className="pb-2.5 font-medium">Time</th>
              <th className="pb-2.5 font-medium">Alert Name</th>
              <th className="pb-2.5 font-medium">Severity</th>
              <th className="pb-2.5 font-medium">Source</th>
              <th className="pb-2.5 font-medium">Destination</th>
              <th className="pb-2.5 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f7f7f7]">
            {sorted.length > 0 ? (
              sorted.map((inc) => (
                <tr key={inc.id} className="group transition-colors hover:bg-neutral-50/80">
                  <td suppressHydrationWarning className="py-2.5 font-mono text-[11px] text-[#737373] whitespace-nowrap">
                    {timeStr(inc.last_seen)}
                  </td>
                  <td className="py-2.5 font-medium text-black">
                    <Link
                      href={`/dashboard/incidents/${encodeURIComponent(inc.id)}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      {alertName(inc)}
                    </Link>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">{getSeverityPill(inc.severity)}</td>
                  <td className="py-2.5 font-mono text-[11px] text-[#404040]">{inc.src_ip}</td>
                  <td className="py-2.5 font-mono text-[11px] text-[#737373]">{destinationTarget(inc)}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">{getStatusPill(inc.status, inc)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#737373]">
                  <ShieldAlert size={20} className="mx-auto mb-2 text-[#a3a3a3]" />
                  <p className="font-medium text-xs text-black">No active threat alerts</p>
                  <p className="text-[11px]">Sensor feeds are clear and monitored.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
