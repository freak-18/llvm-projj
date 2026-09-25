/**
 * BogusControlFlow.cpp — Pass 2
 *
 * For each basic block with more than one instruction:
 *   - Split the block in two (original, clone).
 *   - Insert an always-true (opaque) conditional: if (x*x >= 0) goto original else goto clone.
 *   - The clone is a copy of the original but unreachable at runtime.
 *   - Decompilers must analyse both paths, doubling analysis work per block.
 */
#include "BogusControlFlow.h"
#include "llvm/IR/BasicBlock.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/Cloning.h"
#include "llvm/Transforms/Utils/ValueMapper.h"
#include <vector>

using namespace llvm;

PreservedAnalyses BogusFlowPass::run(Function &F, FunctionAnalysisManager &) {
  if (F.isDeclaration() || F.empty()) return PreservedAnalyses::all();

  LLVMContext &Ctx = F.getContext();
  IRBuilder<> Builder(Ctx);

  std::vector<BasicBlock *> origBlocks;
  for (auto &BB : F) origBlocks.push_back(&BB);

  for (BasicBlock *BB : origBlocks) {
    if (BB->size() < 2) continue;

    // Create clone block (junk — never actually executed)
    ValueToValueMapTy VMap;
    BasicBlock *cloneBB = CloneBasicBlock(BB, VMap, ".bogus", &F);

    // Build opaque predicate: (x * x >= 0) is always true for integers
    Builder.SetInsertPoint(BB->getFirstNonPHI());
    Value *x = Builder.getInt32(7);
    Value *xSq = Builder.CreateMul(x, x, "bogus.sq");
    Value *cond = Builder.CreateICmpSGE(xSq, Builder.getInt32(0), "bogus.cond");

    // Split BB at first non-PHI, insert conditional branch
    BasicBlock *newBB = BB->splitBasicBlock(BB->getFirstNonPHI(), "obfs.real");
    BB->getTerminator()->eraseFromParent();
    Builder.SetInsertPoint(BB);
    Builder.CreateCondBr(cond, newBB, cloneBB);

    // Patch cloneBB to branch to newBB (so IR is valid)
    if (cloneBB->getTerminator()) cloneBB->getTerminator()->eraseFromParent();
    Builder.SetInsertPoint(cloneBB);
    Builder.CreateBr(newBB);
  }

  return PreservedAnalyses::none();
}
