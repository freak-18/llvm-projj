import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { signIn, signUp, isAuthenticated } from "@/lib/auth";
import { SpotlightCard } from "@/components/SpotlightCard";
import { AmbientBackground } from "@/components/AmbientBackground";
import { DecryptText } from "@/components/DecryptText";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ObfusShield AI" }] }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate({ to: "/dashboard" });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name || undefined);
        toast.success("Account created. You're in.");
      } else {
        await signIn(email, password);
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  // Google OAuth not available in the standalone Node.js auth mode.
  // Keep the button for UI consistency; show a friendly message.
  async function handleGoogle() {
    toast.info("Google sign-in is only available in the Lovable Cloud deployment. Use email/password here.");
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 hero-bg">
      <AmbientBackground />
      <div className="hidden md:flex relative flex-col justify-between p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 grid-bg" />
        <Link to="/" className="relative flex items-center gap-2 font-display font-bold">
          <Shield className="h-5 w-5 text-[oklch(0.85_0.1_240)]" />
          ObfusShield <span className="text-gradient">AI</span>
        </Link>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight">Protect software.<br /><span className="text-gradient">Defend innovation.</span></h1>
          <p className="mt-4 text-muted-foreground max-w-md">Join engineering teams hardening their binaries against reverse engineering, piracy, and IP theft.</p>
          <div className="mt-8 flex gap-6 font-mono text-xs text-muted-foreground">
            <div><div className="text-foreground text-2xl font-bold">12,400+</div>Projects protected</div>
            <div><div className="text-foreground text-2xl font-bold">97%</div>Avg RE resistance</div>
          </div>
        </div>
        <div className="relative font-mono text-xs text-muted-foreground">© ObfusShield AI</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <SpotlightCard className="w-full max-w-md glass rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-bold">
              <DecryptText text={mode === "signin" ? "Welcome back" : "Create your account"} />
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to your perimeter." : "Spin up your protected workspace."}</p>
          </div>

          <button onClick={handleGoogle} disabled={busy} className="lift-glow w-full rounded-lg glass hover:bg-accent px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50">
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg bg-input/40 border border-border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-lg bg-input/40 border border-border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" className="w-full rounded-lg bg-input/40 border border-border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50" />
            <button disabled={busy} className="trace-border w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 shadow-[var(--shadow-glow)] transition disabled:opacity-50">
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-[oklch(0.85_0.1_240)] hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </SpotlightCard>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"/></svg>
  );
}
