#!/usr/bin/env node
/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

const core = require('@actions/core');
const { exec } = require('@actions/exec');

const OutputListener = require('./lib/output-listener');
const pathToCLI = require('./lib/cargo-bin');

(async () => {
  // Create listeners to receive output (in memory) and stream to the live log
  const stdout = new OutputListener(process.stdout);
  const stderr = new OutputListener(process.stderr);
  const listeners = {
    stdout: stdout.listener,
    stderr: stderr.listener
  };

  // Execute `cargo` and capture output
  const args = process.argv.slice(2);
  const options = {
    listeners,
    ignoreReturnCode: true,
    silent: true // Prevents the command itself from being printed to stdout
  };
  const exitCode = await exec(pathToCLI, args, options);

  // Set standard action outputs
  core.setOutput('stdout', stdout.contents);
  core.setOutput('stderr', stderr.contents);
  core.setOutput('exitcode', exitCode.toString(10));

  if (exitCode !== 0) {
    // A non-zero exit code is not a failure of the action itself,
    // but of the command that was run. The user's workflow can
    // decide how to handle it (e.g., using `continue-on-error: true`).
    // We can still log it for visibility.
    core.debug(`cargo command exited with code ${exitCode}.`);
  }
})();
