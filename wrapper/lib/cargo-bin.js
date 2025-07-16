/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

// This simply returns the path to the real binary, which was
// exported as an environment variable by the main setup script.
module.exports = process.env.CARGO_BIN_PATH;
