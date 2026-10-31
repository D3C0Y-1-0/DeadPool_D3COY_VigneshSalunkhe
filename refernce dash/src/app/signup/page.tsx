"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [fleetSize, setFleetSize] = useState("1-10");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Calculate password strength score 0 to 4
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthLabels = ["Empty", "Weak", "Fair", "Strong", "Fortified"];
  const strengthColors = [
    "bg-slate-700",
    "bg-rose-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-emerald-400"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("Please accept the Terms of Service to proceed.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 950);
  };

  const handleOAuth = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 700);
  };

  return (
    <div
      className="marketing-site relative min-h-screen bg-[#040408] text-white selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden font-sans"
      style={{ backgroundColor: "#040408", color: "#ffffff" }}
    >
      {/* ------------------------------------------------------------- */}
      {/* Background Cosmic Ambient Aurora Glow & Celestial Arc */}
      {/* ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute top-[-80px] left-1/2 -translate-x-1/2 w-full max-w-[1800px] h-[850px] overflow-hidden z-0">
        <div className="absolute -top-16 -left-16 w-[600px] h-[450px] rounded-full bg-gradient-to-br from-cyan-400/25 via-purple-600/20 to-transparent blur-[110px]" />
        <div className="absolute top-10 right-[-60px] w-[650px] h-[600px] rounded-full bg-gradient-to-bl from-purple-600/25 via-fuchsia-600/15 to-transparent blur-[120px]" />

        {/* Sweeping Planetary Celestial Arc */}
        <svg
          viewBox="0 0 1800 850"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full opacity-70"
        >
          <defs>
            <linearGradient id="signupArcGrad" x1="0" y1="50" x2="1800" y2="600" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#c084fc" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
            <filter id="signupBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
          </defs>
          <path
            d="M -100 360 C 250 40, 1350 30, 1900 400"
            stroke="url(#signupArcGrad)"
            strokeWidth="48"
            strokeLinecap="round"
            filter="url(#signupBlur)"
            opacity="0.4"
          />
          <path
            d="M -100 360 C 250 40, 1350 30, 1900 400"
            stroke="url(#signupArcGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Top Header / Brand Logo */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-20 pt-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex items-center justify-between">
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

        <div className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link href="/signin" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
            Sign In &rarr;
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Central Glassmorphic Sign Up Card */}
      {/* ------------------------------------------------------------- */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl bg-[#0b0c16]/90 border border-white/15 p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(110,68,255,0.18)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Top Rim Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-70" />

          {/* Eyebrow Badge */}
          <div className="flex items-center justify-between mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
              <Sparkles size={11} className="text-purple-400" />
              14-Day Free Fleet Trial
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">No Credit Card Required</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Deploy autonomous defense
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Secure multi-agent systems, intercept unauthorized tool calls, and ensure zero identity drift.
          </p>

          {/* Social One-Click OAuth Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {/* Google */}
            <button
              type="button"
              onClick={() => handleOAuth("Google")}
              className="py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleOAuth("GitHub")}
              className="py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2 group"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="absolute bg-[#0b0c16] px-3 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Or create with email
            </span>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Vance"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                />
              </div>
            </div>

            {/* Fleet Size Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Autonomous Fleet Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1-10", label: "1-10 Agents" },
                  { id: "11-50", label: "11-50 Agents" },
                  { id: "50+", label: "50+ Enterprise" }
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setFleetSize(tier.id)}
                    className={`py-2 px-2 rounded-xl text-center text-xs font-medium transition-all ${
                      fleetSize === tier.id
                        ? "bg-[#6e44ff]/30 border border-[#8b5cf6] text-purple-200"
                        : "bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Master Security Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full h-full transition-all ${
                          step <= strength ? strengthColors[strength] : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Security Posture:</span>
                    <span className="font-semibold text-slate-300">{strengthLabels[strength]}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
                I agree to the{" "}
                <span className="text-purple-300 hover:underline">Terms of Service</span> and{" "}
                <span className="text-purple-300 hover:underline">Security Privacy Policy</span>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#6e44ff] to-[#8b5cf6] text-white text-xs font-semibold shadow-[0_0_24px_rgba(110,68,255,0.65)] hover:shadow-[0_0_34px_rgba(110,68,255,0.9)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Provisioning Security Cluster...</span>
                </>
              ) : (
                <>
                  <span>Create Warden Account</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setFullName("Alex Vance");
                setEmail("alex@warden.io");
                setPassword("QuantumSecure@2026");
                setFleetSize("11-50");
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Auto-fill sample organization
            </button>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Trust & Security Footer */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-20 pb-8 px-6 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-4">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-400" />
          SOC 2 Type II Certified
        </span>
        <span>&bull;</span>
        <span>256-bit End-to-End Encryption</span>
        <span>&bull;</span>
        <span>ISO 27001 & GDPR Compliant</span>
      </footer>
    </div>
  );
}
