"use client";

import { useMemo } from "react";
import { useLive } from "../useLive";
import { Activity, Radio } from "lucide-react";

const KNOWN_DECOY_SENSORS = ["db-prod-02", "portal.internal", "sql-prod-01", "files-prod", "mgmt-lure"];

const LIVE_WINDOW_MS = 120_000;

interface SensorAgg {
  sensor: string;
  zones: Set<string>;
  count: number;
  actions: Set<string>;
  lastTs: string | null;
}

function formatTs(ts: string | null): string {
  if (!ts) return "—";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleTimeString();
}

export default function Sensors() {
  const { events, error } = useLive();

  const sensors = useMemo<SensorAgg[]>(() => {
    const map = new Map<string, SensorAgg>();

    const ensure = (name: string): SensorAgg => {
      let agg = map.get(name);
      if (!agg) {
        agg = { sensor: name, zones: new Set<string>(), count: 0, actions: new Set<string>(), lastTs: null };
        map.set(name, agg);
      }
      return agg;
    };

    KNOWN_DECOY_SENSORS.forEach(ensure);

    events.forEach((event) => {
      const agg = ensure(event.sensor || "unknown");
      agg.count += 1;
      if (event.zone) agg.zones.add(event.zone);
      if (event.action) agg.actions.add(event.action);
      if (!agg.lastTs || new Date(event.ts).getTime() > new Date(agg.lastTs).getTime()) {
        agg.lastTs = event.ts;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.sensor.localeCompare(b.sensor);
    });
  }, [events]);

  const totalEvents = useMemo(() => sensors.reduce((acc, sensor) => acc + sensor.count, 0), [sensors]);
  const now = Date.now();
  const isLive = (sensor: SensorAgg): boolean =>
    sensor.lastTs !== null && now - new Date(sensor.lastTs).getTime() <= LIVE_WINDOW_MS;
  const activeSensors = sensors.filter(isLive).length;

  return (
    <div className="page-content">
      {error && (
        <div role="alert" className="notice notice-danger">
          Sensor telemetry unavailable: {error}
        </div>
      )}

      <section className="page-heading">
        <div>
          <div className="eyebrow">DECOYS</div>
          <h1>Decoy Sensor Fleet</h1>
          <p>Live health and activity for every honeypot sensor across the deception network.</p>
        </div>
        <div className="filter-row text-[11px]">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            Sensors: <b className="text-slate-900">{sensors.length}</b>
          </span>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            Active: <b className="text-emerald-600">{activeSensors}</b>
          </span>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            Events: <b className="text-amber-600">{totalEvents}</b>
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.map((sensor) => {
          const live = isLive(sensor);
          const zone = sensor.zones.has("production")
            ? "production"
            : sensor.zones.has("deception")
              ? "deception"
              : "deception";
          const actionTypes = Array.from(sensor.actions);

          return (
            <div key={sensor.sensor} className="panel panel-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Radio className={`h-4 w-4 flex-shrink-0 ${live ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="mono truncate text-sm font-semibold text-slate-900">{sensor.sensor}</span>
                </div>
                <span className={`status-badge flex-shrink-0 ${live ? "badge-normal" : "badge-warning"}`}>
                  {live ? "Live" : "Quiet"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`status-badge ${zone === "production" ? "badge-warning" : "badge-info"}`}>
                  {zone}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Events</div>
                  <div className="mono text-base font-bold text-slate-900">{sensor.count}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Last Seen</div>
                  <div className="mono text-slate-900">{formatTs(sensor.lastTs)}</div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Activity className="h-3 w-3" />
                  <span>
                    Distinct actions: <b className="mono text-slate-900">{actionTypes.length}</b>
                  </span>
                </div>
                {actionTypes.length === 0 ? (
                  <span className="text-[10px] italic text-slate-400">No activity observed</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {actionTypes.map((action) => (
                      <span
                        key={action}
                        className="mono rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
