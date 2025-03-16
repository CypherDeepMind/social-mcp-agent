/**
 * Configuration de journalisation pour l'application
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

// Obtenir le répertoire actuel en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Création du logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: config.app.name },
  transports: [
    // Écriture de tous les logs au format JSON dans le fichier de log
    new winston.transports.File({ 
      filename: path.join('logs', config.logging.filename),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Affichage des logs de niveau 'error' et plus sévères dans la console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
    }),
  ],
});

// Si nous ne sommes pas en production, ajoutons des logs plus détaillés dans la console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Fonction helper pour créer des loggers avec contexte
logger.createSubLogger = function(context) {
  return {
    info: (message, meta = {}) => logger.info(`[${context}] ${message}`, meta),
    error: (message, meta = {}) => logger.error(`[${context}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${context}] ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`[${context}] ${message}`, meta),
    verbose: (message, meta = {}) => logger.verbose(`[${context}] ${message}`, meta),
  };
};

export default logger; 