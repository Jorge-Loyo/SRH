const winston = require('winston');
require('winston-daily-rotate-file'); // 🔴 Rotación automática de logs

/**
 * Centralized production-ready logger using Winston
 * 
 * Behavior:
 * - Development: Human-readable console output with colors
 * - Production: JSON structured logs (for log aggregators like ELK, Datadog)
 *   + ROTACIÓN AUTOMÁTICA: logs guardados en archivos con rotación diaria
 *   + Retention: mantiene logs de los últimos 14 días
 * - Levels: error (0) > warn (1) > info (2) > http (3) > debug (4)
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('Database connection failed', { error: err.message });
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Console format for development (human-readable with colors)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  })
);

// JSON format for production (structured logs)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 🔴 ROTACIÓN DE LOGS EN PRODUCCIÓN
// Evita que logs.txt crezca indefinidamente y llene el disco
const transports = [
  new winston.transports.Console({
    stderrLevels: ['error'], // Errors go to stderr
  })
];

// En producción: agregar transporte con rotación diaria
if (!isDevelopment) {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m', // Rotar si el archivo supera 100MB
      maxFiles: '14d', // Mantener logs de los últimos 14 días
      zippedArchive: true, // Comprimir logs antiguos
      format: jsonFormat
    })
  );
  
  // Archivo separado para errores críticos
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: 'logs/errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d', // Errores se mantienen 30 días
      zippedArchive: true,
      level: 'error',
      format: jsonFormat
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: isDevelopment ? consoleFormat : jsonFormat,
  defaultMeta: { service: 'salud-api' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

module.exports = logger;
