// Performance logging middleware — fixed double-log bug
export const performanceLogger = (req, res, next) => {
  const start = Date.now();
  let logged = false;

  const logOnce = () => {
    if (logged) return;
    logged = true;
    const duration = Date.now() - start;
    // Only log if >300ms (reduce noise)
    if (duration > 300) {
      console.log(`⚠️  SLOW [${req.method}] ${req.path} - ${duration}ms`);
    }
  };

  // Override finish event instead of intercepting send/json (avoids double-log)
  res.on('finish', logOnce);

  next();
};
