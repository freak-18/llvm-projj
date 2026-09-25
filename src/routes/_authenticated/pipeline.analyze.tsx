/**
 * Pipeline Stage 1 — AI Analysis
 * Select a project → run Tree-sitter + CodeBERT analysis → view risk scores
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProjects, analyzeProject, getProject,
  type AnalysisReport, type SensitiveFunction,
} from "@/lib/api";
import {
  Brain, Sparkles, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight, Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/pipeline/analyze")({
  head: () => ({ meta: [{ title: "AI Analysis — ObfusShield" }] }),
  component: AnalyzePage,
});

const RISK_COLOR: Record<string, string> = {
  low:      "text-[oklch(0.72_0.17_160)] bg-[oklch(0.72_0.17_160/0.1)] border-[oklch(0.72_0.17_160/0.3)]",
  medium:   "text-[oklch(0.85_0.17_70)]  bg-[oklch(0.78_0.17_70/0.1)]  border-[oklch(0.78_0.17_70/0.3)]",
  high:     "text-[oklch(0.78_0.2_25)]   bg-[oklch(0.65_0.22_25/0.1)]  border-[oklch(0.65_0.22_25/0.3)]",
  critical: "text-[oklch(0.85_0.22_25)]  bg-[oklch(0.65_0.22_25/0.2)]  border-[oklch(0.65_0.22_25/0.5)]",
};

function AnalyzePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["project", selectedId],
    queryFn: () => getProject(selectedId!),
    enabled: !!selectedId,
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeProject(selectedId!),
    onSuccess: () => {
      toast.success("Analysis complete");
      qc.invalidateQueries({ queryKey: ["project", selectedId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const latestAnalysis: AnalysisReport | undefined = detail?.analyses?.[0];
  const isProcessing = detail?.project?.status === "analyzing";

  return (
    <div className="p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <PipelineStepHeader step={1} label="AI Analysis" icon={Brain} />
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Tree-sitter parses your source AST. The risk scorer identifies sensitive functions —
          auth, crypto, license, payments — and assigns 0–100 risk scores using CodeBERT-class patterns.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Project selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Select Project
          </h2>
          {projects.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center text-sm text-muted-foreground">
              No projects yet.{" "}
              <Link to="/projects/new" className="text-primary hover:underline">Create one</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setSelectedId(p._id)}
                  className={`lift-glow w-full text-left px-3 py-2.5 rounded-xl text-sm transition group ${
                    selectedId === p._id
                      ? "bg-primary/10 border border-primary/30 text-foreground"
                      : "glass hover:border-primary/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-[10px] font-mono uppercase mt-0.5 flex items-center gap-2">
                    <span>{p.language} · {p.protectionProfile}</span>
                    {(p.status === "analyzed" || p.status === "completed") && (
                      <span className="text-[oklch(0.72_0.17_160)]">● analyzed</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Analysis panel */}
        <div className="md:col-span-2 space-y-4">
          {!selectedId ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <div className="font-semibold">Select a project to analyse</div>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a project from the left to run AI risk analysis.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              Loading project…
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">{detail!.project.name}</div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">
                    {detail!.project.language} · {detail!.project.protectionProfile} · {detail!.files.length} file(s)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {latestAnalysis && (
                    <Link
                      to="/projects/$id"
                      params={{ id: selectedId }}
                      className="fade-hover text-xs text-[oklch(0.85_0.1_240)] hover:underline flex items-center gap-1"
                    >
                      Full view <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => analyzeMut.mutate()}
                    disabled={analyzeMut.isPending || isProcessing}
                    className="trace-border inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analyzeMut.isPending || isProcessing
                      ? "Analyzing…"
                      : latestAnalysis ? "Re-run Analysis" : "Run Analysis"}
                  </button>
                </div>
              </div>

              {/* Results */}
              {!latestAnalysis ? (
                <div className="glass rounded-2xl p-10 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                  <div className="font-semibold">No analysis yet</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Run Analysis" to detect sensitive functions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <SpotlightCard className="glass rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full border ${RISK_COLOR[latestAnalysis.overallRisk ?? "medium"]}`}>
                        {latestAnalysis.overallRisk ?? "—"} risk
                      </span>
                      <p className="text-sm text-foreground/90 leading-relaxed flex-1">
                        {latestAnalysis.summary}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-[oklch(0.72_0.17_160)] font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      {latestAnalysis.analysisSource === "ai_service"
                        ? "Tree-sitter AST + CodeBERT risk scoring"
                        : "Gemini AI Gateway (fallback)"}
                      · {new Date(latestAnalysis.createdAt).toLocaleString()}
                    </div>
                  </SpotlightCard>

                  {/* Metrics strip */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["RE Resistance",    `${latestAnalysis.metrics?.reverseEngineeringResistance ?? 0}%`],
                      ["Tamper Resistance",`${latestAnalysis.metrics?.tamperResistance ?? 0}%`],
                      ["Security Score",   `${latestAnalysis.metrics?.securityScore ?? 0}`],
                    ].map(([l, v]) => (
                      <div key={l} className="lift-glow glass rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                        <div className="mt-1 text-xl font-display font-bold text-gradient">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sensitive functions */}
                  <SpotlightCard className="glass rounded-2xl p-5 space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Sensitive Functions ({latestAnalysis.sensitiveFunctions?.length ?? 0})
                    </h3>
                    {latestAnalysis.sensitiveFunctions?.map((fn, i) => (
                      <FunctionCard key={i} fn={fn} />
                    ))}
                  </SpotlightCard>

                  {/* Recommendations */}
                  {latestAnalysis.recommendations?.length > 0 && (
                    <SpotlightCard className="glass rounded-2xl p-5">
                      <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {latestAnalysis.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="h-4 w-4 text-[oklch(0.85_0.1_240)] shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </SpotlightCard>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Next step */}
      <NextStepBanner
        to="/pipeline/protect"
        label="Next: Select Protection Profile"
        enabled={!!latestAnalysis}
        hint="Choose obfuscation intensity based on risk level"
      />
    </div>
  );
}

function FunctionCard({ fn }: { fn: SensitiveFunction }) {
  const riskColor =
    fn.riskScore >= 75 ? "text-[oklch(0.78_0.2_25)]"
    : fn.riskScore >= 50 ? "text-[oklch(0.85_0.17_70)]"
    : "text-[oklch(0.72_0.17_160)]";

  const barColor =
    fn.riskScore >= 75 ? "bg-[oklch(0.65_0.22_25)]"
    : fn.riskScore >= 50 ? "bg-[oklch(0.78_0.17_70)]"
    : "bg-[oklch(0.72_0.17_160)]";

  return (
    <div className="lift-glow bg-muted/20 rounded-xl p-3.5 border border-border/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-sm font-semibold">{fn.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
            {fn.category}
          </span>
          <span className={`font-mono text-sm font-bold ${riskColor}`}>{fn.riskScore}</span>
        </div>
      </div>
      {/* Risk bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${fn.riskScore}%` }} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{fn.reason}</p>
      {fn.recommendedTechniques?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {fn.recommendedTechniques.map((t) => (
            <span
              key={t}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-[oklch(0.66_0.19_256/0.12)] border border-[oklch(0.66_0.19_256/0.25)] text-[oklch(0.85_0.1_240)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared pipeline UI helpers ────────────────────────────────────────────────

export function PipelineStepHeader({
  step, label, icon: Icon,
}: { step: number; label: string; icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] grid place-items-center shadow-[var(--shadow-glow)]">
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.85_0.1_240)]">
          Stage {step.toString().padStart(2, "0")}
        </div>
        <h1 className="font-display text-2xl font-bold">{label}</h1>
      </div>
    </div>
  );
}

export function NextStepBanner({
  to, label, enabled, hint,
}: { to: string; label: string; enabled: boolean; hint: string }) {
  if (!enabled) return null;
  return (
    <div className="glass rounded-2xl p-4 border border-[oklch(0.72_0.17_160/0.3)] bg-[oklch(0.72_0.17_160/0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[oklch(0.72_0.17_160)] font-mono uppercase tracking-wider mb-0.5">
            ✓ Stage complete
          </div>
          <div className="text-sm text-muted-foreground">{hint}</div>
        </div>
        <Link
          to={to}
          className="trace-border shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)] hover:scale-[1.02] transition"
        >
          {label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
