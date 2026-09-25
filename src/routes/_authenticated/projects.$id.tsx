import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProject,
  analyzeProject,
  obfuscateProject,
  deleteProject,
  getDownloadUrl,
  type AnalysisReport,
  type ObfuscationJob,
} from "@/lib/api";
import {
  Brain, Shield, AlertTriangle, FileCode2, Sparkles, Trash2, Download,
  GitBranch, Lock, Activity, Cpu, ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { io as socketIO } from "socket.io-client";
import { API_URL } from "@/lib/api";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project — ObfusShield AI" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    refetchInterval: (d) => {
      const status = d?.project?.status;
      return status === "analyzing" || status === "obfuscating" ? 2000 : false;
    },
  });

  // Socket.IO real-time updates with fallback to polling
  useEffect(() => {
    const socket = socketIO(API_URL, { 
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected");
      socket.emit("join:project", id);
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket.IO connection error:", error);
    });

    socket.on("analysis:complete", () => {
      console.log("Analysis complete event received");
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("AI analysis complete");
    });
    socket.on("obfuscation:complete", () => {
      console.log("Obfuscation complete event received");
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Obfuscation complete — binary ready");
    });
    socket.on("obfuscation:failed", ({ error }: { error: string }) => {
      console.error("Obfuscation failed event:", error);
      toast.error(`Obfuscation failed: ${error}`);
    });

    return () => { socket.disconnect(); };
  }, [id, qc]);

  const analyzeMut = useMutation({
    mutationFn: async () => {
      console.log("Starting AI analysis for project:", id);
      try {
        const result = await analyzeProject(id);
        console.log("AI analysis completed:", result);
        return result;
      } catch (err: any) {
        console.error("AI analysis error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Analysis mutation success - invalidating queries");
      toast.success("AI analysis completed!");
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => {
      console.error("Analysis mutation error:", e.message);
      toast.error(`Analysis failed: ${e.message ?? "Unknown error"}`);
    },
  });

  const obfMut = useMutation({
    mutationFn: () => obfuscateProject(id),
    onSuccess: () => {
      toast.info("Obfuscation job queued — compiling…");
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Obfuscation failed"),
  });

  const delMut = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => { toast.success("Project deleted"); navigate({ to: "/projects" }); },
  });

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const { project, files, analyses, jobs } = data;
  const latest: AnalysisReport | undefined = analyses[0];
  const latestJob: ObfuscationJob | undefined = jobs[0];
  const metrics = latest?.metrics ?? {};
  const score = project.securityScore ?? 0;
  const isProcessing = project.status === "analyzing" || project.status === "obfuscating";

  return (
    <div className="p-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-mono text-[oklch(0.85_0.1_240)]">{project.protectionProfile} profile</div>
          <h1 className="mt-2 font-display text-3xl font-bold">{project.name}</h1>
          {project.description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{project.description}</p>}
          {isProcessing && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[oklch(0.85_0.1_240)]">
              <span className="animate-pulse h-2 w-2 rounded-full bg-[oklch(0.85_0.1_240)]" />
              {project.status === "analyzing" ? "AI analysis in progress…" : "Obfuscation in progress…"}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => analyzeMut.mutate()}
            disabled={analyzeMut.isPending || isProcessing}
            className="trace-border inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {analyzeMut.isPending ? "Analyzing…" : latest ? "Re-run AI analysis" : "Run AI analysis"}
          </button>
          <button
            onClick={() => obfMut.mutate()}
            disabled={obfMut.isPending || isProcessing || !latest}
            className="lift-glow inline-flex items-center gap-2 rounded-lg glass hover:bg-accent px-3 py-2 text-sm disabled:opacity-50"
            title={!latest ? "Run AI analysis first" : undefined}
          >
            <Cpu className="h-4 w-4" /> Obfuscate
          </button>
          {latestJob?.status === "completed" && (
            <>
              <a
                href={getDownloadUrl(id, "binary")}
                className="lift-glow inline-flex items-center gap-2 rounded-lg glass hover:bg-accent px-3 py-2 text-sm"
              >
                <Download className="h-4 w-4" /> Binary
              </a>
              <a
                href={getDownloadUrl(id, "report")}
                className="lift-glow inline-flex items-center gap-2 rounded-lg glass hover:bg-accent px-3 py-2 text-sm"
              >
                <Download className="h-4 w-4" /> PDF Report
              </a>
            </>
          )}
          {!latestJob && latest && (
            <a
              href={getDownloadUrl(id, "report")}
              className="lift-glow inline-flex items-center gap-2 rounded-lg glass hover:bg-accent px-3 py-2 text-sm"
            >
              <Download className="h-4 w-4" /> PDF Report
            </a>
          )}
          <button
            onClick={() => { if (confirm("Delete this project?")) delMut.mutate(); }}
            className="fade-hover inline-flex items-center gap-2 rounded-lg glass hover:bg-destructive/20 px-3 py-2 text-sm text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-4 gap-4">
        <ScoreGauge score={score} />
        <Metric icon={Shield} label="RE Resistance" value={metrics.reverseEngineeringResistance} />
        <Metric icon={Lock} label="Tamper Resistance" value={metrics.tamperResistance} />
        <Metric icon={Activity} label="Protection Coverage" value={metrics.protectionCoverage} />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="md:col-span-2 space-y-6">
          {/* AI Analysis */}
          <Section icon={Brain} title="AI Risk Analysis">
            {!latest ? (
              <EmptyAnalysis onRun={() => analyzeMut.mutate()} pending={analyzeMut.isPending} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <RiskBadge risk={latest.overallRisk} />
                  <p className="text-sm text-foreground/90">{latest.summary}</p>
                </div>
                {latest.analysisSource === "ai_service" ? (
                  <div className="text-xs text-[oklch(0.72_0.17_160)] font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Analysed by FastAPI AI Service (Tree-sitter + CodeBERT)
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground font-mono">Analysed via AI Gateway (Gemini fallback)</div>
                )}
                <div className="space-y-3">
                  {latest.sensitiveFunctions?.map((fn, i) => (
                    <div key={i} className="lift-glow glass rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-sm font-semibold">{fn.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{fn.category}</span>
                          <RiskScore score={fn.riskScore} />
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{fn.reason}</p>
                      {fn.recommendedTechniques?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {fn.recommendedTechniques.map((t: string) => (
                            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[oklch(0.66_0.19_256/0.15)] border border-[oklch(0.66_0.19_256/0.3)] text-[oklch(0.85_0.1_240)]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Recommendations */}
          {latest?.recommendations && latest.recommendations.length > 0 && (
            <Section icon={Sparkles} title="Recommendations">
              <ul className="space-y-2 text-sm">
                {latest.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.1_240)]" />
                    <span className="text-foreground/90">{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Obfuscation Job Status */}
          {latestJob && (
            <Section icon={Cpu} title="Obfuscation Job">
              <ObfJobPanel job={latestJob} />
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section icon={FileCode2} title={`Source files (${files.length})`}>
            <ul className="space-y-2 text-sm">
              {files.map((f) => (
                <li key={f._id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="font-mono truncate">{f.filename}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{f.sizeBytes} B</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={GitBranch} title="Applied Protections">
            <ProtectionStack profile={project.protectionProfile} />
          </Section>

          {/* LLVM Metrics */}
          {latestJob?.metrics && latestJob.status === "completed" && (
            <Section icon={Activity} title="LLVM Metrics">
              <div className="space-y-2 text-sm">
                {[
                  ["CFG Growth", `+${latestJob.metrics.cfgGrowthPct ?? 0}%`],
                  ["Complexity Increase", `+${latestJob.metrics.complexityIncrease ?? 0}%`],
                  ["String Protection", `${latestJob.metrics.stringProtection ?? 0}%`],
                  ["Functions Protected", `${latestJob.metrics.protectedFunctions ?? 0}%`],
                  ["Duration", `${latestJob.durationMs ?? 0} ms`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between rounded-lg bg-muted/40 px-3 py-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: any) {
  return (
    <SpotlightCard className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
        <h2 className="font-display font-semibold">{title}</h2>
      </div>
      {children}
    </SpotlightCard>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const level = score >= 90 ? "Military" : score >= 75 ? "Enterprise" : score >= 60 ? "Strong" : score >= 40 ? "Moderate" : "Weak";
  return (
    <SpotlightCard className="glass rounded-2xl p-5 glow-border">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Security Score</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-4xl font-display font-bold text-gradient">{pct}</div>
        <div className="text-xs text-muted-foreground">/100</div>
      </div>
      <div className="mt-2 text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.1_240)]">{level}</div>
      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[oklch(0.66_0.19_256)] to-[oklch(0.78_0.14_200)]" style={{ width: `${pct}%` }} />
      </div>
    </SpotlightCard>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value?: number }) {
  const v = value ?? 0;
  return (
    <SpotlightCard className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
      </div>
      <div className="mt-3 text-3xl font-display font-bold">{v}<span className="text-base text-muted-foreground">%</span></div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[oklch(0.66_0.21_295)] to-[oklch(0.66_0.19_256)]" style={{ width: `${v}%` }} />
      </div>
    </SpotlightCard>
  );
}

function RiskBadge({ risk }: { risk?: string }) {
  const map: Record<string, string> = {
    low: "bg-[oklch(0.72_0.17_160/0.2)] text-[oklch(0.85_0.16_160)] border-[oklch(0.72_0.17_160/0.4)]",
    medium: "bg-[oklch(0.78_0.17_70/0.2)] text-[oklch(0.85_0.17_70)] border-[oklch(0.78_0.17_70/0.4)]",
    high: "bg-[oklch(0.65_0.22_25/0.2)] text-[oklch(0.78_0.2_25)] border-[oklch(0.65_0.22_25/0.4)]",
    critical: "bg-[oklch(0.65_0.22_25/0.3)] text-[oklch(0.85_0.22_25)] border-[oklch(0.65_0.22_25/0.6)]",
  };
  return <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full border ${map[risk ?? "medium"] ?? map.medium}`}>{risk ?? "—"}</span>;
}

function RiskScore({ score }: { score: number }) {
  const color = score >= 75 ? "text-[oklch(0.78_0.2_25)]" : score >= 50 ? "text-[oklch(0.85_0.17_70)]" : "text-[oklch(0.85_0.16_160)]";
  return <span className={`font-mono text-sm font-bold ${color}`}>{score}</span>;
}

function EmptyAnalysis({ onRun, pending }: { onRun: () => void; pending: boolean }) {
  return (
    <div className="text-center py-8">
      <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <div className="font-semibold">No analysis yet</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Run AI analysis to detect sensitive functions, score risk, and get obfuscation recommendations.</p>
      <button onClick={onRun} disabled={pending} className="trace-border mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm shadow-[var(--shadow-glow)] disabled:opacity-50">
        <Sparkles className="h-4 w-4" /> {pending ? "Analyzing…" : "Run AI analysis"}
      </button>
    </div>
  );
}

function ProtectionStack({ profile }: { profile: string }) {
  const map: Record<string, string[]> = {
    basic: ["Symbol Renaming", "Dead Code Insertion", "String Obfuscation"],
    advanced: ["Control Flow Flattening", "String Encryption", "Instruction Substitution", "Bogus Control Flow", "Symbol Renaming"],
    enterprise: ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug"],
    military: ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug", "Anti-Tamper", "Virtualization"],
  };
  const techniques = map[profile] ?? map.advanced;
  return (
    <div className="flex flex-wrap gap-1.5">
      {techniques.map((t) => (
        <span key={t} className="text-[11px] font-mono px-2 py-1 rounded-md bg-[oklch(0.66_0.19_256/0.15)] border border-[oklch(0.66_0.19_256/0.3)] text-[oklch(0.85_0.1_240)]">{t}</span>
      ))}
    </div>
  );
}

function ObfJobPanel({ job }: { job: ObfuscationJob }) {
  const statusColor: Record<string, string> = {
    completed: "text-[oklch(0.72_0.17_160)]",
    failed: "text-[oklch(0.78_0.2_25)]",
    processing: "text-[oklch(0.78_0.17_70)]",
    queued: "text-muted-foreground",
  };
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={`font-mono uppercase text-xs ${statusColor[job.status] ?? "text-muted-foreground"}`}>● {job.status}</span>
        {job.durationMs && <span className="text-muted-foreground text-xs">{job.durationMs} ms</span>}
      </div>
      {job.appliedPasses?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {job.appliedPasses.map((p) => (
            <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[oklch(0.72_0.17_160/0.1)] border border-[oklch(0.72_0.17_160/0.3)] text-[oklch(0.72_0.17_160)]">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}
