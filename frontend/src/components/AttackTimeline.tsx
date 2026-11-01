"use client";

import { useMemo } from "react";
import { Clock, Radio } from "lucide-react";
import type { TimelineItem } from "../types";

interface Props {
  events: TimelineItem[];
  maxHeight?: number;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Time unavailable";
}

function formatElapsed(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `+${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `+${minutes}m ${remainder}s` : `+${minutes}m`;
}

function formatDuration(milliseconds: number) {
  return formatElapsed(milliseconds).slice(1);
}

export default function AttackTimeline({ events, maxHeight = 600 }: Props) {
  const sequence = useMemo(
    () => events
      .map((event, index) => ({ event, index, timestamp: new Date(event.ts).getTime() }))
      .filter(({ timestamp }) => Number.isFinite(timestamp))
      .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index),
    [events],
  );
  const duration = sequence.length > 1
    ? sequence[sequence.length - 1].timestamp - sequence[0].timestamp
    : 0;
  const productionCount = sequence.filter(({ event }) => event.zone === "production").length;
  const failureCount = sequence.filter(({ event }) => event.outcome === "failure" || event.outcome === "drop").length;

  return (
    <section className="card attack-timeline-card" aria-label="Attack timeline">
      <header className="attack-timeline-header">
        <div className="attack-timeline-heading">
          <span className="attack-timeline-icon"><Clock size={15} /></span>
          <div>
            <h2>Attack Timeline</h2>
            <p>Evidence in chronological order</p>
          </div>
        </div>
        <span className="attack-timeline-live"><span /> Recorded</span>
      </header>

      <div className="attack-timeline-summary">
        <div><strong>{sequence.length}</strong><span>events</span></div>
        <div><strong>{formatDuration(duration)}</strong><span>observed span</span></div>
        <div><strong>{productionCount}</strong><span>production events</span></div>
        <div><strong>{failureCount}</strong><span>failed / dropped</span></div>
      </div>

      <div className="attack-timeline-scroll" style={{ maxHeight }}>
        {sequence.length === 0 ? (
          <div className="empty-state attack-timeline-empty">
            <Radio size={20} />
            <p>No timestamped events were recorded for this incident.</p>
          </div>
        ) : (
          <ol className="attack-timeline-list">
            {sequence.map(({ event, timestamp }, index) => {
              const previous = sequence[index - 1];
              const elapsed = timestamp - sequence[0].timestamp;
              const gap = previous ? timestamp - previous.timestamp : null;
              const production = event.zone === "production";
              const failed = event.outcome === "failure" || event.outcome === "drop";
              const stage = event.stage?.replace(/_/g, " ") || "stage not classified";

              return (
                <li
                  className={`attack-timeline-event${production ? " is-production" : ""}${failed ? " is-failed" : ""}`}
                  key={`${event.ts}-${event.sensor}-${event.action}-${index}`}
                  style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
                >
                  <div className="attack-timeline-rail">
                    <span className="attack-timeline-node">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <article className="attack-timeline-entry">
                    <div className="attack-timeline-entry-top">
                      <time dateTime={event.ts} title={`Displayed in local time · source timestamp ${event.ts}`}>
                        {formatTime(event.ts)}
                      </time>
                      <span className="attack-timeline-offset">{formatElapsed(elapsed)}</span>
                      {gap !== null && gap >= 10_000 && (
                        <span className="attack-timeline-gap">{formatElapsed(gap)} since prior event</span>
                      )}
                    </div>
                    <p className="attack-timeline-summary-text">{event.summary}</p>
                    <div className="attack-timeline-tags">
                      <span className="attack-timeline-sensor">{event.sensor}</span>
                      <span className={`attack-timeline-zone ${production ? "is-production" : "is-deception"}`}>
                        {event.zone || "zone unknown"}
                      </span>
                      <span className="attack-timeline-stage">{stage}</span>
                      <span className={`attack-timeline-outcome${failed ? " is-failed" : ""}`}>
                        {event.outcome || "outcome unknown"}
                      </span>
                    </div>
                    {(event.techniques ?? []).length > 0 && (
                      <div className="attack-timeline-techniques">
                        {event.techniques.map((technique) => (
                          <span key={technique}>{technique}</span>
                        ))}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <footer className="attack-timeline-footer">
        <span><span className="attack-timeline-legend-dot is-deception" />Deception zone</span>
        <span><span className="attack-timeline-legend-dot is-production" />Production zone</span>
        <span>Times shown in local timezone</span>
      </footer>
    </section>
  );
}
