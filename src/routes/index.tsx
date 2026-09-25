import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Brain, Lock, Activity, Network, FileText, Users, ArrowRight, Cpu, Eye, Zap, CheckCircle2, GitBranch } from "lucide-react";
import { SpotlightCard } from "@/components/SpotlightCard";
import { AmbientBackground } from "@/components/AmbientBackground";
import { DecryptText } from "@/components/DecryptText";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ObfusShield AI — Protect Software. Defend Innovation." },
      { name: "description", content: "Enterprise-grade AI + LLVM software protection. Stop reverse engineering, piracy, and IP theft with intelligent obfuscation, risk scoring, and CFG visualization." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen text-foreground">
      <AmbientBackground />
      <Header />
      <Hero />
      <Stats />
      <Features />
      <Workflow />
      <Profiles />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display font-bold">
          <div className="relative h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] shadow-[0_0_24px_-4px_oklch(0.66_0.19_256/0.7)]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span>ObfusShield <span className="text-gradient">AI</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-mono">
          <a href="#features" className="fade-hover">./features</a>
          <a href="#workflow" className="fade-hover">./workflow</a>
          <a href="#profiles" className="fade-hover">./profiles</a>
          <a href="#pricing" className="fade-hover">./pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="text-sm px-3 py-2 rounded-md hover:bg-accent transition">Sign in</Link>
          <Link to="/auth" className="trace-border text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-95 shadow-[var(--shadow-glow)] transition">
            <DecryptText text="Start Protecting" speed={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden hero-bg">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="container relative mx-auto px-6 py-24 md:py-36 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[oklch(0.72_0.17_160)] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.72_0.17_160)]" />
          </span>
          AI + LLVM Protection Engine • Live
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-5xl mx-auto leading-[1.05]">
          <DecryptText text="Protect Software." /> <br />
          <DecryptText text="Defend Innovation." className="text-gradient" />
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          AI-powered LLVM obfuscation that hardens your binaries against reverse engineering, piracy, and tampering — with risk analysis, CFG visualization, and executive-grade reports.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="trace-border group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] transition">
            Start Protecting <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </Link>
          <a href="#workflow" className="lift-glow inline-flex items-center gap-2 rounded-lg glass px-6 py-3 font-medium hover:bg-accent transition">
            <Eye className="h-4 w-4" /> View Demo
          </a>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative mt-20 max-w-5xl mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-r from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] opacity-30 blur-3xl rounded-3xl" />
      <div className="relative glass glow-border rounded-2xl p-2 shadow-[var(--shadow-card)] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.14_200)] to-transparent animate-scan opacity-60 pointer-events-none" />
        <div className="rounded-xl bg-[oklch(0.13_0.025_260)] p-6 text-left">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[oklch(0.65_0.22_25)]" />
              <div className="h-3 w-3 rounded-full bg-[oklch(0.78_0.17_70)]" />
              <div className="h-3 w-3 rounded-full bg-[oklch(0.72_0.17_160)]" />
            </div>
            <div className="font-mono text-xs text-muted-foreground">obfusshield://banking-system.cpp</div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Security Score", value: "94", trend: "+38", color: "from-[oklch(0.66_0.19_256)] to-[oklch(0.78_0.14_200)]" },
              { label: "Sensitive Funcs", value: "12", trend: "detected", color: "from-[oklch(0.66_0.21_295)] to-[oklch(0.66_0.19_256)]" },
              { label: "RE Resistance", value: "97%", trend: "military-grade", color: "from-[oklch(0.72_0.17_160)] to-[oklch(0.78_0.14_200)]" },
            ].map((c) => (
              <div key={c.label} className="glass rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <div className={`mt-2 text-3xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.trend}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 glass rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-mono text-muted-foreground">Applied Protections</span>
              <span className="text-[oklch(0.72_0.17_160)]">● Active</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Control Flow Flattening","String Encryption","Bogus CF","Instruction Substitution","Anti-Debug","Symbol Renaming","Opaque Predicates"].map((t) => (
                <span key={t} className="text-xs font-mono px-2.5 py-1 rounded-md bg-[oklch(0.66_0.19_256/0.15)] border border-[oklch(0.66_0.19_256/0.3)] text-[oklch(0.85_0.1_240)]">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const items = [
    { v: "12,400+", l: "Projects Protected" },
    { v: "184K", l: "Files Secured" },
    { v: "2.1M", l: "Threats Prevented" },
    { v: "+62%", l: "Avg. Security Lift" },
  ];
  return (
    <section className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((s) => (
          <div key={s.l} className="lift-glow glass rounded-xl p-6 text-center">
            <div className="text-3xl md:text-4xl font-display font-bold text-gradient">{s.v}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Brain, title: "AI Risk Analysis", desc: "CodeBERT-class models detect sensitive logic — auth, crypto, license, payments, secrets — and assign risk scores per function." },
    { icon: Lock, title: "LLVM Obfuscation", desc: "9+ techniques: control-flow flattening, string encryption, bogus CF, instruction substitution, opaque predicates, and more." },
    { icon: Shield, title: "Anti-Tamper / Anti-Debug", desc: "Runtime protection, integrity verification, debugger detection, VM detection, binary fingerprinting." },
    { icon: Activity, title: "Security Scoring", desc: "Quantified 0–100 score, RE resistance, entropy increase, and tamper resistance with interactive analytics." },
    { icon: Network, title: "CFG Visualization", desc: "Interactive before/after control-flow graphs powered by React Flow. Zoom, pan, and compare complexity gains." },
    { icon: FileText, title: "Executive Reports", desc: "PDF / DOCX / HTML reports with threat model, applied protections, and visual charts." },
    { icon: Users, title: "Team Collaboration", desc: "Organizations, RBAC, shared workspaces, review system, audit logs, activity timeline." },
    { icon: Cpu, title: "Binary Analysis", desc: "Inspect functions, symbols, strings, sections; surface weaknesses and risk exposure." },
  ];
  return (
    <section id="features" className="container mx-auto px-6 py-24">
      <SectionHeader eyebrow="Capabilities" title={<>One platform for <span className="text-gradient">end-to-end software protection</span></>} sub="Everything a security-conscious engineering org needs — without compiler-toolchain pain." />
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((f, i) => (
          <SpotlightCard key={f.title} className="group glass rounded-2xl p-6" >
            <div style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-11 w-11 rounded-xl grid place-items-center bg-[oklch(0.66_0.19_256/0.15)] border border-[oklch(0.66_0.19_256/0.3)] group-hover:bg-[oklch(0.66_0.19_256/0.25)] transition">
                <f.icon className="h-5 w-5 text-[oklch(0.85_0.1_240)]" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { icon: FileText, title: "Upload Source", desc: "C, C++, Rust, or Go. Multi-file or ZIP." },
    { icon: Brain, title: "AI Code Analysis", desc: "Identify sensitive functions & assign risk scores." },
    { icon: Lock, title: "LLVM Obfuscation", desc: "Apply chosen profile: Basic → Military Grade." },
    { icon: Shield, title: "Anti-Tamper Layer", desc: "Anti-debug, integrity, fingerprinting injected." },
    { icon: Activity, title: "Security Metrics", desc: "Quantified score, RE resistance, entropy." },
    { icon: GitBranch, title: "CFG Visualization", desc: "Interactive before/after control flow graphs." },
    { icon: FileText, title: "Generate Report", desc: "Executive PDF/DOCX with threat model." },
    { icon: CheckCircle2, title: "Protected Binary", desc: "Download .o, .exe, and full report." },
  ];
  return (
    <section id="workflow" className="container mx-auto px-6 py-24">
      <SectionHeader eyebrow="How it works" title={<>From source to <span className="text-gradient">protected binary</span> in minutes</>} sub="An automated, AI-driven pipeline that replaces hours of manual compiler-toolchain work." />
      <div className="mt-14 grid md:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <SpotlightCard key={s.title} className="relative glass rounded-2xl p-6">
            <div className="absolute -top-3 -left-3 h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.66_0.19_256)] to-[oklch(0.66_0.21_295)] text-xs font-bold font-mono shadow-[var(--shadow-glow)]">{i + 1}</div>
            <s.icon className="h-5 w-5 text-[oklch(0.85_0.1_240)]" />
            <div className="mt-3 font-semibold text-sm">{s.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function Profiles() {
  const profiles = [
    { name: "Basic", color: "from-[oklch(0.72_0.17_160)] to-[oklch(0.78_0.14_200)]", techniques: 3, perf: "Negligible", uses: "Internal tools" },
    { name: "Advanced", color: "from-[oklch(0.66_0.19_256)] to-[oklch(0.78_0.14_200)]", techniques: 5, perf: "Low", uses: "Commercial apps" },
    { name: "Enterprise", color: "from-[oklch(0.66_0.21_295)] to-[oklch(0.66_0.19_256)]", techniques: 7, perf: "Moderate", uses: "FinTech, SaaS" },
    { name: "Military Grade", color: "from-[oklch(0.65_0.22_25)] to-[oklch(0.66_0.21_295)]", techniques: 9, perf: "Significant", uses: "Defense, banking" },
  ];
  return (
    <section id="profiles" className="container mx-auto px-6 py-24">
      <SectionHeader eyebrow="Protection Profiles" title={<>Choose your <span className="text-gradient">threat envelope</span></>} sub="Pre-configured stacks of obfuscation techniques. Or build a custom profile." />
      <div className="mt-14 grid md:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <SpotlightCard key={p.name} className="glass rounded-2xl p-6">
            <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${p.color}`} />
            <div className="mt-4 font-display text-xl font-bold">{p.name}</div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Techniques</span><span className="text-foreground font-mono">{p.techniques}</span></div>
              <div className="flex justify-between"><span>Perf impact</span><span className="text-foreground">{p.perf}</span></div>
              <div className="flex justify-between"><span>Typical use</span><span className="text-foreground">{p.uses}</span></div>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "ObfusShield AI replaced a 3-week manual hardening process with a 4-minute pipeline. Our license-validation logic is now genuinely opaque.", name: "Priya Nair", role: "Head of Security, FinPay" },
    { quote: "The AI risk analysis caught a hardcoded API key our SAST tools missed. The CFG comparison made the value obvious to leadership.", name: "Marcus Lin", role: "Principal Engineer, AeroSoft" },
    { quote: "We needed defense-grade protection without the LLVM PhD. The Military profile gave us exactly that, with audit-ready reports.", name: "Lt. Col. R. Sharma", role: "DRDO Cyber Division" },
  ];
  return (
    <section className="container mx-auto px-6 py-24">
      <SectionHeader eyebrow="Trusted" title={<>Security teams <span className="text-gradient">ship with confidence</span></>} />
      <div className="mt-14 grid md:grid-cols-3 gap-4">
        {items.map((t) => (
          <SpotlightCard key={t.name} as="figure" className="glass rounded-2xl p-6">
            <blockquote className="text-sm leading-relaxed text-foreground/90">“{t.quote}”</blockquote>
            <figcaption className="mt-5 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">{t.name}</div>
              {t.role}
            </figcaption>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Developer", price: "$0", desc: "For individuals exploring protection", features: ["3 projects", "Basic + Advanced profiles", "AI analysis (10 runs/mo)", "Community support"], cta: "Start free" },
    { name: "Team", price: "$99", suffix: "/mo", desc: "For product teams", features: ["Unlimited projects", "All profiles incl. Enterprise", "Unlimited AI analyses", "CFG visualization", "Priority support"], cta: "Start trial", featured: true },
    { name: "Enterprise", price: "Custom", desc: "For regulated industries", features: ["Military Grade profile", "SSO + RBAC + Audit", "On-prem / private cloud", "SLA + dedicated CSM"], cta: "Talk to sales" },
  ];
  return (
    <section id="pricing" className="container mx-auto px-6 py-24">
      <SectionHeader eyebrow="Pricing" title={<>Plans that scale with your <span className="text-gradient">threat surface</span></>} />
      <div className="mt-14 grid md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <SpotlightCard key={t.name} className={`rounded-2xl p-7 ${t.featured ? "glass glow-border animate-pulse-glow" : "glass"}`}>
            {t.featured && <div className="text-xs font-mono uppercase tracking-wider text-[oklch(0.85_0.1_240)] mb-3">Most popular</div>}
            <div className="font-display text-2xl font-bold">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold font-display">{t.price}</span>
              {t.suffix && <span className="text-muted-foreground text-sm">{t.suffix}</span>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[oklch(0.72_0.17_160)]" />{f}</li>
              ))}
            </ul>
            <Link to="/auth" className={`trace-border mt-7 block text-center rounded-lg px-4 py-2.5 font-medium transition ${t.featured ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "glass hover:bg-accent"}`}>
              {t.cta}
            </Link>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl glass glow-border p-12 md:p-16 text-center">
        <div className="absolute inset-0 hero-bg opacity-60 pointer-events-none" />
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative">
          <Zap className="h-10 w-10 mx-auto text-[oklch(0.85_0.1_240)]" />
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold">Harden your binary in <span className="text-gradient">under 5 minutes</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Upload your source. Pick a profile. Download a protected artifact and a board-ready report.</p>
          <Link to="/auth" className="trace-border group mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-[1.02]">
            <DecryptText text="Start Protecting" speed={18} /> <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-bold text-foreground">
          <Shield className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
          ObfusShield AI
        </div>
        <div className="font-mono text-xs">© {new Date().getFullYear()} ObfusShield AI — Built for SIH</div>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="inline-block text-xs uppercase tracking-[0.2em] font-mono text-[oklch(0.85_0.1_240)]">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}
