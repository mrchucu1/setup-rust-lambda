/**
 * Copyright (c) Diego Navarro
 * SPDX-License-Identifier: MIT
 */

class OutputListener {
  constructor (streamWriter) {
    this._buff = [];
    this._streamWriter = streamWriter;
  }

  get listener () {
    const listen = function listen (data) {
      this._buff.push(data);
      if (this._streamWriter) {
        this._streamWriter.write(data);
      }
    };
    return listen.bind(this);
  }

  get contents () {
    return this._buff
      .map(chunk => chunk.toString())
      .join('');
  }
}

module.exports = OutputListener;
