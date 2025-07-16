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
  await exec('rustup-init', ['-y', '--default-toolchain', version, '--profile', 'minimal']);

  // Add cargo to the path for this and future steps
  core.addPath(path.join(process.env.HOME, '.cargo', 'bin'));

  await exec('rustup', ['target', 'add', target]);
}

async function installCargoLambda(version) {
  core.debug(`Downloading cargo-lambda version ${version}`);

  const osArch = mapArch(os.arch());
  const osPlatform = mapOS(os.platform());
  const cargoLambdaUrl = `https://github.com/cargo-lambda/cargo-lambda/releases/latest/download/cargo-lambda-${osArch}-${osPlatform}.tar.gz`;

  if (version !== 'latest') {
    // Note: A more robust implementation would fetch release data from the GitHub API
    // to find the correct URL for a specific version.
    core.warning('Only `latest` version is supported for cargo-lambda at this time.');
  }

  core.debug(`Downloading from ${cargoLambdaUrl}`);
  const cargoLambdaPath = await tc.downloadTool(cargoLambdaUrl);

  core.debug('Extracting cargo-lambda tarball');
  const extractedPath = await tc.extractTar(cargoLambdaPath);

  const cachedPath = await tc.cacheDir(extractedPath, 'cargo-lambda', version);
  core.addPath(cachedPath);
  core.debug(`cargo-lambda installed and cached at ${cachedPath}`);
}

async function installWrapper() {
  const cargoPath = await io.which('cargo', true);
  const cargoDir = path.dirname(cargoPath);
  const exeSuffix = os.platform().startsWith('win') ? '.exe' : '';

  // Rename cargo to cargo-bin
  await io.mv(
    path.join(cargoDir, `cargo${exeSuffix}`),
    path.join(cargoDir, `cargo-bin${exeSuffix}`)
  );
  core.debug('Renamed cargo to cargo-bin');

  // Install our wrapper script as `cargo`
  const wrapperSource = path.resolve(__dirname, '..', 'wrapper', 'dist', 'index.js');
  const wrapperTarget = path.join(cargoDir, `cargo${exeSuffix.length > 0 ? '' : 'cargo'}`); // Simplified for non-windows
  await io.cp(wrapperSource, wrapperTarget);
  await exec('chmod', ['+x', wrapperTarget]);
  core.debug(`Copied wrapper to ${wrapperTarget}`);

  // Export path for the wrapper to find the real binary
  core.exportVariable('CARGO_BIN_PATH', path.join(cargoDir, `cargo-bin${exeSuffix}`));
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
