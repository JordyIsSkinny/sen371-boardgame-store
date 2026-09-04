function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startTime,
    };

    console.log(JSON.stringify(log));
  });

  next();
}

export default requestLogger;
