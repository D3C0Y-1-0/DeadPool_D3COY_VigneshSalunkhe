"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Globe, Save, Settings, Shield, User } from "lucide-react";

const TABS = ["General", "Security", "Notifications", "Integrations"] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("General");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: "Alex Vance", role: "Tier 1 Lead Analyst", email: "analyst@mirage.ops" });
  const [platform, setPlatform] = useState({ name: "MIRAGE", timezone: "UTC+05:30", retention: "30" });
  const [notifications, setNotifications] = useState({ critical: true, high: true, medium: false, low: false, webhook: "" });

  useEffect(() => {
    try {
      const s = localStorage.getItem("mirage_user");
      if (s) setProfile(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  const handleSave = () => {
    try { localStorage.setItem("mirage_user", JSON.stringify(profile)); } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-mute)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>Configuration</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Settings</h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--color-mute)" }}>Configure your MIRAGE SOC Platform preferences</p>
      </div>

      {saved && (
        <div className="notice notice-success"><CheckCircle size={14} style={{ flexShrink: 0 }} /> Settings saved successfully.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: "0.75rem" }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.6rem 0.75rem", borderRadius: 9, fontSize: "0.78rem", fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? "var(--color-accent)" : "var(--color-mute)", background: activeTab === tab ? "rgba(59,130,246,0.1)" : "transparent", border: activeTab === tab ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent", marginBottom: 2, cursor: "pointer", textAlign: "left" }}>
              {tab === "General" ? <Settings size={14} /> : tab === "Security" ? <Shield size={14} /> : tab === "Notifications" ? <Shield size={14} /> : <Globe size={14} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card" style={{ padding: "1.5rem" }}>
          {activeTab === "General" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>Analyst Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="Display Name">
                  <input className="input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Role / Tier">
                  <input className="input" value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} />
                </Field>
                <Field label="Email Address">
                  <input className="input" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                </Field>
              </div>
              <div style={{ height: 1, background: "var(--color-line)" }} />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>Platform Settings</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <Field label="Platform Name">
                  <input className="input" value={platform.name} onChange={(e) => setPlatform((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Timezone">
                  <select className="select-input" value={platform.timezone} onChange={(e) => setPlatform((p) => ({ ...p, timezone: e.target.value }))}>
                    {["UTC", "UTC+05:30", "UTC+08:00", "UTC-05:00", "UTC-08:00"].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Field>
                <Field label="Log Retention (days)">
                  <select className="select-input" value={platform.retention} onChange={(e) => setPlatform((p) => ({ ...p, retention: e.target.value }))}>
                    {["7","14","30","60","90","180","365"].map((d) => <option key={d} value={d}>{d} days</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {activeTab === "Security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>Security Policies</h3>
              {[
                { label: "Require MFA for critical action approvals", checked: true },
                { label: "Enable audit logging for all analyst actions", checked: true },
                { label: "Auto-contain on critical severity incidents", checked: false },
                { label: "Block list sync with production firewall", checked: true },
                { label: "Honeytoken alert escalation to email", checked: false },
              ].map((item, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "0.65rem 0.85rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-line)", borderRadius: 9 }}>
                  <input type="checkbox" defaultChecked={item.checked} style={{ width: 15, height: 15, accentColor: "var(--color-accent)" }} />
                  <span style={{ fontSize: "0.78rem", color: "var(--color-ink)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === "Notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>Alert Thresholds</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["critical","high","medium","low"] as const).map((sev) => {
                  const colors: Record<string,string> = { critical: "#f43f5e", high: "#f97316", medium: "#eab308", low: "#22c55e" };
                  return (
                    <label key={sev} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "0.65rem 0.85rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-line)", borderRadius: 9 }}>
                      <input type="checkbox" checked={notifications[sev]} onChange={(e) => setNotifications((p) => ({ ...p, [sev]: e.target.checked }))} style={{ width: 15, height: 15, accentColor: colors[sev] }} />
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: `${colors[sev]}12`, color: colors[sev], border: `1px solid ${colors[sev]}30` }}>{sev}</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--color-mute)" }}>Send alert for {sev} severity incidents</span>
                    </label>
                  );
                })}
              </div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>Webhook Integration</h3>
              <Field label="Webhook URL (optional)">
                <input className="input" type="url" placeholder="https://hooks.slack.com/…" value={notifications.webhook} onChange={(e) => setNotifications((p) => ({ ...p, webhook: e.target.value }))} />
              </Field>
            </div>
          )}

          {activeTab === "Integrations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-ink)" }}>External Integrations</h3>
              {[
                { name: "Splunk SIEM",       status: "Not configured", desc: "Forward events to Splunk HEC endpoint" },
                { name: "Microsoft Sentinel",status: "Not configured", desc: "Push IOCs to Azure Sentinel workspace" },
                { name: "PagerDuty",         status: "Not configured", desc: "Critical incident alerting via PagerDuty" },
                { name: "Jira Service Mgmt", status: "Not configured", desc: "Auto-create Jira tickets for high+ incidents" },
                { name: "STIX/TAXII Feed",   status: "Active",         desc: "Publish IOCs to threat intelligence sharing" },
              ].map((item) => (
                <div key={item.name} style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-line)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-ink)" }}>{item.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--color-mute)", marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: item.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", color: item.status === "Active" ? "#22c55e" : "#64748b", border: `1px solid ${item.status === "Active" ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.2)"}` }}>{item.status}</span>
                    <button className="btn btn-ghost btn-sm">Configure</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ gap: 6 }}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
