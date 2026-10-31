"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Bell,
  Crosshair,
  Database,
  FileText,
  Gauge,
  Grid,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RotateCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  Zap,
  Search,
  Monitor,
  ShieldAlert,
  Globe,
  LifeBuoy,
  BookOpen,
  LayoutDashboard
} from "lucide-react";
import DemoControl from "./DemoControl";

interface Props {
  children: ReactNode;
  connected: boolean;
  onRefresh: () => void;
  error?: string | null;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/monitor", label: "Real-time Monitor", icon: Monitor },
  { href: "/dashboard/search", label: "SIEM Search", icon: Search },
  { href: "/dashboard/incidents", label: "Alerts", icon: Bell },
  { href: "/dashboard/incidents", label: "Incidents", icon: Crosshair },
  { href: "/dashboard/endpoint", label: "Endpoint Security", icon: ShieldCheck },
  { href: "/dashboard/network", label: "Network Watch", icon: Globe },
  { href: "/dashboard/attack-matrix", label: "Threat Intelligence", icon: Grid },
  { href: "/dashboard/vulnerability", label: "Vulnerability Mgmt", icon: ShieldAlert },
  { href: "/dashboard/cases", label: "Case Management", icon: Database },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon }
];

const topNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/incidents", label: "Alerts" },
  { href: "/dashboard/incidents", label: "Incidents" },
  { href: "/dashboard/attack-matrix", label: "Threat Intel" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/cases", label: "Cases" },
  { href: "/dashboard/playbooks", label: "Playbooks" }
];

export default function Shell({ children, connected, onRefresh, error }: Props) {
  const pathname = usePathname();
  const [demoOpen, setDemoOpen] = useState(false);
  const [utcTime, setUtcTime] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open for professional look
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("not yet");

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefresh(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar${sidebarOpen ? " is-expanded" : ""}`}>
        <div className="sidebar-brand-row">
          <div className="brand-mark">
            <ShieldCheck size={22} className="text-accent" />
          </div>
          {sidebarOpen && (
            <div className="sidebar-brand-copy">
              <strong>SOC SENTINEL</strong>
              <span>Real-time Security Operations</span>
            </div>
          )}
        </div>

        <nav aria-label="Dashboard sections" className="mt-4">
          <div className="px-3 mb-2 text-[10px] font-bold text-mute uppercase tracking-widest">
            {sidebarOpen ? "Data Sources" : ""}
          </div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={label}
                href={href}
                className={`nav-link ${active ? "active" : ""}`}
                title={sidebarOpen ? undefined : label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  {sidebarOpen && <span className="nav-label">{label}</span>}
                </div>
                {active && sidebarOpen && <div className="w-1 h-4 bg-accent rounded-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-4 border-t border-line">
          {sidebarOpen && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-mute">Windows Logs</span>
                <span className="flex items-center gap-1.5 text-low">
                  <div className="w-1.5 h-1.5 rounded-full bg-low" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-mute">Firewall</span>
                <span className="flex items-center gap-1.5 text-low">
                  <div className="w-1.5 h-1.5 rounded-full bg-low" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-mute">DNS Logs</span>
                <span className="flex items-center gap-1.5 text-low">
                  <div className="w-1.5 h-1.5 rounded-full bg-low" /> Connected
                </span>
              </div>
            </div>
          )}
          <Link className="sidebar-footer" href="/" aria-label="Back to landing page" title="Back to landing page">
            <Home size={15} />
          </Link>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-brand">
            <nav className="top-nav" aria-label="Primary navigation">
              {topNavItems.map(({ href, label }) => (
                <Link key={label} href={href} className={isActive(href) ? "active" : ""}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="topbar-actions">
            <div className="flex items-center gap-4 mr-4">
              <Bell size={18} className="text-mute cursor-pointer hover:text-ink transition-colors" />
              <SettingsIcon size={18} className="text-mute cursor-pointer hover:text-ink transition-colors" />
              <div className="flex items-center gap-2 pl-4 border-l border-line">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-ink leading-tight">Analyst</div>
                  <div className="text-[10px] text-mute leading-tight">Tier 1 Analyst</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-panel-card border border-line flex items-center justify-center overflow-hidden">
                  <Users size={16} className="text-mute" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="runtime-strip bg-panel/50 backdrop-blur-md">
          <span className={`runtime-indicator ${connected ? "is-live" : ""}`}>
            <span className="health-dot" />
            {connected ? "Live telemetry active" : "Telemetry disconnected"}
          </span>
          <span className="runtime-updated border-l border-line pl-3">{utcTime}</span>
          <button
            className="refresh-btn ml-3"
            onClick={handleRefresh}
            disabled={isRefreshing}
            type="button"
          >
            <RotateCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Sync Logs"}</span>
          </button>
          <button className="refresh-btn" type="button" onClick={() => setDemoOpen(true)}>
            <Zap size={12} />
            <span>Demo Mode</span>
          </button>
        </div>

        <div className="page-shell">
          {error ? (
            <div role="alert" className="notice notice-danger mb-4">
              <AlertCircle size={16} />
              <div>
                <strong>Connection Error: </strong>
                <span className="mono">{error}</span>
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </main>

      <DemoControl isOpen={demoOpen} onClose={() => setDemoOpen(false)} onRefresh={onRefresh} />
    </div>
  );
}
