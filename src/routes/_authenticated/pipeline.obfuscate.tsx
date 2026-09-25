/**
 * Pipeline Stage 3 — Obfuscation Execution
 * Select analyzed project → run LLVM passes → real-time job tracking
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProjects, getProject, obfuscateProject, getDownloadUrl,
  type ObfuscationJob,
} from "@/lib/api";
import {
  Cpu, Play, CheckCircle2, AlertTriangle, Clock,
  Download, GitBranch, ArrowRight, Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { io as socketIO } from "socket.io-client";
import { API_URL } from "@/lib/api";
import { PipelineStepHeader, NextStepBanner } from "./pipeline.analyze";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/pipeline/obfuscate")({
  head: () => ({ meta: [{ title: "Obfuscation — ObfusShield" }] }),
  component: ObfuscatePage,
});

function ObfuscatePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const analyzedProjects = projects.filter(
    (p) => p.status === "analyzed" || p.status === "completed"
  );

  const { data: detail, isLoading } = useQuery({
    queryKey: ["project", selectedId],
    queryFn: () => getProject(selectedId!),
    enabled: !!selectedId,
    refetchInterval: (d) => {
      const s = d?.project?.status;
      return s === "obfuscating" || s === "queued" ? 2000 : false;
    },
  });

  // Socket.IO for real-time job events
  useEffect(() => {
    if (!selectedId) return;
    const socket = socketIO(API_URL, { transports: ["websocket"] });
    socket.emit("join:project", selectedId);
    socket.on("obfuscation:complete", () => {
      toast.success("Obfuscation complete — binary ready");
      qc.invalidateQueries({ queryKey: ["project", selectedId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    });
    socket.on("obfuscation:failed", ({ error }: { error: string }) => {
      toast.error(`Obfuscation failed: ${error}`);
      qc.invalidateQueries({ queryKey: ["project", selectedId] });
    });
    return () => { socket.disconnect(); };
  }, [selectedId, qc]);

  const obfMut = useMutation({
    mutationFn: () => obfuscateProject(selectedId!),
    onSuccess: () => {
      toast.info("LLVM pipeline queued…");
      qc.invalidateQueries({ queryKey: ["project", selectedId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const project    = detail?.project;
  const latestJob: ObfuscationJob | undefined = detail?.jobs?.[0];
  const hasAnalysis = detail?.analyses?.length > 0;
  const isRunning   = project?.status === "obfuscating" || project?.status === "queued";
  const isDone      = latestJob?.status === "completed";

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <PipelineStepHeader step={3} label="Obfuscation Engine" icon={Cpu} />
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Runs the ObfusShield LLVM pass plugin on your source.
          Pipeline: <code className="font-mono text-xs">clang -emit-llvm</code> →{" "}
          <code className="font-mono text-xs">opt --load-pass-plugin=ObfusShield.so</code> →{" "}
          <code className="font-mono text-xs">clang -c → .o</code>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Project selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Analyzed Projects
          </h2>
          {analyzedProjects.length === 0 ? (
            <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
              Run AI analysis first.{" "}
              <Link to="/pipeline/analyze" className="text-primary hover:underline">Go to analysis</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {analyzedProjects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setSelectedId(p._id)}
                  className={`lift-glow w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                    selectedId === p._id
                      ? "bg-primary/10 border border-primary/30 text-foreground"
                      : "glass hover:border-primary/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-[10px] font-mono uppercase mt-0.5">
                    {p.language} · {p.protectionProfile}
                    {p.status === "completed" && (
                      <span className="ml-2 text-[oklch(0.72_0.17_160)]">● protected</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Obfuscation panel */}
        <div className="md:col-span-2 space-y-4">
          {!selectedId ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Cpu className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <div className="font-semibold">Select an analyzed project</div>
            </div>
          ) : isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Project + action bar */}
              <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{project!.name}</div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">
                    {project!.language} · {project!.protectionProfile}
                  </div>
                </div>
                <button
                  onClick={() => obfMut.mutate()}
                  disabled={obfMut.isPending || isRunning || !hasAnalysis}
                  className="trace-border inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-50"
                >
                  {isRunning
                    ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Running…</>
                    : <><Play className="h-4 w-4 fill-current" /> {isDone ? "Re-run" : "Execute Pipeline"}</>
                  }
                </button>
              </div>

              {/* Pass pipeline visual */}
              <PassPipelineVisual profile={project!.protectionProfile} running={isRunning} done={isDone} />

              {/* Job result */}
              {latestJob && (
                <JobResultPanel job={latestJob} projectId={selectedId} />
              )}

              {!hasAnalysis && (
                <div className="glass rounded-xl p-4 flex items-center gap-3 border border-[oklch(0.78_0.17_70/0.3)] bg-[oklch(0.78_0.17_70/0.05)]">
                  <AlertTriangle className="h-5 w-5 text-[oklch(0.78_0.17_70)] shrink-0" />
                  <div className="text-sm">
                    Run{" "}
                    <Link to="/pipeline/analyze" className="text-primary hover:underline">AI analysis</Link>{" "}
                    first to generate risk data before obfuscating.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <NextStepBanner
        to="/analytics"
        label="Next: View Security Metrics"
        enabled={isDone ?? false}
        hint="Binary protected — review complexity increase, CFG growth, entropy metrics"
      />
    </div>
  );
}

