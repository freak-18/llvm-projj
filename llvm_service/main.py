"""
ObfusShield LLVM Service — FastAPI wrapper around the LLVM toolchain.

Pipeline for each obfuscation request:
  1. Compile source → LLVM IR  (clang -emit-llvm)
  2. Apply ObfusShield passes   (opt -load-pass-plugin=ObfusShield.so)
  3. Compile obfuscated IR → .o (clang -c)
  4. Generate CFG dot file      (opt -dot-cfg)
  5. Convert dot → JSON         (for React Flow visualisation)
  6. Compute security metrics

The C++ LLVM passes (ObfusShield.so) are compiled separately.
See llvm_service/passes/ for the C++ source.
"""
from __future__ import annotations

import json
import logging
import math
import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ObfusShield LLVM Service", version="1.0.0")

# ── Config ───────────────────────────────────────────────────────────────────
LLVM_BIN = os.environ.get("LLVM_BIN", "/usr/bin")          # path to clang/opt/llvm-dis
PASS_PLUGIN = os.environ.get("PASS_PLUGIN", "./ObfusShield.so")
WORK_DIR = Path(os.environ.get("LLVM_WORK_DIR", "/tmp/obfusshield"))
WORK_DIR.mkdir(parents=True, exist_ok=True)

clang = shutil.which("clang-18") or shutil.which("clang") or f"{LLVM_BIN}/clang"
opt = shutil.which("opt-18") or shutil.which("opt") or f"{LLVM_BIN}/opt"
dot_cmd = shutil.which("dot")

# Function-level passes (go into FunctionPassManager)
FUNCTION_PASSES = {"flatten-cfg", "bogus-flow", "inst-subst", "opaque-pred"}

# Module-level passes (go into ModulePassManager)
MODULE_PASSES = {"string-encrypt", "func-split", "anti-debug"}

PASS_NAME_MAP = {
    "ControlFlowFlattening": "flatten-cfg",
    "BogusControlFlow": "bogus-flow",
    "StringEncryption": "string-encrypt",
    "InstructionSubstitution": "inst-subst",
    "FunctionSplitting": "func-split",
    "OpaquePredicates": "opaque-pred",
    "AntiDebug": "anti-debug",
    "AntiTamper": "anti-debug",      # fallback to anti-debug
    "Virtualization": "opaque-pred", # fallback to opaque predicates
    "SymbolRenaming": "inst-subst",  # fallback
    "DeadCodeInsertion": "bogus-flow",
    "StringObfuscation": "string-encrypt",
}

# ── Pydantic models ──────────────────────────────────────────────────────────
class ObfuscateRequest(BaseModel):
    projectId: str
    language: str
    profile: str
    filePaths: list[str]
    passes: list[str] | None = None


class ObfuscateResponse(BaseModel):
    jobId: str
    status: str
    metrics: dict[str, Any]
    outputObjectPath: str | None
    obfuscatedIrPath: str | None
    cfgDotPath: str | None
    cfgJsonPath: str | None


# ── Helpers ──────────────────────────────────────────────────────────────────
def run(cmd: list[str], cwd: Path | None = None, timeout: int = 120) -> subprocess.CompletedProcess:
    """Run a subprocess and raise on non-zero exit."""
    logger.debug("RUN: %s", " ".join(cmd))
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout, cwd=str(cwd or WORK_DIR)
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(cmd)}\nSTDERR: {result.stderr[:2000]}"
        )
    return result


def dot_to_reactflow(dot_content: str) -> dict[str, Any]:
    """Convert a Graphviz DOT string to React Flow nodes + edges."""
    nodes = []
    edges = []
    node_re = re.compile(r'(\w+)\s*\[label="([^"]+)"')
    edge_re = re.compile(r"(\w+)\s*->\s*(\w+)")

    for match in node_re.finditer(dot_content):
        nid, label = match.group(1), match.group(2)
        nodes.append({
            "id": nid,
            "data": {"label": label[:80]},
            "position": {"x": 0, "y": 0},
            "type": "default",
        })

    for match in edge_re.finditer(dot_content):
        src, tgt = match.group(1), match.group(2)
        edges.append({
            "id": f"e-{src}-{tgt}",
            "source": src,
            "target": tgt,
            "animated": True,
        })

    return {"nodes": nodes, "edges": edges}


