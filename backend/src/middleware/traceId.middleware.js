const { runWithTrace, newTraceId } = require('../lib/traceContext');

function traceIdMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || newTraceId();
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  runWithTrace(traceId, () => next());
}

module.exports = traceIdMiddleware;
