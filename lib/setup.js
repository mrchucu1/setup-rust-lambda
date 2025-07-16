/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

const os = require('os');
const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const { exec } = require('@actions/exec');

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [aarch64, x86_64]
function mapArch(arch) {
  const mappings = {
    x64: 'x86_64',
    arm64: 'aarch64'
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [apple-darwin, unknown-linux-gnu, pc-windows-msvc]
function mapOS(os) {
  const mappings = {
    darwin: 'apple-darwin',
    linux: 'unknown-linux-gnu',
    win32: 'pc-windows-msvc'
  };
  return mappings[os] || os;
}

async function installRustToolchain(version, target) {
  core.debug(`Installing Rust toolchain ${version} with target ${target}`);
  // Install rustup-init script first, if not present
  try {
    await io.which('rustup-init', true);
  } catch (e) {
    const rustupInitPath = await tc.downloadTool('https://sh.rustup.rs');
    await exec('chmod', ['+x', rustupInitPath]);
    await exec(rustupInitPath, ['-y', '--default-toolchain', 'none', '--profile', 'minimal']);
    core.addPath(path.join(process.env.HOME, '.cargo', 'bin'));
  }

  // Now use rustup to install the toolchain and target
  await exec('rustup', ['toolchain', 'install', version]);
  await exec('rustup', ['default', version]);
  await exec('rustup', ['target', 'add', target]);
}

async function installCargoLambda(version) {
  core.debug(`Downloading cargo-lambda version ${version}`);

  const osArch = mapArch(os.arch());
  const osPlatform = mapOS(os.platform());

  // Example URL: https://github.com/cargo-lambda/cargo-lambda/releases/latest/download/cargo-lambda-x86_64-unknown-linux-gnu.tar.gz
  let cargoLambdaUrl = `https://github.com/cargo-lambda/cargo-lambda/releases/latest/download/cargo-lambda-${osArch}-${osPlatform}.tar.gz`;

  if (version !== 'latest') {
    // A specific version URL would look like: .../releases/download/vX.Y.Z/...
    cargoLambdaUrl = `https://github.com/cargo-lambda/cargo-lambda/releases/download/v${version}/cargo-lambda-v${version}-${osArch}-${osPlatform}.tar.gz`;
  }

  core.debug(`Downloading from ${cargoLambdaUrl}`);
  const cargoLambdaPath = await tc.downloadTool(cargoLambdaUrl);

  core.debug('Extracting cargo-lambda tarball');
  const extractedPath = await tc.extractTar(cargoLambdaPath);

  // The binary is inside the extracted directory
  const binPath = path.join(extractedPath);
  const cachedPath = await tc.cacheDir(binPath, 'cargo-lambda', version);
  core.addPath(cachedPath);
  core.debug(`cargo-lambda installed and cached at ${cachedPath}`);
}

async function installWrapper() {
  const cargoPath = await io.which('cargo', true);
  const cargoDir = path.dirname(cargoPath);
  const exeSuffix = os.platform().startsWith('win') ? '.exe' : '';

  // Rename cargo to cargo-bin
  const source = path.join(cargoDir, `cargo${exeSuffix}`);
  const target = path.join(cargoDir, `cargo-bin${exeSuffix}`);
  await io.mv(source, target);
  core.debug(`Renamed ${source} to ${target}`);

  // Install our wrapper script as `cargo`
  const wrapperSource = path.resolve(__dirname, '..', 'wrapper', 'dist', 'index.js');
  // On Windows, the wrapper will be named 'cargo'. On Linux/macOS it will also be 'cargo'.
  const wrapperTarget = path.join(cargoDir, 'cargo');
  await io.cp(wrapperSource, wrapperTarget);

  if (os.platform() !== 'win32') {
    await exec('chmod', ['+x', wrapperTarget]);
  }

  core.debug(`Copied wrapper to ${wrapperTarget}`);

  // Export path for the wrapper to find the real binary
  core.exportVariable('CARGO_BIN_PATH', target);
}

async function run() {
  try {
    const rustVersion = core.getInput('rust-version');
    const rustTarget = core.getInput('rust-target');
    const cargoLambdaVersion = core.getInput('cargo-lambda-version');
    const cargoWrapper = core.getInput('cargo-wrapper') === 'true';

    await installRustToolchain(rustVersion, rustTarget);
    await installCargoLambda(cargoLambdaVersion);

    if (cargoWrapper) {
      await installWrapper();
    }
  } catch (error) {
    core.setFailed(error.message);
    throw error;
  }
}

module.exports = run;
