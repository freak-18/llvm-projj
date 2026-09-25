/**
 * StringEncryption.cpp — Pass 3
 *
 * Module-level pass. For each GlobalVariable that holds a ConstantDataArray
 * (i.e. a string literal):
 *   1. XOR each byte with a pseudo-random key derived from its index.
 *   2. Replace the global with the encrypted bytes.
 *   3. At each use site, inject a decryption loop (XOR back) into the
 *      containing function's entry block.
 *
 * This is a simplified production-intent implementation. A hardened version
 * would use AES-CTR or ChaCha20 and hide the key in a custom ELF section.
 */
#include "StringEncryption.h"
#include "llvm/IR/Constants.h"
#include "llvm/IR/GlobalVariable.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Type.h"
#include <cstdint>
#include <vector>

using namespace llvm;

static uint8_t xorKey(unsigned idx) {
  // Simple PRNG-derived key — replace with cryptographic key schedule in production
  static constexpr uint8_t BASE_KEY = 0xAB;
  return static_cast<uint8_t>((BASE_KEY ^ (idx * 0x5D)) & 0xFF);
}

PreservedAnalyses StringEncryptPass::run(Module &M, ModuleAnalysisManager &) {
  LLVMContext &Ctx = M.getContext();
  IRBuilder<> Builder(Ctx);

  std::vector<GlobalVariable *> toEncrypt;

  for (GlobalVariable &GV : M.globals()) {
    if (!GV.isConstant()) continue;
    if (!GV.hasInitializer()) continue;
    auto *CDA = dyn_cast<ConstantDataArray>(GV.getInitializer());
    if (!CDA || !CDA->isString()) continue;
    toEncrypt.push_back(&GV);
  }

  for (GlobalVariable *GV : toEncrypt) {
    auto *CDA = cast<ConstantDataArray>(GV->getInitializer());
    StringRef rawStr = CDA->getAsString();

    // Build encrypted byte array
    std::vector<uint8_t> encBytes(rawStr.size());
    for (size_t i = 0; i < rawStr.size(); ++i) {
      encBytes[i] = static_cast<uint8_t>(rawStr[i]) ^ xorKey(i);
    }

    // Create new global with encrypted bytes
    auto *ByteTy = Type::getInt8Ty(Ctx);
    auto *ArrTy = ArrayType::get(ByteTy, encBytes.size());

    std::vector<Constant *> encConsts;
    encConsts.reserve(encBytes.size());
    for (uint8_t b : encBytes) {
      encConsts.push_back(ConstantInt::get(ByteTy, b));
    }

    Constant *encInit = ConstantArray::get(ArrTy, encConsts);
    GlobalVariable *encGV = new GlobalVariable(
      M, ArrTy, false /* not constant — will be decrypted at runtime */,
      GV->getLinkage(), encInit, GV->getName() + ".enc"
    );

    // Replace all users — inject decryption at each use-site function entry
    for (Use &U : GV->uses()) {
      if (auto *inst = dyn_cast<Instruction>(U.getUser())) {
        Function *parentFn = inst->getParent()->getParent();
        BasicBlock &entryBB = parentFn->getEntryBlock();

        // Only insert decryption loop once per function per string
        Builder.SetInsertPoint(&entryBB.front());

        // Alloca for decrypted buffer
        AllocaInst *buf = Builder.CreateAlloca(ArrTy, nullptr, "str.dec");

        // Copy encrypted bytes and XOR-decrypt at runtime
        for (size_t i = 0; i < encBytes.size(); ++i) {
          Value *encByte = Builder.CreateLoad(ByteTy,
            Builder.CreateConstGEP2_32(ArrTy, encGV, 0, (unsigned)i));
          Value *keyByte = ConstantInt::get(ByteTy, xorKey(i));
          Value *decByte = Builder.CreateXor(encByte, keyByte);
          Builder.CreateStore(decByte,
            Builder.CreateConstGEP2_32(ArrTy, buf, 0, (unsigned)i));
        }
        // Replace use with pointer to decrypted buffer
        U.set(Builder.CreateConstGEP2_32(ArrTy, buf, 0, 0));
      }
    }

    // Remove original plaintext global
    GV->replaceAllUsesWith(UndefValue::get(GV->getType()));
    GV->eraseFromParent();
  }

  return PreservedAnalyses::none();
}
