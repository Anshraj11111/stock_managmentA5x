// Performance logging middleware
export const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override send to log response time
  const logResponse = () => {
    const duration = Date.now() - start;
    
    // Only log slow requests (>200ms) or specific routes
    const shouldLog = duration > 200 || 
                     req.path.includes('/bill') || 
                     req.path.includes('/staff') ||
                     req.path.includes('/payment');
    
    if (shouldLog) {
      console.log(`[${req.method}] ${req.path} - ${duration}ms`);
    }
  };
  
  res.send = function(data) {
    logResponse();
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse();
    return originalJson.call(this, data);
  };
  
  next();
};
