#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * InstructionSubstPass — Instruction Substitution
 *
 * Replaces common arithmetic and logical instructions with semantically
 * equivalent but less obvious sequences.
 *
 * Examples:
 *   a + b  →  a - (-b)   or   a + b + (r ^ r)
 *   a - b  →  a + (~b + 1)
 *   a & b  →  ~(~a | ~b)   (De Morgan)
 *   a | b  →  ~(~a & ~b)
 *   a ^ b  →  (a | b) & ~(a & b)
 */
struct InstructionSubstPass : public PassInfoMixin<InstructionSubstPass> {
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
