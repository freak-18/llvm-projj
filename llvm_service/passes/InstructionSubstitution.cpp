/**
 * InstructionSubstitution.cpp — Pass 4
 */
#include "InstructionSubstitution.h"
#include "llvm/IR/BasicBlock.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include <vector>

using namespace llvm;

PreservedAnalyses InstructionSubstPass::run(Function &F, FunctionAnalysisManager &) {
  if (F.isDeclaration()) return PreservedAnalyses::all();

  IRBuilder<> Builder(F.getContext());
  std::vector<BinaryOperator *> toReplace;

  for (auto &BB : F) {
    for (auto &I : BB) {
      if (auto *BinOp = dyn_cast<BinaryOperator>(&I)) {
        if (BinOp->getType()->isIntegerTy()) {
          toReplace.push_back(BinOp);
        }
      }
    }
  }

  for (BinaryOperator *BinOp : toReplace) {
    Builder.SetInsertPoint(BinOp);
    Value *A = BinOp->getOperand(0);
    Value *B = BinOp->getOperand(1);
    Value *newVal = nullptr;

    switch (BinOp->getOpcode()) {
      case Instruction::Add:
        // a + b  →  a - (-b)
        newVal = Builder.CreateSub(A, Builder.CreateNeg(B), "subst.add");
        break;
      case Instruction::Sub:
        // a - b  →  a + (~b + 1)
        newVal = Builder.CreateAdd(A,
          Builder.CreateAdd(Builder.CreateNot(B), ConstantInt::get(B->getType(), 1)),
          "subst.sub");
        break;
      case Instruction::And:
        // a & b  →  ~(~a | ~b)
        newVal = Builder.CreateNot(
          Builder.CreateOr(Builder.CreateNot(A), Builder.CreateNot(B)),
          "subst.and");
        break;
      case Instruction::Or:
        // a | b  →  ~(~a & ~b)
        newVal = Builder.CreateNot(
          Builder.CreateAnd(Builder.CreateNot(A), Builder.CreateNot(B)),
          "subst.or");
        break;
      case Instruction::Xor:
        // a ^ b  →  (a | b) & ~(a & b)
        newVal = Builder.CreateAnd(
          Builder.CreateOr(A, B),
          Builder.CreateNot(Builder.CreateAnd(A, B)),
          "subst.xor");
        break;
      default:
        break;
    }

    if (newVal) {
      BinOp->replaceAllUsesWith(newVal);
      BinOp->eraseFromParent();
    }
  }

  return PreservedAnalyses::none();
}
