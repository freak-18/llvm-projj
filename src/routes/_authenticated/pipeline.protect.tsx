/**
 * Pipeline Stage 2 — Protection Profile Selection
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/api";
import { Lock, CheckCircle2, ArrowRight, Shield } from "lucide-react";
import { useState } from "react";
import { PipelineStepHeader, NextStepBanner } from "./pipeline.analyze";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/pipeline/protect")({
  head: () => ({ meta: [{ title: "Protection Profiles — ObfusShield" }] }),
  component: ProtectPage,
});

const PROFILES = [
  {
    id: "basic",
    name: "Basic",
    color: "oklch(0.72 0.17 160)",
    gradient: "from-[oklch(0.72_0.17_160)] to-[oklch(0.78_0.14_200)]",
    techniques: 3,
    perfImpact: "Negligible (<1%)",
    useCase: "Internal tools, dev builds",
    resistance: "Low — defeats script-kiddie tools",
    passes: ["Symbol Renaming", "Dead Code Insertion", "String Obfuscation"],
    scoreBoost: "+0",
  },
  {
    id: "advanced",
    name: "Advanced",
    color: "oklch(0.66 0.19 256)",
    gradient: "from-[oklch(0.66_0.19_256)] to-[oklch(0.78_0.14_200)]",
    techniques: 5,
    perfImpact: "Low (2–5%)",
    useCase: "Commercial apps, SaaS",
    resistance: "Medium — defeats IDA/Ghidra auto-analysis",
    passes: ["Control Flow Flattening", "String Encryption", "Instruction Substitution", "Bogus Control Flow", "Symbol Renaming"],
    scoreBoost: "+8",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    color: "oklch(0.78 0.17 70)",
    gradient: "from-[oklch(0.78_0.17_70)] to-[oklch(0.66_0.19_256)]",
    techniques: 7,
    perfImpact: "Moderate (5–15%)",
    useCase: "FinTech, SaaS, IP-sensitive products",
    resistance: "High — defeats automated decompilers",
    passes: ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug"],
    scoreBoost: "+16",
  },
  {
    id: "military",
    name: "Military Grade",
    color: "oklch(0.65 0.22 25)",
    gradient: "from-[oklch(0.65_0.22_25)] to-[oklch(0.66_0.21_295)]",
    techniques: 9,
    perfImpact: "Significant (15–40%)",
    useCase: "Defense, banking, critical infrastructure",
    resistance: "Military — defeats expert reverse engineers",
    passes: ["Control Flow Flattening", "String Encryption", "Bogus Control Flow", "Instruction Substitution", "Opaque Predicates", "Function Splitting", "Anti-Debug", "Anti-Tamper", "Virtualization"],
    scoreBoost: "+24",
  },
];

function ProtectPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const analyzedProjects = projects.filter(
    (p) => p.status === "analyzed" || p.status === "completed"
  );

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div>
        <PipelineStepHeader step={2} label="Protection Profiles" icon={Lock} />
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Select your threat envelope. Each profile maps to a curated set of LLVM obfuscation passes.
          Higher profiles increase security score but add performance overhead.
        </p>
      </div>

      {/* Profile cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => setSelected(profile.id)}
            className={`lift-glow text-left glass rounded-2xl p-5 transition hover:-translate-y-1 ${
              selected === profile.id
                ? "border-[oklch(0.66_0.19_256/0.6)] bg-[oklch(0.66_0.19_256/0.08)]"
                : "hover:border-[oklch(0.66_0.19_256/0.3)]"
            }`}
          >
            {/* Profile gradient bar */}
            <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${profile.gradient} mb-4`} />

            <div className="flex items-start justify-between mb-1">
              <h3 className="font-display text-lg font-bold">{profile.name}</h3>
              {selected === profile.id && (
                <CheckCircle2 className="h-5 w-5 text-[oklch(0.72_0.17_160)] shrink-0" />
              )}
            </div>

            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <Row label="Techniques" value={`${profile.techniques} passes`} />
              <Row label="Perf impact" value={profile.perfImpact} />
              <Row label="Score boost" value={profile.scoreBoost} highlight />
              <Row label="Use case" value={profile.useCase} />
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {profile.resistance}
            </p>

            <div className="flex flex-wrap gap-1">
              {profile.passes.map((p) => (
                <span
                  key={p}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-md border"
                  style={{
                    background: `${profile.color}15`,
                    borderColor: `${profile.color}30`,
                    color: profile.color,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Pass comparison table */}
      {selected && (
        <SpotlightCard className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
            LLVM Pass Details — {PROFILES.find((p) => p.id === selected)?.name}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-4">Pass</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2">Security Effect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {PASS_DETAILS.filter((pd) =>
                  PROFILES.find((p) => p.id === selected)?.passes.includes(pd.name)
                ).map((pd) => (
                  <tr key={pd.name} className="hover:bg-muted/20">
                    <td className="py-2 pr-4 font-mono text-xs font-semibold text-[oklch(0.85_0.1_240)]">
                      {pd.name}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {pd.type}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{pd.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      )}

      {/* Next step */}
      <NextStepBanner
        to="/pipeline/obfuscate"
        label="Next: Run Obfuscation"
        enabled={!!selected}
        hint={`${PROFILES.find((p) => p.id === selected)?.name ?? ""} profile selected — proceed to LLVM obfuscation`}
      />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-medium ${highlight ? "text-[oklch(0.72_0.17_160)]" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

const PASS_DETAILS = [
  { name: "Control Flow Flattening", type: "Function",  effect: "Converts structured CFG into switch-dispatch loop; defeats decompiler pattern matching" },
  { name: "Bogus Control Flow",      type: "Function",  effect: "Inserts dead blocks with opaque predicates; doubles analysis work for reverse engineers" },
  { name: "String Encryption",       type: "Module",    effect: "XOR-encrypts all string literals; `strings` tool sees only ciphertext" },
  { name: "Instruction Substitution",type: "Function",  effect: "Replaces +,-,&,|,^ with semantically equivalent but less obvious sequences" },
  { name: "Function Splitting",      type: "Module",    effect: "Splits large functions at midpoints; defeats library signature matching" },
  { name: "Opaque Predicates",       type: "Function",  effect: "Inserts algebraic invariants that appear non-trivial to constraint solvers" },
  { name: "Anti-Debug",              type: "Module",    effect: "Injects ptrace-based debugger detection; aborts if debugger is attached" },
  { name: "Anti-Tamper",             type: "Module",    effect: "Runtime integrity checks; detects patched binary bytes" },
  { name: "Virtualization",          type: "Function",  effect: "Converts functions to virtual ISA; most powerful but highest overhead" },
  { name: "Symbol Renaming",         type: "Function",  effect: "Strips meaningful symbol names; replaces with opaque identifiers" },
  { name: "Dead Code Insertion",     type: "Function",  effect: "Inserts unreachable code paths to confuse static analysis" },
  { name: "String Obfuscation",      type: "Function",  effect: "Splits and reassembles string constants at runtime" },
];
