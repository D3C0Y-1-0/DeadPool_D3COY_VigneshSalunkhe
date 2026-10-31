import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, Users, Grid, Zap, Radio } from "lucide-react";
import DemoControl from "./DemoControl";

interface Props {
  children: React.ReactNode;
  connected: boolean;
  onRefresh: () => void;
}

export default function Shell({ children, connected, onRefresh }: Props) {
  const location = useLocation();
  const [demoOpen, setDemoOpen] = useState(false);
  const [utcTime, setUtcTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "Command Center", path: "/", icon: LayoutDashboard },
    { label: "Attackers", path: "/attackers", icon: Users },
    { label: "ATT&CK Matrix", path: "/attack", icon: Grid },
  ];

  return (
    <div className="flex h-screen bg-[#0a0e17] text-[#e6edf7] overflow-hidden">
      {/* Left Navigation Rail */}
      <aside className="w-16 md:w-56 bg-[#111827] border-r border-[#1f2a3d] flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-[#1f2a3d] gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4da3ff] to-[#ff3b5c] flex items-center justify-center flex-shrink-0 shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <div className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white to-[#4da3ff] bg-clip-text text-transparent">
                MIRAGE
              </div>
              <div className="text-[10px] text-[#8a97ad] tracking-tight">
                SOC DECEPTION FABRIC
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#4da3ff]/15 text-[#4da3ff] border border-[#4da3ff]/40 shadow-sm"
                      : "text-[#8a97ad] hover:text-[#e6edf7] hover:bg-[#162032]"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info in rail */}
        <div className="p-3 border-t border-[#1f2a3d] hidden md:block">
          <div className="text-[10px] text-[#8a97ad] uppercase tracking-wider mb-1">
            Deception Fabric
          </div>
          <div className="text-xs text-[#3dd6a8] font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3dd6a8] animate-pulse" />
            Active Decoys: 5
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-[#111827] border-b border-[#1f2a3d] px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#8a97ad] font-medium hidden sm:inline">
              Every touch is a tell.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* UTC Clock */}
            <div className="mono text-xs text-[#8a97ad] px-2.5 py-1 bg-[#0a0e17] border border-[#1f2a3d] rounded">
              {utcTime}
            </div>

            {/* Live WS Pulse Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs mono font-semibold border ${
                connected
                  ? "bg-[#3dd6a8]/10 text-[#3dd6a8] border-[#3dd6a8]/40"
                  : "bg-[#f5c542]/10 text-[#f5c542] border-[#f5c542]/40"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${connected ? "animate-pulse" : ""}`} />
              {connected ? "LIVE" : "RECONNECTING"}
            </div>

            {/* Demo Control Button */}
            <button
              onClick={() => setDemoOpen(true)}
              className="px-3 py-1 bg-gradient-to-r from-[#4da3ff] to-[#0284c7] hover:from-[#3b82f6] hover:to-[#0369a1] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Demo Control</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Outlet */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* Bottom Footer Strip */}
        <footer className="h-7 bg-[#0a0e17] border-t border-[#1f2a3d] px-4 flex items-center justify-between text-[11px] text-[#8a97ad] flex-shrink-0">
          <div>MITRE ATT&CK v19 Enterprise Framework</div>
          <div className="flex items-center gap-2">
            <span className="text-[#3dd6a8]">●</span>
            <span>Lab Mode: Isolated Containment Active</span>
          </div>
        </footer>
      </div>

      <DemoControl
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        onRefresh={onRefresh}
      />
    </div>
  );
}
