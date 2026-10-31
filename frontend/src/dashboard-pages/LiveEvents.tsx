"use client";

import { useMemo, useState } from "react";
import { useLive } from "../useLive";
import { NormalizedEvent } from "../types";
import { Search, Filter, Clock, Globe, ShieldAlert, Activity, User, Info } from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";

function getDetails(event: NormalizedEvent): string {
  if (event.action === "auth") {
    return `${event.outcome === "success" ? "Successful" : "Failed"} login for user "${event.user || "unknown"}" with password "${event.password || "********"}"`;
  }
  if (event.action === "command") {
    return `Executed command: ${event.cmd}`;
  }
  if (event.action === "web_request") {
    return `${event.raw?.method || "GET"} ${event.raw?.path || "/"}`;
  }
  if (event.action === "scan") {
    return `Port scan detected on port ${event.dst_port}`;
  }
  return event.category || event.action;
}

function getRisk(event: NormalizedEvent): "critical" | "high" | "medium" | "low" {
  if (event.zone === "production") return "critical";
  if (event.honeytoken_id) return "critical";
  if (event.action === "auth" && event.outcome === "success") return "high";
  if (event.action === "command") return "high";
  if (event.action === "scan") return "medium";
  return "low";
}

export default function LiveEvents() {
  const { events, loading, error } = useLive();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All Types");

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.src_ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.user && e.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.cmd && e.cmd.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === "All Types" || e.action === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [events, searchTerm, filterType]);

  const eventTypes = ["All Types", "Auth", "Command", "Scan", "Web_Request", "Firewall"];

  return (
    <div className="page-content space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Intelligence</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Live Events</h1>
          <p className="text-sm text-mute mt-1">Real-time stream of honeypot and production security activities.</p>
        </div>
        <div className="bg-panel-card border border-line rounded-lg px-4 py-2 flex items-center gap-6">
          <div>
            <div className="text-[10px] text-mute uppercase tracking-widest mb-0.5">Events / Min</div>
            <div className="text-lg font-bold text-low flex items-center gap-2">
              <Activity size={14} />
              {Math.round(events.length / 5) || 0}
            </div>
          </div>
          <div className="w-px h-8 bg-line" />
          <div>
            <div className="text-[10px] text-mute uppercase tracking-widest mb-0.5">Total Captured</div>
            <div className="text-lg font-bold text-ink">{events.length}</div>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-panel/30 p-4 rounded-xl border border-line">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={16} />
          <input
            type="text"
            placeholder="Search by IP, user, or command..."
            className="w-full bg-panel-card border border-line rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterType === type
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "bg-panel-card border border-line text-mute hover:border-accent/30"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-panel-card border border-line rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-panel/50 border-b border-line">
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Source IP</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Username</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-mute uppercase tracking-widest">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs text-mute group-hover:text-ink">
                      <Clock size={12} className="text-accent/50" />
                      {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        event.action === 'auth' ? 'bg-amber-500/10 text-amber-500' :
                        event.action === 'command' ? 'bg-crit/10 text-crit' :
                        'bg-accent/10 text-accent'
                      }`}>
                        {event.action === 'auth' ? <User size={14} /> : 
                         event.action === 'command' ? <ShieldAlert size={14} /> : 
                         <Info size={14} />}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-ink">{event.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="text-mute" />
                      <span className="text-xs font-mono font-medium text-ink">{event.src_ip}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs ${event.user ? "text-ink font-medium" : "text-mute italic"}`}>
                      {event.user || "none"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-mute line-clamp-1 max-w-md group-hover:text-ink transition-colors">
                      {getDetails(event)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SeverityBadge severity={getRisk(event)} />
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-mute italic">
                    {loading ? "Streaming live telemetry..." : "No events match your current filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
