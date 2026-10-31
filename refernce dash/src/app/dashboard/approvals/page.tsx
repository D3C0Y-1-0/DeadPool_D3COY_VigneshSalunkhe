"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  HelpCircle,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCheck,
  Users,
  XCircle
} from "lucide-react";
import { fetchJson, postJson, type ApprovalItem, type Agent } from "@/lib/api";

type DemoItem = {
  id: string;
  agentName: string;
  agentRole: string;
  actionTitle: string;
  riskBadge: "Medium" | "High";
  riskColor: "amber" | "red";
  whyPaused: string;
  details: Array<{ label: string; value: string }>;
};

const SIMPLE_DEMO_ITEMS: DemoItem[] = [
  {
    id: "REQ-8492",
    agentName: "Finance Assistant (proc-01)",
    agentRole: "Procurement Workload",
    actionTitle: "Place Hardware Purchase Order",
    riskBadge: "Medium",
    riskColor: "amber",
    whyPaused: "The order total ($14,250) is above the agent's $10,000 auto-approval spending limit.",
    details: [
      { label: "Vendor", value: "Supplier #1 (Approved Partner)" },
      { label: "Items", value: "3x Server Compute Nodes" },
      { label: "Total Cost", value: "$14,250 USD" },
      { label: "Attached Quote", value: "vendor_quote_v2.pdf" }
    ]
  },
  {
    id: "REQ-5120",
    agentName: "Support Assistant (supp-01)",
    agentRole: "Customer Support",
    actionTitle: "View Sensitive Customer Account Details",
    riskBadge: "High",
    riskColor: "red",
    whyPaused: "The agent is replying to an external ticket and asked to access confidential customer phone and billing details.",
    details: [
      { label: "Customer ID", value: "Customer C-463" },
      { label: "Related Ticket", value: "Ticket #T-1839" },
      { label: "Requested Info", value: "Billing Address & Phone Number" },
      { label: "Safety Rule", value: "Confidential data requires one-time approval" }
    ]
  }
];

type ResolvedItem = {
  id: string;
  agentName: string;
  actionTitle: string;
  decision: "Approved" | "Rejected";
  resolvedBy: string;
  timeAgo: string;
};

