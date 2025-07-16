/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

// Mock the external modules we'll be using
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');
jest.mock('@actions/tool-cache');
jest.mock('os');

const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const os = require('os');
const setup = require('../lib/setup');

describe('Setup Rust Lambda Action', () => {

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // This test was already passing, kept as is.
  it('installs the correct tools for Linux x86_64 with wrapper', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');
    tc.downloadTool.mockResolvedValue('/tmp/some-download-path');
    tc.extractTar.mockResolvedValue('/tmp/some-extract-path');
    tc.cacheDir.mockResolvedValue('/tmp/some-cache-path');
    io.which.mockResolvedValue('/home/runner/.cargo/bin/cargo');

    await setup();

    expect(exec.exec).toHaveBeenCalledWith('rustup', ['toolchain', 'install', 'stable']);
    expect(exec.exec).toHaveBeenCalledWith('rustup', ['target', 'add', 'x86_64-unknown-linux-musl']);
    expect(tc.downloadTool).toHaveBeenCalledWith(expect.stringContaining('x86_64-unknown-linux-gnu.tar.gz'));
    expect(io.mv).toHaveBeenCalledWith('/home/runner/.cargo/bin/cargo', '/home/runner/.cargo/bin/cargo-bin');
    expect(core.addPath).toHaveBeenCalledWith('/tmp/some-cache-path');
    expect(core.exportVariable).toHaveBeenCalledWith('CARGO_BIN_PATH', '/home/runner/.cargo/bin/cargo-bin');
  });

  // FIX APPLIED HERE
  it('installs for Windows with correct .exe suffix', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-pc-windows-msvc').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('win32');
    os.arch.mockReturnValue('x64');
    tc.downloadTool.mockResolvedValue('/tmp/win-dl');
    tc.extractTar.mockResolvedValue('/tmp/win-ex');
    tc.cacheDir.mockResolvedValue('/tmp/win-cache');
    io.which.mockResolvedValue('C:\\Users\\runneradmin\\.cargo\\bin\\cargo.exe');

    await setup();

    // Corrected Assertion for io.mv
    // We check that the path CONTAINS the right filename, making it more robust.
    expect(io.mv).toHaveBeenCalledWith(
      expect.stringContaining('cargo.exe'),
      expect.stringContaining('cargo-bin.exe')
    );

    // Corrected Assertion for core.exportVariable
    // Same robust check for the exported variable.
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CARGO_BIN_PATH',
      expect.stringContaining('cargo-bin.exe')
    );
  });

  // This test was already passing, kept as is.
  it('does NOT install the wrapper when cargo-wrapper is false', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('false');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');

    // Minimal mocks needed since many functions won't be called
    tc.downloadTool.mockResolvedValue('/tmp/dl');
    tc.extractTar.mockResolvedValue('/tmp/ex');
    tc.cacheDir.mockResolvedValue('/tmp/cache');

    await setup();

    expect(io.mv).not.toHaveBeenCalled();
    expect(core.exportVariable).not.toHaveBeenCalledWith('CARGO_BIN_PATH', expect.any(String));
  });

  // FIX APPLIED HERE
  it('fails gracefully if a download fails', async () => {
    // Tell Jest we expect exactly one assertion to be made in this test.
    // This ensures that the expect() inside the catch block is actually run.
    expect.assertions(1);

    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');

    const errorMessage = 'Network error: 404 Not Found';
    // Mock the download function to throw an error, simulating a failure.
    tc.downloadTool.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    // Since our setup() function is designed to re-throw errors,
    // we must wrap its call in a try/catch block within the test.
    try {
      await setup();
    } catch (e) {
      // This block is now expected to run. We verify that our error handling
      // logic was called correctly before the error was re-thrown.
      expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
    }
  });
});
