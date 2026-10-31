"use client";

import { useLive } from "../useLive";
import KpiCards from "../components/KpiCards";
import AlertQueue from "../components/AlertQueue";
import ThreatMap from "../components/ThreatMap";
import AlertDistribution from "../components/AlertDistribution";
import SystemStatus from "../components/SystemStatus";
import RecentCases from "../components/RecentCases";
import { IncidentSummary } from "../types";

export default function CommandCenter() {
  const { events, incidents, stats, error, loading } = useLive();
  const incidentList = Object.values(incidents) as IncidentSummary[];

  return (
    <div className="page-content space-y-6">
      {error && (
        <div role="alert" className="notice notice-danger">
          Backend telemetry unavailable: {error}. Showing cached data.
        </div>
      )}

      {/* KPI Cards Row */}
      <KpiCards stats={stats} />

      {/* Middle Row: Attack Map (2/3) + Alert Distribution (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[450px]">
          <ThreatMap incidents={incidentList} />
        </div>
        <div className="h-[450px]">
          <AlertDistribution incidents={incidentList} />
        </div>
      </div>

      {/* Bottom Row: Recent Alerts (2/3) + System/Cases (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[400px]">
          <AlertQueue incidents={incidentList} />
        </div>
        <div className="space-y-6">
          <div className="h-[200px]">
            <SystemStatus />
          </div>
          <div className="h-[250px]">
            <RecentCases incidents={incidentList} />
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 bg-panel border border-line px-3 py-1 rounded-full text-[10px] text-mute animate-pulse">
          Syncing with SOC backbone...
        </div>
      )}
    </div>
  );
}
