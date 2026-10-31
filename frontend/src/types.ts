export interface NormalizedEvent {
  id: string;
  ts: string;
  source: "cowrie" | "portal" | "opencanary" | "tripwire" | "prod" | string;
  sensor: string;
  zone: "deception" | "production" | string;
  session_id?: string;
  src_ip: string;
  raw_src_ip: string;
  dst_service: string;
  dst_port?: number;
  action: "connect" | "auth" | "command" | "download" | "upload" | "scan" | "web_request" | "firewall" | "fingerprint" | string;
  outcome: "success" | "failure" | "allow" | "drop" | "unknown" | string;
  user?: string;
  password?: string;
  cmd?: string;
  file?: {
    name?: string;
    sha256?: string;
    size?: number;
    url?: string;
  };
  honeytoken_id?: string;
  ssh?: {
    client?: string;
    hassh?: string;
  };
  flags: string[];
  techniques: string[];
  stage?: string;
  category?: string;
  raw?: Record<string, any>;
}

export interface Factor {
  label: string;
  points: number;
}

export interface TechniqueItem {
  id: string;
  name: string;
  tactic: string;
  count?: number;
}

export interface ActionItem {
  id: string;
  type: "block_source" | "isolate_host" | "hunt" | "rotate_credentials" | "export_iocs" | "monitor" | string;
  title: string;
  why: string;
  params: Record<string, any>;
  requires_approval: boolean;
  status: "recommended" | "approved" | "executed" | "dry_run";
  result?: string;
}

export interface RealAssetEvent {
  ts: string;
  sensor: string;
  zone: string;
  action: string;
  outcome: string;
  summary?: string;
}

export interface TimelineItem {
  ts: string;
  sensor: string;
  zone: string;
  action: string;
  outcome: string;
  summary: string;
  stage?: string;
  techniques: string[];
}

export interface TranscriptItem {
  ts: string;
  cmd: string;
}

export interface Profile {
  cadence: "human" | "bot" | "scripted" | "unknown";
  median_gap_s: number | null;
  sensors: string[];
  sessions: number;
  creds_tried: string[];
  ssh_client: string | null;
  hassh: string | null;
}

export interface Incident {
  id: string; // INC-<ip>
  src_ip: string;
  first_seen: string;
  last_seen: string;
  duration_s: number;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  verdict: "targeted" | "opportunistic";
  stage: string;
  country: string;
  asn: string;
  status: "open" | "contained" | "closed";
  real_asset_touched: boolean;
  honeytoken_hit: boolean;
  factors: Factor[];
  techniques: TechniqueItem[];
  real_asset_events: RealAssetEvent[];
  profile: Profile;
  timeline: TimelineItem[];
  transcript: TranscriptItem[];
  files: Array<{ name?: string; sha256?: string; size?: number }>;
  narrative: string;
  actions: ActionItem[];
}

export interface IncidentSummary {
  id: string;
  src_ip: string;
  severity: "critical" | "high" | "medium" | "low";
  score: number;
  verdict: "targeted" | "opportunistic";
  stage: string;
  status: "open" | "contained" | "closed";
  last_seen: string;
  first_seen?: string;
  real_asset_touched: boolean;
  honeytoken_hit: boolean;
  country: string;
  asn: string;
}

export interface KpiStats {
  raw_events: number;
  incidents: number;
  critical_open: number;
  opportunistic: number;
  contained: number;
  noise_suppressed_pct: number;
}
