/**
 * Logger simple para frontend (sin Winston)
 * Solo usa console para avoid bundling issues
 */

const logger = {
  info: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${message}`, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },
  
  critical: (message, meta = {}) => {
    console.error(`[CRITICAL] ${message}`, meta);
  }
};

export default logger;
