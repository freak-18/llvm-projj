/**
 * LLVM Service client.
 *
 * Calls the C++ / Python LLVM microservice for:
 *   - Obfuscation pass pipeline
 *   - CFG generation (dot → JSON)
 *   - Security metrics computation
 */
const axios = require("axios");
const logger = require("../utils/logger");

const LLVM_SERVICE_URL = process.env.LLVM_SERVICE_URL || "http://localhost:9000";
const TIMEOUT_MS = 300_000; // 5 min — LLVM compilation can be slow

/**
 * Kick off obfuscation for a project.
 *
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.language
 * @param {string} params.profile      - protection profile
 * @param {Array}  params.filePaths    - absolute paths to source files on disk
 * @param {Array}  params.passes       - explicit pass list (optional, derived from profile if omitted)
 * @returns {Object} { jobId, status, metrics, cfgDotPath, outputObjectPath }
 */
async function obfuscate({ projectId, language, profile, filePaths, passes }) {
  try {
    const { data } = await axios.post(
      `${LLVM_SERVICE_URL}/obfuscate`,
      { projectId, language, profile, filePaths, passes },
      { timeout: TIMEOUT_MS }
    );
    return data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    logger.warn(`LLVM service error: ${msg}`);
    throw Object.assign(new Error(`LLVM service: ${msg}`), { isServiceUnavailable: true });
  }
}

/**
 * Fetch CFG graph JSON for a project.
 * Returns the parsed React Flow node/edge structure.
 */
async function getCFG(projectId) {
  try {
    const { data } = await axios.get(
      `${LLVM_SERVICE_URL}/cfg/${projectId}`,
      { timeout: 30_000 }
    );
    return data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    throw new Error(`CFG fetch failed: ${msg}`);
  }
}

/**
 * Poll obfuscation job status.
 */
async function getJobStatus(jobId) {
  try {
    const { data } = await axios.get(
      `${LLVM_SERVICE_URL}/job/${jobId}`,
      { timeout: 10_000 }
    );
    return data;
  } catch (err) {
    throw new Error(`Job status fetch failed: ${err.message}`);
  }
}

/**
 * Check LLVM service health
 */
async function ping() {
  try {
    const { data } = await axios.get(`${LLVM_SERVICE_URL}/health`, { timeout: 5000 });
    return data;
  } catch {
    return { status: "unavailable" };
  }
}

module.exports = { obfuscate, getCFG, getJobStatus, ping };
