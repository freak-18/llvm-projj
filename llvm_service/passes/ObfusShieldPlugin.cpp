/**
 * ObfusShieldPlugin.cpp — New Pass Manager plugin registration (LLVM 18)
 *
 * Function passes  (FunctionPassManager): flatten-cfg, bogus-flow,
 *                                          inst-subst, opaque-pred
 * Module passes    (ModulePassManager):   string-encrypt, func-split,
 *                                          anti-debug
 *
 * Usage:
 *   opt --load-pass-plugin=ObfusShield.so \
 *       --passes="module(string-encrypt,func-split,anti-debug),\
 *                 flatten-cfg,bogus-flow,inst-subst,opaque-pred" \
 *       input.ll -S -o output.ll
 */
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Passes/PassPlugin.h"
#include "llvm/IR/PassManager.h"

#include "ControlFlowFlattening.h"
#include "BogusControlFlow.h"
#include "StringEncryption.h"
#include "InstructionSubstitution.h"
#include "FunctionSplitting.h"
#include "OpaquePredicates.h"
#include "AntiDebug.h"

using namespace llvm;

extern "C" LLVM_ATTRIBUTE_WEAK ::llvm::PassPluginLibraryInfo
llvmGetPassPluginInfo() {
  return {
    LLVM_PLUGIN_API_VERSION,
    "ObfusShield",
    LLVM_VERSION_STRING,
    [](PassBuilder &PB) {

      // ── Function passes ──────────────────────────────────────────────────
      PB.registerPipelineParsingCallback(
        [](StringRef Name, FunctionPassManager &FPM,
           ArrayRef<PassBuilder::PipelineElement>) -> bool {
          if (Name == "flatten-cfg") {
            FPM.addPass(FlattenCFGPass());
            return true;
          }
          if (Name == "bogus-flow") {
            FPM.addPass(BogusFlowPass());
            return true;
          }
          if (Name == "inst-subst") {
            FPM.addPass(InstructionSubstPass());
            return true;
          }
          if (Name == "opaque-pred") {
            FPM.addPass(OpaquePredicatesPass());
            return true;
          }
          return false;
        }
      );

      // ── Module passes ─────────────────────────────────────────────────────
      PB.registerPipelineParsingCallback(
        [](StringRef Name, ModulePassManager &MPM,
           ArrayRef<PassBuilder::PipelineElement>) -> bool {
          if (Name == "string-encrypt") {
            MPM.addPass(StringEncryptPass());
            return true;
          }
          if (Name == "func-split") {
            MPM.addPass(FunctionSplitPass());
            return true;
          }
          if (Name == "anti-debug") {
            MPM.addPass(AntiDebugPass());
            return true;
          }
          return false;
        }
      );
    }
  };
}
