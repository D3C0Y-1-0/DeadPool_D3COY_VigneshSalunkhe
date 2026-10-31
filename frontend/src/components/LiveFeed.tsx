import React from "react";
import { NormalizedEvent } from "../types";
import { Terminal, Shield } from "lucide-react";

interface Props {
  events: NormalizedEvent[];
}

export default function LiveFeed({ events }: Props) {
  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="card-title pb-2 mb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h2 className="section-title tracking-wide uppercase text-slate-900">
            Live Event Feed
          </h2>
          <span className="status-badge badge-info mono">
            {events.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Production Zone
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Deception Zone
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mono text-xs">
        {events.length === 0 ? (
          <div className="empty-state">
            <div>
              <p>Waiting for first touch on deception sensors...</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Decoys are listening silently on 172.28.0.0/24
              </p>
            </div>
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
                className={`p-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                  isProd
                    ? "border-l-4 border-l-red-500 bg-red-50/40"
                    : "border-l-2 border-l-slate-300"
                }`}
              >
                <span className="text-slate-400 flex-shrink-0">{timeStr}</span>
                <span
                  className={`status-badge flex-shrink-0 ${
                    isProd ? "badge-danger" : "badge-info"
                  }`}
                >
                  {ev.sensor}
                </span>
                <span className="text-slate-900 font-medium flex-shrink-0">
                  {ev.src_ip}
                </span>
                <span className="text-slate-500 flex-1 truncate">
                  {actionSummary}
                </span>
                {ev.techniques && ev.techniques.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {ev.techniques.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
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
