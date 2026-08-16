/** Central error handler + 404. */
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.expose || status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
