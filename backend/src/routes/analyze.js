const express = require("express");
const { body, validationResult } = require("express-validator");
const Project = require("../models/Project");
const SourceFile = require("../models/SourceFile");
const AnalysisReport = require("../models/AnalysisReport");
const SecurityMetrics = require("../models/SecurityMetrics");
const { protect } = require("../middleware/auth");
const aiService = require("../services/aiService");
const logger = require("../utils/logger");

const router = express.Router();
router.use(protect);

// Profile score boosts applied after AI analysis
const PROFILE_BOOST = { basic: 0, advanced: 8, enterprise: 16, military: 24 };

// POST /api/analyze
router.post(
  "/",
  [body("projectId").isMongoId()],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid projectId" });

    try {
      const projectId = req.body.projectId;
      logger.info(`[ANALYZE] Starting analysis for project: ${projectId}`);

      const project = await Project.findOne({
        _id: projectId,
        userId: req.user._id,
      });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const files = await SourceFile.find({ projectId: project._id }).lean();
      if (!files.length) return res.status(400).json({ error: "No source files to analyze" });

      logger.info(`[ANALYZE] Found ${files.length} files for analysis`);

      // Mark as analyzing
      project.status = "analyzing";
      await project.save();

      // Emit progress via Socket.IO (attached in index.js as req.app.io)
      req.app.io?.to(`project:${project._id}`).emit("analysis:progress", { stage: "started" });

      let parsed;
      let analysisSource = "ai_service";

      // ── Try FastAPI AI service with timeout ───────────────────────────────
      try {
        logger.info(`[ANALYZE] Calling AI service at ${aiService.AI_SERVICE_URL}`);
        const analysisPromise = aiService.analyzeCode({
          language: project.language,
          profile: project.protectionProfile,
          files: files.map((f) => ({ filename: f.filename, content: f.content })),
        });
        
        // 30 second timeout
        parsed = await Promise.race([
          analysisPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("AI service timeout after 30s")), 30000)
          )
        ]);
        
        logger.info("[ANALYZE] AI service analysis successful");
        analysisSource = "ai_service";
      } catch (svcErr) {
        logger.warn(`[ANALYZE] AI service error: ${svcErr.message}`);
        
        // ── Try Gemini gateway fallback ─────────────────────────────────────
        if (process.env.LOVABLE_API_KEY) {
          try {
            logger.warn("[ANALYZE] Attempting Gemini gateway fallback");
            analysisSource = "ai_gateway";
            parsed = await runGatewayAnalysis(project, files);
            logger.info("[ANALYZE] Gateway analysis completed");
          } catch (gwErr) {
            logger.warn(`[ANALYZE] Gateway fallback failed: ${gwErr.message} — using mock analysis`);
            analysisSource = "mock";
            parsed = generateMockAnalysis(project, files);
          }
        } else {
          // ── Fallback: Use mock analysis when no external services available ──
          logger.warn("[ANALYZE] No LOVABLE_API_KEY set and AI service unavailable — using mock analysis");
          analysisSource = "mock";
          parsed = generateMockAnalysis(project, files);
        }
      }

      req.app.io?.to(`project:${project._id}`).emit("analysis:progress", { stage: "scoring" });

      // Apply profile boost to metrics
      const boost = PROFILE_BOOST[project.protectionProfile] ?? 0;
      const cap = (n) => Math.max(0, Math.min(100, Math.round((n ?? 50) + boost)));

      if (parsed.metrics) {
        parsed.metrics.reverseEngineeringResistance = cap(parsed.metrics.reverseEngineeringResistance ?? parsed.metrics.reverse_engineering_resistance);
        parsed.metrics.tamperResistance = cap(parsed.metrics.tamperResistance ?? parsed.metrics.tamper_resistance);
        parsed.metrics.protectionCoverage = cap(parsed.metrics.protectionCoverage ?? parsed.metrics.protection_coverage);
        parsed.metrics.securityScore = cap(parsed.metrics.securityScore ?? parsed.metrics.security_score);
        parsed.metrics.complexityIncreasePct = parsed.metrics.complexityIncreasePct ?? parsed.metrics.complexity_increase_pct ?? 0;
        parsed.metrics.entropyIncreasePct = parsed.metrics.entropyIncreasePct ?? parsed.metrics.entropy_increase_pct ?? 0;
      }

      logger.info("[ANALYZE] Creating analysis report");

      // ── Save AnalysisReport ─────────────────────────────────────────────
      const report = await AnalysisReport.create({
        projectId: project._id,
        userId: req.user._id,
        summary: parsed.summary ?? null,
        overallRisk: parsed.overall_risk ?? parsed.overallRisk ?? null,
        sensitiveFunctions: normaliseFunctions(parsed.sensitive_functions ?? parsed.sensitiveFunctions ?? []),
        recommendations: parsed.recommendations ?? [],
        metrics: parsed.metrics ?? {},
        rawAiResponse: JSON.stringify(parsed),
        analysisSource,
      });

      // ── Update Project ──────────────────────────────────────────────────
      project.status = "analyzed";
      project.securityScore = parsed.metrics?.securityScore ?? 0;
      await project.save();
      logger.info(`[ANALYZE] Project updated with security score: ${project.securityScore}`);

      // ── Update SecurityMetrics ──────────────────────────────────────────
      await SecurityMetrics.findOneAndUpdate(
        { projectId: project._id },
        {
          securityScore: report.metrics?.securityScore ?? 0,
          reverseEngineeringResistance: report.metrics?.reverseEngineeringResistance ?? 0,
          tamperResistance: report.metrics?.tamperResistance ?? 0,
          protectionCoverage: report.metrics?.protectionCoverage ?? 0,
          complexityScore: report.metrics?.complexityIncreasePct ?? 0,
          entropyScore: report.metrics?.entropyIncreasePct ?? 0,
          lastAnalyzedAt: new Date(),
          $inc: { analysisCount: 1 },
        },
        { upsert: true }
      );
      logger.info("[ANALYZE] SecurityMetrics updated");

      req.app.io?.to(`project:${project._id}`).emit("analysis:complete", {
        reportId: report._id,
        score: project.securityScore,
      });
      logger.info(`[ANALYZE] Analysis complete - emitted socket event (source: ${analysisSource})`);

      res.status(201).json(report);
    } catch (err) {
      logger.error(`[ANALYZE] Error: ${err.message}`, err);
      next(err);
    }
  }
);