export default function ApprovalsPage() {
  const [backendApprovals, setBackendApprovals] = useState<ApprovalItem[]>([]);
  const [demoItems, setDemoItems] = useState<DemoItem[]>(SIMPLE_DEMO_ITEMS);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Friendly audit history
  const [history, setHistory] = useState<ResolvedItem[]>([
    {
      id: "REQ-1092",
      agentName: "Support Assistant (supp-02)",
      actionTitle: "Sent ticket reply to Customer #1826",
      decision: "Approved",
      resolvedBy: "You (Admin)",
      timeAgo: "15 mins ago"
    },
    {
      id: "REQ-0891",
      agentName: "Finance Assistant (proc-01)",
      actionTitle: "Create supplier price lookup",
      decision: "Approved",
      resolvedBy: "You (Admin)",
      timeAgo: "1 hour ago"
    }
  ]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchJson<ApprovalItem[]>("/approvals?status=pending"),
      fetchJson<Agent[]>("/agents")
    ])
      .then(([apprRes, agentsRes]) => {
        if (!active) return;
        if (apprRes.status === "fulfilled") setBackendApprovals(apprRes.value);
        if (agentsRes.status === "fulfilled") setAgents(agentsRes.value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalPending = backendApprovals.length + demoItems.length;
  const activeAgentCount = agents.length > 0 ? agents.length : 7;

  // Resolve demo action with instant pleasant feedback
  const handleResolve = (item: DemoItem, decision: "Approved" | "Rejected") => {
    setResolvingId(item.id);
    setTimeout(() => {
      setDemoItems((prev) => prev.filter((d) => d.id !== item.id));
      setHistory((prev) => [
        {
          id: item.id,
          agentName: item.agentName,
          actionTitle: item.actionTitle,
          decision,
          resolvedBy: "You (Admin)",
          timeAgo: "Just now"
        },
        ...prev
      ]);
      setResolvingId(null);
    }, 400);
  };

  // Add demonstration requests
  const handleAddDemo = (type: "purchase" | "customer") => {
    const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    if (type === "purchase") {
      setDemoItems((prev) => [
        {
          id: newId,
          agentName: "Finance Assistant (proc-01)",
          agentRole: "Procurement Workload",
          actionTitle: "Place Hardware Purchase Order",
          riskBadge: "Medium",
          riskColor: "amber",
          whyPaused: "The order total ($14,250) is above the agent's $10,000 auto-approval spending limit.",
          details: [
            { label: "Vendor", value: "Supplier #1" },
            { label: "Items", value: "3x Server Compute Nodes" },
            { label: "Total Cost", value: "$14,250 USD" },
            { label: "Attached Quote", value: "vendor_quote_v2.pdf" }
          ]
        },
        ...prev.filter((d) => d.id !== newId)
      ]);
    } else {
      setDemoItems((prev) => [
        {
          id: newId,
          agentName: "Support Assistant (supp-01)",
          agentRole: "Customer Support",
          actionTitle: "View Sensitive Customer Account Details",
          riskBadge: "High",
          riskColor: "red",
          whyPaused: "The agent is replying to an external ticket and asked to access confidential customer phone and billing details.",
          details: [
            { label: "Customer ID", value: "Customer C-463" },
            { label: "Related Ticket", value: "Ticket #T-1839" },
            { label: "Requested Info", value: "Billing Address & Phone" },
            { label: "Safety Rule", value: "Confidential data requires approval" }
          ]
        },
        ...prev.filter((d) => d.id !== newId)
      ]);
    }
  };

  const resetAll = () => {
    setDemoItems(SIMPLE_DEMO_ITEMS);
  };

  return (
    <div className="page-content">
      {/* Friendly Header */}
      <section className="page-heading command-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <UserCheck size={14} className="text-emerald-500" />
            HUMAN OVERSIGHT
          </div>
          <h1>Action Approvals</h1>
          <p>
            When an AI agent wants to take a sensitive action (like spending over its limit or
            reading private data), it pauses here for your approval before continuing.
          </p>
        </div>

        <div className="heading-context">
          <div className="flex items-center gap-2">
            <span className="heading-live">
              <span className="health-dot" />
              Safety Guard Active
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                totalPending > 0
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {totalPending} Waiting for Approval
            </span>
          </div>
          <div className="text-xs text-slate-500">
            One-time permissions &bull; The agent cannot take unapproved actions
          </div>
        </div>
      </section>

      {/* Demo helper banner (Easy for demo videos) */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/20 shadow-md text-white mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                Try a Demo Request in your video:
              </div>
              <div className="text-xs text-slate-300">
                Click a button to see how the safety check pauses an agent&apos;s request:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleAddDemo("purchase")}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ShoppingCart size={13} />
              + Test Order ($14,250)
            </button>
            <button
              type="button"
              onClick={() => handleAddDemo("customer")}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText size={13} />
              + Test Customer Data Access
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
            >
              <RefreshCw size={12} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 4 Simple, Clear Metric Cards */}
      <section className="metric-strip">
        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Requests Pending</span>
            <span className="metric-icon tone-amber">
              <Clock size={16} />
            </span>
          </div>
          <div className="kpi-value">{totalPending}</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Needs your decision</span>
            <span className={totalPending > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {totalPending > 0 ? "Review Needed" : "All Clear"}
            </span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Safety Rule</span>
            <span className="metric-icon tone-blue">
              <ShieldCheck size={16} />
            </span>
          </div>
          <div className="kpi-value text-base font-bold text-slate-900">Auto-Limit $10k</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Higher amounts pause for you</span>
            <span className="text-blue-600 font-semibold">Active</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Active Agents</span>
            <span className="metric-icon tone-green">
              <Bot size={16} />
            </span>
          </div>
          <div className="kpi-value">{activeAgentCount} Online</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Finance & Support assistants</span>
            <span className="text-emerald-600 font-semibold">Safe</span>
          </div>
        </div>

        <div className="metric-card command-metric">
          <div className="metric-topline">
            <span className="stat-label">Approval Mode</span>
            <span className="metric-icon tone-purple">
              <Lock size={16} />
            </span>
          </div>
          <div className="kpi-value text-base font-bold text-slate-900">One-Time Only</div>
          <div className="metric-detail flex items-center justify-between">
            <span>Approves this action only</span>
            <span className="text-purple-600 font-semibold">Protected</span>
          </div>
        </div>
      </section>

      {/* Main List of Pending Actions */}
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Actions Waiting for Your Decision ({totalPending})
            </h2>
            <p className="text-xs text-slate-500">
              Review what the agent wants to do, check the details, then approve or reject.
            </p>
          </div>

          <Link
            href="/dashboard/agent-graph"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            See Agent Graph <ArrowUpRight size={13} />
          </Link>
        </div>

        {totalPending === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-900">No Actions Waiting</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Your agents are currently working within their standard permissions. When an agent
              requests a sensitive action, it will appear here.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              Load Demo Request
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {demoItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        item.riskColor === "red"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {item.actionTitle}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.riskColor === "red"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.riskBadge} Importance
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Requested by: <strong className="text-slate-800">{item.agentName}</strong> &bull; Request ID: {item.id}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-slate-500">
                    Status: <strong className="text-amber-700 font-semibold">Paused for Review</strong>
                  </span>
                </div>

                {/* Body: Simple Explanation & Details */}
                <div className="p-4 space-y-3">
                  {/* Why it paused */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs">
                    <span className="font-bold text-amber-900 block mb-0.5">
                      Why does this need your approval?
                    </span>
                    <span className="text-amber-800 leading-relaxed">
                      {item.whyPaused}
                    </span>
                  </div>

                  {/* Clean Key-Value Grid */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Request Summary:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {item.details.map((d, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="text-[10px] text-slate-400 font-medium">
                            {d.label}
                          </div>
                          <div className="font-semibold text-slate-800 mt-0.5 truncate">
                            {d.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Shield size={13} className="text-emerald-600" />
                    If approved, this action runs once. Future actions still require approval.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={resolvingId === item.id}
                      onClick={() => handleResolve(item, "Rejected")}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle size={14} className="text-slate-500" />
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={resolvingId === item.id}
                      onClick={() => handleResolve(item, "Approved")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      {resolvingId === item.id ? "Approving…" : "Approve (One-Time)"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Simple 3-Step Explanation for Video Presenters */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 mt-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            How Agent Safety Works:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                Agent Asks to Take Action
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                The AI agent prepares a task, like purchasing supplies or reading customer files.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">2</span>
                Safety Check Checks Rules
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                If the action exceeds spending limits or accesses sensitive data, it automatically pauses.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">3</span>
                You Decide in One Click
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                You review the details and click Approve or Reject. The agent cannot act without your permission.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Decisions History (Plain & Readable) */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm mt-4">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Recent Decisions History
            </span>
            <span className="text-[11px] text-slate-400">
              Logged automatically
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {record.actionTitle}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {record.agentName} &bull; {record.timeAgo}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      record.decision === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {record.decision}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    by {record.resolvedBy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
