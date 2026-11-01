"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertCircle, Bell, ChevronDown,
  Crosshair, FileText, Globe, Grid3x3,
  Home, LayoutDashboard, LogOut, Monitor, PanelLeftClose, PanelLeftOpen,
  Radio, RotateCw, Search, Server, Settings, Shield, ShieldAlert,
  ShieldCheck, Terminal, Users, Zap, X
} from "lucide-react";
import DemoControl from "./DemoControl";
import { useLive } from "../useLive";
import { IncidentSummary } from "../types";
import ThreatIntelTicker from "./ThreatIntelTicker";

interface Props {
  children: ReactNode;
  connected: boolean;
  onRefresh: () => void;
  error?: string | null;
}

const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { href: "/dashboard",         label: "Overview",          icon: LayoutDashboard },
      { href: "/dashboard/monitor", label: "Live Events",       icon: Monitor, badge: "LIVE" },
      { href: "/dashboard/incidents",label: "Incidents",        icon: Crosshair },
      { href: "/dashboard/response", label: "Response Center",  icon: Zap },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/attackers",     label: "Attacker Profiles", icon: Users },
      { href: "/dashboard/attack-matrix", label: "MITRE ATT&CK",      icon: Grid3x3 },
      { href: "/dashboard/search",        label: "SIEM Search",        icon: Search },
      { href: "/dashboard/network",       label: "Network Watch",      icon: Globe },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/sensors",       label: "Honeypot Fleet",      icon: Server },
      { href: "/dashboard/endpoint",      label: "Endpoint Monitoring", icon: ShieldCheck, badge: "LIVE" },
      { href: "/dashboard/reports",       label: "Reports",             icon: FileText },
      { href: "/dashboard/vulnerability", label: "Exploit Probes",      icon: ShieldAlert },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/settings", label: "Settings",     icon: Settings },
      { href: "/dashboard/demo",     label: "Demo Console",      icon: Terminal },
    ],
  },
];

const TOP_NAV = [
  { href: "/dashboard",             label: "Command Center" },
  { href: "/dashboard/monitor",     label: "Live Telemetry" },
  { href: "/dashboard/incidents",   label: "Incidents" },
  { href: "/dashboard/attack-matrix",label: "Threat Intel" },
  { href: "/dashboard/reports",     label: "Reports" },
];

const DATA_SOURCES = [
  { source: "cowrie", label: "Cowrie SSH" },
  { source: "portal", label: "Web Portal" },
  { source: "opencanary", label: "OpenCanary" },
  { source: "tripwire", label: "Tripwire" },
  { source: "prod", label: "Prod Shield" },
  { source: "endpoint", label: "Remote Endpoints" },
];

