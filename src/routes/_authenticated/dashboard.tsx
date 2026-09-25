import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/api";
import {
  Shield, AlertTriangle, Plus, ArrowRight, Brain,
  Lock, Activity, Cpu, GitBranch, FileText, Download,
  CheckCircle2, Clock, Zap, Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Mission Control — ObfusShield AI" }] }),
  component: Dashboard,
});

// Pipeline stage definition
const PIPELINE = [
  { step: 1, icon: Plus,        label: "Create Project",      desc: "Name, language, profile",  to: "/projects/new",          color: "oklch(0.66 0.19 256)" },
  { step: 2, icon: Brain,       label: "AI Analysis",         desc: "Detect sensitive functions",to: "/pipeline/analyze",      color: "oklch(0.66 0.21 295)" },
  { step: 3, icon: Lock,        label: "Protection Profile",  desc: "Basic → Military grade",   to: "/pipeline/protect",      color: "oklch(0.78 0.17 70)" },
  { step: 4, icon: Cpu,         label: "Obfuscation",         desc: "LLVM pass pipeline",        to: "/pipeline/obfuscate",    color: "oklch(0.72 0.17 160)" },
  { step: 5, icon: Activity,    label: "Security Metrics",    desc: "Score, entropy, CFG growth",to: "/analytics",             color: "oklch(0.78 0.14 200)" },
  { step: 6, icon: GitBranch,   label: "CFG Visualization",   desc: "Control flow graph",        to: "/pipeline/cfg",          color: "oklch(0.66 0.19 256)" },
  { step: 7, icon: FileText,    label: "Report Generation",   desc: "Executive PDF report",      to: "/pipeline/reports",      color: "oklch(0.66 0.21 295)" },
  { step: 8, icon: Download,    label: "Download Binary",     desc: "Protected .o artifact",     to: "/pipeline/downloads",    color: "oklch(0.72 0.17 160)" },
];

