/**
 * Pipeline Stage — Report Generation
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects, getProject, getDownloadUrl } from "@/lib/api";
import { FileText, Download, ArrowRight, CheckCircle2, Shield, Activity, Brain } from "lucide-react";
import { useState } from "react";
import { PipelineStepHeader, NextStepBanner } from "./pipeline.analyze";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/pipeline/reports")({
  head: () => ({ meta: [{ title: "Reports — ObfusShield" }] }),
  component: ReportsPage,
});

const REPORT_SECTIONS = [
  { icon: Shield,   title: "Executive Summary",    desc: "Project overview, overall risk level, and key findings" },
  { icon: Brain,    title: "AI Risk Analysis",      desc: "Sensitive function table with risk scores and categories" },
  { icon: CheckCircle2, title: "Applied Passes",   desc: "LLVM obfuscation passes applied with security impact" },
  { icon: Activity, title: "Security Metrics",     desc: "Score formula, RE resistance, tamper resistance, coverage" },
  { icon: FileText, title: "Recommendations",       desc: "Actionable hardening steps from the AI engine" },
];

function ReportsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: detail, isLoading } = useQuery({
    queryKey: ["project", selectedId],
    queryFn: () => getProject(selectedId!),
    enabled: !!selectedId,
  });

  const analysis = detail?.analyses?.[0];
  const job = detail?.jobs?.[0];
  const project = detail?.project;

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <PipelineStepHeader step={7} label="Report Generation" icon={FileText} />
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          PDFKit generates a professional security report with executive summary,
          risk analysis, applied passes, metrics, and security score.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Project selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Select Project
          </h2>
          <div className="space-y-1.5">
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelectedId(p._id)}
                className={`lift-glow w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                  selectedId === p._id
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "glass hover:border-primary/20 text-muted-foreground"
                }`}
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[10px] font-mono uppercase mt-0.5">
                  {p.language} · {p.status}
                  {p.securityScore ? ` · score ${p.securityScore}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report preview */}
        <div className="md:col-span-2 space-y-4">
          {!selectedId ? (
            <div className="glass rounded-2xl p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <div className="font-semibold">Select a project to preview its report</div>
            </div>
          ) : isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Report header mock */}
              <SpotlightCard className="glass rounded-2xl overflow-hidden">
                {/* Cover */}
                <div className="bg-gradient-to-br from-[oklch(0.13_0.025_260)] to-[oklch(0.16_0.03_260)] px-6 py-8 relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[oklch(0.85_0.1_240)] mb-2">
                          ObfusShield AI · Security Report
                        </div>
                        <h2 className="font-display text-2xl font-bold">{project!.name}</h2>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {project!.language.toUpperCase()} · {project!.protectionProfile.toUpperCase()} · {new Date(project!.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {/* Score badge */}
                      <div className="glass rounded-xl p-3 text-center min-w-[70px]">
                        <div className="text-[10px] font-mono text-muted-foreground">SCORE</div>
                        <div className="text-3xl font-display font-bold text-gradient">
                          {project!.securityScore ?? "—"}
                        </div>
                        <div className="text-[9px] text-muted-foreground">/100</div>
                      </div>
                    </div>

                    {/* Summary */}
                    {analysis?.summary && (
                      <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
                        {analysis.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sections list */}
                <div className="p-5 border-t border-border">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                    Report Sections
                  </div>
                  <div className="space-y-2">
                    {REPORT_SECTIONS.map((s, i) => (
                      <div key={s.title} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                        <div className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</div>
                        <s.icon className="h-4 w-4 text-[oklch(0.85_0.1_240)] shrink-0" />
                        <div>
                          <div className="text-xs font-semibold">{s.title}</div>
                          <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                        </div>
                        <CheckCircle2 className={`ml-auto h-3.5 w-3.5 shrink-0 ${
                          i === 0 ? "text-[oklch(0.72_0.17_160)]" :
                          analysis ? "text-[oklch(0.72_0.17_160)]" :
                          "text-muted-foreground/30"
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              </SpotlightCard>

              {/* Download button */}
              <a
                href={getDownloadUrl(selectedId, "report")}
                className="trace-border flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium shadow-[var(--shadow-glow)] hover:scale-[1.01] transition"
              >
                <Download className="h-4 w-4" />
                Download PDF Report — {project!.name.replace(/\s+/g, "_")}_security_report.pdf
              </a>
            </>
          )}
        </div>
      </div>

      <NextStepBanner
        to="/pipeline/downloads"
        label="Next: Download Protected Binary"
        enabled={!!selectedId && !!detail?.jobs?.[0]}
        hint="Download the obfuscated .o binary artifact"
      />
    </div>
  );
}
