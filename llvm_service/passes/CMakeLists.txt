cmake_minimum_required(VERSION 3.20)
project(ObfusShieldPasses)

# ── Find LLVM ────────────────────────────────────────────────────────────────
find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

include(AddLLVM)
include_directories(${LLVM_INCLUDE_DIRS})
separate_arguments(LLVM_DEFINITIONS_LIST NATIVE_COMMAND ${LLVM_DEFINITIONS})
add_definitions(${LLVM_DEFINITIONS_LIST})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Handle optional zstd dependency pulled in by LLVM ────────────────────────
# The apt LLVM build references zstd::libzstd_shared even if zstd isn't present.
# Create a dummy ALIAS target to satisfy CMake's dependency resolution.
find_package(zstd QUIET)
if(NOT zstd_FOUND)
  if(NOT TARGET zstd::libzstd_shared)
    add_library(zstd_dummy INTERFACE)
    add_library(zstd::libzstd_shared ALIAS zstd_dummy)
  endif()
endif()

# ── Build shared pass plugin ─────────────────────────────────────────────────
add_library(ObfusShield MODULE
  ControlFlowFlattening.cpp
  BogusControlFlow.cpp
  StringEncryption.cpp
  InstructionSubstitution.cpp
  FunctionSplitting.cpp
  OpaquePredicates.cpp
  AntiDebug.cpp
  ObfusShieldPlugin.cpp
)

target_compile_options(ObfusShield PRIVATE -fno-rtti)

# Only link the core LLVM components we actually use — avoids pulling in zstd
target_link_libraries(ObfusShield PRIVATE
  LLVMCore
  LLVMSupport
  LLVMTransformUtils
  LLVMAnalysis
  LLVMIRReader
)

set_target_properties(ObfusShield PROPERTIES
  PREFIX ""
  SUFFIX ".so"
)
