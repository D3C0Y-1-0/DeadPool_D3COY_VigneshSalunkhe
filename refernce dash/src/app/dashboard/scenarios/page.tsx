"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  HelpCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  TrendingUp,
  XCircle,
  Zap
} from "lucide-react";
import { postJson, type EventItem, type ScenarioResult } from "@/lib/api";

type ScenarioConfig = {
  id: ScenarioResult["scenario"];
  title: string;
  subtitle: string;
  category: string;
  categoryColor: "emerald" | "rose" | "amber" | "purple";
  icon: "normal" | "injection" | "drift" | "mimicry";
  plainDescription: string;
  whatItTests: string;
  expectedOutcome: string;
};

const SCENARIOS: ScenarioConfig[] = [
  {
    id: "normal",
    title: "Normal Procurement Routine",
    subtitle: "Safe Everyday Work",
    category: "Routine Workflow",
    categoryColor: "emerald",
    icon: "normal",
    plainDescription:
      "Runs legitimate price checks and purchase orders to verify that normal business work continues smoothly with zero false alarms.",
    whatItTests: "Tests that legitimate tasks are not accidentally blocked or slowed down.",
    expectedOutcome: "All routine actions allowed, zero disruptions to real work."
  },
  {
    id: "injection",
    title: "Malicious Document Injection",
    subtitle: "Hidden Prompt Injection Attack",
    category: "Prompt Injection",
    categoryColor: "rose",
    icon: "injection",
    plainDescription:
      "Simulates an untrusted supplier PDF containing hidden prompt injection instructions trying to trick the AI into stealing employee salary data.",
    whatItTests: "Tests whether hidden instructions in files can hijack the agent.",
    expectedOutcome: "The safety system flags the injected instructions and blocks data exfiltration."
  },
  {
    id: "drift",
    title: "Gradual Permission Drift",
    subtitle: "Scope Creep & Capability Expansion",
    category: "Behavioral Drift",
    categoryColor: "amber",
    icon: "drift",
    plainDescription:
      "The agent slowly attempts new tools and system actions outside its declared permissions over time to test boundary enforcement.",
    whatItTests: "Tests if the agent's behavior stays strictly inside its assigned role contract.",
    expectedOutcome: "New unapproved tools are paused and flagged before execution."
  },
  {
    id: "mimicry",
    title: "Sneaky Mimicry Probing",
    subtitle: "Disguised Attacks in Routine Work",
    category: "Mimicry Attack",
    categoryColor: "purple",
    icon: "mimicry",
    plainDescription:
      "An attacker mixes sensitive data queries in between normal, innocent-looking tasks to test if the filter detects the anomaly.",
    whatItTests: "Tests detection against attacks hidden inside routine-looking requests.",
    expectedOutcome: "The anomalous queries are intercepted while safe routine tasks proceed."
  }
];

