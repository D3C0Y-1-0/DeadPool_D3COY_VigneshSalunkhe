"use client";

import { useEffect, useMemo, useState } from "react";
import { useLive } from "../useLive";
import { fetchAttackMatrix } from "../api";
import KpiCards from "../components/KpiCards";
import { TechniqueItem } from "../types";
import { Download, FileText, Grid } from "lucide-react";

export default function Reports() {
  const { incidents, stats, loading, error } = useLive();
  const [matrix, setMatrix] = useState<TechniqueItem[]>([]);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState("Pre-built Reports");

  useEffect(() => {
    fetchAttackMatrix()
      .then((rows) => {
        setMatrix(rows);
        setMatrixError(null);
      })
      .catch((cause: unknown) => {
        setMatrix([]);
        setMatrixError(cause instanceof Error ? cause.message : "Could not load ATT&CK telemetry.");
      })
      .finally(() => setMatrixLoading(false));
  }, []);

  const incidentIds = useMemo(
    () => Object.keys(incidents).sort((a, b) => a.localeCompare(b)),
    [incidents]
  );

  const currentId = selectedId && incidentIds.includes(selectedId) ? selectedId : incidentIds[0] || "";

  const reportTemplates = [
    { id: 'summary', title: 'Threat Summary Report', desc: 'Overview of events, incidents and top attackers', icon: FileText },
    { id: 'attack', title: 'MITRE ATT&CK Report', desc: 'Techniques, tactics and event mapping', icon: Grid },
    { id: 'adversary', title: 'Attacker Profile Report', desc: 'Detailed analysis of top attackers', icon: Grid },
    { id: 'response', title: 'Incident Response Report', desc: 'Actions taken and resolution status', icon: FileText }
  ];

  const recentReports = [
    { title: 'threat-summary-2025-04-24.pdf', date: 'Apr 24, 2025', size: '2.4 MB' },
    { title: 'mitre-attack-2025-04-23.pdf', date: 'Apr 23, 2025', size: '1.8 MB' },
    { title: 'adversary-profile-2025-04-22.pdf', date: 'Apr 22, 2025', size: '3.1 MB' }
  ];

  return (
    <div className="page-content space-y-6">
      {error && (
        <div role="alert" className="notice notice-danger">
          Report telemetry unavailable: {error}
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Intelligence</div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Security Reports</h1>
          <p className="text-sm text-mute mt-1">Generate and download executive security reports and data exports.</p>
        </div>
        <div className="flex items-center gap-1 bg-panel border border-line p-1 rounded-lg">
          {["Pre-built Reports", "Custom Reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-mute hover:text-ink hover:bg-panel-card"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-panel-card border border-line rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={14} className="text-accent" />
              Available Report Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map((report) => (
                <div key={report.id} className="p-4 rounded-xl border border-line bg-panel hover:border-accent/50 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <report.icon size={20} />
                    </div>
                    <button className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all">
                      Generate
                    </button>
                  </div>
                  <h4 className="text-[13px] font-bold text-ink mb-1">{report.title}</h4>
                  <p className="text-[11px] text-mute leading-relaxed">{report.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
            <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest mb-4 flex items-center gap-2">
              <Download size={14} className="text-accent" />
              Raw Data Export
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold text-ink">ECS NDJSON</div>
                <p className="text-[10px] text-mute leading-relaxed">Full raw event stream in ECS-lite format.</p>
                <a href="/api/export/ecs.ndjson" className="mt-auto text-[10px] font-bold text-accent flex items-center gap-2 hover:underline">
                  <Download size={12} /> Download Data
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold text-ink">STIX 2.1 Bundle</div>
                <p className="text-[10px] text-mute leading-relaxed">Threat-intel indicators and observables.</p>
                {currentId ? (
                  <a href={`/api/incidents/${encodeURIComponent(currentId)}/export/stix`} className="mt-auto text-[10px] font-bold text-accent flex items-center gap-2 hover:underline">
                    <Download size={12} /> Download STIX
                  </a>
                ) : <span className="text-[10px] text-mute italic mt-auto">No incidents</span>}
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold text-ink">CSV Archive</div>
                <p className="text-[10px] text-mute leading-relaxed">Per-incident spreadsheet exports.</p>
                {currentId ? (
                  <a href={`/api/incidents/${encodeURIComponent(currentId)}/export/csv`} className="mt-auto text-[10px] font-bold text-accent flex items-center gap-2 hover:underline">
                    <Download size={12} /> Download CSV
                  </a>
                ) : <span className="text-[10px] text-mute italic mt-auto">No incidents</span>}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-[10px] font-bold text-mute uppercase tracking-widest">Target Incident:</label>
              <select
                value={currentId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="bg-panel border border-line rounded-lg px-3 py-1.5 text-[11px] text-ink outline-none focus:border-accent/50"
              >
                {incidentIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-panel-card border border-line rounded-xl p-6 shadow-xl">
            <h3 className="text-[10px] font-bold text-mute uppercase tracking-widest mb-6 flex items-center justify-between">
              Recent Reports
              <span className="text-accent cursor-pointer hover:underline uppercase text-[9px]">View All</span>
            </h3>
            <div className="space-y-4">
              {recentReports.map((report, i) => (
                <div key={i} className="flex items-start gap-3 group cursor-pointer">
                  <div className="p-2 bg-panel border border-line rounded-lg text-mute group-hover:text-accent group-hover:border-accent/50 transition-all">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-ink truncate mb-0.5 group-hover:text-accent transition-colors">{report.title}</div>
                    <div className="flex items-center gap-2 text-[9px] text-mute uppercase tracking-wider">
                      <span>{report.date}</span>
                      <div className="w-1 h-1 rounded-full bg-line" />
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-xl p-6 shadow-xl">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3">Scheduled Reports</h3>
            <p className="text-[11px] text-mute leading-relaxed mb-4">Daily executive summaries and weekly technical deep-dives are active.</p>
            <button className="w-full bg-accent text-white py-2 rounded-lg text-[10px] font-bold hover:bg-accent/80 transition-all shadow-lg shadow-accent/20">
              Manage Schedules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