function Dashboard() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const total       = projects.length;
  const completed   = projects.filter((p) => p.status === "completed").length;
  const analyzed    = projects.filter((p) => p.status === "analyzed" || p.status === "completed").length;
  const inProgress  = projects.filter((p) => ["analyzing", "obfuscating", "queued"].includes(p.status)).length;
  const highRisk    = projects.filter((p) => (p.securityScore ?? 0) < 60 && p.status !== "uploaded").length;
  const avgScore    = analyzed
    ? Math.round(projects.filter(p => p.securityScore).reduce((a, p) => a + (p.securityScore ?? 0), 0) / Math.max(analyzed, 1))
    : 0;

  return (
    <div className="p-8 max-w-7xl space-y-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.85_0.1_240)] mb-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.17_160)] opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.17_160)]" />
            </span>
            Security Operations Center
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Mission <span className="text-gradient">Control</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            End-to-end software protection pipeline. {total} project{total !== 1 ? "s" : ""} in the perimeter.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="trace-border inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-glow)] hover:scale-[1.02] transition"
        >
          <Plus className="h-4 w-4" /> New Project
        </Link>
      </div>

      {/* ── Threat posture cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ThreatCard
          icon={Shield}
          label="Avg Security Score"
          value={avgScore ? `${avgScore}` : "—"}
          sub="0–100"
          accent
        />
        <ThreatCard
          icon={CheckCircle2}
          label="Protected"
          value={`${completed}`}
          sub={`${total - completed} pending`}
          color="oklch(0.72 0.17 160)"
        />
        <ThreatCard
          icon={Clock}
          label="In Progress"
          value={`${inProgress}`}
          sub="active jobs"
          color="oklch(0.78 0.17 70)"
        />
        <ThreatCard
          icon={AlertTriangle}
          label="High Risk"
          value={`${highRisk}`}
          sub="score < 60"
          color="oklch(0.65 0.22 25)"
          warn
        />
      </div>

      {/* ── Protection Pipeline ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-[oklch(0.85_0.1_240)]" />
            Protection Pipeline
          </h2>
          <span className="text-xs text-muted-foreground font-mono">8 stages end-to-end</span>
        </div>

        {/* Pipeline visual */}
        <div className="glass rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PIPELINE.map((stage, i) => (
              <Link
                key={stage.step}
                to={stage.to}
                className="lift-glow group relative glass rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200 hover:border-[oklch(0.66_0.19_256/0.4)]"
              >
                {/* Step connector line */}
                {i < PIPELINE.length - 1 && i % 4 !== 3 && (
                  <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="h-7 w-7 rounded-lg grid place-items-center text-white shrink-0"
                    style={{ background: `${stage.color}`, boxShadow: `0 0 12px -3px ${stage.color}` }}
                  >
                    <stage.icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: stage.color }}
                  >
                    0{stage.step}
                  </span>
                </div>
                <div className="text-xs font-semibold leading-tight">{stage.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {stage.desc}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 mt-2 transition" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active projects ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-[oklch(0.85_0.1_240)]" />
            Active Operations
          </h2>
          <Link to="/projects" className="fade-hover text-xs text-[oklch(0.85_0.1_240)] hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            Scanning perimeter…
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <div className="font-display text-lg font-semibold">No projects in perimeter</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload your first source file to begin the protection pipeline.
            </p>
            <Link
              to="/projects/new"
              className="trace-border mt-5 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-[var(--shadow-glow)]"
            >
              <Plus className="h-4 w-4" /> Create first project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 8).map((p) => (
              <Link
                key={p._id}
                to="/projects/$id"
                params={{ id: p._id }}
                className="lift-glow group flex items-center gap-4 glass rounded-xl px-4 py-3 hover:border-[oklch(0.66_0.19_256/0.3)] transition"
              >
                {/* Status indicator */}
                <StatusDot status={p.status} />

                {/* Project info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono uppercase mt-0.5">
                    {p.language} · {p.protectionProfile} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Pipeline stage badge */}
                <PipelineStageBadge status={p.status} />

                {/* Score bar */}
                <div className="hidden md:flex items-center gap-2 w-28">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.securityScore ?? 0}%`,
                        background: scoreGradient(p.securityScore ?? 0),
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono shrink-0 w-8 text-right">
                    {p.securityScore ?? "—"}
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-[oklch(0.85_0.1_240)] group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: Brain, label: "Run AI Analysis",
            desc: "Detect sensitive functions and score risk across a project",
            to: "/pipeline/analyze", color: "from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)]",
          },
          {
            icon: Cpu, label: "Start Obfuscation",
            desc: "Apply LLVM passes to harden your binary",
            to: "/pipeline/obfuscate", color: "from-[oklch(0.66_0.21_295)] to-[oklch(0.72_0.17_160)]",
          },
          {
            icon: FileText, label: "Generate Report",
            desc: "Download executive PDF with metrics and CFG screenshots",
            to: "/pipeline/reports", color: "from-[oklch(0.72_0.17_160)] to-[oklch(0.78_0.14_200)]",
          },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="lift-glow group glass rounded-2xl p-5 hover:-translate-y-1 transition"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${a.color} grid place-items-center mb-3 shadow-[0_0_16px_-4px_oklch(0.66_0.19_256/0.5)]`}>
              <a.icon className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-sm">{a.label}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-[oklch(0.85_0.1_240)] opacity-0 group-hover:opacity-100 transition">
              Go <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ThreatCard({ icon: Icon, label, value, sub, accent, warn, color }: any) {
  return (
    <SpotlightCard className={`glass rounded-2xl p-5 ${accent ? "glow-border" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        <Icon className="h-4 w-4" style={{ color: warn ? "oklch(0.65 0.22 25)" : color ?? "oklch(0.85 0.1 240)" }} />
      </div>
      <div className={`text-3xl font-display font-bold ${accent ? "text-gradient" : ""}`} style={!accent && color ? { color } : {}}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </SpotlightCard>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: "bg-muted-foreground",
    analyzing: "bg-[oklch(0.78_0.17_70)] animate-pulse",
    analyzed: "bg-[oklch(0.78_0.14_200)]",
    obfuscating: "bg-[oklch(0.66_0.21_295)] animate-pulse",
    completed: "bg-[oklch(0.72_0.17_160)]",
    failed: "bg-[oklch(0.65_0.22_25)]",
    queued: "bg-[oklch(0.78_0.17_70)]",
  };
  return <div className={`h-2 w-2 rounded-full shrink-0 ${map[status] ?? "bg-muted"}`} />;
}

function PipelineStageBadge({ status }: { status: string }) {
  const stageMap: Record<string, { label: string; color: string }> = {
    uploaded:    { label: "Uploaded",    color: "bg-muted/60 text-muted-foreground" },
    analyzing:   { label: "Analyzing…",  color: "bg-[oklch(0.78_0.17_70/0.15)] text-[oklch(0.85_0.17_70)]" },
    analyzed:    { label: "Analyzed",    color: "bg-[oklch(0.78_0.14_200/0.15)] text-[oklch(0.78_0.14_200)]" },
    obfuscating: { label: "Obfuscating", color: "bg-[oklch(0.66_0.21_295/0.15)] text-[oklch(0.85_0.1_240)]" },
    completed:   { label: "Protected ✓", color: "bg-[oklch(0.72_0.17_160/0.15)] text-[oklch(0.72_0.17_160)]" },
    failed:      { label: "Failed",      color: "bg-[oklch(0.65_0.22_25/0.15)] text-[oklch(0.78_0.2_25)]" },
    queued:      { label: "Queued",      color: "bg-[oklch(0.78_0.17_70/0.15)] text-[oklch(0.85_0.17_70)]" },
  };
  const s = stageMap[status] ?? stageMap.uploaded;
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

function scoreGradient(score: number) {
  if (score >= 80) return "linear-gradient(90deg, oklch(0.72 0.17 160), oklch(0.78 0.14 200))";
  if (score >= 60) return "linear-gradient(90deg, oklch(0.78 0.17 70), oklch(0.78 0.14 200))";
  return "linear-gradient(90deg, oklch(0.65 0.22 25), oklch(0.78 0.17 70))";
}