export default function ScenariosPage() {
  const [running, setRunning] = useState<ScenarioResult["scenario"] | null>(null);
  const [results, setResults] = useState<Partial<Record<ScenarioResult["scenario"], ScenarioResult>>>({});
  const [error, setError] = useState<string | null>(null);

  async function runScenario(id: ScenarioResult["scenario"]) {
    setRunning(id);
    setError(null);
    try {
      const result = await postJson<ScenarioResult>(`/sim/scenarios/${id}/run`);
      setResults((current) => ({ ...current, [id]: result }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scenario run failed.");
    } finally {
      setRunning(null);
    }
  }

  const completedCount = Object.keys(results).length;

  return (
    <div className="page-content">
      {/* Friendly Header */}
      <section className="page-heading command-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-500" />
            SAFETY SIMULATOR & TEST LAB
          </div>
          <h1>Attack & Workflow Simulations</h1>
          <p>
            Run simulated test scenarios to see how the safety system handles prompt injections,
            permission creep, and normal everyday tasks.
          </p>
        </div>

        <div className="heading-context">
          <div className="flex items-center gap-2">
            <span className="heading-live">
              <span className="health-dot" />
              Isolated Test Sandbox
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              Safe Mock Environment
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Simulations run safely in memory &bull; Zero real external calls
          </div>
        </div>
      </section>

      {/* 4 Clear Metric Cards */}
      <section className="metric-strip">
        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Available Tests</span>
            <span className="metric-icon tone-blue">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="kpi-value text-slate-900 font-bold">4 Scenarios</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Attack & baseline tests</span>
            <span className="text-blue-600 font-semibold">Ready to run</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Simulations Completed</span>
            <span className="metric-icon tone-green">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="kpi-value text-emerald-600 font-bold">
            {completedCount} of 4
          </div>
          <div className="metric-detail flex items-center justify-between">
            <span>Tests executed in session</span>
            <span className="text-emerald-600 font-semibold">
              {completedCount === 4 ? "All Tested" : "Interactive"}
            </span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Environment Mode</span>
            <span className="metric-icon tone-purple">
              <Shield size={16} />
            </span>
          </div>
          <div className="kpi-value text-base font-bold text-slate-900">Safe Sandbox</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Air-gapped simulator</span>
            <span className="text-purple-600 font-semibold">Zero Risk</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Safety Filter</span>
            <span className="metric-icon tone-amber">
              <Zap size={16} />
            </span>
          </div>
          <div className="kpi-value text-base font-bold text-slate-900">Pre-Execution</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Catches threats before action</span>
            <span className="text-amber-600 font-semibold">Active</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        {SCENARIOS.map((scenario) => {
          const result = results[scenario.id];
          const isRunning = running === scenario.id;

          const categoryBadgeClass =
            scenario.categoryColor === "rose"
              ? "bg-rose-100 text-rose-800 border-rose-200"
              : scenario.categoryColor === "emerald"
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : scenario.categoryColor === "amber"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-purple-100 text-purple-800 border-purple-200";

          return (
            <div
              key={scenario.id}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header & Description */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        scenario.categoryColor === "rose"
                          ? "bg-rose-100 text-rose-600"
                          : scenario.categoryColor === "emerald"
                          ? "bg-emerald-100 text-emerald-600"
                          : scenario.categoryColor === "amber"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      {scenario.icon === "normal" && <CheckCircle2 size={18} />}
                      {scenario.icon === "injection" && <Flame size={18} />}
                      {scenario.icon === "drift" && <SlidersHorizontal size={18} />}
                      {scenario.icon === "mimicry" && <Eye size={18} />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {scenario.title}
                      </h2>
                      <div className="text-xs text-slate-400">
                        {scenario.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${categoryBadgeClass}`}>
                    {scenario.category}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {scenario.plainDescription}
                </p>

                {/* What it tests box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <HelpCircle size={13} className="text-slate-400" />
                    What this tests:
                  </div>
                  <div className="text-slate-500 text-[11px] leading-relaxed">
                    {scenario.whatItTests}
                  </div>
                  <div className="text-emerald-700 font-medium text-[11px] pt-1 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    Expected: {scenario.expectedOutcome}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-400">
                  {result ? "Simulation completed" : "Ready to test"}
                </span>

                <div className="flex items-center gap-2">
                  {result && (
                    <button
                      type="button"
                      onClick={() =>
                        setResults((prev) => {
                          const next = { ...prev };
                          delete next[scenario.id];
                          return next;
                        })
                      }
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={running !== null}
                    onClick={() => void runScenario(scenario.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                      scenario.categoryColor === "rose"
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Running test…
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-current" />
                        {result ? "Run Again" : "Run Simulation"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Visual Results Panel (When finished) */}
              {result && (
                <div className="p-4 border-t border-slate-200 bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Test Finished ({result.mode.toUpperCase()} Mode)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Agent: {result.agent_id}
                    </span>
                  </div>

                  {/* Step-by-Step Execution Chain if available */}
                  {Array.isArray(result.summary?.steps) && result.summary.steps.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Execution Steps & Risk Progression:
                      </div>
                      <div className="space-y-1">
                        {result.summary.steps.map((step: any, idx: number) => {
                          const isHigh = step.band === "CRITICAL" || step.band === "HIGH";
                          const isMed = step.band === "ELEVATED" || step.band === "WATCH";

                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 flex items-center justify-center text-[10px] font-mono">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-200">
                                    {step.label || step.tool}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {step.resource || step.tool}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isHigh
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : isMed
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  }`}
                                >
                                  {step.band} ({Math.round(step.risk || 0)}/100)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary Bullets */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                    {scenario.id === "injection" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Prompt Injection Detected:</span>
                          <strong className="text-emerald-400">Yes (Blocked)</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Simulated Data Leaked:</span>
                          <strong className="text-emerald-400">0 bytes to external network</strong>
                        </div>
                      </>
                    )}

                    {scenario.id === "normal" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Legitimate Tasks Allowed:</span>
                          <strong className="text-emerald-400">100% Completed</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>False Alarms:</span>
                          <strong className="text-emerald-400">0 Alarms</strong>
                        </div>
                      </>
                    )}

                    {scenario.id === "drift" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Permission Boundary Drift:</span>
                          <strong className="text-amber-400">Detected & Paused</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Allowed Workload Afterwards:</span>
                          <strong className="text-emerald-400">Maintained safely</strong>
                        </div>
                      </>
                    )}

                    {scenario.id === "mimicry" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Anomalous Probes Intercepted:</span>
                          <strong className="text-purple-400">Contained in sandbox</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Legitimate Work Allowed:</span>
                          <strong className="text-emerald-400">100% Available</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Generated Event Links */}
                  {result.events && result.events.length > 0 && (
                    <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Generated {result.events.length} telemetry records:
                      </span>
                      <Link
                        href="/dashboard/events"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                      >
                        Inspect Telemetry Stream <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
