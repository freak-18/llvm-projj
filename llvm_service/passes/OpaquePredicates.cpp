/**
 * OpaquePredicates.cpp — Pass 6
 */
#include "OpaquePredicates.h"
#include "llvm/IR/BasicBlock.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include <vector>

using namespace llvm;

PreservedAnalyses OpaquePredicatesPass::run(Function &F, FunctionAnalysisManager &) {
  if (F.isDeclaration() || F.empty()) return PreservedAnalyses::all();

  LLVMContext &Ctx = F.getContext();
  IRBuilder<> Builder(Ctx);

  std::vector<BasicBlock *> blocks;
  for (auto &BB : F) blocks.push_back(&BB);

  for (BasicBlock *BB : blocks) {
    if (BB->size() < 3) continue;

    // Insert before the first non-PHI instruction
    Builder.SetInsertPoint(BB->getFirstNonPHI());

    // Opaque true: (x | ~x) == -1  (always true)
    Value *x = Builder.getInt32(0xDEAD);
    Value *notX = Builder.CreateNot(x, "op.notx");
    Value *orVal = Builder.CreateOr(x, notX, "op.or");
    Value *cond = Builder.CreateICmpEQ(orVal, Builder.getInt32(-1), "op.cond");

    // Split block and insert dead unreachable branch
    BasicBlock *realBB = BB->splitBasicBlock(BB->getFirstNonPHI(), "op.real");
    BasicBlock *deadBB = BasicBlock::Create(Ctx, "op.dead", &F);

    // Replace unconditional br with conditional
    BB->getTerminator()->eraseFromParent();
    Builder.SetInsertPoint(BB);
    Builder.CreateCondBr(cond, realBB, deadBB);

    // Dead block just branches back to real block
    Builder.SetInsertPoint(deadBB);
    Builder.CreateBr(realBB);
  }

  return PreservedAnalyses::none();
}
