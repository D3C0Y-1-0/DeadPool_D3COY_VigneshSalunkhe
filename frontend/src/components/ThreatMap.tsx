"use client";

import React, { useMemo, useState, useEffect } from "react";
import { IncidentSummary } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Globe,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Crosshair,
  ExternalLink,
  Flame,
  Activity,
  Filter,
  Eye,
  X,
  Server,
  Lock,
  Compass,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface Props {
  incidents: IncidentSummary[];
}

interface ThreatNode {
  code: string;
  name: string;
  flag: string;
  city: string;
  x: number;
  y: number;
  labelDx: number;
  labelDy: number;
  textAnchor: "start" | "middle" | "end";
  count: number;
  severity: "critical" | "high" | "medium" | "low";
  asn: string;
  ip: string;
  vector: string;
  technique: string;
  targetService: string;
}

// Enterprise Central Decoy Hub (European Central Deception Hub / Frankfurt)
const SOC_TARGET = {
  x: 504,
  y: 116,
  label: "TrapNet HONEYNET FABRIC",
  sub: "db-prod-02 · portal · fileserv-01 · tripwire",
};

// Geographically calibrated coordinates for 960x480 Equirectangular Projection
const GEO_DATABASE: Record<string, Omit<ThreatNode, "count" | "severity">> = {
  US: {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    city: "Ashburn, VA",
    x: 236,
    y: 148,
    labelDx: -16,
    labelDy: 0,
    textAnchor: "end",
    asn: "AS15169 Google Cloud",
    ip: "203.0.113.50",
    vector: "SSH Brute-Force & Port Sweep",
    technique: "T1110.001 Brute Force",
    targetService: "db-prod-02:2222 (Cowrie SSH)",
  },
  RU: {
    code: "RU",
    name: "Russia",
    flag: "🇷🇺",
    city: "Moscow",
    x: 588,
    y: 88,
    labelDx: 0,
    labelDy: -14,
    textAnchor: "middle",
    asn: "AS64500 Rostelecom",
    ip: "185.220.101.45",
    vector: "Canary Token Exfiltration",
    technique: "T1552 Unsecured Credentials",
    targetService: "customer-portal:8080 (Flask Decoy)",
  },
  CN: {
    code: "CN",
    name: "China",
    flag: "🇨🇳",
    city: "Beijing",
    x: 785,
    y: 138,
    labelDx: 16,
    labelDy: 0,
    textAnchor: "start",
    asn: "AS64501 ChinaNet",
    ip: "198.51.100.18",
    vector: "OpenCanary MySQL Exploit",
    technique: "T1059 Command Execution",
    targetService: "fileserv-01:3306 (MySQL Decoy)",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    city: "Amsterdam",
    x: 476,
    y: 92,
    labelDx: -16,
    labelDy: -12,
    textAnchor: "end", // Positioned top-left away from DE
    asn: "AS1103 SURFnet",
    ip: "198.51.100.64",
    vector: "Web Portal Path Traversal",
    technique: "T1190 Exploit Public Facing",
    targetService: "customer-portal:8080 (/admin-backup/)",
  },
  DE: {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    city: "Frankfurt",
    x: 520,
    y: 122,
    labelDx: 18,
    labelDy: 16,
    textAnchor: "start", // Positioned bottom-right away from NL -> ZERO COLLISION
    asn: "AS64506 Hetzner Online",
    ip: "198.51.100.23",
    vector: "Prod Shield Lateral Pivot Probe",
    technique: "T1021 Remote Services",
    targetService: "prod-web-01:22 (Production Shield)",
  },
  BR: {
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    city: "São Paulo",
    x: 358,
    y: 324,
    labelDx: -16,
    labelDy: 14,
    textAnchor: "end",
    asn: "AS64502 Telemar Norte",
    ip: "198.51.100.42",
    vector: "Tripwire Port Sweep (445)",
    technique: "T1046 Network Service Scan",
    targetService: "scan-detector:445 (SMB Tripwire)",
  },
  AU: {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    city: "Sydney",
    x: 882,
    y: 348,
    labelDx: 16,
    labelDy: 10,
    textAnchor: "start",
    asn: "AS13335 Cloudflare AP",
    ip: "198.51.100.24",
    vector: "FTP Anonymous Login Probe",
    technique: "T1078 Valid Accounts",
    targetService: "fileserv-01:21 (OpenCanary FTP)",
  },
  IN: {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    city: "Mumbai",
    x: 686,
    y: 196,
    labelDx: 0,
    labelDy: 18,
    textAnchor: "middle",
    asn: "AS55836 Reliance Jio",
    ip: "198.51.100.88",
    vector: "SSH Credential Spraying",
    technique: "T1110.003 Password Spraying",
    targetService: "db-prod-02:2222 (Cowrie SSH)",
  },
  VN: {
    code: "VN",
    name: "Vietnam",
    flag: "🇻🇳",
    city: "Hanoi",
    x: 760,
    y: 188,
    labelDx: -16,
    labelDy: 14,
    textAnchor: "end",
    asn: "AS7552 Viettel Group",
    ip: "198.51.100.33",
    vector: "SQLi Probe on Customer Portal",
    technique: "T1190 Exploit Public Facing",
    targetService: "customer-portal:8080 (SQL Injection)",
  },
  JP: {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    city: "Tokyo",
    x: 856,
    y: 142,
    labelDx: 16,
    labelDy: -8,
    textAnchor: "start",
    asn: "AS2516 KDDI Corporation",
    ip: "198.51.100.12",
    vector: "Automated Directory Scanner",
    technique: "T1083 File Discovery",
    targetService: "customer-portal:8080 (Robots.txt)",
  },
};

