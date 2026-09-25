#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * FlattenCFGPass — Control Flow Flattening
 *
 * Transforms structured control flow into a single dispatch loop:
 *
 *   while (state != EXIT) {
 *     switch (state) {
 *       case BB0: ...; state = BB2; break;
 *       case BB1: ...; state = BB3; break;
 *       ...
 *     }
 *   }
 *
 * This completely defeats pattern-matching decompilers and symbolic execution
 * engines that rely on structured CFGs.
 */
struct FlattenCFGPass : public PassInfoMixin<FlattenCFGPass> {
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
