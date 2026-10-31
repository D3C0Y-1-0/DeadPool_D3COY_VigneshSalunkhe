"use client";

import { useState } from "react";
import { useLive } from "../useLive";
import { triggerDemo, resetDemo } from "../api";
import { CheckCircle2, Play, RotateCcw, ShieldAlert, Zap } from "lucide-react";

type Scenario = "targeted" | "noise" | "reset";

const SCENARIOS: Array<{
  key: Scenario;
  title: string;
  description: string;
  accent: string;
  buttonClass: string;
}> = [
  {
    key: "targeted",
    title: "Targeted Attack",
    description:
      "Runs the full kill chain inside attacker_net: port scan → decoy SSH on db-prod-02 → credential theft → honeytoken access → simulated pivot against the fake production host.",
    accent: "text-rose-600",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white"
  },
  {
    key: "noise",
    title: "Noise Storm",
    description:
      "Emits high-volume opportunistic scanning and rapid dictionary attacks from many synthetic bots inside attacker_net to exercise correlation and noise suppression.",
    accent: "text-slate-900",
    buttonClass: "bg-slate-900 hover:bg-slate-800 text-white"
  },
  {
    key: "reset",
    title: "Reset Environment",
    description:
      "Flushes all synthetic events, incidents and simulated firewall blocklists, returning the isolated lab to a pristine state.",
    accent: "text-slate-900",
    buttonClass: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
  }
];

export default function DemoConsole() {
  const { connected, refreshAll } = useLive();
  const [running, setRunning] = useState<Scenario | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");

  const run = async (scenario: Scenario) => {
    if (running !== null) return;
    setRunning(scenario);
    setMessage(null);
    try {
      if (scenario === "reset") {
        await resetDemo();
        setMessage("MIRAGE environment reset to a pristine state.");
      } else {
        await triggerDemo(scenario);
        setMessage(
          scenario === "targeted"
            ? "Targeted attack scenario launched inside the isolated attacker_net network."
            : "Noise storm launched inside the isolated attacker_net network."
        );
      }
      setMessageKind("ok");
      await refreshAll();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Scenario could not be started.");
      setMessageKind("error");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="page-content">
      <section className="page-heading">
        <div>
          <div className="eyebrow">SIMULATION</div>
          <h1>Demo Console</h1>
          <p>Drive the synthetic adversary simulator that feeds the MIRAGE pipeline.</p>
        </div>
        <div className={`status-badge ${connected ? "badge-normal" : "badge-danger"}`}>
          <Zap size={13} className="mr-1.5" />
          {connected ? "Live stream connected" : "Live stream offline"}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
        <span>
          Lab simulator only. These controls generate synthetic attack traffic exclusively inside the isolated
          compose project on <code className="mono">attacker_net</code>. Nothing is ever scanned, contacted or
          attacked outside this environment.
        </span>
      </div>

      {message && (
        <div
          role={messageKind === "error" ? "alert" : undefined}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            messageKind === "error"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <CheckCircle2
            className={`h-4 w-4 flex-shrink-0 ${
              messageKind === "error" ? "text-amber-600" : "text-emerald-600"
            }`}
          />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SCENARIOS.map((scenario) => {
          const isRunning = running === scenario.key;
          return (
            <div
              key={scenario.key}
              className="panel panel-shadow flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className={`text-xs font-bold uppercase tracking-wider ${scenario.accent}`}>
                  {scenario.title}
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{scenario.description}</p>
              </div>
              <button
                onClick={() => run(scenario.key)}
                disabled={running !== null}
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${scenario.buttonClass}`}
              >
                {scenario.key === "reset" ? (
                  <RotateCcw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`} />
                ) : (
                  <Play className={`h-3.5 w-3.5 fill-current ${isRunning ? "animate-pulse" : ""}`} />
                )}
                {isRunning ? "Running…" : scenario.key === "reset" ? "Reset environment" : scenario.title}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
