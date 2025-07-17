FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gcc \
    libc6-dev \
    tar \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fLO "https://ziglang.org/builds/zig-x86_64-linux-0.15.0-dev.1084+dbe0e0c1b.tar.xz"
RUN tar -xJf "zig-x86_64-linux-0.15.0-dev.1084+dbe0e0c1b.tar.xz" -C /usr/bin
RUN rm -rf "zig-x86_64-linux-0.15.0-dev.1084+dbe0e0c1b.tar.xz"

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain none --profile minimal

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