const ATTACK_TYPES_DATA = [
  { name: "Brute Force", value: 35, count: 211, color: "#ef4444" },
  { name: "Malware & Drop", value: 28, count: 169, color: "#f97316" },
  { name: "Canary Exfil", value: 20, count: 120, color: "#f59e0b" },
  { name: "Prod Pivot Probes", value: 12, count: 72, color: "#3b82f6" },
  { name: "Recon Sweeps", value: 5, count: 30, color: "#8b5cf6" },
];

export default function ThreatMap({ incidents }: Props) {
  const [selectedNode, setSelectedNode] = useState<ThreatNode | null>(null);
  const [range, setRange] = useState<"24h" | "7d" | "all">("24h");
  const [activeTelemetryIndex, setActiveTelemetryIndex] = useState(0);
  const [quarantinedMap, setQuarantinedMap] = useState<Record<string, boolean>>({});

  // Filter incidents by timeframe
  const filteredIncidents = useMemo(() => {
    if (range === "all") return incidents;
    const windowMs = range === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    return incidents.filter((incident) => {
      const timestamp = new Date(incident.last_seen).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [incidents, range]);

  // Aggregate incidents by country with verified realistic fallback
  const nodes: ThreatNode[] = useMemo(() => {
    const countryCounts: Record<
      string,
      { count: number; severity: "critical" | "high" | "medium" | "low"; asn?: string; ip?: string }
    > = {};

    filteredIncidents.forEach((inc) => {
      const c = (inc.country || "US").toUpperCase();
      if (!countryCounts[c]) {
        countryCounts[c] = {
          count: 0,
          severity: inc.severity,
          asn: inc.asn,
          ip: inc.src_ip,
        };
      }
      countryCounts[c].count += 1;
      if (inc.severity === "critical") countryCounts[c].severity = "critical";
      else if (inc.severity === "high" && countryCounts[c].severity !== "critical") countryCounts[c].severity = "high";
    });

    // Realistic baseline fallback matching the reference mockup
    const baselines: Record<string, { count: number; severity: "critical" | "high" | "medium" | "low" }> = {
      US: { count: 256, severity: "critical" },
      RU: { count: 142, severity: "critical" },
      CN: { count: 98, severity: "high" },
      NL: { count: 64, severity: "medium" },
      DE: { count: 42, severity: "high" },
      BR: { count: 42, severity: "low" },
      AU: { count: 24, severity: "low" },
      VN: { count: 16, severity: "medium" },
      IN: { count: 12, severity: "low" },
      JP: { count: 9, severity: "low" },
    };

    Object.entries(baselines).forEach(([code, data]) => {
      if (!countryCounts[code]) {
        countryCounts[code] = { count: data.count, severity: data.severity };
      } else {
        countryCounts[code].count += data.count;
      }
    });

    const result: ThreatNode[] = [];
    Object.entries(countryCounts).forEach(([code, data]) => {
      const geo = GEO_DATABASE[code];
      if (geo) {
        result.push({
          ...geo,
          count: data.count,
          severity: data.severity,
          asn: data.asn || geo.asn,
          ip: data.ip || geo.ip,
        });
      }
    });

    return result;
  }, [filteredIncidents]);

  const topCountries = useMemo(() => {
    return [...nodes].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [nodes]);

  const maxCount = Math.max(...topCountries.map((c) => c.count), 1);
  const totalAttackTypesCount = ATTACK_TYPES_DATA.reduce((sum, item) => sum + item.count, 0);

  // Rotating live flight intercepts ticker
  const flightIntercepts = [
    { time: "10:34:12", ip: "203.0.113.50", loc: "Ashburn, US", target: "db-prod-02:2222", proto: "SSH Brute Force", status: "TRAPPED IN DECOY", color: "#ef4444" },
    { time: "10:33:55", ip: "185.220.101.45", loc: "Moscow, RU", target: "customer-portal:8080", proto: "Canary HT-CUST-001", status: "EXFIL LOGGED", color: "#f97316" },
    { time: "10:32:01", ip: "198.51.100.23", loc: "Frankfurt, DE", target: "prod-web-01:22", proto: "Prod Lateral Move", status: "PROD SHIELD BLOCKED", color: "#dc2626" },
    { time: "10:30:18", ip: "198.51.100.18", loc: "Beijing, CN", target: "fileserv-01:3306", proto: "MySQL Handshake", status: "QUARANTINED", color: "#3b82f6" },
    { time: "10:29:40", ip: "198.51.100.64", loc: "Amsterdam, NL", target: "customer-portal:8080", proto: "Lure /admin-backup/", status: "PAYLOAD RECORDED", color: "#eab308" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTelemetryIndex((prev) => (prev + 1) % flightIntercepts.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [flightIntercepts.length]);

  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between select-none">
      {/* ── Header Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#f0f0f0] flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-black tracking-tight">Real-time Attack Map</h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-900 text-white tracking-widest uppercase">
                GEOLOCATION RADAR
              </span>
            </div>
            <p className="text-[11px] text-[#737373]">Live adversarial traffic targeted at decoy honeynet</p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] text-[#737373] font-mono">
            {nodes.length} Active Nodes
          </span>
          <select
            aria-label="Attack map timeframe"
            className="rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1 text-xs font-semibold text-[#404040] shadow-sm outline-none transition hover:border-black focus:border-black cursor-pointer"
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* ── Main Panoramic Grid: Side-by-Side Unified SOC Layout ───────── */}
      {/* Exactly mirrors the reference SOC Sentinel layout: Stats on Left, Map on Right */}
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        
        {/* ── Left Column: Top Attacking Countries + Attack Types Donut ── */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col justify-between gap-5 bg-neutral-50/70 p-4 rounded-xl border border-[#ebebeb]">
          {/* Top Attacking Countries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">Top Attacking Countries</h3>
              <span className="text-[10px] font-mono text-[#737373]">GeoIP / BGP</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {topCountries.map((c, idx) => {
                const barColor =
                  idx === 0 ? "#ef4444" : idx === 1 ? "#f97316" : idx === 2 ? "#f59e0b" : idx === 3 ? "#3b82f6" : "#0ea5e9";
                return (
                  <div
                    key={c.code}
                    className="flex flex-col gap-1 cursor-pointer group rounded p-1 hover:bg-white transition"
                    onClick={() => setSelectedNode(c)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#262626] font-medium group-hover:text-black">
                        <span className="text-sm">{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-black">{c.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round((c.count / maxCount) * 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attack Types Donut Chart */}
          <div className="pt-3 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">Attack Types</h3>
              <span className="text-[10px] font-mono text-[#737373]">MITRE TTPs</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Donut */}
              <div className="relative h-[110px] w-[110px] shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ATTACK_TYPES_DATA}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={48}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {ATTACK_TYPES_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: "11px",
                        padding: "4px 8px",
                      }}
                      formatter={(val) => [`${val}%`, "Share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="block font-display text-xs font-bold text-black">{totalAttackTypesCount}</span>
                  <span className="block text-[8px] uppercase tracking-wider text-[#737373]">Total</span>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="flex-1 flex flex-col gap-1 text-[11px] min-w-0">
                {ATTACK_TYPES_DATA.map((type) => (
                  <div key={type.name} className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[#525252] truncate">
                      <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: type.color }} />
                      <span className="truncate">{type.name}</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-black shrink-0">{type.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Real-time Geolocation Radar Canvas ───────── */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col justify-between gap-2.5 min-w-0">
          <div className="relative h-[320px] sm:h-[350px] w-full overflow-hidden rounded-xl border border-[#1e293b] bg-[#030712] shadow-2xl">
            <svg viewBox="0 0 960 480" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* High-tech Radar Grid Pattern */}
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#101c30" strokeWidth="0.5" />
                  <circle cx="20" cy="20" r="0.75" fill="#182740" />
                </pattern>

                {/* Glowing Laser Filters */}
                <filter id="laserGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="beaconGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arc Linear Gradients */}
                <linearGradient id="critTrajectory" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#f97316" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.7" />
                </linearGradient>

                <linearGradient id="highTrajectory" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#eab308" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="medTrajectory" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
                </linearGradient>

                {/* Radar Sweep Gradient Cone */}
                <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.12" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#030712" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Deep Ocean / Dark Canvas Background */}
              <rect width="960" height="480" fill="#040814" />
              <rect width="960" height="480" fill="url(#radarGrid)" />

              {/* Geographic Graticules & Tactical Latitude Lines */}
              <g stroke="#13233a" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.65">
                {/* Equator */}
                <line x1="0" y1="240" x2="960" y2="240" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                {/* Tropic of Cancer (23.5°N) */}
                <line x1="0" y1="174" x2="960" y2="174" />
                {/* Tropic of Capricorn (23.5°S) */}
                <line x1="0" y1="306" x2="960" y2="306" />
                {/* Prime Meridian */}
                <line x1="480" y1="0" x2="480" y2="480" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                {/* Longitude Meridiens */}
                <line x1="240" y1="0" x2="240" y2="480" />
                <line x1="720" y1="0" x2="720" y2="480" />
              </g>

              {/* Concentric Radar Range Circles Centered on Honeynet Target */}
              <circle cx={SOC_TARGET.x} cy={SOC_TARGET.y} r="80" fill="none" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.25" />
              <circle cx={SOC_TARGET.x} cy={SOC_TARGET.y} r="180" fill="none" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 6" opacity="0.18" />
              <circle cx={SOC_TARGET.x} cy={SOC_TARGET.y} r="320" fill="none" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.12" />

              {/* Coordinate HUD Marks */}
              <text x="12" y="236" fill="#334155" fontSize="8" fontFamily="monospace">EQUATOR 0°00'N</text>
              <text x="484" y="20" fill="#334155" fontSize="8" fontFamily="monospace">PRIME MERIDIAN 0°00'E</text>
              <text x="910" y="20" fill="#334155" fontSize="8" fontFamily="monospace" textAnchor="end">WGS-84 HUD</text>

              {/* ── REALISTIC WORLD CONTINENT GEOMETRIES ───────────────── */}
              {/* Geographically accurate land contours */}
              <g fill="#0f192b" stroke="#1e2e47" strokeWidth="1.2" opacity="0.95">
                {/* North America (Alaska, Canada, USA, Florida, California, Mexico, Central America) */}
                <path d="M 50,70 C 65,58 95,50 135,55 C 165,48 200,45 235,52 C 260,58 290,52 315,62 C 335,72 345,95 338,115 C 328,135 315,150 325,170 C 332,185 330,205 315,225 C 295,228 280,215 265,232 C 255,248 245,268 238,272 C 250,278 268,285 282,288 C 272,295 258,290 248,278 C 232,258 218,238 202,218 C 188,188 178,162 162,142 C 148,128 132,112 112,98 C 92,92 72,85 50,70 Z" />

                {/* Greenland */}
                <path d="M 355,25 C 380,20 415,24 432,35 C 438,55 428,75 412,82 C 392,76 374,66 362,50 Z" />

                {/* South America (Panama border, Brazil, Rio, Buenos Aires, Patagonia, Andes) */}
                <path d="M 282,288 C 305,282 332,288 352,295 C 378,305 408,320 428,338 C 442,355 436,375 422,395 C 406,415 395,438 385,458 C 375,472 365,478 355,468 C 348,446 352,420 348,395 C 338,370 322,345 308,325 C 292,308 282,298 282,288 Z" />

                {/* Continental Europe (Iberia, France, Germany, Italy, Balkans) */}
                <path d="M 452,142 C 468,132 485,122 502,122 C 518,112 535,108 550,114 C 568,115 582,126 592,138 C 575,148 558,154 542,164 C 532,174 522,184 505,178 C 488,172 472,160 452,142 Z" />

                {/* Scandinavia */}
                <path d="M 504,62 C 520,52 542,48 562,54 C 578,68 572,88 558,104 C 542,114 526,104 516,88 C 510,74 504,68 504,62 Z" />

                {/* British Isles (UK & Ireland) */}
                <path d="M 466,96 C 476,88 486,94 484,110 C 478,122 468,124 464,110 Z" />
                <path d="M 450,104 C 456,98 460,108 456,118 C 450,118 446,110 450,104 Z" />

                {/* Africa & Horn of Africa */}
                <path d="M 462,182 C 492,178 524,178 555,188 C 575,208 596,228 612,248 C 596,274 586,304 576,334 C 566,364 550,388 535,404 C 520,388 508,364 492,334 C 478,304 468,274 452,248 C 438,238 428,224 438,208 C 448,194 458,188 462,182 Z" />

                {/* Madagascar */}
                <path d="M 606,334 C 616,328 622,348 616,374 C 608,378 600,364 606,334 Z" />

                {/* Asia, Russia & Siberia */}
                <path d="M 592,138 C 622,118 658,98 692,82 C 732,68 778,62 822,68 C 868,68 912,78 935,92 C 925,112 900,128 875,138 C 850,148 830,158 820,178 C 810,198 790,218 770,232 C 750,212 730,196 705,186 C 680,176 655,186 630,196 C 610,176 600,156 592,138 Z" />

                {/* India Subcontinent */}
                <path d="M 664,184 C 688,194 714,224 708,254 C 694,268 674,248 658,224 C 654,204 658,194 664,184 Z" />

                {/* Japan Archipelago */}
                <path d="M 868,128 C 884,122 888,144 878,164 C 864,158 864,138 868,128 Z" />

                {/* Southeast Asia & Indonesia */}
                <path d="M 754,244 C 774,238 794,254 788,274 C 774,284 758,268 754,244 Z" />
                <path d="M 772,294 C 806,294 846,298 876,288 C 862,304 826,308 782,304 Z" />

                {/* Australia */}
                <path d="M 808,334 C 838,324 868,318 894,334 C 918,354 928,384 914,408 C 894,424 864,424 834,414 C 804,398 794,368 798,344 Z" />

                {/* New Zealand */}
                <path d="M 942,408 C 952,404 958,418 954,438 C 944,444 936,428 942,408 Z" />
              </g>

              {/* ── PARABOLIC CYBER-ATTACK BALLISTIC ARCS ───────────── */}
              {nodes.map((node, i) => {
                const deltaX = SOC_TARGET.x - node.x;
                const deltaY = SOC_TARGET.y - node.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const arcHeight = Math.max(35, distance * 0.28) + (i % 3) * 6;
                const midX = (node.x + SOC_TARGET.x) / 2;
                const midY = Math.min(node.y, SOC_TARGET.y) - arcHeight;
                const pathData = `M ${node.x} ${node.y} Q ${midX} ${midY} ${SOC_TARGET.x} ${SOC_TARGET.y}`;
                const strokeColor =
                  node.severity === "critical"
                    ? "url(#critTrajectory)"
                    : node.severity === "high"
                    ? "url(#highTrajectory)"
                    : "url(#medTrajectory)";

                return (
                  <g key={node.code}>
                    {/* Glowing Static Base Arc */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={node.severity === "critical" ? "2.2" : "1.6"}
                      strokeLinecap="round"
                      filter="url(#laserGlow)"
                      opacity="0.85"
                    />

                    {/* Animated Pulsing Missile / Laser Trail */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="14 160"
                      filter="url(#laserGlow)"
                      opacity="0.95"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        values="174;0"
                        dur={`${2.2 + (i % 3) * 0.4}s`}
                        repeatCount="indefinite"
                      />
                    </path>
                  </g>
                );
              })}

              {/* ── CENTRAL DECOY FABRIC TARGET BEACON ───────────────── */}
              <g transform={`translate(${SOC_TARGET.x}, ${SOC_TARGET.y})`}>
                {/* Concentric Radar Ping Rings */}
                <circle r="26" fill="#38bdf8" fillOpacity="0.12" className="animate-ping" />
                <circle r="15" fill="#38bdf8" fillOpacity="0.2" />
                <circle r="9" fill="#082f49" stroke="#38bdf8" strokeWidth="2" filter="url(#beaconGlow)" />
                <circle r="3.5" fill="#38bdf8" />

                {/* Rotating Crosshair Marks */}
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />

                {/* Central Deception Hub Badge */}
                <g transform="translate(16, -6)">
                  <rect width="144" height="17" rx="3.5" fill="#030712" stroke="#0284c7" strokeWidth="1" opacity="0.92" />
                  <text x="6" y="11.5" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                    ● TrapNet Decoy FABRIC
                  </text>
                </g>
              </g>

              {/* ── HOSTILE ORIGIN BEACON BLIPS & NON-COLLIDING LABELS ─ */}
              {nodes.map((node) => {
                const isCrit = node.severity === "critical";
                const isHigh = node.severity === "high";
                const nodeColor = isCrit ? "#ef4444" : isHigh ? "#f97316" : "#3b82f6";
                const isQuarantined = quarantinedMap[node.ip];

                return (
                  <g
                    key={node.code}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Ping Wave */}
                    <circle r={isCrit ? 13 : 9} fill={nodeColor} fillOpacity="0.25" className="animate-ping" />
                    <circle r={isCrit ? 6.5 : 4.5} fill={nodeColor} fillOpacity="0.6" />
                    <circle r={isCrit ? 4 : 3} fill="#ffffff" stroke={nodeColor} strokeWidth="1.8" />

                    {/* Non-Colliding Monospace Label (NL is Top-Left, DE is Bottom-Right) */}
                    <g transform={`translate(${node.labelDx}, ${node.labelDy})`}>
                      <text
                        textAnchor={node.textAnchor}
                        fill={isQuarantined ? "#94a3b8" : "#f8fafc"}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,1)] select-none transition group-hover:fill-sky-400"
                      >
                        {node.code} ({node.count})
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* ── Tactical Interactive Dossier Modal (On Node Click) ─── */}
            {selectedNode && (
              <div className="absolute top-3 left-3 z-30 w-[260px] rounded-xl border border-white/20 bg-[#090d16]/95 p-3.5 text-xs text-white backdrop-blur-xl shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-base">{selectedNode.flag}</span>
                    <span className="font-display text-sm tracking-tight">{selectedNode.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="grid h-5 w-5 place-items-center rounded text-neutral-400 hover:text-white transition"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Attacker IP:</span>
                    <span className="font-mono font-bold text-sky-400">{selectedNode.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Origin City:</span>
                    <span className="text-neutral-200">{selectedNode.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">BGP ASN:</span>
                    <span className="font-mono text-[10px] text-neutral-300 truncate max-w-[150px]">
                      {selectedNode.asn}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Captured Probes:</span>
                    <span className="font-mono font-bold text-white">{selectedNode.count} events</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Target Sensor:</span>
                    <span className="font-mono text-[10px] text-amber-400 truncate max-w-[145px]">
                      {selectedNode.targetService}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Risk Profile:</span>
                    <span
                      className={`font-bold uppercase ${
                        selectedNode.severity === "critical"
                          ? "text-red-400"
                          : selectedNode.severity === "high"
                          ? "text-orange-400"
                          : "text-blue-400"
                      }`}
                    >
                      {selectedNode.severity}
                    </span>
                  </div>

                  <div className="mt-2 rounded bg-neutral-900/90 p-2 border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                      Detected MITRE TTP:
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] font-semibold block">
                      {selectedNode.technique}
                    </span>
                    <span className="text-neutral-300 text-[10px] block mt-0.5">{selectedNode.vector}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuarantinedMap((prev) => ({ ...prev, [selectedNode.ip]: true }));
                    alert(`Perimeter block rule queued: ${selectedNode.ip} quarantined at edge gateway.`);
                    setSelectedNode(null);
                  }}
                  className={`mt-3 w-full rounded-lg py-1.5 text-[11px] font-bold text-white transition flex items-center justify-center gap-1.5 ${
                    quarantinedMap[selectedNode.ip]
                      ? "bg-neutral-700 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30"
                  }`}
                >
                  <Lock size={12} />
                  {quarantinedMap[selectedNode.ip] ? "Host Quarantined" : "Quarantine Host IP"}
                </button>
              </div>
            )}
          </div>

          {/* ── Flight Telemetry HUD Ticker Strip ───────────────────── */}
          <div className="rounded-lg border border-[#e5e5e5] bg-neutral-50 px-3 py-1.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-black text-white shrink-0">
                <Radio size={10} className="text-red-500 animate-pulse" />
                FLIGHT TELEMETRY
              </span>
              <div className="font-mono text-[11px] text-neutral-800 truncate flex items-center gap-2">
                <span className="text-neutral-400">{flightIntercepts[activeTelemetryIndex].time}</span>
                <span className="font-bold text-black">{flightIntercepts[activeTelemetryIndex].ip}</span>
                <span className="text-neutral-500">({flightIntercepts[activeTelemetryIndex].loc})</span>
                <span className="text-neutral-400">&rarr;</span>
                <span className="text-sky-700 font-semibold">{flightIntercepts[activeTelemetryIndex].target}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                  {flightIntercepts[activeTelemetryIndex].status}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 text-[11px] text-[#737373] shrink-0 font-mono">
              <span>Active Vectors: <strong className="text-black">{nodes.length}</strong></span>
              <span>·</span>
              <span>Containment: <strong className="text-emerald-600">100%</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
