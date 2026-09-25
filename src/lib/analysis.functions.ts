import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const SYSTEM = `You are ObfusShield AI, an elite reverse-engineering and software-protection analyst.
You analyze source code (C/C++/Rust/Go) to identify sensitive logic that must be protected against reverse engineering, piracy, tampering, and IP theft.

Return ONLY a JSON object (no markdown, no commentary) matching this shape:
{
  "summary": "2-3 sentence executive summary",
  "overall_risk": "low" | "medium" | "high" | "critical",
  "sensitive_functions": [
    {
      "name": "string (function name)",
      "risk_score": 0-100,
      "category": "authentication" | "encryption" | "license" | "payment" | "secret" | "business-logic" | "api-key" | "other",
      "reason": "1-2 sentences why this is sensitive",
      "recommended_techniques": ["control-flow-flattening","string-encryption","bogus-control-flow","instruction-substitution","function-splitting","opaque-predicates","symbol-renaming","virtualization","dead-code-insertion"]
    }
  ],
  "recommendations": [ "string action item", ... ],
  "metrics": {
    "complexity_increase_pct": number,
    "entropy_increase_pct": number,
    "reverse_engineering_resistance": 0-100,
    "tamper_resistance": 0-100,
    "protection_coverage": 0-100,
    "security_score": 0-100
  }
}`;

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;
    const { data: project, error: pe } = await supabase
      .from("projects").select("*").eq("id", data.projectId).single();
    if (pe || !project) throw new Error(pe?.message ?? "Project not found");

    const { data: files, error: fe } = await supabase
      .from("source_files").select("filename, content, language").eq("project_id", data.projectId);
    if (fe) throw new Error(fe.message);
    if (!files?.length) throw new Error("No source files to analyze");

    const profileBoost: Record<string, number> = {
      basic: 0, advanced: 8, enterprise: 16, military: 24,
    };
    const boost = profileBoost[project.protection_profile] ?? 0;

    const combined = files
      .map((f) => `// ===== FILE: ${f.filename} (${f.language ?? "unknown"}) =====\n${f.content}`)
      .join("\n\n")
      .slice(0, 60000);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      prompt: `Protection profile selected: ${project.protection_profile.toUpperCase()}.
Language: ${project.language}.
Analyze the following source code and return the JSON object as specified.

${combined}`,
    });

    // Extract JSON object (model may sometimes wrap in code fence)
    let parsed: any;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch {
      throw new Error("AI response was not valid JSON");
    }

    // Apply profile boost
    if (parsed.metrics) {
      const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n + boost)));
      parsed.metrics.reverse_engineering_resistance = cap(parsed.metrics.reverse_engineering_resistance ?? 50);
      parsed.metrics.tamper_resistance = cap(parsed.metrics.tamper_resistance ?? 50);
      parsed.metrics.protection_coverage = cap(parsed.metrics.protection_coverage ?? 50);
      parsed.metrics.security_score = cap(parsed.metrics.security_score ?? 50);
    }

    const { data: saved, error: sErr } = await supabase
      .from("ai_analyses")
      .insert({
        project_id: data.projectId,
        user_id: userId,
        summary: parsed.summary ?? null,
        overall_risk: parsed.overall_risk ?? null,
        sensitive_functions: parsed.sensitive_functions ?? [],
        recommendations: parsed.recommendations ?? [],
        metrics: parsed.metrics ?? {},
        raw_response: text,
      })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    await supabase
      .from("projects")
      .update({
        security_score: parsed.metrics?.security_score ?? 0,
        status: "analyzed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.projectId);

    return saved;
  });
