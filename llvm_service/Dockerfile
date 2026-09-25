FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install LLVM 18, Clang, Python, Graphviz, CMake
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg lsb-release software-properties-common \
  && wget -qO- https://apt.llvm.org/llvm.sh | bash -s -- 18 \
  && apt-get install -y --no-install-recommends \
    clang-18 llvm-18 llvm-18-dev opt \
    graphviz \
    cmake ninja-build \
    python3 python3-pip \
    g++ git \
  && ln -sf /usr/bin/clang-18 /usr/local/bin/clang \
  && ln -sf /usr/bin/opt-18 /usr/local/bin/opt \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY main.py .
COPY passes/ ./passes/

# Build LLVM pass plugin
RUN cd passes && mkdir -p build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release \
      -DLLVM_DIR=/usr/lib/llvm-18/lib/cmake/llvm \
    && make -j$(nproc) && \
    cp libObfusShield.so /app/ObfusShield.so || true

ENV LLVM_BIN=/usr/bin
ENV PASS_PLUGIN=/app/ObfusShield.so

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000", "--workers", "1"]