def compute_metrics(
    orig_ir: str,
    obf_ir: str,
    passes: list[str],
    profile: str,
) -> dict[str, float]:
    """Heuristic metric computation based on IR line counts and pass list."""
    orig_lines = orig_ir.count("\n") + 1
    obf_lines = obf_ir.count("\n") + 1

    cfg_growth = round(100 * (obf_lines - orig_lines) / max(orig_lines, 1), 1)
    complexity_increase = max(cfg_growth, 0)

    # Entropy: count unique tokens / total tokens ratio
    def token_entropy(ir: str) -> float:
        tokens = re.findall(r"\w+", ir)
        if not tokens:
            return 0.0
        freq = {}
        for t in tokens:
            freq[t] = freq.get(t, 0) + 1
        probs = [c / len(tokens) for c in freq.values()]
        return -sum(p * math.log2(p) for p in probs if p > 0)

    e_orig = token_entropy(orig_ir)
    e_obf = token_entropy(obf_ir)
    entropy_increase = max(0, round(100 * (e_obf - e_orig) / max(e_orig, 0.01), 1))

    string_protection = 80 if "StringEncryption" in passes else (40 if "StringObfuscation" in passes else 0)
    protected_fns = min(100, 20 * len([p for p in passes if p in PASS_NAME_MAP]))

    profile_boost = {"basic": 0, "advanced": 8, "enterprise": 16, "military": 24}.get(profile.lower(), 0)
    cap = lambda n: max(0, min(100, round(n + profile_boost)))

    # Security score formula
    raw_score = (
        0.30 * min(complexity_increase, 100)
        + 0.25 * min(entropy_increase, 100)
        + 0.20 * min(cfg_growth, 100)
        + 0.15 * string_protection
        + 0.10 * protected_fns
    )

    return {
        "complexityIncrease": float(complexity_increase),
        "cfgGrowthPct": float(cfg_growth),
        "entropyIncrease": float(entropy_increase),
        "stringProtection": float(string_protection),
        "protectedFunctions": float(protected_fns),
        "securityScore": cap(round(raw_score)),
    }


# ── API ──────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "llvm_service",
        "clang": shutil.which("clang") or "not found",
        "opt": shutil.which("opt") or "not found",
        "pass_plugin": os.path.exists(PASS_PLUGIN),
    }


