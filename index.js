/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

const core = require('@actions/core');
const setup = require('./lib/setup');

(async () => {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