const PASS_MAP: Record<string, string[]> = {
  basic:      ["Symbol Renaming", "Dead Code Insertion", "String Obfuscation"],
  advanced:   ["Control Flow Flattening", "String Encryption", "Instruction Substitution", "Bogus Control Flow", "Symbol Renaming"],
  enterprise: ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug"],
  military:   ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug", "Anti-Tamper", "Virtualization"],
};

function PassPipelineVisual({ profile, running, done }: { profile: string; running: boolean; done: boolean }) {
  const passes = PASS_MAP[profile] ?? PASS_MAP.advanced;
  return (
    <SpotlightCard className="glass rounded-2xl p-5">
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
        LLVM Pass Pipeline · {profile.toUpperCase()}
      </div>
      <div className="space-y-2">
        {/* Compile step */}
        <PipelineStep label="clang -emit-llvm -S source.cpp -o source.ll" type="compile" done={done || running} />
        {/* Obfuscation passes */}
        {passes.map((p, i) => (
          <PipelineStep key={p} label={`opt --passes="${passToId(p)}" source.ll`} type="pass" done={done} running={running} delay={i} passName={p} />
        ))}
        {/* Link step */}
        <PipelineStep label="clang source_obf.ll -c -o protected.o" type="link" done={done} />
      </div>
    </SpotlightCard>
  );
}

function PipelineStep({ label, type, done, running, delay = 0, passName }: {
  label: string; type: string; done?: boolean; running?: boolean; delay?: number; passName?: string;
}) {
  const typeColor: Record<string, string> = {
    compile: "text-[oklch(0.78_0.14_200)]",
    pass:    "text-[oklch(0.66_0.21_295)]",
    link:    "text-[oklch(0.72_0.17_160)]",
  };
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${done ? "bg-[oklch(0.72_0.17_160)]" : running ? "bg-[oklch(0.78_0.17_70)] animate-pulse" : "bg-muted"}`} />
      {passName && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[oklch(0.66_0.21_295/0.1)] text-[oklch(0.85_0.1_240)] border border-[oklch(0.66_0.21_295/0.2)] shrink-0">
          {passName}
        </span>
      )}
      <code className={`text-[10px] font-mono truncate ${typeColor[type] ?? "text-muted-foreground"}`}>
        {label}
      </code>
    </div>
  );
}

function JobResultPanel({ job, projectId }: { job: ObfuscationJob; projectId: string }) {
  const statusConfig = {
    completed:  { icon: CheckCircle2, color: "text-[oklch(0.72_0.17_160)]", label: "Completed" },
    failed:     { icon: AlertTriangle, color: "text-[oklch(0.78_0.2_25)]", label: "Failed" },
    processing: { icon: Zap,          color: "text-[oklch(0.78_0.17_70)]", label: "Processing" },
    queued:     { icon: Clock,        color: "text-muted-foreground",       label: "Queued" },
  }[job.status] ?? { icon: Clock, color: "text-muted-foreground", label: job.status };

  const Icon = statusConfig.icon;

  return (
    <SpotlightCard className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${statusConfig.color}`} />
          <span className={`font-mono font-semibold text-sm ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {job.durationMs && (
            <span className="text-xs text-muted-foreground">in {job.durationMs}ms</span>
          )}
        </div>
        {job.status === "completed" && (
          <div className="flex gap-2">
            <a
              href={getDownloadUrl(projectId, "binary")}
              className="fade-hover inline-flex items-center gap-1.5 rounded-lg glass hover:bg-accent px-3 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Binary (.o)
            </a>
            <Link
              to="/pipeline/cfg"
              className="fade-hover inline-flex items-center gap-1.5 rounded-lg glass hover:bg-accent px-3 py-1.5 text-xs"
            >
              <GitBranch className="h-3.5 w-3.5" /> View CFG
            </Link>
          </div>
        )}
      </div>

      {job.metrics && job.status === "completed" && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ["CFG Growth",       `+${job.metrics.cfgGrowthPct ?? 0}%`],
            ["Entropy Increase", `+${job.metrics.entropyIncrease ?? 0}%`],
            ["Security Score",   `${job.metrics.securityScore ?? 0}`],
          ].map(([l, v]) => (
            <div key={l} className="lift-glow bg-muted/20 rounded-xl p-3 text-center border border-border/40">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
              <div className="mt-1 text-lg font-display font-bold text-gradient">{v}</div>
            </div>
          ))}
        </div>
      )}

      {job.appliedPasses?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.appliedPasses.map((p) => (
            <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded border bg-[oklch(0.72_0.17_160/0.08)] border-[oklch(0.72_0.17_160/0.25)] text-[oklch(0.72_0.17_160)]">
              {p}
            </span>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}

function passToId(name: string) {
  const map: Record<string, string> = {
    "Control Flow Flattening": "flatten-cfg",
    "Bogus Control Flow":      "bogus-flow",
    "String Encryption":       "string-encrypt",
    "Instruction Substitution":"inst-subst",
    "Function Splitting":      "func-split",
    "Opaque Predicates":       "opaque-pred",
    "Anti-Debug":              "anti-debug",
    "Anti-Tamper":             "anti-debug",
    "Virtualization":          "opaque-pred",
    "Symbol Renaming":         "inst-subst",
    "Dead Code Insertion":     "bogus-flow",
    "String Obfuscation":      "string-encrypt",
  };
  return map[name] ?? name.toLowerCase();
}
