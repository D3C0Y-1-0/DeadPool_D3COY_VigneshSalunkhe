import React from "react";
import { NormalizedEvent } from "../types";
import { Terminal, Shield } from "lucide-react";

interface Props {
  events: NormalizedEvent[];
}

export default function LiveFeed({ events }: Props) {
  return (
    <div className="bg-[#111827] border border-[#1f2a3d] rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[#1f2a3d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#4da3ff]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#e6edf7]">
            Live Event Feed
          </h2>
          <span className="text-xs bg-[#1f2a3d] text-[#8a97ad] px-2 py-0.5 rounded-full mono">
            {events.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-[#8a97ad]">
            <span className="w-2 h-2 rounded-full bg-[#ff3b5c]" /> Production Zone
          </span>
          <span className="flex items-center gap-1 text-[#8a97ad]">
            <span className="w-2 h-2 rounded-full bg-[#4da3ff]" /> Deception Zone
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1f2a3d]/40 mono text-xs">
        {events.length === 0 ? (
          <div className="p-8 text-center text-[#8a97ad]">
            <p>Waiting for first touch on deception sensors...</p>
            <p className="text-[11px] text-[#8a97ad]/70 mt-1">
              Decoys are listening silently on 172.28.0.0/24
            </p>
          </div>
        ) : (
          events.slice(0, 150).map((ev) => {
            const isProd = ev.zone === "production";
            const timeStr = ev.ts.slice(11, 19);

            let actionSummary = "";
            if (ev.action === "command") {
              actionSummary = `$ ${ev.cmd}`;
            } else if (ev.action === "auth") {
              actionSummary = `${ev.outcome.toUpperCase()} auth: ${ev.user || "unknown"}:${ev.password ? "***" : ""}`;
            } else if (ev.action === "download") {
              actionSummary = `DOWNLOAD ${ev.file?.name || "file"} [${ev.honeytoken_id || "lure"}]`;
            } else if (ev.action === "scan") {
              actionSummary = `PORT SCAN ${ev.flags?.join(" ") || ""}`;
            } else if (ev.action === "firewall") {
              actionSummary = `FW ${ev.outcome.toUpperCase()} :${ev.dst_port || 80}`;
            } else {
              actionSummary = `${ev.action.toUpperCase()} ${ev.dst_service}`;
            }

            return (
              <div
                key={ev.id}
                className={`p-2.5 flex items-start gap-3 hover:bg-[#162032] transition-colors ${
                  isProd
                    ? "border-l-4 border-l-[#ff3b5c] bg-[#ff3b5c]/5"
                    : "border-l-2 border-l-[#4da3ff]/40"
                }`}
              >
                <span className="text-[#8a97ad] flex-shrink-0">{timeStr}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold flex-shrink-0 ${
                    isProd
                      ? "bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/40"
                      : "bg-[#4da3ff]/15 text-[#4da3ff] border border-[#4da3ff]/30"
                  }`}
                >
                  {ev.sensor}
                </span>
                <span className="text-[#e6edf7] font-medium flex-shrink-0">
                  {ev.src_ip}
                </span>
                <span className="text-[#8a97ad] flex-1 truncate text-slate-300">
                  {actionSummary}
                </span>
                {ev.techniques && ev.techniques.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {ev.techniques.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-[#1f2a3d] text-[#4da3ff] px-1.5 py-0.2 rounded border border-[#4da3ff]/30"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
