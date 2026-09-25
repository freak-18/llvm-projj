#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * BogusFlowPass — Bogus Control Flow
 *
 * Inserts dead basic blocks with opaque always-false predicates that appear
 * to branch to junk code. Decompilers may try to analyse both paths,
 * dramatically increasing analysis time and producing misleading output.
 */
struct BogusFlowPass : public PassInfoMixin<BogusFlowPass> {
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
