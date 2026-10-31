"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Bell,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  Filter,
  FolderKanban,
  Gift,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  MoreVertical,
  MousePointer,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Zap
} from "lucide-react";

export default function HomePage() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [searchFilter, setSearchFilter] = useState("");

  const vendorRows = [
    {
      id: "ephemeral",
      name: "Ephemeral",
      domain: "ephemeral.io",
      initial: "E",
      initialBg: "bg-purple-600/30 text-purple-300 border-purple-500/40",
      rating: 90,
      ratingChange: "+1.5%",
      changePositive: true,
      lastAssessed: "22 Jan 2026",
      badges: [
        { label: "Active", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        { label: "Customer data", style: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
        { label: "Admin", style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
        { label: "+5", style: "bg-white/10 text-slate-300 border-white/10" }
      ]
    },
    {
      id: "slacklm",
      name: "SlackLM Lab",
      domain: "slacklm.com",
      initial: "S",
      initialBg: "bg-blue-600/30 text-blue-300 border-blue-500/40",
      rating: 72,
      ratingChange: "+4%",
      changePositive: true,
      lastAssessed: "20 Jan 2026",
      badges: [
        { label: "Active", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        { label: "Business data", style: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
        { label: "Admin", style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
        { label: "+4", style: "bg-white/10 text-slate-300 border-white/10" }
      ]
    },
    {
      id: "warpseed",
      name: "Warpspeed AI",
      domain: "getwarpseed.com",
      initial: "W",
      initialBg: "bg-cyan-600/30 text-cyan-300 border-cyan-500/40",
      rating: 78,
      ratingChange: "+6%",
      changePositive: true,
      lastAssessed: "24 Jan 2026",
      badges: [
        { label: "Active", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        { label: "Customer data", style: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
        { label: "Financial", style: "bg-pink-500/15 text-pink-300 border-pink-500/30" }
      ]
    },
    {
      id: "cloudwatch",
      name: "CloudWatch Guard",
      domain: "cloudwatch.app",
      initial: "C",
      initialBg: "bg-amber-600/30 text-amber-300 border-amber-500/40",
      rating: 58,
      ratingChange: "-3%",
      changePositive: false,
      lastAssessed: "26 Jan 2026",
      badges: [
        { label: "Active", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        { label: "Database access", style: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
        { label: "Admin", style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" }
      ]
    },
    {
      id: "contractai",
      name: "ContractAI",
      domain: "contractai.io",
      initial: "C",
      initialBg: "bg-purple-600/30 text-purple-300 border-purple-500/40",
      rating: 42,
      ratingChange: "-7%",
      changePositive: false,
      lastAssessed: "10 Jan 2026",
      badges: [
        { label: "Active", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        { label: "Salesforce", style: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
        { label: "Admin", style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
        { label: "+4", style: "bg-white/10 text-slate-300 border-white/10" }
      ]
    }
  ];

  const filteredRows = vendorRows.filter((r) =>
    r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.domain.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // -------------------------------------------------------------
  // VISUAL AI SAAS PRODUCT STATE & DEMONSTRATIVE DATA
  // (Human-in-the-loop approvals, fleet monitor, readiness calculator)
  // -------------------------------------------------------------
  const [activeDemoAction, setActiveDemoAction] = useState<"stripe" | "export" | "schema">("stripe");
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "denied">("pending");
  const [approvalAnimating, setApprovalAnimating] = useState(false);
  const [activeFleetIndex, setActiveFleetIndex] = useState(0);
  const [agentCount, setAgentCount] = useState(8);
  const [selectedRisks, setSelectedRisks] = useState<string[]>(["database", "financial"]);
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleActionChange = (actionKey: "stripe" | "export" | "schema") => {
    setActiveDemoAction(actionKey);
    setApprovalStatus("pending");
    setApprovalAnimating(false);
  };

  const handleApprovalDecision = (decision: "approved" | "denied") => {
    setApprovalAnimating(true);
    setTimeout(() => {
      setApprovalStatus(decision);
      setApprovalAnimating(false);
    }, 450);
  };

  const toggleRiskOption = (riskKey: string) => {
    setSelectedRisks((prev) =>
      prev.includes(riskKey) ? prev.filter((k) => k !== riskKey) : [...prev, riskKey]
    );
  };

  // Human-in-the-Loop Approval Demo Scenarios
  const approvalActions = {
    stripe: {
      id: "stripe",
      title: "High-Value Payment Authorization",
      agent: "ProcurementBot",
      model: "Claude 3.5 Sonnet",
      risk: "High Financial Value",
      riskStyle: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      description: "Autonomous Agent triggered scale-up order: $1,450.00 via Stripe API",
      reasoning: "Cluster memory reached 88% capacity. Automated policy requires provisioning 2x H100 GPU instances.",
      policyFired: "POL-FIN-02: Single-action transfers > $500 require Human Manager Approval",
      amount: "$1,450.00",
      recipient: "AWS Infrastructure / Stripe",
      approvedMsg: "Action Authorized! $1,450.00 payment dispatched in 2.4ms. Audit token #AW-9021 created.",
      deniedMsg: "Action Blocked! Transfer halted before execution. Agent safely isolated in sandbox."
    },
    export: {
      id: "export",
      title: "Customer Contact Sync Request",
      agent: "SupportCopilot",
      model: "GPT-4o",
      risk: "Customer Privacy & PII",
      riskStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30",
      description: "Attempted bulk export of 850 customer records to external analytics webhook",
      reasoning: "Agent attempting to backfill customer cohort analytics to third-party endpoint.",
      policyFired: "POL-SEC-04: Strict Zero-PII Exfiltration to Unregistered Third-Party Webhooks",
      amount: "850 Profiles",
      recipient: "api.external-metrics.io/sync",
      approvedMsg: "One-time exception approved by Lead Architect. Sensitive PII redacted automatically.",
      deniedMsg: "Outbound Exfiltration Blocked! Zero records transmitted. Incident logged in Audit Vault."
    },
    schema: {
      id: "schema",
      title: "Production Database Migration",
      agent: "DevOpsAgent",
      model: "Gemini 1.5 Pro",
      risk: "Infrastructure DDL",
      riskStyle: "text-purple-300 bg-purple-500/15 border-purple-500/30",
      description: "Agent proposed schema modification: ALTER TABLE users DROP COLUMN phone",
      reasoning: "Task prompt instructed deprecating legacy telephone fields from user table.",
      policyFired: "POL-OPS-01: Irreversible DDL schema mutations require 2-person security review",
      amount: "Production DB",
      recipient: "Postgres Cluster (us-east-1)",
      approvedMsg: "Migration signed off by Lead DBA. Snapshot backup automatically verified.",
      deniedMsg: "Execution Halted! Table schema protected. Accidental data destruction prevented."
    }
  };

  // -------------------------------------------------------------
  // CONTINUOUS MOVING TICKER STRIP DATA ("moving strip not box")
  // -------------------------------------------------------------
  const marqueeItems = [
    { icon: "🦜", name: "LangChain", type: "Native SDK", badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    { icon: "🟣", name: "Claude 3.5 Sonnet", type: "Anthropic", badgeStyle: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30" },
    { icon: "👥", name: "CrewAI", type: "Swarm Guard", badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
    { icon: "🟢", name: "GPT-4o & o1", type: "OpenAI", badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    { icon: "🤖", name: "Microsoft AutoGen", type: "Role Contracts", badgeStyle: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
    { icon: "🔵", name: "Gemini 1.5 Pro", type: "Google DeepMind", badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    { icon: "🦙", name: "LlamaIndex", type: "RAG Firewall", badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    { icon: "🟠", name: "Llama 3.3", type: "Meta / vLLM", badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  ];

  const marqueeItemsReverse = [
    { icon: "⚡", name: "Slack Approvals", type: "Push Webhook", badgeStyle: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    { icon: "💳", name: "Stripe API", type: "Spend Limits", badgeStyle: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
    { icon: "🐘", name: "PostgreSQL", type: "DDL Guard", badgeStyle: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    { icon: "🐳", name: "Kubernetes Sidecar", type: "Zero-Code Proxy", badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
    { icon: "🐙", name: "GitHub Actions", type: "CI/CD Gate", badgeStyle: "bg-white/10 text-slate-300 border-white/20" },
    { icon: "🛡️", name: "Zero Data Retention", type: "Privacy SLA", badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    { icon: "⏱️", name: "< 4.2ms Enforcement", type: "Inline Speed", badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    { icon: "📜", name: "MITRE ATLAS", type: "Threat Standard", badgeStyle: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  ];

  // Visual Before & After comparison points
  const beforePoints = [
    { title: "Surprise Token Bills", desc: "Recursive loops run unchecked overnight, burning thousands in LLM credits" },
    { title: "Accidental Production Damage", desc: "Hallucinated commands drop databases or trigger unintended customer emails" },
    { title: "Silent Data Exfiltration", desc: "Adversarial prompt injections trick agents into leaking private internal records" },
    { title: "Engineering Anxiety", desc: "Teams are terrified to deploy autonomous agents directly to real paying customers" }
  ];

  const afterPoints = [
    { title: "Sub-5ms Loop Breakers", desc: "Deterministic circuit breakers detect and halt runaway recursion instantly" },
    { title: "1-Click Human Approvals", desc: "Instant mobile & Slack approval requests before any high-stakes tool commits" },
    { title: "Zero-Trust Context Shield", desc: "Sanitizes prompt injection vectors and isolates rogue tool calls automatically" },
    { title: "Fearless Production Autonomy", desc: "Ship autonomous workflows with 100% confidence and verifiable audit trails" }
  ];

  // Visual Agent Fleet Showcase data
  const agentFleet = [
    {
      name: "Customer Support Copilot",
      role: "Tier-1 Autonomous Concierge",
      model: "GPT-4o",
      framework: "CrewAI",
      avatarBg: "bg-purple-600/30 text-purple-300 border-purple-500/40",
      rating: "98% Health",
      allowedTools: ["Zendesk API", "Internal Knowledgebase", "Stripe (Read-Only)"],
      activeGuardrails: ["Zero PII Exfiltration", "Adversarial Prompt Shield"],
      activity: "Resolved 412 customer tickets with 0 security escalations today"
    },
    {
      name: "Financial Operations Bot",
      role: "Procurement & Invoice Auto-Pilot",
      model: "Claude 3.5 Sonnet",
      framework: "AutoGen",
      avatarBg: "bg-emerald-600/30 text-emerald-300 border-emerald-500/40",
      rating: "100% Health",
      allowedTools: ["QuickBooks API", "Vendor Portal", "Invoice PDF Generator"],
      activeGuardrails: ["$500 Human Approval Rule", "Recursive Loop Circuit Breaker"],
      activity: "Approved 18 vendor invoices; intercepted 1 duplicate $4,200 payment"
    },
    {
      name: "DevOps & Infrastructure Agent",
      role: "Cloud Scale & Health Copilot",
      model: "Gemini 1.5 Pro",
      framework: "LangChain",
      avatarBg: "bg-blue-600/30 text-blue-300 border-blue-500/40",
      rating: "99% Health",
      allowedTools: ["Kubernetes Metrics", "CloudWatch Logs", "Docker Sandbox"],
      activeGuardrails: ["DDL Schema Freeze", "Restricted Shell Sandbox"],
      activity: "Scaled 3 container pods smoothly; prevented 1 unauthorized DROP TABLE"
    }
  ];

  // Customer Wall of Love (Visual Testimonials)
  const testimonials = [
    {
      quote: "AgentWarden gave us the confidence to launch our autonomous support concierge to 40,000 customers. We caught two prompt injection attempts on day one with zero user disruption.",
      name: "Sarah Jenkins",
      title: "VP of AI Engineering",
      company: "FinScale",
      avatar: "SJ",
      avatarBg: "bg-purple-600/30 text-purple-300 border-purple-500/40"
    },
    {
      quote: "The 1-click Slack approval workflow is brilliant. Our agents do real work autonomously, but our team stays in control of every high-value dollar and production mutation.",
      name: "Alex Rivera",
      title: "Chief Technology Officer",
      company: "AutoFlow AI",
      avatar: "AR",
      avatarBg: "bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
    },
    {
      quote: "Our enterprise buyers demanded strict SOC2-ready agent governance before signing. AgentWarden gave it to us out of the box in one afternoon. Absolute game-changer.",
      name: "Marcus Vance",
      title: "Head of Security & Trust",
      company: "DataNest Cloud",
      avatar: "MV",
      avatarBg: "bg-blue-600/30 text-blue-300 border-blue-500/40"
    }
  ];

  // Pricing Plans data
  const pricingPlans = [
    {
      name: "Developer",
      tagline: "For hackers, researchers & early agent builders",
      monthlyPrice: 0,
      annualPrice: 0,
      badge: "Free Forever",
      popular: false,
      cta: "Get Started Free",
      href: "/dashboard",
      features: [
        "Up to 3 Autonomous Agents",
        "15,000 Inspected Events / month",
        "Deterministic Policy Engine (< 5ms)",
        "Core Threat Interception (Prompt Injection & Shell)",
        "Community Discord Support",
        "7-Day Incident Audit Log Retention"
      ]
    },
    {
      name: "Team & Growth",
      tagline: "For fast-moving AI startups and scaling product teams",
      monthlyPrice: 79,
      annualPrice: 63,
      badge: "Most Popular",
      popular: true,
      cta: "Start 14-Day Free Trial",
      href: "/dashboard",
      features: [
        "Unlimited Autonomous Agents",
        "250,000 Inspected Events / month",
        "Human-in-the-Loop Push & Slack Webhooks",
        "Interactive Topological Agent Graph",
        "Role-Based Tool Contracts & Quotas",
        "Full Incident Replay & Forensics",
        "30-Day Audit Vault Retention",
        "Priority Support & 99.9% SLA"
      ]
    },
    {
      name: "Enterprise",
      tagline: "For mission-critical production systems & regulated orgs",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      badge: "Air-Gapped & VPC",
      popular: false,
      cta: "Contact Enterprise Team",
      href: "/dashboard",
      features: [
        "Self-Hosted Kubernetes Sidecar / Private VPC",
        "Zero Outbound Internet Required (Air-gapped)",
        "Custom Fine-Tuned Threat Classifiers",
        "SOC2 Type II, HIPAA & ISO-27001 Evidence Reports",
        "Unlimited Event Volume & Retention",
        "Dedicated Security Architect & 24/7 Phone SLA",
        "Custom SAML / SSO & Multi-Tenant RBAC"
      ]
    }
  ];

  // Frequently Asked Questions data
  const faqs = [
    {
      q: "Does AgentWarden add noticeable latency to our agent's execution?",
      a: "No. AgentWarden's deterministic policy engine executes in memory in under 4.2ms. Because policy evaluation happens locally without round-tripping to external large language models, your end users will not perceive any latency delay."
    },
    {
      q: "Which agent frameworks and LLM providers are supported?",
      a: "AgentWarden supports any agent architecture. We have 1-line native SDKs for LangChain, LlamaIndex, CrewAI, and Microsoft AutoGen, as well as a zero-code HTTP/REST sidecar proxy that intercepts OpenAI, Anthropic Claude, Google Gemini, and open-source models (vLLM, Ollama)."
    },
    {
      q: "What happens when an agent triggers a human approval policy?",
      a: "The agent's proposed action is instantly paused mid-flight. AgentWarden dispatches a push notification to your dashboard and sends an interactive webhook payload to Slack, Discord, or your custom endpoint. A team manager can click 'Approve' or 'Reject' in one click, and the agent resumes execution seamlessly."
    },
    {
      q: "Is our proprietary data or prompt history stored or used for model training?",
      a: "Never. AgentWarden is built on a zero-data-retention architecture. We inspect tool arguments in memory and generate cryptographic SHA-256 hashes for audit verification. Your sensitive company data is never retained, shared, or used to train AI models."
    },
    {
      q: "Can we deploy AgentWarden entirely inside our own private cloud / VPC?",
      a: "Yes. Enterprise customers can run AgentWarden as a containerized sidecar inside AWS EKS, Google GKE, Azure AKS, or on-premises air-gapped infrastructure. Zero outbound network telemetry is required."
    }
  ];

  // Subtle organic twinkling cosmic stars
  const cosmicStars = [
    { top: "10%", left: "14%", size: "w-1 h-1", delay: "0.2s" },
    { top: "18%", left: "6%", size: "w-1.5 h-1.5", delay: "1.4s" },
    { top: "7%", left: "32%", size: "w-1 h-1", delay: "2.1s" },
    { top: "14%", left: "68%", size: "w-1.5 h-1.5", delay: "0.8s" },
    { top: "25%", left: "84%", size: "w-1 h-1", delay: "3.2s" },
    { top: "38%", left: "93%", size: "w-1.5 h-1.5", delay: "1.7s" },
    { top: "52%", left: "89%", size: "w-1 h-1", delay: "2.5s" },
    { top: "32%", left: "10%", size: "w-1 h-1", delay: "1.1s" },
    { top: "64%", left: "5%", size: "w-1.5 h-1.5", delay: "2.8s" },
    { top: "75%", left: "95%", size: "w-1 h-1", delay: "0.5s" },
    { top: "85%", left: "12%", size: "w-1 h-1", delay: "1.9s" },
    { top: "90%", left: "80%", size: "w-1.5 h-1.5", delay: "2.4s" }
  ];

  return (
    <div className="marketing-site relative min-h-screen bg-[#040408] text-white selection:bg-purple-600 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* 1. CINEMATIC CELESTIAL ATMOSPHERE & FRAMING COSMIC AURA */}
      {/* (Clean central cosmic pocket - zero harsh vector lines across text) */}
      {/* ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute top-[-60px] left-1/2 -translate-x-1/2 w-full max-w-[1920px] h-[1050px] overflow-hidden z-0">
        {/* Origin Coronal Light Flare (Top-Left entrance) */}
        <div className="absolute -top-20 -left-20 w-[720px] h-[540px] rounded-full bg-gradient-to-br from-cyan-400/28 via-purple-600/24 to-transparent blur-[110px] animate-nebula-1" />

        {/* Ambient Center Sky Nebula Bloom (Soft volumetric halo behind hero headline) */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[980px] h-[520px] rounded-full bg-gradient-to-b from-purple-600/22 via-indigo-600/12 to-transparent blur-[140px]" />

        {/* Right Flank Celestial Aura */}
        <div className="absolute top-10 right-[-80px] w-[760px] h-[860px] rounded-full bg-gradient-to-bl from-purple-600/28 via-fuchsia-600/18 to-transparent blur-[120px] animate-nebula-2" />

        {/* Subtle Architectural Dot/Grid Mesh Mask (Vercel / Linear polish) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)] opacity-70" />

        {/* Twinkling Cosmic Celestial Stars */}
        {cosmicStars.map((star, idx) => (
          <div
            key={idx}
            className={`absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-star-twinkle ${star.size}`}
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}

        {/* Framing Celestial Orbital Ribbon & Aurora (Positioned along flanks - strictly leaves center text clean) */}
        <svg
          viewBox="0 0 1800 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            {/* Right Sweeping Ribbon Gradient */}
            <linearGradient id="rightRibbonAtmosphere" x1="1800" y1="40" x2="1150" y2="820" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#a855f7" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="rightRibbonCore" x1="1800" y1="40" x2="1150" y2="820" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#c084fc" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#e879f9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
            </linearGradient>

            {/* Left Atmospheric Aurora Gradient */}
            <linearGradient id="leftAtmosphereGrad" x1="-120" y1="340" x2="440" y2="-40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#818cf8" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>

            {/* Gaussian Blur Filters */}
            <filter id="ribbonHeavyBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="38" />
            </filter>
            <filter id="ribbonMidBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <filter id="ribbonCoreBlur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* LEFT FLANK AURORA SWIRL (Frames upper-left, completely clear of headline) */}
          <path
            d="M -120 340 C 60 140, 220 30, 440 -30"
            stroke="url(#leftAtmosphereGrad)"
            strokeWidth="60"
            strokeLinecap="round"
            filter="url(#ribbonHeavyBlur)"
            opacity="0.4"
          />
          <path
            d="M -120 340 C 60 140, 220 30, 440 -30"
            stroke="url(#leftAtmosphereGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            filter="url(#ribbonMidBlur)"
            opacity="0.65"
          />

          {/* RIGHT FLANK CELESTIAL SWOOPING RIBBON (Loops gracefully down right flank behind preview card) */}
          {/* Layer 1: Thick Atmospheric Aurora Glow */}
          <path
            d="M 1820 40 C 1660 200, 1500 460, 1240 780"
            stroke="url(#rightRibbonAtmosphere)"
            strokeWidth="72"
            strokeLinecap="round"
            filter="url(#ribbonHeavyBlur)"
            opacity="0.42"
          />
          {/* Layer 2: Vibrant Mid Plasma Glow */}
          <path
            d="M 1820 40 C 1660 200, 1500 460, 1240 780"
            stroke="url(#rightRibbonCore)"
            strokeWidth="20"
            strokeLinecap="round"
            filter="url(#ribbonMidBlur)"
            opacity="0.75"
          />
          {/* Layer 3: Luminous Core Beam */}
          <path
            d="M 1820 40 C 1660 200, 1500 460, 1240 780"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#ribbonCoreBlur)"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP NAVIGATION BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-30 pt-7 px-6 md:px-12 max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo with 3 Vertical Bar Marks */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-end gap-1 h-5">
            <span className="w-1.5 h-3 rounded-full bg-gradient-to-t from-purple-600 to-indigo-400 group-hover:h-3.5 transition-all" />
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-t from-purple-500 to-fuchsia-400 group-hover:h-5.5 transition-all shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
            <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-t from-indigo-500 to-purple-400 group-hover:h-4 transition-all" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-purple-200 transition-colors">
            AgentWarden
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-slate-300/90 font-medium">
          <Link href="/" className="text-white hover:text-purple-300 transition-colors">
            Home
          </Link>
          <Link href="#product" className="hover:text-white transition-colors">
            Overview
          </Link>
          <Link href="#approvals-demo" className="hover:text-white transition-colors">
            Live Approvals
          </Link>
          <Link href="#fleet" className="hover:text-white transition-colors">
            Agent Fleet
          </Link>
          <Link href="#comparison" className="hover:text-white transition-colors">
            Before & After
          </Link>
          <Link href="#calculator" className="hover:text-white transition-colors">
            Readiness
          </Link>
          <Link href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="#faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Right Action: Luminous Sign In Pill */}
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="px-6 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_24px_rgba(110,68,255,0.65)] hover:shadow-[0_0_32px_rgba(110,68,255,0.9)] hover:scale-[1.03] active:scale-[0.98] transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 3. HERO SECTION (100% CENTERED - EXACT REFERENCE LAYOUT) */}
      {/* ------------------------------------------------------------- */}
      <section className="relative z-20 pt-16 md:pt-24 pb-12 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Massive Centered Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white uppercase leading-[1.06] max-w-4xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
          NEXT-GEN AI <br />
          <span className="text-white">
            FOR AGENT SECURITY
          </span>
        </h1>

        {/* Centered Subtitle */}
        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Stay ahead of risks with AI-powered insights. Our platform continuously monitors third-party
          vendors and autonomous agents, delivers real-time security ratings, and ensures compliance with global standards&mdash;so
          you can focus on growing your business with confidence.
        </p>

        {/* Dual Centered CTA Pill Buttons */}
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/dashboard"
            className="px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_28px_rgba(110,68,255,0.7)] hover:shadow-[0_0_38px_rgba(110,68,255,0.95)] hover:scale-105 active:scale-95 transition-all"
          >
            Get started
          </Link>
          <Link
            href="/dashboard/agent-graph"
            className="px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-white/[0.06] text-white border border-white/20 backdrop-blur-md hover:bg-white/[0.12] hover:border-white/35 transition-all"
          >
            Book A Demo
          </Link>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. PRODUCT DASHBOARD SHOWCASE CARD (CENTERED DIRECTLY BELOW) */}
        {/* Matches the "Organization overview" card from reference image */}
        {/* ------------------------------------------------------------- */}
        <div
          id="product"
          className="mt-16 w-full max-w-5xl rounded-2xl bg-[#0c0d16]/95 border border-white/15 shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(139,92,246,0.15)] backdrop-blur-2xl overflow-hidden text-left relative"
        >
          {/* Subtle Top Rim Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60" />
          {/* Luminous Ambient Halo behind Showcase */}
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-b from-purple-500/20 via-transparent to-purple-600/10 blur-xl -z-10" />

          <div className="flex flex-col md:flex-row min-h-[640px]">
            {/* Left Mini-Sidebar inside Dashboard Mockup */}
            <aside className="w-full md:w-56 bg-[#090a10] border-b md:border-b-0 md:border-r border-white/10 p-4 flex flex-col justify-between">
              <div>
                {/* Brand in Mockup */}
                <div className="flex items-center gap-2 px-2 py-1 mb-4">
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-1 h-2 rounded-full bg-purple-400" />
                    <span className="w-1 h-4 rounded-full bg-purple-300" />
                    <span className="w-1 h-3 rounded-full bg-purple-400" />
                  </div>
                  <span className="font-bold text-sm text-white tracking-tight">AgentWarden</span>
                </div>

                {/* Search Bar in Mockup */}
                <div className="relative mb-4">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Search..."
                    className="w-full pl-7 pr-2 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/10 text-slate-300 placeholder-slate-500"
                  />
                </div>

                {/* Nav Links in Mockup */}
                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveNav("Home")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Home"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Home size={13} /> Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Dashboard")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Dashboard"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard size={13} /> Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Projects")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Projects"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FolderKanban size={13} /> Projects
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Tasks")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Tasks"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <CheckSquare size={13} /> Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Reporting")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Reporting"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <BarChart2 size={13} /> Reporting
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Users")}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeNav === "Users"
                        ? "bg-[#6e44ff] text-white shadow-[0_0_15px_rgba(110,68,255,0.5)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users size={13} /> Users
                  </button>
                  <div className="pt-2 text-[11px] text-slate-500 uppercase px-3 font-semibold tracking-wider">
                    Settings
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Support")}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium"
                  >
                    <HelpCircle size={13} /> Support
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav("Settings")}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white font-medium"
                  >
                    <Settings size={13} /> Settings
                  </button>
                </div>
              </div>

              {/* Callout Card: New features available! with Video preview */}
              <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-[11px]">
                <div className="text-white font-semibold mb-1">New features available!</div>
                <p className="text-slate-400 text-[10px] leading-tight">
                  Check out the new dashboard view. Pages now load faster.
                </p>
                {/* Video Mockup Thumbnail */}
                <div className="mt-2.5 h-16 rounded-lg bg-gradient-to-br from-purple-900/60 to-slate-900 border border-white/10 relative flex items-center justify-center overflow-hidden group cursor-pointer">
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={10} className="fill-white text-white ml-0.5" />
                  </div>
                  <span className="absolute bottom-1 right-1 text-[8px] px-1 bg-black/60 rounded text-slate-300">
                    1:24
                  </span>
                </div>
                <div className="mt-2 text-slate-400 text-[10px] flex items-center justify-between">
                  <span className="hover:text-slate-200 cursor-pointer">Dismiss</span>
                  <span className="text-purple-400 font-medium hover:underline cursor-pointer">
                    What&apos;s new?
                  </span>
                </div>
              </div>

              {/* User Profile Footer */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 flex items-center justify-center text-[10px] font-bold text-white">
                    AV
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-white leading-none">Alex Vance</div>
                    <div className="text-[9px] text-slate-500 leading-tight">alex@warden.io</div>
                  </div>
                </div>
                <MoreVertical size={13} className="text-slate-500 hover:text-white cursor-pointer" />
              </div>
            </aside>

            {/* Main Content Area inside Dashboard Mockup */}
            <div className="flex-1 p-5 md:p-6 overflow-hidden flex flex-col justify-between">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-lg text-white tracking-tight">Organization overview</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer">
                    <Search size={13} />
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Filter size={12} /> Filters
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <SlidersHorizontal size={12} /> Customize
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Download size={12} /> Export
                  </button>
                </div>
              </div>

              {/* Row 1: Donut Breakdown + Multi-wave Line Graph */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4">
                {/* Donut Card (5 cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-[#0e101a] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Vendor breakdown</span>
                  </div>
                  {/* Visual SVG Donut chart with legend */}
                  <div className="my-3 flex items-center justify-around gap-2">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Segment 1: Purple 38% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="12"
                          strokeDasharray="90 240"
                          strokeDashoffset="0"
                        />
                        {/* Segment 2: Cyan 24% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="12"
                          strokeDasharray="57 240"
                          strokeDashoffset="-92"
                        />
                        {/* Segment 3: Indigo 18% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="12"
                          strokeDasharray="43 240"
                          strokeDashoffset="-151"
                        />
                        {/* Segment 4: Fuchsia 12% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#d946ef"
                          strokeWidth="12"
                          strokeDasharray="29 240"
                          strokeDashoffset="-196"
                        />
                        {/* Segment 5: Slate 8% */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#475569"
                          strokeWidth="12"
                          strokeDasharray="19 240"
                          strokeDashoffset="-227"
                        />
                      </svg>
                      {/* Donut Center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#0e101a] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-300">100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                        <span className="text-slate-300">20-100</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                        <span className="text-slate-300">81-100</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
                        <span className="text-slate-300">61-80</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#d946ef]" />
                        <span className="text-slate-300">41-60</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#475569]" />
                        <span className="text-slate-300">21-40</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1e293b]" />
                        <span className="text-slate-400">0-20</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-1 py-1 rounded-lg border border-white/10 hover:border-white/20 text-center text-[10px] text-slate-300 hover:text-white transition-colors"
                  >
                    View full report
                  </button>
                </div>

                {/* Line Chart Card (7 cols) */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-[#0e101a] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white">Average vendor rating</span>
                      <p className="text-[10px] text-slate-400">Track how your rating compares to your industry average.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-purple-300">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Your rating
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-500" /> Industry Average
                      </span>
                    </div>
                  </div>

                  {/* Multi-Wave SVG Neon Line Chart */}
                  <div className="my-2 h-28 w-full flex">
                    {/* Y-axis values */}
                    <div className="flex flex-col justify-between text-[8px] text-slate-500 pr-2 py-1 font-mono">
                      <span>100</span>
                      <span>80</span>
                      <span>60</span>
                      <span>40</span>
                      <span>20</span>
                      <span>0</span>
                    </div>

                    <div className="flex-1 relative">
                      <svg viewBox="0 0 360 80" className="w-full h-full" fill="none">
                        <defs>
                          <linearGradient id="purpleAreaWave" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="16" x2="360" y2="16" stroke="rgba(255,255,255,0.05)" />
                        <line x1="0" y1="32" x2="360" y2="32" stroke="rgba(255,255,255,0.05)" />
                        <line x1="0" y1="48" x2="360" y2="48" stroke="rgba(255,255,255,0.05)" />
                        <line x1="0" y1="64" x2="360" y2="64" stroke="rgba(255,255,255,0.05)" />

                        {/* Area gradient under rating line */}
                        <path
                          d="M 0,55 Q 35,45 70,38 T 140,30 T 210,18 T 280,12 T 360,8 L 360,80 L 0,80 Z"
                          fill="url(#purpleAreaWave)"
                        />
                        {/* Glowing Purple "Your rating" spline */}
                        <path
                          d="M 0,55 Q 35,45 70,38 T 140,30 T 210,18 T 280,12 T 360,8"
                          stroke="#a855f7"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Pulse dot on line */}
                        <circle cx="210" cy="18" r="3" fill="#c084fc" />
                        <circle cx="210" cy="18" r="6" fill="#c084fc" fillOpacity="0.3" />

                        {/* Dotted Industry Average spline */}
                        <path
                          d="M 0,65 Q 45,62 90,58 T 180,54 T 270,50 T 360,46"
                          stroke="#64748b"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* X-axis months */}
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pl-6">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Vendor Movements Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Vendor movements</h4>
                    <p className="text-[10px] text-slate-400">Keep track of vendors and their security ratings.</p>
                  </div>
                  <div className="relative">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-6 pr-2 py-1 text-[10px] rounded-md bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[10px] border-b border-white/10 uppercase font-mono">
                        <th className="py-2 w-6">
                          <input type="checkbox" className="rounded bg-white/10 border-white/20" />
                        </th>
                        <th className="py-2">Vendor</th>
                        <th className="py-2">Rating</th>
                        <th className="py-2">Last assessed</th>
                        <th className="py-2">Categories</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5">
                            <input type="checkbox" className="rounded bg-white/10 border-white/20" />
                          </td>
                          <td className="py-2.5 font-medium text-white flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] border ${row.initialBg}`}>
                              {row.initial}
                            </div>
                            <div>
                              <div className="leading-none">{row.name}</div>
                              <div className="text-[9px] text-slate-500 leading-tight">{row.domain}</div>
                            </div>
                          </td>
                          <td className="py-2.5 font-mono">
                            <span className="font-semibold text-white">{row.rating}</span>
                            <span
                              className={`ml-1.5 text-[9px] px-1 py-0.2 rounded font-sans ${
                                row.changePositive
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {row.ratingChange}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 text-[10px] font-mono">{row.lastAssessed}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {row.badges.map((b, idx) => (
                                <span
                                  key={idx}
                                  className={`px-1.5 py-0.5 rounded text-[9px] border font-medium ${b.style}`}
                                >
                                  {b.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="inline-flex items-center gap-2 text-slate-500">
                              <Pencil size={11} className="hover:text-white cursor-pointer" />
                              <Trash2 size={11} className="hover:text-rose-400 cursor-pointer" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4.5 REALISTIC LIVE SECURITY METRICS BAR (#metrics) */}
        {/* ------------------------------------------------------------- */}
        <div id="metrics" className="mt-14 w-full max-w-5xl rounded-2xl bg-[#0c0d16]/90 border border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  Live Runtime Telemetry
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Active Defense
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">Zero-overhead deterministic protection across all connected agent graphs</p>
              </div>
            </div>
            <Link
              href="/dashboard/enforcement"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
            >
              <span>View Live Threat Stream</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                99.98%
              </div>
              <div className="text-xs font-semibold text-slate-300 mt-1">Interception Rate</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Prompt injections & tool violations halted</p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                &lt; 4.2ms
              </div>
              <div className="text-xs font-semibold text-slate-300 mt-1">Decision Latency</div>
              <p className="text-[11px] text-slate-400 mt-0.5">In-memory deterministic policy check</p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                14,820+
              </div>
              <div className="text-xs font-semibold text-slate-300 mt-1">Monitored Actions</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Autonomous tool executions audited daily</p>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 tracking-tight">
                0
              </div>
              <div className="text-xs font-semibold text-slate-300 mt-1">Production Breaches</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero PII data leaks or unauthorized mutations</p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. CONTINUOUS MOVING TICKER STRIP ("moving strip not box") */}
        {/* Infinite marquee ticker with subtle edge masks */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-20 w-full overflow-hidden flex flex-col items-center">
          {/* Subtle clean label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Compatible Across Any Agent Framework &amp; Foundation Model
            </span>
          </div>

          {/* Marquee Track 1 (Scrolling Left) */}
          <div className="w-full max-w-6xl overflow-hidden py-2 relative [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-marquee-infinite flex items-center gap-3.5">
              {[...marqueeItems, ...marqueeItems].map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 backdrop-blur-md flex items-center gap-2.5 shrink-0 transition-all cursor-default group"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {item.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${item.badgeStyle}`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Marquee Track 2 (Scrolling Right in Reverse) */}
          <div className="w-full max-w-6xl overflow-hidden py-2 mt-1 relative [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-marquee-reverse flex items-center gap-3.5">
              {[...marqueeItemsReverse, ...marqueeItemsReverse].map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 backdrop-blur-md flex items-center gap-2.5 shrink-0 transition-all cursor-default group"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {item.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${item.badgeStyle}`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5.5 INTERACTIVE HUMAN-IN-THE-LOOP APPROVAL SIMULATOR (#approvals-demo) */}
      {/* High-impact visual AI SaaS product element for demo videos */}
      {/* ------------------------------------------------------------- */}
      <section id="approvals-demo" className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
          <ShieldCheck size={13} className="text-purple-300" />
          <span>Interactive Product Simulation</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Keep Humans in the Driver&apos;s Seat for High-Stakes Actions
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Autonomous agents execute fast. When an agent attempts an action that impacts money, customer data, or databases, AgentWarden pauses execution and requests instant human sign-off.
        </p>

        {/* 3 Interactive Business Scenario Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 max-w-3xl">
          <button
            type="button"
            onClick={() => handleActionChange("stripe")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border ${
              activeDemoAction === "stripe"
                ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105"
                : "bg-white/5 text-slate-300 border-white/10 hover:border-purple-500/40 hover:bg-white/10"
            }`}
          >
            <span>💳</span>
            <span>$1,450 Cloud Server Scale-Up</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionChange("export")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border ${
              activeDemoAction === "export"
                ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105"
                : "bg-white/5 text-slate-300 border-white/10 hover:border-purple-500/40 hover:bg-white/10"
            }`}
          >
            <span>📧</span>
            <span>Customer Contact Sync (850 records)</span>
          </button>

          <button
            type="button"
            onClick={() => handleActionChange("schema")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border ${
              activeDemoAction === "schema"
                ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105"
                : "bg-white/5 text-slate-300 border-white/10 hover:border-purple-500/40 hover:bg-white/10"
            }`}
          >
            <span>🗄️</span>
            <span>Production Schema DDL Migration</span>
          </button>
        </div>

        {/* The Live Interactive Approval Card */}
        <div className="mt-8 w-full max-w-4xl rounded-3xl bg-[#0c0d16]/95 border border-white/15 p-6 sm:p-9 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(139,92,246,0.18)] text-left relative overflow-hidden">
          {/* Subtle top rim aura */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-80" />

          {/* Top Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                AI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">
                    {approvalActions[activeDemoAction].agent}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${approvalActions[activeDemoAction].riskStyle}`}>
                    {approvalActions[activeDemoAction].risk}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Powered by <strong className="text-slate-300">{approvalActions[activeDemoAction].model}</strong> &bull; Status: <span className="text-amber-400 font-semibold">Paused for Sign-Off</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 self-start sm:self-auto font-mono">
              <Clock size={12} className="text-emerald-400" />
              <span>Held in Memory &bull; Latency &lt; 2.8ms</span>
            </div>
          </div>

          {/* Main Action Details Box */}
          <div className="mt-6 rounded-2xl bg-[#08080f] border border-white/10 p-5 sm:p-6 relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                  Proposed Autonomous Action
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {approvalActions[activeDemoAction].description}
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Agent Reasoning:</strong> {approvalActions[activeDemoAction].reasoning}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Scope / Amount</span>
                <span className="text-lg sm:text-xl font-extrabold text-white">
                  {approvalActions[activeDemoAction].amount}
                </span>
              </div>
            </div>

            {/* Matched Security Guardrail Callout */}
            <div className="mt-4 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2.5">
              <ShieldAlert size={16} className="text-purple-400 shrink-0" />
              <span>{approvalActions[activeDemoAction].policyFired}</span>
            </div>
          </div>

          {/* Interactive Decision / Result Banner */}
          <div className="mt-6">
            {approvalAnimating ? (
              <div className="p-6 rounded-2xl bg-[#10111e] border border-purple-500/30 flex items-center justify-center gap-3 text-sm text-purple-300 font-semibold">
                <RefreshCw size={16} className="animate-spin text-purple-400" />
                <span>Applying Instant Security Verdict...</span>
              </div>
            ) : approvalStatus === "pending" ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#0e0f1d] to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Bell size={16} className="animate-bounce" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Manager Approval Required</span>
                    <span className="text-[11px] text-slate-400">Click below to simulate real-time authorization in your demo video</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision("approved")}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle2 size={13} />
                    <span>Approve Action</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalDecision("denied")}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span>Deny &amp; Freeze</span>
                  </button>
                </div>
              </div>
            ) : approvalStatus === "approved" ? (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                      Action Approved &amp; Executed
                    </span>
                    <span className="text-xs text-slate-300 mt-0.5 block">
                      {approvalActions[activeDemoAction].approvedMsg}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovalStatus("pending")}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all"
                >
                  Reset Demo
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-[0_0_30px_rgba(244,63,94,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block">
                      Action Denied &amp; Intercepted
                    </span>
                    <span className="text-xs text-slate-300 mt-0.5 block">
                      {approvalActions[activeDemoAction].deniedMsg}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovalStatus("pending")}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all"
                >
                  Reset Demo
                </button>
              </div>
            )}
          </div>

          {/* Bottom Card Navigation Link */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-400">Available as Slack webhooks, mobile push, or in-dashboard queue.</span>
            <Link
              href="/dashboard/approvals"
              className="font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Explore Approvals Dashboard</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5.8 BEFORE & AFTER AUTONOMOUS SAFETY COMPARISON (#comparison) */}
      {/* ------------------------------------------------------------- */}
      <section id="comparison" className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <Activity size={13} className="text-purple-300" />
          <span>Autonomous AI Contrast</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          The Difference Between AI Anxiety and Enterprise Confidence
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          See how leading teams go from nervous prototype testing to fearless production scale.
        </p>

        {/* 2-Column Split Contrast Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          {/* Left Card: The Wild West of Unguarded Agents */}
          <div className="p-7 sm:p-8 rounded-3xl bg-[#0d0910] border border-rose-500/25 shadow-2xl relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-rose-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="text-lg font-bold text-white tracking-tight">The Wild West of Unguarded Agents</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                  High Risk
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Deploying autonomous LLM agents without deterministic boundary guardrails.
              </p>

              <div className="mt-6 space-y-4">
                {beforePoints.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      &times;
                    </span>
                    <div>
                      <strong className="text-xs font-bold text-white block">{point.title}</strong>
                      <span className="text-[11px] text-slate-400 leading-normal">{point.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-rose-500/20 text-xs text-rose-300/80 font-medium flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-400" />
              <span>Results in team hesitation and blocked product launches.</span>
            </div>
          </div>

          {/* Right Card: Guarded Autonomy with AgentWarden */}
          <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-[#131429] to-[#0c0d16] border-2 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.25)] relative flex flex-col justify-between">
            <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(168,85,247,0.7)]">
              AgentWarden Protected
            </div>

            <div>
              <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Protected Production Autonomy</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                  100% Guarded
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Deterministic policy firewalls and 1-click approvals governing every single tool call.
              </p>

              <div className="mt-6 space-y-4">
                {afterPoints.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      <Check size={11} />
                    </span>
                    <div>
                      <strong className="text-xs font-bold text-white block">{point.title}</strong>
                      <span className="text-[11px] text-slate-300 leading-normal">{point.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-purple-500/20 text-xs text-purple-300 font-medium flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Full compliance confidence and verifiable audit replay.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. WORKFLOW AUTOMATION SECTION ("How to setup") */}
      {/* Matches Section 4 from reference image */}
      {/* ------------------------------------------------------------- */}
      <section id="workflow" className="relative z-20 py-24 px-6 md:px-12 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
        {/* Left Column: Headline & Action */}
        <div className="flex-1 text-left max-w-lg">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-6 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            How to setup &rarr;
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            It takes less than <br />
            a minute to create <br />
            automations
          </h2>
          <p className="mt-5 text-sm sm:text-base text-slate-400 leading-relaxed">
            See how you can setup an account within a few seconds and start your automation process seamlessly.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_24px_rgba(110,68,255,0.6)] hover:shadow-[0_0_32px_rgba(110,68,255,0.85)] hover:scale-105 transition-all inline-block"
            >
              Get started
            </Link>
          </div>
        </div>

        {/* Right Column: Sleek Automation Diagram Mockup */}
        <div className="flex-1 w-full max-w-lg p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 shadow-2xl relative">
          <div className="flex flex-col items-center gap-8">
            {/* Top Node: Create Automation */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Trigger</span>
              <div className="px-5 py-3 rounded-2xl bg-[#141624] border border-purple-500/40 text-white text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                <div className="w-5 h-5 rounded-md bg-purple-600/40 flex items-center justify-center text-purple-300">
                  <Sparkles size={12} />
                </div>
                <span>Create Automation</span>
              </div>
            </div>

            {/* Curved Connecting Wires SVG */}
            <div className="relative w-full max-w-md h-12 flex justify-center">
              <svg viewBox="0 0 360 48" className="w-full h-full" fill="none">
                <path
                  d="M 180,0 C 180,24 80,24 80,48"
                  stroke="#a855f7"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 6px #a855f7)"
                />
                <path
                  d="M 180,0 C 180,24 280,24 280,48"
                  stroke="#a855f7"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 6px #a855f7)"
                />
              </svg>
            </div>

            {/* Two Lower Action Cards */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Left Branch */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold text-indigo-400 mb-1">Action</span>
                <div className="w-full p-3.5 rounded-2xl bg-[#131522] border border-white/10 hover:border-purple-500/40 transition-colors text-left">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-2">
                    <Mail size={12} />
                  </div>
                  <div className="text-xs font-bold text-white">Send in Email</div>
                  <div className="text-[10px] text-slate-400">to Customers</div>
                </div>
              </div>

              {/* Right Branch */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase font-bold text-purple-400 mb-1">Condition</span>
                <div className="w-full p-3.5 rounded-2xl bg-[#131522] border border-white/10 hover:border-purple-500/40 transition-colors text-left">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-2">
                    <Gift size={12} />
                  </div>
                  <div className="text-xs font-bold text-white">Give them</div>
                  <div className="text-[10px] text-slate-400">Loyalty Points</div>
                </div>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={11} /> Complete &bull; 100% Automated
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. POWER FEATURES (2x2 BENTO GRID - EXACT REFERENCE MATCH) */}
      {/* Matches Section 5 from reference image */}
      {/* ------------------------------------------------------------- */}
      <section id="features" className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          Features
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Power Features to Supercharge <br />
          Your Automation
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          AgentWarden is packed with smart, scalable features designed to simplify workflows, boost efficiency
        </p>

        {/* 2x2 Bento Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {/* Card 1: Scale Without the Scream */}
          <div className="p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 shadow-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Scale Without the Scream</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Whether you&apos;ve got 10 users or 10,000, Flowmate grows with you&mdash;minus the tech headaches.
              </p>
            </div>

            {/* Widget: Semi-circle Gauge Chart with Profit Breakdown */}
            <div className="mt-8 p-5 rounded-2xl bg-[#11121d] border border-white/5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-semibold text-white">Profit Breakdown</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-20 flex flex-col items-center justify-end">
                  <svg viewBox="0 0 100 50" className="w-full h-full" fill="none">
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 10 50 A 40 40 0 0 1 82 25"
                      stroke="#a855f7"
                      strokeWidth="10"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px #a855f7)"
                    />
                  </svg>
                  <span className="text-sm font-bold text-white mt-1">$15,987</span>
                  <span className="text-[9px] text-slate-400 uppercase">Total Profit</span>
                </div>
                <div className="flex-1 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Product A (54%)
                    </span>
                    <strong className="text-white">$7,900</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Product B (32%)
                    </span>
                    <strong className="text-white">$5,900</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Product C (14%)
                    </span>
                    <strong className="text-white">$2,123</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Drag, Drop, Automate */}
          <div className="p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 shadow-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Drag, Drop, Automate</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                No code? No problem. Build powerful workflows with an interface so smooth, it&apos;s almost fun.
              </p>
            </div>

            {/* Widget: Draggable workflow pill with realistic cursor */}
            <div className="mt-8 p-6 rounded-2xl bg-[#11121d] border border-white/5 relative min-h-[140px] flex flex-col items-center justify-center gap-3">
              {/* Floating Active Drag Card */}
              <div className="px-4 py-2.5 rounded-xl bg-[#6e44ff]/40 border border-[#8b5cf6]/60 text-white text-xs font-semibold flex items-center gap-2.5 shadow-[0_10px_25px_rgba(110,68,255,0.45)] transform -rotate-1 scale-105">
                <div className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center text-[10px]">M</div>
                <span>Update newsletter</span>
                <Lock size={11} className="text-slate-300 ml-1" />
              </div>

              {/* Realistic White Mouse Pointer Cursor */}
              <div className="absolute right-16 bottom-7 text-white flex items-center gap-1 pointer-events-none drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10">
                <MousePointer size={18} className="fill-white" />
              </div>

              {/* Drop Target Outline */}
              <div className="w-full max-w-xs py-2 px-3 rounded-lg border border-dashed border-white/15 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Update your email</span>
                <span className="text-[10px] text-slate-600">Drop here</span>
              </div>
            </div>
          </div>

          {/* Card 3: Smart Enough to Chill */}
          <div className="p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 shadow-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Smart Enough to Chill</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Our AI does the thinking, so you don&apos;t have to. Optimize, predict, and adapt on autopilot.
              </p>
            </div>

            {/* Widget: Autopilot AI & 99% Stat */}
            <div className="mt-8 p-5 rounded-2xl bg-[#11121d] border border-white/5 flex items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-[10px] font-bold text-purple-200">
                  Autopilot AI
                </span>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-purple-300">
                    F
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-blue-300">
                    G
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-cyan-300">
                    S
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                  99%
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Accuracy
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Plug It All In */}
          <div className="p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 shadow-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Plug It All In</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Integrates with your favorite tools like it was born to. Zapier, Slack, Google&mdash;you name it.
              </p>
            </div>

            {/* Widget: Central Hub with 6 Connected Bezier Tools */}
            <div className="mt-8 p-5 rounded-2xl bg-[#11121d] border border-white/5 relative min-h-[140px] flex items-center justify-between">
              {/* Left 3 Tool Icons */}
              <div className="space-y-2 z-10">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-purple-300">
                  F
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-indigo-300">
                  D
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-blue-300">
                  B
                </div>
              </div>

              {/* Connecting SVG Bezier Lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 320 120" className="w-full h-full" fill="none">
                  {/* Left branch curves */}
                  <path d="M 40,25 C 100,25 120,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M 40,60 C 100,60 120,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.8" />
                  <path d="M 40,95 C 100,95 120,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />
                  {/* Right branch curves */}
                  <path d="M 280,25 C 220,25 200,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M 280,60 C 220,60 200,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.8" />
                  <path d="M 280,95 C 220,95 200,60 160,60" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />
                </svg>
              </div>

              {/* Center Glowing Hub */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 border border-purple-400 p-0.5 shadow-[0_0_24px_rgba(168,85,247,0.7)] z-10 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 h-2 rounded-full bg-white" />
                  <span className="w-1 h-4 rounded-full bg-white" />
                  <span className="w-1 h-3 rounded-full bg-white" />
                </div>
              </div>

              {/* Right 3 Tool Icons */}
              <div className="space-y-2 z-10">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-amber-300">
                  G
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-orange-300">
                  Z
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-emerald-300">
                  S
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7.0 3-STEP PROTECTION ENGINE */}
      {/* Visual AI SaaS product flow */}
      {/* ------------------------------------------------------------- */}
      <section className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <ShieldCheck size={13} className="text-purple-300" />
          <span>3-Step Protection Engine</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          How AgentWarden Protects Every Autonomous Action
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Connect your agent fleet, configure boundary contracts in plain English, and let deterministic guardrails enforce safety in milliseconds.
        </p>

        {/* 3 Step Flow Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-3xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-5 group-hover:scale-110 transition-transform">
                <Code2 size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Step 1 &bull; Connect</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Plug In Any Agent Fleet</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Connect your LangChain, CrewAI, AutoGen, or custom REST agents with a single line of code. Zero refactoring required.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Setup time</span>
              <strong className="text-slate-300">&lt; 60 seconds</strong>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-5 group-hover:scale-110 transition-transform">
                <Layers size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step 2 &bull; Verify</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Real-Time Graph Firewall</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Every tool call is inspected in memory. AgentWarden verifies permissions, caller identity, and data sensitivity before execution.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Decision latency</span>
              <strong className="text-emerald-400">&lt; 4.2ms in-memory</strong>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Step 3 &bull; Enforce</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Autonomous Circuit Breakers</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Freeze runaway loops automatically, sanitize adversarial prompts, and request 1-click human sign-offs for high-value actions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Enforcement mode</span>
              <strong className="text-purple-300">Block or Human-in-Loop</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7.5 AGENT FLEET GOVERNANCE HUB (#fleet) */}
      {/* Visual AI SaaS product element for fleet oversight */}
      {/* ------------------------------------------------------------- */}
      <section id="fleet" className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <Users size={13} className="text-purple-300" />
          <span>Autonomous Fleet Oversight</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Govern Any Agent Fleet Across Any Framework
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Whether you run 3 copilots or 50 autonomous workers, get unified visibility, active boundary contracts, and instant kill switches.
        </p>

        {/* 3 Interactive Fleet Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {agentFleet.map((agent, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden"
            >
              {/* Subtle top rim glow */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs border ${agent.avatarBg}`}>
                      {agent.model.split(" ")[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{agent.name}</h3>
                      <span className="text-[11px] text-slate-400">{agent.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{agent.rating}</span>
                  </div>
                </div>

                {/* Framework and Model Info */}
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                    {agent.framework}
                  </span>
                  <span>&bull;</span>
                  <span>Model: <strong className="text-purple-300">{agent.model}</strong></span>
                </div>

                {/* Allowed Tools Chips */}
                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Permitted Tool APIs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.allowedTools.map((t, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Active Guardrails Chips */}
                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Active Boundary Rules
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.activeGuardrails.map((g, gIdx) => (
                      <span key={gIdx} className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                        <Check size={9} />
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity footer */}
              <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
                <Activity size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{agent.activity}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7.8 AUTONOMOUS READINESS & RISK CALCULATOR (#calculator) */}
      {/* Highly visual interactive AI SaaS calculator */}
      {/* ------------------------------------------------------------- */}
      <section id="calculator" className="relative z-20 py-24 px-4 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <Sparkles size={13} className="text-purple-300" />
          <span>Interactive Readiness Check</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Check Your Autonomous Agent Security Readiness
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Estimate your organization&apos;s protection coverage based on your agent fleet size and connected tool capabilities.
        </p>

        {/* Calculator Interactive Box */}
        <div className="mt-12 w-full rounded-3xl bg-[#0c0d16]/95 border border-white/15 p-7 sm:p-10 backdrop-blur-2xl shadow-2xl text-left grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Inputs (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  How many autonomous agents are in your stack?
                </label>
                <span className="text-sm font-extrabold text-purple-400 bg-purple-950/50 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  {agentCount} {agentCount === 1 ? "Agent" : "Agents"}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={agentCount}
                onChange={(e) => setAgentCount(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-white/10 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 Agent (Pilot)</span>
                <span>25 Agents (Scaling)</span>
                <span>50+ Agents (Enterprise)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2.5">
                What tools &amp; capabilities do your agents use?
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: "database", label: "SQL Database Read/Write", icon: "💾" },
                  { key: "financial", label: "Payment & Banking APIs", icon: "💳" },
                  { key: "pii", label: "Customer PII & Sensitive Data", icon: "🔒" },
                  { key: "terminal", label: "Shell & Code Execution", icon: "⚡" }
                ].map((risk) => {
                  const isSelected = selectedRisks.includes(risk.key);
                  return (
                    <button
                      key={risk.key}
                      type="button"
                      onClick={() => toggleRiskOption(risk.key)}
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border text-left transition-all ${
                        isSelected
                          ? "bg-purple-600/30 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="text-sm">{risk.icon}</span>
                      <span className="truncate">{risk.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Output Score Card (5 cols) */}
          <div className="md:col-span-5 rounded-2xl bg-[#08080f] border border-purple-500/30 p-6 flex flex-col items-center text-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AgentWarden Security Readiness
            </span>

            {/* Circular Progress Gauge */}
            <div className="relative w-32 h-32 my-4 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#calculatorScoreGrad)"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * (82 + selectedRisks.length * 4)) / 100}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="calculatorScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white">
                  {Math.min(99, 82 + selectedRisks.length * 4)}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                  Guarded
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Based on {agentCount} agents and {selectedRisks.length} critical tool boundaries, AgentWarden prevents an estimated <strong className="text-purple-300 font-bold">{agentCount * 140} unapproved actions/mo</strong>.
            </div>

            <Link
              href="/dashboard"
              className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_20px_rgba(110,68,255,0.6)] hover:shadow-[0_0_28px_rgba(110,68,255,0.85)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Activate Fleet Guard</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8.0 CUSTOMER STORIES & WALL OF LOVE */}
      {/* High-credibility visual social proof cards */}
      {/* ------------------------------------------------------------- */}
      <section className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <CheckCircle2 size={13} className="text-purple-300" />
          <span>Verified AI Customer Stories</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Loved by Fast-Moving AI Product Teams
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          See why engineering leads and AI founders rely on AgentWarden to deploy autonomous agents with 100% confidence.
        </p>

        {/* 3 Testimonial Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {testimonials.map((story, sIdx) => (
            <div
              key={sIdx}
              className="p-7 rounded-3xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400 mb-4 text-xs">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  &ldquo;{story.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${story.avatarBg}`}>
                  {story.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{story.name}</h4>
                  <p className="text-[11px] text-slate-400">{story.title} &bull; <strong className="text-purple-300">{story.company}</strong></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. TRANSPARENT, PREDICTABLE PRICING SECTION (#pricing) */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="relative z-20 py-24 px-4 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <Sparkles size={12} className="mr-1" /> Transparent Pricing
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Simple Plans That Scale With Your Agent Fleet
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Start free for hackathons and research. Upgrade as your agent execution volume expands. Zero hidden fees.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold ${!billingAnnual ? "text-white" : "text-slate-400"}`}>
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setBillingAnnual(!billingAnnual)}
            className="w-12 h-6 rounded-full bg-white/10 p-0.5 border border-white/20 transition-colors relative"
          >
            <div
              className={`w-5 h-5 rounded-full bg-purple-500 transition-transform ${
                billingAnnual ? "translate-x-6 bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingAnnual ? "text-white" : "text-slate-400"}`}>
            <span>Annually</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              Save 20%
            </span>
          </span>
        </div>

        {/* 3 Pricing Tier Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          {pricingPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-7 rounded-3xl flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? "bg-gradient-to-b from-[#14152a] to-[#0c0d16] border-2 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.25)] scale-105"
                  : "bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 shadow-xl"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                  Most Popular &bull; Recommended
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                  <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    {plan.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[32px]">{plan.tagline}</p>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline gap-1">
                  {typeof plan.monthlyPrice === "number" ? (
                    <>
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        ${billingAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-white tracking-tight">{plan.monthlyPrice}</span>
                  )}
                </div>

                {/* Feature Checklist */}
                <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card CTA Link */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <Link
                  href={plan.href}
                  className={`w-full py-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_24px_rgba(110,68,255,0.7)] hover:shadow-[0_0_32px_rgba(110,68,255,0.95)] hover:scale-105"
                      : "bg-white/5 hover:bg-white/10 border border-white/15 text-white"
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8.5 FREQUENTLY ASKED QUESTIONS ACCORDION (#faq) */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="relative z-20 py-24 px-4 max-w-4xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <HelpCircle size={12} className="mr-1" /> Clear Answers
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl">
          Everything you need to know about inline latency, agent framework compatibility, and zero-retention privacy.
        </p>

        {/* Accordion Questions List */}
        <div className="mt-12 w-full space-y-4 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#0c0d16]/90 border border-white/10 hover:border-purple-500/30 transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left transition-colors"
                >
                  <span className="font-bold text-sm sm:text-base text-white">{faq.q}</span>
                  <div className={`w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400 transition-transform ${isOpen ? "rotate-180 text-purple-300 bg-purple-600/30" : ""}`}>
                    <ChevronDown size={14} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. BOTTOM CELESTIAL PLANETARY CRESCENT & CTA */}
      {/* ------------------------------------------------------------- */}
      <section className="relative z-20 pt-36 pb-24 px-4 overflow-hidden flex flex-col items-center text-center">
        {/* Giant Rising Planetary Crescent Arch at Bottom */}
        <div className="pointer-events-none absolute bottom-[-180px] left-1/2 -translate-x-1/2 w-full max-w-[1600px] h-[640px] overflow-hidden z-0">
          {/* Radial Light Burst rising upwards from below */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 65% at 50% 100%, rgba(168, 85, 247, 0.48), transparent 72%), radial-gradient(ellipse 65% 45% at 50% 100%, rgba(99, 102, 241, 0.38), transparent 75%)"
            }}
          />

          {/* SVG Arc Layering */}
          <svg
            viewBox="0 0 1600 640"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="bottomPlanetArcGrad" x1="60" y1="520" x2="1540" y2="520" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="20%" stopColor="#8b5cf6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#d946ef" stopOpacity="1" />
                <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>

              <filter id="bottomHeavyBlur" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="35" />
              </filter>
              <filter id="bottomMidBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>

            {/* Layer 1: Atmospheric Outer Bloom */}
            <path
              d="M 60 520 C 380 180, 1220 180, 1540 520"
              stroke="url(#bottomPlanetArcGrad)"
              strokeWidth="80"
              strokeLinecap="round"
              filter="url(#bottomHeavyBlur)"
              opacity="0.38"
            />

            {/* Layer 2: Mid Plasma Glow */}
            <path
              d="M 60 520 C 380 180, 1220 180, 1540 520"
              stroke="url(#bottomPlanetArcGrad)"
              strokeWidth="24"
              strokeLinecap="round"
              filter="url(#bottomMidBlur)"
              opacity="0.8"
            />

            {/* Layer 3: Core Luminous Beam */}
            <path
              d="M 60 520 C 380 180, 1220 180, 1540 520"
              stroke="#f5d0fe"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Layer 4: Soft Planetary Horizon Rim */}
            <path
              d="M 60 520 C 380 180, 1220 180, 1540 520"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />

            {/* Layer 5: Animated Energy Stream */}
            <path
              d="M 60 520 C 380 180, 1220 180, 1540 520"
              stroke="url(#bottomPlanetArcGrad)"
              strokeWidth="3"
              strokeDasharray="22 140"
              strokeLinecap="round"
              className="animate-stream-flow"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Centered CTA Content */}
        <div className="relative z-10 max-w-3xl flex flex-col items-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-[11px] font-semibold text-purple-300 mb-4 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            Start your journey
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-xl leading-tight">
            Ready to dive in? <br />
            Start your journey today
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-md leading-relaxed">
            Protect your autonomous AI agents with real-time policy guardrails, human approvals, and sub-5ms enforcement.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white shadow-[0_0_32px_rgba(110,68,255,0.75)] hover:shadow-[0_0_42px_rgba(110,68,255,0.95)] hover:scale-105 active:scale-95 transition-all"
            >
              Get started free
            </Link>
            <Link
              href="/dashboard/agent-graph"
              className="px-8 py-3.5 rounded-full text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-all"
            >
              Explore Agent Graph
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 10. LUXURY COMPREHENSIVE FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-20 border-t border-white/10 pt-16 pb-12 px-6 md:px-12 max-w-7xl mx-auto text-xs text-slate-400">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand & Overview Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex items-end gap-1 h-5">
                <span className="w-1.5 h-3 rounded-full bg-purple-600" />
                <span className="w-1.5 h-5 rounded-full bg-purple-400" />
                <span className="w-1.5 h-3.5 rounded-full bg-indigo-400" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">AgentWarden</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The deterministic runtime security and policy firewall for autonomous AI agents, tool calls, and LLM reasoning chains.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational &bull; Latency &lt; 4.2ms</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Command Center
                </Link>
              </li>
              <li>
                <Link href="/dashboard/agent-graph" className="hover:text-white transition-colors">
                  Agent Graph
                </Link>
              </li>
              <li>
                <Link href="/dashboard/approvals" className="hover:text-white transition-colors">
                  Human Approvals
                </Link>
              </li>
              <li>
                <Link href="/dashboard/enforcement" className="hover:text-white transition-colors">
                  Policy Enforcement
                </Link>
              </li>
              <li>
                <Link href="/dashboard/scenarios" className="hover:text-white transition-colors">
                  Scenario Lab
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Developers</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link href="#architecture" className="hover:text-white transition-colors">
                  Python SDK
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-white transition-colors">
                  TypeScript SDK
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-white transition-colors">
                  Docker Sidecar
                </Link>
              </li>
              <li>
                <Link href="#demo" className="hover:text-white transition-colors">
                  Interactive Sandbox
                </Link>
              </li>
              <li>
                <Link href="/dashboard/audit" className="hover:text-white transition-colors">
                  Audit Telemetry
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Company */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Security</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                  Zero Data Retention
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                  SOC2 Type II Pack
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                  MITRE ATLAS Mapping
                </span>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition-colors">
                  Enterprise SLA
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-white transition-colors">
                  Security FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>&copy; {new Date().getFullYear()} AgentWarden Inc. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white transition-colors cursor-pointer">Security Disclosure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
