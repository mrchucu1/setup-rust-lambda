FROM ubuntu@sha256:1ec65b2719518e27d4d25f104d93f9fac60dc437f81452302406825c46fcc9cb
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
     curl \
     ca-certificates \
     gcc \
     libc6-dev \
     tar \
     xz-utils \
     && rm -rf /var/lib/apt/lists/* \
     && apt-get clean \
     && rm -rf /var/lib/apt/lists/*

# Security best practice: Add checksum verification for Zig download
ARG ZIG_URL="https://ziglang.org/download/0.14.1/zig-x86_64-linux-0.14.1.tar.xz"
ARG ZIG_SHA256="24aeeec8af16c381934a6cd7d95c807a8cb2cf7df9fa40d359aa884195c4716c"
RUN curl -fLO "${ZIG_URL}" && \
    echo "${ZIG_SHA256}  $(basename ${ZIG_URL})" | sha256sum -c - && \
    tar -xJf "$(basename ${ZIG_URL})" && \
    mv zig-*/* /usr/bin/ && \
    rm -rf zig-* "$(basename ${ZIG_URL})"

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain none --profile minimal

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]