function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Not found' });
}

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // keep response safe
  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };

