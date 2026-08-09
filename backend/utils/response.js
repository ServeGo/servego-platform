export function sendApiError(res, status, code, message, details = null) {
  // A request-timeout middleware may have already sent a 504 while a slow
  // handler was still running. Sending again throws ERR_HTTP_HEADERS_SENT.
  if (res.headersSent) return;
  // Controllers may log raw ORM errors, but those details must never cross the
  // API boundary on a server failure.
  const safeDetails = status >= 500 ? null : details;
  return res.status(status).json({ success: false, code, message, details: safeDetails });
}

export function sendApiSuccess(res, status, data, meta = null) {
  if (res.headersSent) return;
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}
