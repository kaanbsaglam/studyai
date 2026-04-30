const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const store = new AsyncLocalStorage();

function runWithTrace(traceId, fn) {
  return store.run({ traceId }, fn);
}

function currentTraceId() {
  return store.getStore()?.traceId;
}

function newTraceId() {
  return uuidv4();
}

module.exports = { runWithTrace, currentTraceId, newTraceId };
