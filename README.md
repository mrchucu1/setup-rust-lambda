# setup-rust-lambda Action

[![Continuous Integration](https://github.com/mrchucu1/setup-rust-lambda/actions/workflows/ci.yml/badge.svg)](https://github.com/mrchucu1/setup-rust-lambda/actions/workflows/ci.yml)

The `setup-rust-lambda` action sets up a Rust and `cargo-lambda` toolchain in your GitHub Actions workflow by:

-   Installing a specific version of the Rust toolchain using `rustup`.
-   Adding a specific cross-compilation target (e.g., `x86_64-unknown-linux-musl`).
-   Downloading a specific version of `cargo-lambda` and adding it to the `PATH`.
-   Installing a wrapper script for the `cargo` binary. This allows subsequent steps in the same job to access the `stdout`, `stderr`, and `exitcode` from any `cargo` command.

After using this action, subsequent steps can run `cargo test`, `cargo lambda build`, and `cargo lambda deploy` seamlessly, just like on your local machine.

<!--TODO: Fix actions pipeline-->

## Usage

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners.

### Example: Full CI/CD Pipeline

This example shows a complete workflow that **tests on pull requests** and **deploys on pushes to the `main` branch**.

**Prerequisites:**

1.  Set up AWS OIDC authentication. This is the most secure method. Follow the [official AWS guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html) or the `configure-aws-credentials` [action documentation](https://github.com/aws-actions/configure-aws-credentials#setting-up-oidc-provider-and-iam-role).
2.  Add the required `AWS_ACCOUNT_ID` and `IAM_ROLE_NAME` as GitHub repository secrets.
3.  Ensure your Lambda function has an **Execution Role** with permissions to write to CloudWatch Logs.

```yaml
name: Build and Deploy Rust Lambda

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

permissions:
  id-token: write
  contents: read

env:
  CARGO_TERM_COLOR: always
  AWS_REGION: "us-east-2"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/${{ secrets.IAM_ROLE_NAME }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Test and Build Code & Deploy Lambda function
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: mrchucu1/setup-rust-lambda@v0.5.2
        id: deploy
        with:
          command: |
            cargo test && cargo lambda build --release && \
            cargo lambda deploy \
              --description "${{ github.sha }}" \
              --binary-path ./target/lambda/<your-package-name>/bootstrap \
              --iam-role arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/<lambda-function-role> \
              <lambda-function-name>

      - name: Test and Build Code & skip deploy
        if: github.event_name == 'push' && github.ref != 'refs/heads/main'
        uses: mrchucu1/setup-rust-lambda@v0.5.2
        id: deploy
        with:
          command: cargo test && cargo lambda build --release
```
### Saving built binaries 

```yaml
name: Build and return artifacts

on:
  push:
    branches: ['*']
  pull_request:
    branches: ["*"]

env:
  CARGO_TERM_COLOR: always

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Test and Build Code & Deploy Lambda function
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: mrchucu1/setup-rust-lambda@v0.5.2
        id: deploy
        with:
          command: |
            cargo test && cargo lambda build --release --output-format zip \

      - name: Archive production artifacts
        uses: actions/upload-artifact@v4
        with:
          name: lambda-target-zip
          path: |
            target/lambda/<your-build-name>/
```

## Inputs

- `rust-version`: (Optional) The Rust toolchain version. Defaults to `stable`.
<!-- `rust-target`: (Optional) The Rust cross-compilation target. Defaults to `x86_64-unknown-linux-musl`. Use `aarch64-unknown-linux-gnu` for ARM/Graviton2 Lambdas. -->
- `cargo-lambda-version`: (Optional) The version of `cargo-lambda` to install. Defaults to `latest`.
- `cargo-wrapper`: (Optional) Whether to install the `cargo` wrapper. Defaults to `true`.

## Outputs

When `cargo-wrapper` is `true`, subsequent steps that run `cargo` will produce the following outputs, which you can access via a step `id`:

- `stdout`: The STDOUT stream of the `cargo` command.
- `stderr`: The STDERR stream of the `cargo` command.
- `exitcode`: The exit code of the `cargo` command.

## License

[MIT License](LICENSE)

## Code of Conduct

[Code of Conduct](CODE_OF_CONDUCT.md)
