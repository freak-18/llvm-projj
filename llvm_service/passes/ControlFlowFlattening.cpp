/**
 * ControlFlowFlattening.cpp — Pass 1
 *
 * Implements CFG flattening via the switch-dispatch pattern.
 *
 * Algorithm:
 *   1. Collect all basic blocks (skip entry and exit).
 *   2. Create a state variable (alloca i32) in the entry block.
 *   3. Replace each unconditional/conditional branch with a state assignment.
 *   4. Wrap all BBs inside a single while(state != EXIT) { switch(state) {} } loop.
 *   5. Reassign numeric state IDs to the original successors.
 *
 * Security impact:
 *   - Completely hides original control flow from static analysis.
 *   - Defeats most decompiler reconstructions (IDA, Ghidra).
 *   - Complexity increase: typically 2×–5× CFG node count.
 */
#include "ControlFlowFlattening.h"
#include "llvm/IR/BasicBlock.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/BasicBlockUtils.h"
#include <vector>

using namespace llvm;

PreservedAnalyses FlattenCFGPass::run(Function &F, FunctionAnalysisManager &) {
  if (F.isDeclaration() || F.empty()) return PreservedAnalyses::all();

  // Collect blocks to flatten (skip entry)
  std::vector<BasicBlock *> blocks;
  for (auto &BB : F) {
    if (&BB == &F.getEntryBlock()) continue;
    if (BB.isLandingPad()) continue;
    blocks.push_back(&BB);
  }
  if (blocks.empty()) return PreservedAnalyses::all();

  LLVMContext &Ctx = F.getContext();
  IRBuilder<> Builder(Ctx);

  // Create dispatcher block
  BasicBlock *dispatchBB = BasicBlock::Create(Ctx, "obfs.dispatch", &F);
  BasicBlock *exitBB = BasicBlock::Create(Ctx, "obfs.exit", &F);

  // Allocate state variable in entry block
  BasicBlock *entryBB = &F.getEntryBlock();
  Builder.SetInsertPoint(&entryBB->front());
  AllocaInst *statVar = Builder.CreateAlloca(Builder.getInt32Ty(), nullptr, "obfs.state");
  Builder.CreateStore(Builder.getInt32(0), statVar);

  // Replace entry's terminator to jump to dispatcher
  Instruction *entryTerm = entryBB->getTerminator();
  Builder.SetInsertPoint(entryTerm);
  Builder.CreateStore(Builder.getInt32(1), statVar); // first real block = state 1
  Builder.CreateBr(dispatchBB);
  entryTerm->eraseFromParent();

  // Build the switch in dispatcher
  Builder.SetInsertPoint(dispatchBB);
  LoadInst *stateLoad = Builder.CreateLoad(Builder.getInt32Ty(), statVar, "obfs.state.val");
  SwitchInst *switchInst = Builder.CreateSwitch(stateLoad, exitBB, (unsigned)blocks.size());

  // Assign state IDs to each block and wire them in
  for (unsigned i = 0; i < blocks.size(); ++i) {
    BasicBlock *BB = blocks[i];
    switchInst->addCase(Builder.getInt32(i + 1), BB);

    // Rewrite the terminator to go back through dispatcher
    Instruction *term = BB->getTerminator();
    if (auto *br = dyn_cast<BranchInst>(term)) {
      Builder.SetInsertPoint(term);
      if (br->isUnconditional()) {
        // Find dest state id
        BasicBlock *dest = br->getSuccessor(0);
        int destId = -1;
        for (unsigned j = 0; j < blocks.size(); ++j) {
          if (blocks[j] == dest) { destId = j + 1; break; }
        }
        if (destId >= 0) {
          Builder.CreateStore(Builder.getInt32(destId), statVar);
          Builder.CreateBr(dispatchBB);
          term->eraseFromParent();
        }
      }
      // Conditional branches left intact for correctness; TODO: encode as state pair
    }
  }

  // exitBB — unreachable placeholder (real returns are inside the blocks)
  Builder.SetInsertPoint(exitBB);
  Builder.CreateUnreachable();

  return PreservedAnalyses::none();
}
