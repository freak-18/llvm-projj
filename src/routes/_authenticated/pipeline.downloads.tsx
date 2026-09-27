/**
 * Pipeline Stage — Downloads
 * Download obfuscated binary and PDF report for completed projects.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects, getDownloadUrl } from "@/lib/api";
import { Download, FileText, Package, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { PipelineStepHeader } from "./pipeline.analyze";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/pipeline/downloads")({
  head: () => ({ meta: [{ title: "Downloads — ObfusShield" }] }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const completed = projects.filter((p) => p.status === "completed");
  const analyzed  = projects.filter((p) => p.status === "analyzed");

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <PipelineStepHeader step={8} label="Downloads" icon={Download} />
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Download protected binaries and executive security reports.
          Binaries are compiled object files (.o) ready for linking.
        </p>
      </div>

      {/* Completed — binary + report */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.72_0.17_160)]" />
            Protected Binaries Available
          </h2>
          <div className="space-y-3">
            {completed.map((p) => (
              <SpotlightCard
                key={p._id}
                className="glass rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[oklch(0.72_0.17_160)] shrink-0" />
                    <span className="font-semibold truncate">{p.name}</span>
                    <ScoreBadge score={p.securityScore ?? 0} />
                  </div>
                  <div className="text-xs text-muted-foreground font-mono uppercase mt-1">
                    {p.language} · {p.protectionProfile} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Download buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={getDownloadUrl(p._id, "binary")}
                    className="trace-border inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)] hover:scale-[1.02] transition"
                  >
                    <Package className="h-4 w-4" />
                    Binary (.o)
                  </a>
                  <a
                    href={getDownloadUrl(p._id, "report")}
                    className="lift-glow inline-flex items-center gap-2 rounded-xl glass hover:bg-accent px-4 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </a>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}

      {/* Analyzed only — report available, binary not yet */}
      {analyzed.length > 0 && (
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[oklch(0.78_0.14_200)]" />
            Reports Available (Run Obfuscation for Binary)
          </h2>
          <div className="space-y-3">
            {analyzed.map((p) => (
              <SpotlightCard
                key={p._id}
                className="glass rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 opacity-80"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[oklch(0.78_0.17_70)] shrink-0" />
                    <span className="font-semibold truncate">{p.name}</span>
                    <ScoreBadge score={p.securityScore ?? 0} />
                  </div>
                  <div className="text-xs text-muted-foreground font-mono uppercase mt-1">
                    {p.language} · analyzed · run obfuscation to generate binary
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={getDownloadUrl(p._id, "report")}
                    className="lift-glow inline-flex items-center gap-2 rounded-xl glass hover:bg-accent px-4 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4" /> PDF Report
                  </a>
                  <Link
                    to="/pipeline/obfuscate"
                    className="lift-glow inline-flex items-center gap-2 rounded-xl bg-primary/80 text-primary-foreground px-4 py-2 text-sm"
                  >
                    Run Obfuscation →
                  </Link>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && completed.length === 0 && analyzed.length === 0 && (
        <div className="glass rounded-2xl p-16 text-center">
          <Download className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <div className="font-display text-lg font-semibold">No downloads yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Complete the protection pipeline to download your hardened binary and security report.
          </p>
          <Link
            to="/projects/new"
            className="trace-border mt-5 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm"
          >
            Start Pipeline →
          </Link>
        </div>
      )}

      {/* What's in each download */}
      <SpotlightCard className="glass rounded-2xl p-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
          Download Contents
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="lift-glow bg-muted/20 rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-[oklch(0.72_0.17_160)]" />
              <span className="text-sm font-semibold">Protected Binary (.o)</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Compiled object file with all LLVM passes applied</li>
              <li>• String literals encrypted, CFG flattened</li>
              <li>• Anti-debug code injected into sensitive functions</li>
              <li>• Ready for linking into your final executable</li>
            </ul>
          </div>
          <div className="lift-glow bg-muted/20 rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
              <span className="text-sm font-semibold">PDF Security Report</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Executive summary for board/stakeholder review</li>
              <li>• Sensitive function table with risk scores</li>
              <li>• Applied passes with security impact</li>
              <li>• Metrics: score, RE resistance, entropy increase</li>
            </ul>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80
    ? "bg-[oklch(0.72_0.17_160/0.15)] text-[oklch(0.72_0.17_160)] border-[oklch(0.72_0.17_160/0.3)]"
    : score >= 60
    ? "bg-[oklch(0.78_0.17_70/0.15)] text-[oklch(0.85_0.17_70)] border-[oklch(0.78_0.17_70/0.3)]"
    : "bg-[oklch(0.65_0.22_25/0.15)] text-[oklch(0.78_0.2_25)] border-[oklch(0.65_0.22_25/0.3)]";
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${color}`}>
      {score}
    </span>
  );
}
