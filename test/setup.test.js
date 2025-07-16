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
const path = require('path'); // Import the path module
const setup = require('../lib/setup');

describe('Setup Rust Lambda Action', () => {

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // FIX APPLIED HERE
  it('installs the correct tools for Linux x86_64 with wrapper', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');
    tc.downloadTool.mockResolvedValue('/tmp/some-download-path');
    tc.extractTar.mockResolvedValue('/tmp/some-extract-path');
    tc.cacheDir.mockResolvedValue('/tmp/some-cache-path');
    // Use path.join to create a platform-correct path for the mock
    const mockCargoPath = path.join('/home/runner', '.cargo', 'bin', 'cargo');
    io.which.mockResolvedValue(mockCargoPath);

    await setup();

    expect(exec.exec).toHaveBeenCalledWith('rustup', ['toolchain', 'install', 'stable']);
    expect(exec.exec).toHaveBeenCalledWith('rustup', ['target', 'add', 'x86_64-unknown-linux-musl']);
    expect(tc.downloadTool).toHaveBeenCalledWith(expect.stringContaining('x86_64-unknown-linux-gnu.tar.gz'));

    // Corrected, platform-agnostic assertions
    expect(io.mv).toHaveBeenCalledWith(
        expect.stringContaining(path.join('bin', 'cargo')),
        expect.stringContaining(path.join('bin', 'cargo-bin'))
    );
    expect(core.addPath).toHaveBeenCalledWith('/tmp/some-cache-path');
    expect(core.exportVariable).toHaveBeenCalledWith(
        'CARGO_BIN_PATH',
        expect.stringContaining(path.join('bin', 'cargo-bin'))
    );
  });

  it('installs for Windows with correct .exe suffix', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-pc-windows-msvc').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('win32');
    os.arch.mockReturnValue('x64');
    tc.downloadTool.mockResolvedValue('/tmp/win-dl');
    tc.extractTar.mockResolvedValue('/tmp/win-ex');
    tc.cacheDir.mockResolvedValue('/tmp/win-cache');
    const mockCargoPath = path.join('C:', 'Users', 'runneradmin', '.cargo', 'bin', 'cargo.exe');
    io.which.mockResolvedValue(mockCargoPath);

    await setup();

    expect(io.mv).toHaveBeenCalledWith(
      expect.stringContaining('cargo.exe'),
      expect.stringContaining('cargo-bin.exe')
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CARGO_BIN_PATH',
      expect.stringContaining('cargo-bin.exe')
    );
  });

  it('does NOT install the wrapper when cargo-wrapper is false', async () => {
    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('false');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');
    tc.downloadTool.mockResolvedValue('/tmp/dl');
    tc.extractTar.mockResolvedValue('/tmp/ex');
    tc.cacheDir.mockResolvedValue('/tmp/cache');

    await setup();

    expect(io.mv).not.toHaveBeenCalled();
    expect(core.exportVariable).not.toHaveBeenCalledWith('CARGO_BIN_PATH', expect.any(String));
  });

  it('fails gracefully if a download fails', async () => {
    expect.assertions(1);

    core.getInput.mockReturnValueOnce('stable').mockReturnValueOnce('x86_64-unknown-linux-musl').mockReturnValueOnce('latest').mockReturnValueOnce('true');
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x64');

    const errorMessage = 'Network error: 404 Not Found';
    tc.downloadTool.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    try {
      await setup();
    } catch (e) {
      expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
    }
  });
});
