#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * FunctionSplitPass — Function Splitting
 *
 * Splits large functions at arbitrary mid-points into two halves, where
 * the second half becomes a new private function called by the first.
 * Defeats function-boundary analysis used by decompilers to identify
 * known library patterns.
 */
struct FunctionSplitPass : public PassInfoMixin<FunctionSplitPass> {
  PreservedAnalyses run(Module &M, ModuleAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