// ── Helpers ────────────────────────────────────────────────────────────────

function normaliseFunctions(fns) {
  return fns.map((fn) => ({
    name: fn.name,
    riskScore: fn.risk_score ?? fn.riskScore ?? 50,
    category: fn.category ?? "other",
    reason: fn.reason,
    recommendedTechniques: fn.recommended_techniques ?? fn.recommendedTechniques ?? [],
  }));
}

/**
 * In-process Gemini fallback (identical to the Lovable-era ai-gateway approach).
 * Requires LOVABLE_API_KEY env var.
 */
async function runGatewayAnalysis(project, files) {
  try {
    logger.info("[GATEWAY] Loading AI SDK modules");
    const { generateText } = await import("ai");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY environment variable not set — cannot run fallback analysis. Set LOVABLE_API_KEY to enable Gemini fallback.");
    }

    logger.info("[GATEWAY] Creating OpenAI-compatible gateway client");
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const combined = files
      .map((f) => `// ===== FILE: ${f.filename} =====\n${f.content}`)
      .join("\n\n")
      .slice(0, 60000);

    const SYSTEM = `You are ObfusShield AI. Analyse source code and return ONLY a JSON object with keys: summary, overall_risk, sensitive_functions, recommendations, metrics (complexity_increase_pct, entropy_increase_pct, reverse_engineering_resistance, tamper_resistance, protection_coverage, security_score). No markdown, no commentary.`;

    logger.info("[GATEWAY] Calling Gemini for code analysis");
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      prompt: `Profile: ${project.protectionProfile.toUpperCase()}\nLanguage: ${project.language}\n\n${combined}`,
    });

    logger.info("[GATEWAY] Parsing Gemini response");
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    logger.info("[GATEWAY] Gateway analysis complete");
    return parsed;
  } catch (err) {
    logger.error(`[GATEWAY] Fallback analysis failed: ${err.message}`);
    throw new Error(`AI gateway fallback failed: ${err.message}`);
  }
}

/**
 * Mock analysis fallback — provides basic analysis when no AI services are available.
 * Used for development/testing when AI service and Gemini are unavailable.
 */
function generateMockAnalysis(project, files) {
  const combinedContent = files.map(f => f.content).join("\n");
  
  // Simple heuristics for detecting sensitive patterns
  const hasCrypto = /crypto|encrypt|decrypt|hash|rsa|aes|cipher/i.test(combinedContent);
  const hasAuth = /password|auth|login|token|jwt|secret|api.*key/i.test(combinedContent);
  const hasPayment = /payment|charge|billing|transaction|credit.*card|stripe|paypal/i.test(combinedContent);
  const hasDatabase = /database|sql|query|sql.*inject|database.*access/i.test(combinedContent);
  
  const sensitiveCount = [hasCrypto, hasAuth, hasPayment, hasDatabase].filter(Boolean).length;
  const riskLevel = sensitiveCount >= 3 ? "high" : sensitiveCount >= 2 ? "medium" : "low";
  
  return {
    summary: `Mock analysis for ${project.language} project with ${files.length} file(s). Detected ${sensitiveCount} sensitive areas.`,
    overall_risk: riskLevel,
    sensitive_functions: [
      ...(hasAuth ? [{ name: "Authentication logic", risk_score: 75, category: "auth", reason: "Contains authentication-related code", recommended_techniques: ["String Encryption", "Control Flow Flattening"] }] : []),
      ...(hasCrypto ? [{ name: "Cryptographic operations", risk_score: 80, category: "crypto", reason: "Contains cryptographic implementations", recommended_techniques: ["String Encryption", "Opaque Predicates"] }] : []),
      ...(hasPayment ? [{ name: "Payment processing", risk_score: 85, category: "payment", reason: "Handles payment/transaction logic", recommended_techniques: ["Control Flow Flattening", "Function Splitting"] }] : []),
    ],
    recommendations: [
      "Enable advanced obfuscation for sensitive functions",
      "Apply string encryption to protect hardcoded values",
      "Use control flow flattening to complicate logic flow",
      "Consider function splitting for large functions"
    ],
    metrics: {
      complexity_increase_pct: 35 + (sensitiveCount * 10),
      entropy_increase_pct: 40 + (sensitiveCount * 8),
      reverse_engineering_resistance: 50 + (sensitiveCount * 8),
      tamper_resistance: 45 + (sensitiveCount * 10),
      protection_coverage: 60 + (sensitiveCount * 5),
      security_score: 55 + (sensitiveCount * 7),
    }
  };
}

module.exports = router;
