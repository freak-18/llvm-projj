/**
 * FunctionSplitting.cpp — Pass 5
 *
 * For each function with ≥ 8 basic blocks:
 *   - Find the midpoint block.
 *   - Extract the second half into a new function obfs_split_<N>.
 *   - Replace the split point with a call + branch to the new function.
 *
 * Note: This is a structural sketch. Full implementation requires
 * careful handling of SSA values that cross the split boundary (via
 * argument/return insertion). The implementation below uses
 * llvm::extractCodeRegion (CodeExtractor) for correctness.
 */
#include "FunctionSplitting.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/Module.h"
#include "llvm/Transforms/Utils/CodeExtractor.h"
#include <vector>

using namespace llvm;

PreservedAnalyses FunctionSplitPass::run(Module &M, ModuleAnalysisManager &) {
  std::vector<Function *> toSplit;
  for (auto &F : M) {
    if (!F.isDeclaration() && F.size() >= 8) {
      toSplit.push_back(&F);
    }
  }

  for (Function *F : toSplit) {
    // Collect second-half basic blocks (rough midpoint)
    size_t total = F->size();
    size_t mid = total / 2;
    size_t idx = 0;

    std::vector<BasicBlock *> secondHalf;
    for (auto &BB : *F) {
      if (idx >= mid) secondHalf.push_back(&BB);
      ++idx;
    }

    if (secondHalf.size() < 2) continue;

    // Use LLVM's CodeExtractor to handle SSA boundary values automatically
    CodeExtractor extractor(secondHalf, /*DT=*/nullptr, /*AggregateArgs=*/false);
    if (extractor.isEligible()) {
      CodeExtractorAnalysisCache CEAC(*F);
      Function *newFn = extractor.extractCodeRegion(CEAC);
      if (newFn) {
        newFn->setName("obfs.split." + F->getName());
        newFn->setLinkage(GlobalValue::PrivateLinkage);
      }
    }
  }

  return PreservedAnalyses::none();
}
