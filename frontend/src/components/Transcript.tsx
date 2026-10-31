import React from "react";
import { TranscriptItem } from "../types";
import { Terminal, Copy, Check } from "lucide-react";

interface Props {
  transcript: TranscriptItem[];
}

export default function Transcript({ transcript }: Props) {
  const [copied, setCopied] = React.useState(false);

  const copyAll = () => {
    const text = transcript.map(t => `${t.ts.slice(11, 19)} $ ${t.cmd}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#050811] border border-[#1f2a3d] rounded-lg p-3 flex flex-col h-64">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2a3d]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#3dd6a8]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6edf7]">
            Adversary Session Transcript
          </h3>
        </div>
        {transcript.length > 0 && (
          <button
            onClick={copyAll}
            className="text-xs text-[#8a97ad] hover:text-[#e6edf7] flex items-center gap-1 cursor-pointer transition-colors"
            title="Copy commands"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3dd6a8]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mono text-xs space-y-1.5 pr-1">
        {transcript.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8a97ad] italic">
            No interactive shell commands recorded in this session.
          </div>
        ) : (
          transcript.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-slate-300">
              <span className="text-[#8a97ad] select-none text-[11px]">
                {item.ts ? item.ts.slice(11, 19) : "--:--:--"}
              </span>
              <span className="text-[#3dd6a8] font-bold select-none">$</span>
              <span className="text-[#e6edf7] font-medium break-all selection:bg-[#4da3ff]/40">
                {item.cmd}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