export default function Shell({ children, connected, onRefresh, error }: Props) {
  const { events, incidents } = useLive();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [utcTime, setUtcTime] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("—");
  const [profile, setProfile] = useState({ name: "Alex Vance", role: "Tier 1 Lead Analyst", email: "analyst@mirage.ops" });
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const incidentList = Object.values(incidents) as IncidentSummary[];
  const recentIncidents = [...incidentList]
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
    .slice(0, 3);
  const openIncidentCount = incidentList.filter((incident) => incident.status === "open").length;

  useEffect(() => {
    try { const s = localStorage.getItem("mirage_user"); if (s) setProfile(JSON.parse(s)); } catch { /**/ }
  }, []);

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const handleRefresh = async () => {
    setSpinning(true);
    try { await onRefresh(); setLastRefresh(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); }
    finally { setTimeout(() => setSpinning(false), 700); }
  };

  const initials = profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar (pure black) ───────────────────────────── */}
      <aside className={`sidebar${expanded ? " is-expanded" : ""}`}>
        {/* Brand */}
        <div className="sidebar-brand-row">
          <Link href="/dashboard" className="brand-mark" aria-label="MIRAGE home">M</Link>
          {expanded && (
            <div className="sidebar-brand-copy">
              <strong>MIRAGE</strong>
              <span>Deception SOC Platform</span>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {expanded && <div className="nav-section-label">{section.label}</div>}
              {!expanded && <div style={{ height: 6 }} />}
              {section.items.map(({ href, label, icon: Icon, badge }: any) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link${active ? " active" : ""}`}
                    title={!expanded ? label : undefined}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    {expanded && (
                      <>
                        <span className="nav-label">{label}</span>
                        {badge && (
                          <span style={{ marginLeft: "auto", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", padding: "1px 5px", borderRadius: 4, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>{badge}</span>
                        )}
                        {!badge && active && (
                          <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Data sources */}
        {expanded && (
          <div className="sidebar-sources">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(107,114,128,0.6)" }}>Data Sources</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#737373" }}>{DATA_SOURCES.length} configured</span>
            </div>
            {DATA_SOURCES.map(({ source, label }) => {
              const count = events.filter((event) => event.source === source).length;
              return (
              <div key={source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 5, fontSize: "0.68rem" }}>
                <span style={{ color: "#9ca3af" }}>{label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: count > 0 ? "#10b981" : "#6b7280", fontWeight: 600, fontSize: "0.62rem" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: count > 0 ? "#10b981" : "#6b7280" }} />
                  {count > 0 ? `${count} recent` : "No recent events"}
                </span>
              </div>
            );})}
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer" />
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <main className="main-panel" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Topbar — white, sticky */}
        <header className="topbar">
          <div className="topbar-brand">
            <Link href="/dashboard" className="brand-mark brand-mark-small" aria-label="MIRAGE home">M</Link>
            <span className="brand-divider">/</span>
            <nav className="top-nav" aria-label="Primary navigation">
              {TOP_NAV.map(({ href, label }) => (
                <Link key={href} href={href} className={isActive(href) ? "active" : ""}>{label}</Link>
              ))}
            </nav>
          </div>

          <div className="topbar-actions">
            {/* System health */}
            <span className={`system-health${connected ? " is-online" : " is-offline"}`}>
              <span className="health-dot" />
              {connected ? "Live stream connected" : "Reconnecting…"}
            </span>

            {/* UTC clock — compact */}
            <span className="topbar-clock" suppressHydrationWarning style={{ fontSize: "0.67rem", color: "#9ca3af", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{utcTime}</span>

            {/* Settings */}
            <Link href="/dashboard/settings" className="topbar-icon" aria-label="Settings"><Settings size={15} /></Link>

            {/* Notifications */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button className="topbar-icon" onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false); }} aria-label="Notifications" style={{ position: "relative" }}>
                <Bell size={15} />
                {openIncidentCount > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -3, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: "0.5rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                    {openIncidentCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="fade-up" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 13, boxShadow: "0 12px 40px rgba(0,0,0,0.12)", zIndex: 200, padding: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#000" }}>Security Alerts</span>
                    <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#737373" }}><X size={13} /></button>
                  </div>
                  {recentIncidents.length > 0 ? recentIncidents.map((incident) => {
                    const colors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
                    return (
                      <Link key={incident.id} href={`/dashboard/incidents/${encodeURIComponent(incident.id)}`} onClick={() => setNotifOpen(false)} style={{ display: "block", padding: "0.55rem 0.65rem", background: "#fafafa", border: "1px solid var(--color-border)", borderRadius: 8, marginBottom: 5, transition: "background 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: colors[incident.severity] ?? "#374151" }}>{incident.severity} · {incident.status}</span>
                          <span style={{ fontSize: "0.6rem", color: "#9ca3af", fontFamily: "var(--font-mono)" }}>{new Date(incident.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.7rem", color: "#737373" }}>{incident.src_ip} · {incident.verdict} · {incident.stage.replace(/_/g, " ")}</p>
                      </Link>
                    );
                  }) : (
                    <p style={{ margin: "0.5rem 0", color: "#737373", fontSize: "0.72rem" }}>No incidents have been recorded.</p>
                  )}
                  <Link href="/dashboard/incidents" onClick={() => setNotifOpen(false)} style={{ display: "block", textAlign: "center", fontSize: "0.7rem", color: "#6e44ff", marginTop: 4, fontWeight: 600 }}>View all alerts →</Link>
                </div>
              )}
            </div>

            {/* Demo button */}
            <button className="btn btn-violet btn-sm topbar-demo" onClick={() => setDemoOpen(true)} aria-label="Open demo controls" style={{ gap: 5 }}>
              <Zap size={13} /> Demo
            </button>

            {/* Avatar dropdown */}
            <div ref={avatarRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setAvatarOpen((v) => !v); setNotifOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "0.55rem", background: "none", border: "none", cursor: "pointer", paddingLeft: "0.65rem", borderLeft: "1px solid var(--color-border)" }}
                aria-label="User menu"
              >
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 600, color: "#000", lineHeight: 1.2 }}>{profile.name}</div>
                  <div style={{ fontSize: "0.6rem", color: "#737373", lineHeight: 1.2 }}>{profile.role}</div>
                </div>
                <div className="avatar-mark">{initials}</div>
                <ChevronDown size={13} style={{ color: "#737373" }} />
              </button>

              {avatarOpen && (
                <div className="fade-up" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 210, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 13, boxShadow: "0 12px 40px rgba(0,0,0,0.12)", zIndex: 200, padding: "0.75rem" }}>
                  <div style={{ padding: "0.4rem 0.5rem 0.65rem", marginBottom: "0.4rem", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#000" }}>{profile.name}</div>
                    <div style={{ fontSize: "0.63rem", color: "#9ca3af", fontFamily: "var(--font-mono)", marginTop: 2 }}>{profile.email}</div>
                  </div>
                  <Link href="/dashboard/settings" onClick={() => setAvatarOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.45rem 0.5rem", borderRadius: 7, color: "#374151", fontSize: "0.74rem", transition: "background 0.15s" }}>
                    <Settings size={13} /> Console Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Runtime sub-strip */}
        <div className="runtime-strip">
          <span className={`runtime-indicator${connected ? " is-live" : ""}`}>
            <span className="health-dot" />
            {connected ? "Live stream connected" : "Live stream reconnecting…"}
          </span>
          <span className="status-badge badge-normal" style={{ fontSize: "0.59rem" }}>ISOLATED LAB</span>
          <span className="runtime-updated">Last sync: {lastRefresh}</span>
          <button className="refresh-btn" onClick={handleRefresh} disabled={spinning} title="Refresh data">
            <RotateCw size={11} className={spinning ? "animate-spin" : ""} />
            {spinning ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="notice notice-warning" style={{ margin: "0.75rem 1.5rem 0", borderRadius: 10 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span><strong>Live connection warning — </strong>{error}</span>
          </div>
        )}

        {/* Page content */}
        <div className="page-shell" style={{ flex: 1 }}>
          {children}
        </div>

        <ThreatIntelTicker />
      </main>

      <DemoControl isOpen={demoOpen} onClose={() => setDemoOpen(false)} onRefresh={onRefresh} />
    </div>
  );
}
