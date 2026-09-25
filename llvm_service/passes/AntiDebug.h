#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * AntiDebugPass — Anti-Debug / Anti-Tamper
 *
 * Injects debugger detection code at function entry points.
 * On Linux/macOS: uses ptrace(PTRACE_TRACEME) — returns -1 if already traced.
 * On Windows: uses IsDebuggerPresent() / CheckRemoteDebuggerPresent().
 *
 * If a debugger is detected, the function corrupts its return value
 * or calls abort() to thwart dynamic analysis.
 */
struct AntiDebugPass : public PassInfoMixin<AntiDebugPass> {
  PreservedAnalyses run(Module &M, ModuleAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