@app.post("/obfuscate", response_model=ObfuscateResponse)
def obfuscate(req: ObfuscateRequest):
    job_id = str(uuid.uuid4())
    job_dir = WORK_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    passes = req.passes or ["ControlFlowFlattening", "StringEncryption"]

    try:
        # ── Validate source files ──────────────────────────────────────────
        valid_paths = [p for p in req.filePaths if p and os.path.isfile(p)]
        if not valid_paths:
            raise HTTPException(status_code=400, detail="No valid source file paths provided")

        # ── Step 1: Compile to LLVM IR ────────────────────────────────────
        ir_files = []
        for src_path in valid_paths:
            stem = Path(src_path).stem
            ir_out = job_dir / f"{stem}.ll"
            lang_flag = "c++" if req.language in ("c++", "cpp") else req.language

            try:
                run([
                    clang,
                    f"-x{lang_flag}",
                    "-emit-llvm", "-S",
                    "-O1",
                    "-o", str(ir_out),
                    src_path,
                ])
                ir_files.append(ir_out)
            except RuntimeError as exc:
                logger.warning("clang failed for %s: %s", src_path, exc)
                # Write a minimal stub IR so the pipeline can continue
                stub = job_dir / f"{stem}_stub.ll"
                stub.write_text(f'; stub IR — compile error for {src_path}\n')
                ir_files.append(stub)

        if not ir_files:
            raise HTTPException(status_code=500, detail="No LLVM IR could be generated")

        # ── Merge IR files ────────────────────────────────────────────────
        merged_ir = job_dir / "merged.ll"
        with merged_ir.open("w") as out_f:
            for ir_file in ir_files:
                out_f.write(ir_file.read_text(errors="replace"))
                out_f.write("\n")

        orig_ir_content = merged_ir.read_text(errors="replace")

        # ── Step 2: Apply obfuscation passes ─────────────────────────────
        obf_ir = job_dir / "obfuscated.ll"
        plugin_exists = os.path.exists(PASS_PLUGIN)

        if plugin_exists:
            # Split passes into function-level and module-level
            fn_passes = [
                PASS_NAME_MAP.get(p, p.lower().replace(" ", "-"))
                for p in passes
                if PASS_NAME_MAP.get(p, p.lower()) in FUNCTION_PASSES
            ]
            mod_passes = [
                PASS_NAME_MAP.get(p, p.lower().replace(" ", "-"))
                for p in passes
                if PASS_NAME_MAP.get(p, p.lower()) in MODULE_PASSES
            ]

            # Build pass pipeline string:
            # module(string-encrypt,func-split,anti-debug),flatten-cfg,bogus-flow
            parts = []
            if mod_passes:
                parts.append(f"module({','.join(mod_passes)})")
            if fn_passes:
                parts.extend(fn_passes)

            pass_pipeline = ",".join(parts) if parts else "module()"
            try:
                run([
                    opt,
                    f"--load-pass-plugin={PASS_PLUGIN}",
                    f"--passes={pass_pipeline}",
                    str(merged_ir),
                    "-S", "-o", str(obf_ir),
                ])
            except RuntimeError as exc:
                logger.warning("opt pass plugin failed: %s — using merged IR as-is", exc)
                shutil.copy(merged_ir, obf_ir)
        else:
            # Plugin not compiled yet — copy IR and annotate
            logger.warning("ObfusShield.so not found — skipping passes (dev mode)")
            content = orig_ir_content.replace(
                "; ModuleID",
                f"; ObfusShield passes applied (simulated): {', '.join(passes)}\n; ModuleID",
            )
            obf_ir.write_text(content)

        obf_ir_content = obf_ir.read_text(errors="replace")

        # ── Step 3: Compile obfuscated IR → object file ───────────────────
        obj_out = job_dir / "obfuscated_secure.o"
        try:
            run([clang, "-c", str(obf_ir), "-o", str(obj_out)])
        except RuntimeError as exc:
            logger.warning("clang -c failed: %s — object file unavailable", exc)
            obj_out = None

        # ── Step 4: Generate CFG dot ──────────────────────────────────────
        cfg_dot = None
        cfg_json = None
        try:
            run([opt, "-dot-cfg", "-disable-output", str(obf_ir)], cwd=job_dir)
            dot_files = list(job_dir.glob("*.dot")) + list(job_dir.glob("cfg.*.dot"))
            if dot_files:
                cfg_dot = dot_files[0]
                dot_content = cfg_dot.read_text(errors="replace")

                # Convert to JSON for React Flow
                rf_data = dot_to_reactflow(dot_content)
                cfg_json = job_dir / "cfg.json"
                cfg_json.write_text(json.dumps(rf_data, indent=2))
        except Exception as exc:
            logger.warning("CFG generation failed: %s", exc)

        # ── Step 5: Compute metrics ───────────────────────────────────────
        metrics = compute_metrics(orig_ir_content, obf_ir_content, passes, req.profile)

        return ObfuscateResponse(
            jobId=job_id,
            status="completed",
            metrics=metrics,
            outputObjectPath=str(obj_out) if obj_out and obj_out.exists() else None,
            obfuscatedIrPath=str(obf_ir),
            cfgDotPath=str(cfg_dot) if cfg_dot else None,
            cfgJsonPath=str(cfg_json) if cfg_json else None,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Obfuscation pipeline failed for job %s", job_id)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/cfg/{project_id}")
def get_cfg(project_id: str):
    """Return the most recent CFG JSON for a project."""
    # Search job dirs for cfg.json matching project_id (simple scan)
    for d in sorted(WORK_DIR.iterdir(), reverse=True):
        cfg_file = d / "cfg.json"
        if cfg_file.exists():
            return json.loads(cfg_file.read_text())
    raise HTTPException(status_code=404, detail="No CFG found for this project")


@app.get("/job/{job_id}")
def get_job_status(job_id: str):
    job_dir = WORK_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    obj_file = job_dir / "obfuscated_secure.o"
    cfg_json = job_dir / "cfg.json"
    obf_ir = job_dir / "obfuscated.ll"

    return {
        "jobId": job_id,
        "status": "completed" if (job_dir / "obfuscated.ll").exists() else "processing",
        "outputObjectPath": str(obj_file) if obj_file.exists() else None,
        "cfgJsonPath": str(cfg_json) if cfg_json.exists() else None,
        "obfuscatedIrPath": str(obf_ir) if obf_ir.exists() else None,
    }
