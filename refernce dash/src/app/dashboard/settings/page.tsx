"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { apiBase, fetchJson } from "@/lib/api";

type Health = { status: string; service: string; version: string; mode: string; roles: string[]; tools: number };

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<Health>("/health")
      .then(setHealth)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Backend settings unavailable."));
  }, []);

  return (
    <div className="page-content">
      <section className="page-heading"><div><div className="eyebrow">SYSTEM CONFIGURATION</div><h1>Settings</h1><p>Read-only connection and runtime information reported by the active backend.</p></div></section>
      {error && <div className="notice notice-danger" role="alert">Unable to read backend settings: {error}</div>}
      <section className="detail-grid">
        <article className="panel panel-shadow">
          <div className="section-heading"><h2 className="section-title">Backend connection</h2><CheckCircle2 size={18} color={health ? "#34d399" : "#fbbf24"} /></div>
          <dl className="detail-list">
            <div><dt>Configured API URL</dt><dd>{apiBase}</dd></div>
            <div><dt>Connection</dt><dd>{health ? "Connected" : error ? "Unavailable" : "Checking…"}</dd></div>
            <div><dt>Service</dt><dd>{health?.service ?? "—"}</dd></div>
            <div><dt>Version</dt><dd>{health?.version ?? "—"}</dd></div>
          </dl>
        </article>
        <article className="panel panel-shadow">
          <div className="section-heading"><h2 className="section-title">Runtime configuration</h2><Info size={18} color="#60a5fa" /></div>
          <dl className="detail-list">
            <div><dt>Backend mode</dt><dd><span className={`status-badge ${health?.mode === "enforce" ? "badge-normal" : "badge-warning"}`}>{health?.mode?.toUpperCase() ?? "Unknown"}</span></dd></div>
            <div><dt>Registered role contracts</dt><dd>{health?.roles.join(", ") ?? "—"}</dd></div>
            <div><dt>Registered tools</dt><dd>{health?.tools ?? "—"}</dd></div>
          </dl>
          <div className="notice notice-warning" style={{ marginTop: 16 }}>
            Runtime mode is configured on the FastAPI backend (WARDEN_MODE). This page does not change it. Restart the backend after changing server environment variables.
          </div>
        </article>
      </section>
      <section className="panel panel-shadow">
        <div className="section-heading"><h2 className="section-title">Operator preferences</h2><span className="status-badge badge-info">Not persisted</span></div>
        <p className="text-muted">The current backend does not expose persisted dashboard preferences. No controls are shown here that would imply a setting was saved.</p>
      </section>
    </div>
  );
}
