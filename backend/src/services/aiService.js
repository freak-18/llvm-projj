/**
 * AI Service client.
 *
 * Calls the FastAPI AI microservice (Python / Tree-sitter / CodeBERT).
 * Falls back to a local LLM-based analysis if the service is unreachable.
 */
const axios = require("axios");
const logger = require("../utils/logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const TIMEOUT_MS = 120_000; // 2 min — analysis can be slow

logger.info(`[AI_SERVICE] Initialized with URL: ${AI_SERVICE_URL}`);
logger.info(`[AI_SERVICE] This should match the AI service container (usually from docker-compose or env variable)`);

/**
 * Analyse source files for sensitive functions and risk scores.
 *
 * @param {Object} params
 * @param {string} params.language   - "c" | "c++" | "rust" | "go"
 * @param {string} params.profile    - protection profile name
 * @param {Array}  params.files      - [{ filename, content }]
 * @returns {Object} Parsed AI analysis response
 */
async function analyzeCode({ language, profile, files }) {
  try {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/analyze`,
      { language, profile, files },
      { timeout: TIMEOUT_MS }
    );
    return { ...data, source: "ai_service" };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    logger.warn(`AI service unreachable (${msg}), falling back to gateway`);
    // Rethrow so the route handler can invoke the fallback
    throw Object.assign(new Error(msg), { isServiceUnavailable: true });
  }
}

/**
 * Check AI service health
 */
async function ping() {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    return data;
  } catch {
    return { status: "unavailable" };
  }
}

module.exports = { analyzeCode, ping, AI_SERVICE_URL };
