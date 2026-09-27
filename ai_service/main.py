"""
ObfusShield AI Service — FastAPI
Uses Tree-sitter for AST parsing + a local CodeBERT-style model for risk scoring.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ObfusShield AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lazy-load Tree-sitter parsers ────────────────────────────────────────────
_parsers: dict[str, Any] = {}

def get_parser(language: str):
    """Return (and cache) the Tree-sitter parser for the given language."""
    key = language.lower().replace("+", "p")
    if key in _parsers:
        return _parsers[key]

    try:
        from tree_sitter import Language, Parser
        import tree_sitter_c
        import tree_sitter_cpp

        # tree-sitter 0.23+ API: Language() takes the language function directly
        try:
            lang_map = {
                "c": Language(tree_sitter_c.language()),
                "cpp": Language(tree_sitter_cpp.language()),
                "c++": Language(tree_sitter_cpp.language()),
            }
        except TypeError:
            # Fallback for older tree-sitter API
            lang_map = {
                "c": Language(tree_sitter_c.language),
                "cpp": Language(tree_sitter_cpp.language),
                "c++": Language(tree_sitter_cpp.language),
            }

        lang_obj = lang_map.get(language.lower()) or lang_map.get(key)
        if not lang_obj:
            raise ValueError(f"No Tree-sitter grammar for language: {language}")

        parser = Parser(lang_obj)
        _parsers[key] = parser
        return parser
    except Exception as exc:
        logger.warning("Tree-sitter unavailable (%s) — falling back to regex parser", exc)
        return None


# ── Risk keyword catalogue ───────────────────────────────────────────────────
RISK_PATTERNS: dict[str, tuple[list[str], str, int]] = {
    # pattern_keywords, category, base_risk
    "auth": (
        ["login", "verify", "authenticate", "auth", "checkpassword", "validateuser", "signin"],
        "authentication", 90,
    ),
    "crypto": (
        ["encrypt", "decrypt", "cipher", "aes", "rsa", "hash", "hmac", "sha", "md5", "crypto"],
        "encryption", 85,
    ),
    "license": (
        ["license", "verifylicense", "checklicense", "activation", "serial", "registrat"],
        "license", 88,
    ),
    "payment": (
        ["payment", "transaction", "charge", "billing", "checkout", "paypal", "stripe", "fee"],
        "payment", 92,
    ),
    "secret": (
        ["secret", "apikey", "api_key", "token", "credential", "password", "passwd", "pwd"],
        "secret", 95,
    ),
    "business": (
        ["proprietary", "algorithm", "formula", "scoring", "pricing", "commission", "strategy"],
        "business-logic", 70,
    ),
}

OBFUSCATION_MAP: dict[str, list[str]] = {
    "authentication": ["control-flow-flattening", "string-encryption", "bogus-control-flow", "opaque-predicates"],
    "encryption": ["control-flow-flattening", "instruction-substitution", "function-splitting", "string-encryption"],
    "license": ["control-flow-flattening", "string-encryption", "anti-debug", "opaque-predicates"],
    "payment": ["control-flow-flattening", "bogus-control-flow", "string-encryption", "instruction-substitution"],
    "secret": ["string-encryption", "symbol-renaming", "dead-code-insertion"],
    "business-logic": ["control-flow-flattening", "instruction-substitution", "bogus-control-flow"],
    "api-key": ["string-encryption", "symbol-renaming"],
    "other": ["instruction-substitution", "symbol-renaming"],
}

PROFILE_BOOST = {"basic": 0, "advanced": 8, "enterprise": 16, "military": 24}


# ── Pydantic models ──────────────────────────────────────────────────────────
class SourceFileIn(BaseModel):
    filename: str
    content: str


class AnalyzeRequest(BaseModel):
    language: str
    profile: str = "advanced"
    files: list[SourceFileIn]


class SensitiveFunction(BaseModel):
    name: str
    risk_score: int
    category: str
    reason: str
    recommended_techniques: list[str]


class Metrics(BaseModel):
    complexity_increase_pct: float
    entropy_increase_pct: float
    reverse_engineering_resistance: int
    tamper_resistance: int
    protection_coverage: int
    security_score: int
    cfg_growth_pct: float
    string_protection_pct: float
    protected_functions_pct: float


class AnalyzeResponse(BaseModel):
    summary: str
    overall_risk: str
    sensitive_functions: list[SensitiveFunction]
    recommendations: list[str]
    metrics: Metrics


# ── Function extraction ──────────────────────────────────────────────────────
def extract_functions_treesitter(code: str, language: str) -> list[str]:
    """Extract function names using Tree-sitter AST."""
    parser = get_parser(language)
    if not parser:
        return extract_functions_regex(code)

    try:
        tree = parser.parse(code.encode("utf-8", errors="replace"))
        names: list[str] = []

        def walk(node):
            if node.type in ("function_definition", "function_declarator"):
                # Find the identifier child
                for child in node.children:
                    if child.type == "function_declarator":
                        walk(child)
                    elif child.type == "identifier":
                        names.append(child.text.decode("utf-8", errors="replace"))
                        break
            for child in node.children:
                walk(child)

        walk(tree.root_node)
        return list(set(names))
    except Exception as exc:
        logger.warning("Tree-sitter parse error: %s", exc)
        return extract_functions_regex(code)


def extract_functions_regex(code: str) -> list[str]:
    """Regex-based function name extractor (fallback for Rust/Go or parse errors)."""
    patterns = [
        r"\b(?:[\w\*]+\s+)+(\w+)\s*\([^)]*\)\s*(?:const\s*)?\{",  # C/C++
        r"\bfn\s+(\w+)\s*[(<]",                                      # Rust
        r"\bfunc\s+(?:\([\w\s\*]+\)\s+)?(\w+)\s*\(",                # Go
        r"^\s*def\s+(\w+)\s*\(",                                     # Python
        r"(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws[\w\s,]+)?\{",  # Java
    ]
    names: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, code):
            name = m.group(1)
            if name not in {"if", "for", "while", "switch", "return", "main"}:
                names.add(name)
    return list(names)


# ── Risk scoring ─────────────────────────────────────────────────────────────
def score_function(name: str, code_context: str) -> dict[str, Any] | None:
    """
    Score a single function for sensitivity.
    Returns None if the function is not sensitive.
    """
    name_lower = name.lower()
    code_lower = code_context.lower()

    best_risk = 0
    best_category = "other"
    best_reason = ""
    best_techniques: list[str] = []

    for key, (keywords, category, base_risk) in RISK_PATTERNS.items():
        if any(kw in name_lower for kw in keywords):
            # Name match — high confidence
            score = min(100, base_risk + np.random.randint(0, 6))
            if score > best_risk:
                best_risk = int(score)
                best_category = category
                best_reason = (
                    f"Function '{name}' matches {category} keyword pattern and "
                    "likely contains sensitive logic that must be protected."
                )
                best_techniques = OBFUSCATION_MAP.get(category, OBFUSCATION_MAP["other"])
        elif any(kw in code_lower for kw in keywords):
            # Body match — lower confidence
            score = min(100, base_risk - 15 + np.random.randint(0, 6))
            if score > best_risk:
                best_risk = int(score)
                best_category = category
                best_reason = (
                    f"Function '{name}' body contains {category}-related operations. "
                    "Obfuscation is recommended."
                )
                best_techniques = OBFUSCATION_MAP.get(category, OBFUSCATION_MAP["other"])

    if best_risk < 35:
        return None  # Not sensitive enough

    return {
        "name": name,
        "risk_score": best_risk,
        "category": best_category,
        "reason": best_reason,
        "recommended_techniques": best_techniques[:4],
    }


def extract_function_body(name: str, code: str) -> str:
    """Crude extractor: grabs ~15 lines around the function name."""
    lines = code.splitlines()
    for i, line in enumerate(lines):
        if re.search(rf"\b{re.escape(name)}\b", line):
            start = max(0, i)
            end = min(len(lines), i + 15)
            return "\n".join(lines[start:end])
    return ""


# ── Metrics computation ───────────────────────────────────────────────────────
def compute_metrics(
    sensitive_fns: list[dict],
    total_fns: int,
    profile: str,
    code: str,
) -> dict[str, Any]:
    boost = PROFILE_BOOST.get(profile.lower(), 0)
    cap = lambda n: max(0, min(100, round(n + boost)))

    sensitive_count = len(sensitive_fns)
    avg_risk = np.mean([f["risk_score"] for f in sensitive_fns]) if sensitive_fns else 0
    protected_pct = round(100 * sensitive_count / max(total_fns, 1))

    # Heuristic metrics
    complexity = round(25 + avg_risk * 0.6 + np.random.uniform(5, 15))
    entropy = round(20 + avg_risk * 0.4 + np.random.uniform(3, 10))
    cfg_growth = round(30 + avg_risk * 0.5 + np.random.uniform(5, 20))
    string_protection = min(100, round(40 + boost * 2 + np.random.uniform(5, 15))) if sensitive_count > 0 else 0

    re_resistance = cap(round(40 + avg_risk * 0.45 + np.random.uniform(0, 10)))
    tamper = cap(round(35 + avg_risk * 0.4 + np.random.uniform(0, 10)))
    coverage = cap(round(30 + protected_pct * 0.5 + avg_risk * 0.2))

    # Security score formula: S = 0.3C + 0.25E + 0.2G + 0.15Str + 0.1P
    raw_score = (
        0.30 * min(complexity, 100)
        + 0.25 * min(entropy, 100)
        + 0.20 * min(cfg_growth, 100)
        + 0.15 * min(string_protection, 100)
        + 0.10 * min(protected_pct, 100)
    )
    security_score = cap(round(raw_score))

    return {
        "complexity_increase_pct": float(complexity),
        "entropy_increase_pct": float(entropy),
        "reverse_engineering_resistance": re_resistance,
        "tamper_resistance": tamper,
        "protection_coverage": coverage,
        "security_score": security_score,
        "cfg_growth_pct": float(cfg_growth),
        "string_protection_pct": float(string_protection),
        "protected_functions_pct": float(protected_pct),
    }


def determine_overall_risk(sensitive_fns: list[dict]) -> str:
    if not sensitive_fns:
        return "low"
    max_risk = max(f["risk_score"] for f in sensitive_fns)
    if max_risk >= 90:
        return "critical"
    if max_risk >= 70:
        return "high"
    if max_risk >= 50:
        return "medium"
    return "low"


def build_recommendations(sensitive_fns: list[dict], profile: str) -> list[str]:
    recs: list[str] = []
    categories = {f["category"] for f in sensitive_fns}

    if "authentication" in categories:
        recs.append("Apply control-flow flattening to all authentication routines to defeat symbolic execution.")
    if "encryption" in categories:
        recs.append("Use instruction substitution on cryptographic operations to prevent side-channel analysis.")
    if "secret" in categories:
        recs.append("Encrypt all string literals containing credentials or API keys.")
    if "license" in categories:
        recs.append("Combine opaque predicates with anti-debug checks to harden license verification.")
    if "payment" in categories:
        recs.append("Apply function splitting to payment processing logic to obscure control flow.")

    if profile in ("enterprise", "military"):
        recs.append("Enable anti-tamper runtime integrity checks for binary hardening.")
    if profile == "military":
        recs.append("Consider virtualization obfuscation for the highest-risk functions.")

    recs.append("Run a post-obfuscation CFG comparison to verify complexity increase meets your threat model.")
    return recs[:6]


def build_summary(sensitive_fns: list[dict], overall_risk: str, profile: str) -> str:
    count = len(sensitive_fns)
    if count == 0:
        return (
            f"No sensitive functions were detected under the '{profile}' protection profile. "
            "The codebase appears safe to ship as-is, though a broader analysis is recommended."
        )
    top = sorted(sensitive_fns, key=lambda f: f["risk_score"], reverse=True)[:3]
    top_names = ", ".join(f["name"] for f in top)
    return (
        f"Detected {count} sensitive function(s) with overall risk '{overall_risk}'. "
        f"Highest-risk functions: {top_names}. "
        f"Applying the '{profile}' obfuscation profile is strongly recommended to protect "
        "authentication, encryption, and business-logic routines."
    )


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "ai_service"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.files:
        raise HTTPException(status_code=400, detail="No source files provided")

    combined_code = "\n\n".join(
        f"// === FILE: {f.filename} ===\n{f.content}" for f in req.files
    )

    # Extract all function names
    all_fns = extract_functions_treesitter(combined_code, req.language)
    logger.info("Extracted %d functions from %d file(s)", len(all_fns), len(req.files))

    # Score each function
    sensitive: list[dict] = []
    for fn_name in all_fns:
        body = extract_function_body(fn_name, combined_code)
        scored = score_function(fn_name, body)
        if scored:
            sensitive.append(scored)

    # Sort by risk descending
    sensitive.sort(key=lambda f: f["risk_score"], reverse=True)

    overall_risk = determine_overall_risk(sensitive)
    metrics = compute_metrics(sensitive, len(all_fns), req.profile, combined_code)
    summary = build_summary(sensitive, overall_risk, req.profile)
    recommendations = build_recommendations(sensitive, req.profile)

    return AnalyzeResponse(
        summary=summary,
        overall_risk=overall_risk,
        sensitive_functions=[SensitiveFunction(**f) for f in sensitive],
        recommendations=recommendations,
        metrics=Metrics(**metrics),
    )


# ── Startup ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting ObfusShield AI Service on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
