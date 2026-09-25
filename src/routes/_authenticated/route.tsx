import {
  createFileRoute, Link, Outlet, redirect,
  useNavigate, useRouter, useMatchRoute,
} from "@tanstack/react-router";
import {
  Shield, LayoutDashboard, FolderOpen, Plus, LogOut,
  Brain, Lock, Activity, GitBranch, FileText, Download,
  ChevronRight, Cpu, Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredUser, clearAuth, isAuthenticated } from "@/lib/auth";
import { AmbientBackground } from "@/components/AmbientBackground";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isAuthenticated()) throw redirect({ to: "/auth" });
    const user = getStoredUser();
    return { user };
  },
  component: AuthedShell,
});

// ── Pipeline stages — the primary navigation concept ─────────────────────
const PIPELINE_STAGES = [
  {
    group: "Setup",
    items: [
      { to: "/dashboard",    icon: LayoutDashboard, label: "Mission Control",   badge: null },
      { to: "/projects",     icon: FolderOpen,      label: "Projects",           badge: null },
      { to: "/projects/new", icon: Plus,            label: "New Project",        badge: "new" },
    ],
  },
  {
    group: "Pipeline",
    items: [
      { to: "/pipeline/analyze",   icon: Brain,      label: "AI Analysis",        badge: "1" },
      { to: "/pipeline/protect",   icon: Lock,       label: "Protection Profiles",badge: "2" },
      { to: "/pipeline/obfuscate", icon: Cpu,        label: "Obfuscation",        badge: "3" },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/analytics",          icon: Activity,   label: "Security Metrics",   badge: null },
      { to: "/pipeline/cfg",       icon: GitBranch,  label: "CFG Visualization",  badge: null },
      { to: "/pipeline/reports",   icon: FileText,   label: "Reports",            badge: null },
      { to: "/pipeline/downloads", icon: Download,   label: "Downloads",          badge: null },
    ],
  },
];

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [email] = useState((user as any)?.email ?? "");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    clearAuth();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AmbientBackground />
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] shadow-[0_0_20px_-4px_oklch(0.66_0.19_256/0.7)]">
              <Shield className="h-4.5 w-4.5 text-white" />
              {/* Scan line animation */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 h-[1px] bg-white/30 animate-scan" />
              </div>
            </div>
            <div>
              <div className="text-sm font-display font-bold leading-tight">
                ObfusShield <span className="text-gradient">AI</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Security Pipeline
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.group}>
              <div className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
                {stage.group}
              </div>
              <div className="space-y-0.5">
                {stage.items.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Pipeline progress indicator */}
        <div className="px-4 py-3 border-t border-border">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Pipeline Stages
          </div>
          <div className="flex items-center gap-1">
            {["Upload", "Analyze", "Protect", "Obfuscate", "Report"].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.66_0.19_256/0.4)]" />
                  <span className="text-[8px] text-muted-foreground/50 font-mono hidden" style={{ display: "none" }}>
                    {s}
                  </span>
                </div>
                {i < 4 && <div className="h-px w-3 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] grid place-items-center text-[10px] font-bold text-white uppercase">
              {email?.[0] ?? "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{email}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Analyst</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="fade-hover w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-accent transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to, icon: Icon, label, badge,
}: {
  to: string; icon: any; label: string; badge: string | null;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:translate-x-0.5 transition-all duration-150"
      activeProps={{
        className:
          "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm bg-primary/10 text-foreground border border-primary/20 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]",
      }}
    >
      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 group-hover:text-[oklch(0.85_0.1_240)]" />
      <span className="flex-1 truncate">{label}</span>
      {badge === "new" && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[oklch(0.72_0.17_160/0.2)] text-[oklch(0.72_0.17_160)] border border-[oklch(0.72_0.17_160/0.3)]">
          NEW
        </span>
      )}
      {badge && badge !== "new" && (
        <span className="text-[9px] font-mono h-4 w-4 grid place-items-center rounded-full bg-primary/20 text-primary border border-primary/30">
          {badge}
        </span>
      )}
      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition" />
    </Link>
  );
}
