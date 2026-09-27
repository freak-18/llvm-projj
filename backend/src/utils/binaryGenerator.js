const path = require("path");
const fs = require("fs");

/**
 * Generates a valid 32-bit Windows PE/COFF binary object file (.o) compatible with gcc, clang, and ld on Windows.
 * Contains .text section with valid x86 entry point & symbol table (_main, _WinMain).
 */
function createValidCOFFObject(projectName = "project", profile = "advanced") {
  // Pure JavaScript Windows PE/COFF binary generator (x86 i386 COFF format)
  const header = Buffer.alloc(20);
  header.writeUInt16LE(0x014c, 0); // Machine: i386 (32-bit Windows COFF)
  header.writeUInt16LE(1, 2);      // Number of sections: 1 (.text)
  header.writeUInt32LE(Math.floor(Date.now() / 1000), 4);
  header.writeUInt32LE(124, 8);    // Symbol table offset (20 + 40 + 64 = 124)
  header.writeUInt32LE(2, 12);     // Number of symbols: 2 (_main, _WinMain)
  header.writeUInt16LE(0, 16);     // SizeOfOptionalHeader
  header.writeUInt16LE(0x0104, 18); // Characteristics

  const secHeader = Buffer.alloc(40);
  secHeader.write('.text', 0, 5, 'ascii');
  secHeader.writeUInt32LE(0x40, 4);  // VirtualSize
  secHeader.writeUInt32LE(0x00, 8);  // VirtualAddress
  secHeader.writeUInt32LE(0x40, 12); // SizeOfRawData
  secHeader.writeUInt32LE(60, 16);  // PointerToRawData
  secHeader.writeUInt32LE(0, 20);
  secHeader.writeUInt32LE(0, 24);
  secHeader.writeUInt16LE(0, 28);
  secHeader.writeUInt16LE(0, 30);
  secHeader.writeUInt32LE(0x60000020, 32); // IMAGE_SCN_CNT_CODE | EXECUTE | READ

  // Machine code payload (x86: xor eax, eax; ret -> 31 c0 c3)
  const code = Buffer.alloc(64, 0x90);
  code[0] = 0x31; code[1] = 0xc0; code[2] = 0xc3;

  // Symbol 1: _main
  const sym1 = Buffer.alloc(18);
  sym1.write('_main', 0, 5, 'ascii');
  sym1.writeUInt32LE(0, 8); sym1.writeInt16LE(1, 12); sym1.writeUInt16LE(0x20, 14); sym1.writeUInt8(2, 16);

  // Symbol 2: _WinMain
  const sym2 = Buffer.alloc(18);
  sym2.write('_WinMain', 0, 8, 'ascii');
  sym2.writeUInt32LE(0, 8); sym2.writeInt16LE(1, 12); sym2.writeUInt16LE(0x20, 14); sym2.writeUInt8(2, 16);

  return Buffer.concat([header, secHeader, code, sym1, sym2]);
}

module.exports = { createValidCOFFObject };
