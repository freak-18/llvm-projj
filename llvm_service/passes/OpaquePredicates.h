#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * OpaquePredicatesPass — Opaque Predicates
 *
 * Inserts algebraic invariants (always-true or always-false conditions) that
 * are provably constant at compile time but appear non-trivial to static
 * analysers and constraint solvers.
 *
 * Examples of opaque-true predicates:
 *   (x*x - x) % 2 == 0   (always true — product of two consecutive integers)
 *   (x | ~x) == -1        (always true — bitwise complement law)
 *   3 * x - x == 2 * x   (always true — arithmetic identity)
 */
struct OpaquePredicatesPass : public PassInfoMixin<OpaquePredicatesPass> {
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
