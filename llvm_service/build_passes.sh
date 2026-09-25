#!/usr/bin/env bash
# build_passes.sh — Compile ObfusShield LLVM pass plugin
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PASSES_DIR="$SCRIPT_DIR/passes"
BUILD_DIR="$PASSES_DIR/build"

# Find llvm-config — try versioned names first
LLVM_CONFIG=""
for cmd in llvm-config-18 llvm-config-17 llvm-config; do
  if command -v "$cmd" &>/dev/null; then
    LLVM_CONFIG="$cmd"
    break
  fi
done

# If still not found, check common install paths
if [ -z "$LLVM_CONFIG" ]; then
  for path in /usr/lib/llvm-18/bin/llvm-config /usr/lib/llvm-17/bin/llvm-config; do
    if [ -f "$path" ]; then
      LLVM_CONFIG="$path"
      break
    fi
  done
fi

if [ -z "$LLVM_CONFIG" ]; then
  echo "ERROR: llvm-config not found. Install with: sudo apt install llvm-18-dev"
  exit 1
fi

echo "==> Building ObfusShield LLVM passes..."
echo "    LLVM version: $($LLVM_CONFIG --version)"
echo "    LLVM cmake dir: $($LLVM_CONFIG --cmakedir)"
echo "    Passes source: $PASSES_DIR"

mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

cmake "$PASSES_DIR" \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR="$($LLVM_CONFIG --cmakedir)"

make -j"$(nproc)"

# Copy .so to llvm_service root for the Python service to find
SO_FILE=$(find "$BUILD_DIR" -name "*.so" | head -1)
if [ -n "$SO_FILE" ]; then
  cp "$SO_FILE" "$SCRIPT_DIR/ObfusShield.so"
  echo "==> Done. Plugin: $SCRIPT_DIR/ObfusShield.so"
  ls -lh "$SCRIPT_DIR/ObfusShield.so"
else
  echo "WARNING: No .so found in build dir. Check cmake output above."
fi
