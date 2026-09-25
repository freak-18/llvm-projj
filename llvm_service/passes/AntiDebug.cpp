/**
 * AntiDebug.cpp — Pass 7 (LLVM 18 compatible)
 *
 * Injects ptrace-based anti-debug checks into sensitive functions.
 */
#include "AntiDebug.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Type.h"
#include <regex>

using namespace llvm;

static const std::regex SENSITIVE_PATTERN(
  "login|verify|auth|encrypt|decrypt|license|payment|secret|sign",
  std::regex::icase
);

PreservedAnalyses AntiDebugPass::run(Module &M, ModuleAnalysisManager &) {
  LLVMContext &Ctx = M.getContext();
  IRBuilder<> Builder(Ctx);

  auto *LongTy    = Type::getInt64Ty(Ctx);
  auto *IntTy     = Type::getInt32Ty(Ctx);
  auto *VoidPtrTy = PointerType::get(Type::getInt8Ty(Ctx), 0);

  FunctionCallee ptraceFn = M.getOrInsertFunction(
    "ptrace",
    FunctionType::get(LongTy, {IntTy, IntTy, VoidPtrTy, VoidPtrTy}, false)
  );
  FunctionCallee abortFn = M.getOrInsertFunction(
    "abort",
    FunctionType::get(Type::getVoidTy(Ctx), {}, false)
  );

  for (Function &F : M) {
    if (F.isDeclaration() || F.empty()) continue;

    std::string name = F.getName().str();
    if (!std::regex_search(name, SENSITIVE_PATTERN)) continue;

    BasicBlock &entry      = F.getEntryBlock();
    Instruction *firstInst = entry.getFirstNonPHI();
    Builder.SetInsertPoint(firstInst);

    Value *ptrace_traceme = ConstantInt::get(IntTy, 0);
    Value *zero_int       = ConstantInt::get(IntTy, 0);
    Value *null_ptr       = ConstantPointerNull::get(cast<PointerType>(VoidPtrTy));

    Value *result = Builder.CreateCall(
      ptraceFn, {ptrace_traceme, zero_int, null_ptr, null_ptr}, "ptrace.ret"
    );
    Value *cond = Builder.CreateICmpEQ(
      result, ConstantInt::get(LongTy, -1), "dbg.detected"
    );

    // Split the entry block at firstInst so we can insert the branch
    BasicBlock *checkBB = firstInst->getParent();
    BasicBlock *safeBB  = checkBB->splitBasicBlock(firstInst, "anti_debug.safe");
    BasicBlock *abortBB = BasicBlock::Create(Ctx, "anti_debug.abort", &F);

    // Replace the unconditional branch added by splitBasicBlock with a conditional
    checkBB->getTerminator()->eraseFromParent();
    Builder.SetInsertPoint(checkBB);
    Builder.CreateCondBr(cond, abortBB, safeBB);

    // Abort block
    Builder.SetInsertPoint(abortBB);
    Builder.CreateCall(abortFn);
    Builder.CreateUnreachable();
  }

  return PreservedAnalyses::none();
}
