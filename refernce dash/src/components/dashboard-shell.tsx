"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, Database, FileText, Gauge, Lock, Shield, ShieldCheck, ShieldAlert, Sparkles, Wrench, Settings, Bell, PanelLeftClose, PanelLeftOpen, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchJson, WS_URL } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/agent-graph", label: "Agent Graph", icon: Activity },
  { href: "/dashboard/agents", label: "Agents", icon: Shield },
  { href: "/dashboard/events", label: "Events", icon: FileText },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/approvals", label: "Approvals", icon: Lock },
  { href: "/dashboard/enforcement", label: "Enforcement", icon: ShieldCheck },
  { href: "/dashboard/audit", label: "Audit Trail", icon: Database },
  { href: "/dashboard/scenarios", label: "Scenario Runner", icon: Sparkles },
  { href: "/dashboard/policies", label: "Policies", icon: Wrench },
  { href: "/dashboard/settings", label: "Settings", icon: ShieldAlert }
];

const topNavItems = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/agent-graph", label: "Access Graph" },
  { href: "/dashboard/incidents", label: "Incidents" },
  { href: "/dashboard/audit", label: "Audit" }
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = useState<boolean | null>(null);
  const [mode, setMode] = useState<string>("");
  const [live, setLive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("not yet");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    window.setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        const health = await fetchJson<{ mode?: string }>("/health");
        if (!isCancelled) {
          setOnline(true);
          setMode((health.mode ?? "unknown").toUpperCase());
          setLastRefresh(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      } catch {
        if (!isCancelled) {
          setOnline(false);
          setMode("");
        }
      }
    };
    load();
    return () => { isCancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let stopped = false;
    let retryTimer: number | undefined;
    let startTimer: number | undefined;
    let retryCount = 0;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      try {
        socket = new WebSocket(WS_URL);
        socket.onopen = () => {
          retryCount = 0;
          setLive(true);
        };
        socket.onmessage = (message) => {
          try {
            const payload = JSON.parse(message.data) as { type?: string; data?: unknown };
            if (["event", "alert", "approval", "posture"].includes(payload.type ?? "")) {
              window.dispatchEvent(new CustomEvent("drishti:live-event", { detail: payload }));
            }
          } catch (cause) {
            console.error("Invalid message received from DRISHTI live stream.", cause);
          }
        };
        socket.onclose = () => {
          if (stopped) return;
          setLive(false);
          const delay = Math.min(30000, 1000 * 2 ** retryCount);
          retryCount += 1;
          retryTimer = window.setTimeout(connect, delay);
        };
        socket.onerror = () => socket?.close();
      } catch (cause) {
        console.error("Could not connect to the DRISHTI live stream.", cause);
        setLive(false);
        if (!stopped) retryTimer = window.setTimeout(connect, 5000);
      }
    };
    startTimer = window.setTimeout(connect, 0);
    return () => {
      stopped = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      socket?.close();
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar${sidebarOpen ? " is-expanded" : ""}`}>
        <div className="sidebar-brand-row">
          <Link className="brand-mark" href="/dashboard" aria-label="DRISHTI command center">D</Link>
          {sidebarOpen && <div className="sidebar-brand-copy"><strong>DRISHTI</strong><span>Runtime security</span></div>}
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </div>
        <nav aria-label="Dashboard sections">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} title={sidebarOpen ? undefined : label} aria-label={label} aria-current={active ? "page" : undefined}>
                <Icon size={18} />
                {sidebarOpen && <span className="nav-label">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer" aria-label="DRISHTI runtime security">DW</div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-brand">
            <Link className="brand-mark brand-mark-small" href="/dashboard" aria-label="DRISHTI home">D</Link>
            <span className="brand-divider">/</span>
            <nav className="top-nav" aria-label="Primary navigation">
              {topNavItems.map(({ href, label }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return <Link key={href} href={href} className={active ? "active" : ""}>{label}</Link>;
              })}
            </nav>
          </div>
          <div className="topbar-actions">
            <span className={`system-health ${online ? "is-online" : online === false ? "is-offline" : ""}`}>
              <span className="health-dot" />{online === null ? "Checking system" : online ? "System healthy" : "Backend offline"}
            </span>
            <Link href="/dashboard/settings" className="topbar-icon" aria-label="Settings"><Settings size={16} /></Link>
            <Link href="/dashboard/approvals" className="topbar-icon" aria-label="Approvals"><Bell size={16} /></Link>
            <span className="avatar-mark" aria-label="DRISHTI operator">D</span>
          </div>
        </header>

        <div className="runtime-strip">
          <span className={`runtime-indicator ${live ? "is-live" : ""}`}><span className="health-dot" />{live ? "Live stream connected" : "Live stream reconnecting"}</span>
          <span className={`status-badge ${online && mode === "ENFORCE" ? "badge-normal" : "badge-warning"}`} title={online && mode !== "ENFORCE" ? "The backend is not enforcing policy decisions." : undefined}>
            {!online ? "MODE UNKNOWN" : mode === "ENFORCE" ? "ENFORCEMENT ACTIVE" : `${mode} MODE · OBSERVE ONLY`}
          </span>
          <span className="runtime-updated">Backend check: {lastRefresh}</span>
          <button className="refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh data">
            <RotateCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Refreshing…" : "Refresh data"}</span>
          </button>
        </div>

        <div className="page-shell" key={refreshKey}>{children}</div>
      </main>
    </div>
  );
}
