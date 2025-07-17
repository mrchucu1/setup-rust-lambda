#!/bin/sh
set -e

echo "--- Inputs ---"
echo "Rust Version: ${INPUT_RUST_VERSION}"
echo "Rust Target: ${INPUT_RUST_TARGET}"
echo "cargo-lambda Version: ${INPUT_CARGO_LAMBDA_VERSION}"
echo "Command to run: ${INPUT_COMMAND}"
echo "--------------"

echo "Installing Rust toolchain: ${INPUT_RUST_VERSION}..."
rustup toolchain install "${INPUT_RUST_VERSION}"
rustup default "${INPUT_RUST_VERSION}"
echo "Adding Rust target: ${INPUT_RUST_TARGET}..."
rustup target add "${INPUT_RUST_TARGET}"

echo "Installing cargo-lambda: ${INPUT_CARGO_LAMBDA_VERSION}..."
#cargo install cargo-binstall
#cargo binstall -y --version "${INPUT_CARGO_LAMBDA_VERSION}" cargo-lambda
curl -fLO "https://github.com/cargo-lambda/cargo-lambda/releases/download/v${INPUT_CARGO_LAMBDA_VERSION}/cargo-lambda-v${INPUT_CARGO_LAMBDA_VERSION}.x86_64-unknown-linux-musl.tar.gz"
tar -xzf "cargo-lambda-v${INPUT_CARGO_LAMBDA_VERSION}.x86_64-unknown-linux-musl.tar.gz" -C /usr/bin/

echo "Executing command: ${INPUT_COMMAND}"
sh -c "${INPUT_COMMAND}"
