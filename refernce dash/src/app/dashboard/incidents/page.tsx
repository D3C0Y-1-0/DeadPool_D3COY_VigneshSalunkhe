"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Lock,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap
} from "lucide-react";
import { fetchJson, type AlertItem, type Band } from "@/lib/api";

type IncidentRecord = {
  id: string;
  agentName: string;
  agentId: string;
  role: string;
  threatType: string;
  severity: "Critical" | "High" | "Medium";
  severityColor: "red" | "amber" | "blue";
  whatHappened: string;
  howWeStoppedIt: string;
  timeAgo: string;
  sourceFile?: string;
};

const SIMPLE_INCIDENTS: IncidentRecord[] = [
  {
    id: "INC-9412",
    agentName: "Finance Assistant",
    agentId: "proc-01",
    role: "Procurement Workload",
    threatType: "Hidden Prompt Injection Attack",
    severity: "Critical",
    severityColor: "red",
    whatHappened:
      "A supplier quote PDF contained hidden white text instructing the AI to reroute payments to an unknown bank account.",
    howWeStoppedIt:
      "The safety check flagged the untrusted instructions and blocked the transfer before any money was sent.",
    timeAgo: "5 mins ago",
    sourceFile: "invoice_quote_994.pdf"
  },
  {
    id: "INC-8120",
    agentName: "Support Assistant",
    agentId: "supp-01",
    role: "Customer Support",
    threatType: "Decoy Honeytoken Triggered",
    severity: "High",
    severityColor: "amber",
    whatHappened:
      "An external user sent a message trying to trick the agent into revealing internal password keys.",
    howWeStoppedIt:
      "The agent touched a decoy safety trap. Its access was immediately frozen, keeping real systems safe.",
    timeAgo: "22 mins ago",
    sourceFile: "Customer Support Ticket #1839"
  },
  {
    id: "INC-6504",
    agentName: "Procurement Agent",
    agentId: "demo-normal-732de1b6",
    role: "Procurement Workload",
    threatType: "Unpermitted Tool Request",
    severity: "Medium",
    severityColor: "blue",
    whatHappened:
      "The agent attempted to execute a system command outside of its allowed purchasing permissions.",
    howWeStoppedIt:
      "Blocked automatically by the agent's permission rules. The agent was kept inside its safe boundary.",
    timeAgo: "45 mins ago",
    sourceFile: "Automated Routine Workflow"
  }
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>(SIMPLE_INCIDENTS);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "Critical" | "High" | "Medium">("ALL");
  const [quarantined, setQuarantined] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    fetchJson<AlertItem[]>("/alerts?limit=100")
      .then((rows) => {
        if (!active) return;
        if (rows.length > 0) {
          // If backend has real alerts, convert them into readable format
          const mapped: IncidentRecord[] = rows.map((r, idx) => ({
            id: r.id || `INC-${1000 + idx}`,
            agentName: r.agent_id.startsWith("proc") ? "Finance Assistant" : "Support Assistant",
            agentId: r.agent_id,
            role: r.agent_id.startsWith("proc") ? "Procurement Workload" : "Customer Support",
            threatType: r.shadow_action || "Policy Violation Blocked",
            severity: r.band === "CRITICAL" ? "Critical" : r.band === "HIGH" ? "High" : "Medium",
            severityColor: r.band === "CRITICAL" ? "red" : r.band === "HIGH" ? "amber" : "blue",
            whatHappened: r.message || "Anomalous action detected that violated safety rules.",
            howWeStoppedIt: "Blocked automatically by the safety filter before execution.",
            timeAgo: "Recent",
            sourceFile: r.event_id
          }));
          setIncidents(mapped);
        }
      })
      .catch(() => {
        // Fall back gracefully to simple demo incidents
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleQuarantine = (agentId: string) => {
    setQuarantined((prev) => ({ ...prev, [agentId]: true }));
  };

  const filtered = useMemo(() => {
    if (filterSeverity === "ALL") return incidents;
    return incidents.filter((i) => i.severity === filterSeverity);
  }, [incidents, filterSeverity]);

  return (
    <div className="page-content">
      {/* Friendly Header */}
      <section className="page-heading command-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <ShieldAlert size={14} className="text-rose-500" />
            SECURITY THREAT LOG
          </div>
          <h1>Blocked Security Threats</h1>
          <p>
            Whenever an attacker tries prompt injection, trick questions, or unpermitted actions,
            the safety system blocks them and logs the event here.
          </p>
        </div>

        <div className="heading-context">
          <div className="flex items-center gap-2">
            <span className="heading-live">
              <span className="health-dot" />
              Protection Active
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              0 Leaks &bull; 100% Blocked
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Threats are stopped at the source before any damage occurs
          </div>
        </div>
      </section>

      {/* 4 Simple Metrics */}
      <section className="metric-strip">
        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Blocked Threats</span>
            <span className="metric-icon tone-red">
              <ShieldAlert size={16} />
            </span>
          </div>
          <div className="kpi-value text-rose-600 font-bold">{incidents.length}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Harmful requests stopped</span>
            <span className="text-rose-600 font-semibold">Protected</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Data Leaked</span>
            <span className="metric-icon tone-green">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="kpi-value text-emerald-600 font-bold">0 Bytes</div>
          <div className="metric-detail flex items-center justify-between">
            <span>No data left your system</span>
            <span className="text-emerald-600 font-semibold">Safe</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Protected Agents</span>
            <span className="metric-icon tone-blue">
              <Bot size={16} />
            </span>
          </div>
          <div className="kpi-value text-slate-900 font-bold">7 Online</div>
          <div className="metric-detail flex items-center justify-between">
            <span>All workloads covered</span>
            <span className="text-blue-600 font-semibold">100% Guarded</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Response Time</span>
            <span className="metric-icon tone-purple">
              <Zap size={16} />
            </span>
          </div>
          <div className="kpi-value text-slate-900 font-bold">Instant</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Zero delay filtering</span>
            <span className="text-purple-600 font-semibold">Pre-Execution</span>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterSeverity("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSeverity === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Events ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("Critical")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSeverity === "Critical"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Critical
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("High")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSeverity === "High"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            High
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("Medium")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSeverity === "Medium"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Medium
          </button>
        </div>

        <Link
          href="/dashboard/agent-graph"
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
        >
          View in Agent Graph <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Clear, Readable Incident Cards */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const isQuarantined = quarantined[item.agentId];

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      item.severityColor === "red"
                        ? "bg-rose-100 text-rose-700"
                        : item.severityColor === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {item.threatType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.severityColor === "red"
                            ? "bg-rose-100 text-rose-800"
                            : item.severityColor === "amber"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.severity} Severity
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Targeted: <strong className="text-slate-800">{item.agentName}</strong> ({item.agentId}) &bull; {item.timeAgo}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Stopped Before Execution
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What happened */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">
                    What happened?
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {item.whatHappened}
                  </p>
                  {item.sourceFile && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Source: <code className="text-slate-600 font-mono">{item.sourceFile}</code>
                    </div>
                  )}
                </div>

                {/* How we stopped it */}
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      How did the system protect you?
                    </span>
                    <p className="text-emerald-800 leading-relaxed mt-1">
                      {item.howWeStoppedIt}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    {isQuarantined ? (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                        <Lock size={11} /> Agent Paused
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuarantine(item.agentId)}
                        className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Lock size={12} />
                        Pause {item.agentId}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
