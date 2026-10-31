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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#1f2a3d] rounded-xl max-w-md w-full p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a97ad] hover:text-[#e6edf7] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-[#4da3ff]" />
          <h2 className="text-base font-bold text-[#e6edf7] uppercase tracking-wide">
            Interactive Demo Control
          </h2>
        </div>

        <p className="text-xs text-[#8a97ad] mb-4">
          Authorised deception lab simulator. Generates live synthetic adversary telemetry inside the isolated <code className="mono text-[#4da3ff]">attacker_net</code> container network.
        </p>

        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-[#ff3b5c]/30 bg-[#ff3b5c]/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#ff3b5c] uppercase">
                Targeted Attack (PS 04 Scenario)
              </div>
              <div className="text-[11px] text-[#8a97ad] mt-0.5">
                Full kill-chain: Scan → Decoy SSH → Stolen Creds → Prod Pivot
              </div>
            </div>
            <button
              onClick={() => handleTrigger("targeted")}
              disabled={runningScenario !== null}
              className="px-3 py-1.5 bg-[#ff3b5c] hover:bg-[#e02b4c] text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {runningScenario === "targeted" ? "Running..." : "Launch"}
            </button>
          </div>

          <div className="p-3 rounded-lg border border-[#4da3ff]/30 bg-[#4da3ff]/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#4da3ff] uppercase">
                Background Noise Storm
              </div>
              <div className="text-[11px] text-[#8a97ad] mt-0.5">
                Simulates 15+ automated botnet scanners & rapid dictionary attacks
              </div>
            </div>
            <button
              onClick={() => handleTrigger("noise")}
              disabled={runningScenario !== null}
              className="px-3 py-1.5 bg-[#4da3ff] hover:bg-[#3b82f6] text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {runningScenario === "noise" ? "Spamming..." : "Noise"}
            </button>
          </div>

          <div className="p-3 rounded-lg border border-[#1f2a3d] bg-[#0a0e17] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#e6edf7] uppercase">
                Reset Demo Environment
              </div>
              <div className="text-[11px] text-[#8a97ad] mt-0.5">
                Flushes database tables and resets prod firewall blocklist
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={runningScenario !== null}
              className="px-3 py-1.5 bg-[#1f2a3d] hover:bg-slate-700 text-[#e6edf7] rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-[#334155]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {runningScenario === "reset" ? "Resetting..." : "Reset"}
            </button>
          </div>
        </div>

        {msg && (
          <div className="mt-4 p-2 rounded bg-[#0a0e17] border border-[#1f2a3d] text-xs mono text-[#3dd6a8] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{msg}</span>
          </div>
        )}

        <div className="mt-4 text-[11px] text-[#8a97ad] text-center border-t border-[#1f2a3d] pt-3">
          Lab mode: isolated • Cap-drop enabled • No egress
        </div>
      </div>
    </div>
  );
}
