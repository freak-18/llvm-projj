#pragma once
#include "llvm/IR/PassManager.h"

namespace llvm {

/**
 * StringEncryptPass — String Encryption
 *
 * Encrypts all global string constants with a XOR key and inserts a
 * runtime decryption routine at the point of use.
 * Static string analysis tools (strings, Ghidra strings view) will see
 * only encrypted bytes instead of readable text.
 */
struct StringEncryptPass : public PassInfoMixin<StringEncryptPass> {
  PreservedAnalyses run(Module &M, ModuleAnalysisManager &AM);
  static bool isRequired() { return false; }
};

} // namespace llvm
