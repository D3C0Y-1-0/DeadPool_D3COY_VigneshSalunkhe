import React, { useState } from "react";
import { triggerDemo, resetDemo } from "../api";
import { Play, RotateCcw, Zap, ShieldAlert, CheckCircle2, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function DemoControl({ isOpen, onClose, onRefresh }: Props) {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrigger = async (scenario: "targeted" | "noise") => {
    setRunningScenario(scenario);
    setMsg(`Triggered '${scenario}' attack simulator...`);
    try {
      await triggerDemo(scenario);
      setMsg(`Scenario '${scenario}' is executing inside isolated container.`);
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setTimeout(() => setRunningScenario(null), 1500);
    }
  };

  const handleReset = async () => {
    setRunningScenario("reset");
    setMsg("Clearing all events, incidents and firewall blocklists...");
    try {
      await resetDemo();
      setMsg("MIRAGE platform reset to pristine state.");
      onRefresh();
    } catch (e: any) {
      setMsg(`Reset error: ${e.message}`);
    } finally {
      setTimeout(() => setRunningScenario(null), 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            Interactive Demo Control
          </h2>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Authorised deception lab simulator. Generates live synthetic adversary telemetry inside the isolated <code className="mono text-slate-700">attacker_net</code> container network.
        </p>

        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-red-700 uppercase">
                Targeted Attack (PS 04 Scenario)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Full kill-chain: Scan → Decoy SSH → Stolen Creds → Prod Pivot
              </div>
            </div>
            <button
              onClick={() => handleTrigger("targeted")}
              disabled={runningScenario !== null}
              className="danger-btn text-xs flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {runningScenario === "targeted" ? "Running..." : "Launch"}
            </button>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase">
                Background Noise Storm
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Simulates 15+ automated botnet scanners & rapid dictionary attacks
              </div>
            </div>
            <button
              onClick={() => handleTrigger("noise")}
              disabled={runningScenario !== null}
              className="primary-btn text-xs flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {runningScenario === "noise" ? "Spamming..." : "Noise"}
            </button>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase">
                Reset Demo Environment
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Flushes database tables and resets prod firewall blocklist
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={runningScenario !== null}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {runningScenario === "reset" ? "Resetting..." : "Reset"}
            </button>
          </div>
        </div>

        {msg && (
          <div className="mt-4 p-2 rounded bg-slate-50 border border-slate-200 text-xs mono text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{msg}</span>
          </div>
        )}

        <div className="mt-4 text-[11px] text-slate-500 text-center border-t border-slate-200 pt-3">
          Lab mode: isolated • Cap-drop enabled • No egress
        </div>
      </div>
    </div>
  );
}
