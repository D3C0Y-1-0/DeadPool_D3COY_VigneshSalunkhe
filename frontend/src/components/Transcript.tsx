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
    <div className="flex flex-col h-full bg-panel-card">
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Terminal size={16} />
          </div>
          <h3 className="text-[10px] font-bold text-ink uppercase tracking-widest">
            Interactive Session Transcript
          </h3>
        </div>
        {transcript.length > 0 && (
          <button
            onClick={copyAll}
            className="text-[10px] font-bold text-mute hover:text-ink flex items-center gap-1.5 cursor-pointer transition-all bg-panel border border-line px-2 py-1 rounded-md"
            title="Copy all commands"
          >
            {copied ? <Check size={12} className="text-low" /> : <Copy size={12} />}
            <span>{copied ? "COPIED" : "COPY LOG"}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 mono text-[12px] space-y-2.5 scrollbar-thin bg-black/20">
        {transcript.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-mute italic opacity-50 space-y-3">
            <div className="w-12 h-12 rounded-full border border-line flex items-center justify-center">
              <Terminal size={20} />
            </div>
            <span>No interactive shell commands recorded.</span>
          </div>
        ) : (
          transcript.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 group">
              <span className="text-mute/50 select-none text-[10px] pt-0.5">
                {item.ts ? item.ts.slice(11, 19) : "--:--:--"}
              </span>
              <span className="text-accent font-bold select-none opacity-70">$</span>
              <span className="text-ink font-medium break-all selection:bg-accent/30 group-hover:text-white transition-colors">
                {item.cmd}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
