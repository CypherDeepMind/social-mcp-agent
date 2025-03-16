/**
 * Point d'entrée principal de l'application
 * Initialise et orchestre tous les agents via le middleware MCP
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from './utils/logger.js';
import mcpMiddleware from './middleware/mcp-middleware.js';
import ContentAnalysisAgent from './agents/content-analysis-agent.js';
// Importer les autres agents à mesure qu'ils sont implémentés

// Obtenir le répertoire actuel en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le répertoire de logs s'il n'existe pas
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Classe principale de l'application
 */
class SocialMcpAgentApp {
  constructor() {
    this.agents = new Map();
    this.logger = logger.createSubLogger('App');
    this.initialized = false;
    this.started = false;
  }

  /**
   * Initialise l'application et ses composants
   */
  async initialize() {
    if (this.initialized) {
      this.logger.warn('L\'application est déjà initialisée');
      return;
    }

    this.logger.info('Initialisation de l\'application Social MCP Agent');

    // Initialiser le middleware MCP
    await mcpMiddleware.initialize();

    // Créer et initialiser les agents
    await this.initializeAgents();

    this.initialized = true;
    this.logger.info('Application initialisée avec succès');
  }

  /**
   * Initialise tous les agents
   */
  async initializeAgents() {
    this.logger.info('Initialisation des agents');

    // Créer et initialiser l'agent d'analyse de contenu
    const contentAnalysisAgent = new ContentAnalysisAgent();
    await contentAnalysisAgent.initialize();
    this.agents.set(contentAnalysisAgent.id, contentAnalysisAgent);
    mcpMiddleware.registerAgent(contentAnalysisAgent.id, contentAnalysisAgent);

    // Ajouter l'initialisation des autres agents au fur et à mesure qu'ils sont implémentés
    // Exemple :
    // const trendsAgent = new TrendsAgent();
    // await trendsAgent.initialize();
    // this.agents.set(trendsAgent.id, trendsAgent);
    // mcpMiddleware.registerAgent(trendsAgent.id, trendsAgent);

    this.logger.info(`${this.agents.size} agent(s) initialisé(s)`);
  }

  /**
   * Démarre l'application et ses composants
   */
  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.started) {
      this.logger.warn('L\'application est déjà démarrée');
      return;
    }

    this.logger.info('Démarrage de l\'application Social MCP Agent');

    // Démarrer tous les agents
    for (const [id, agent] of this.agents.entries()) {
      this.logger.info(`Démarrage de l'agent '${id}'`);
      await agent.start();
    }

    // Configuration de la gestion des événements d'application
    this.setupEventHandlers();

    this.started = true;
    this.logger.info('Application démarrée avec succès');
  }

  /**
   * Configure les gestionnaires d'événements inter-agents
   */
  setupEventHandlers() {
    // Configuration des événements entre agents ici
    // Par exemple, l'agent tendances pourrait écouter les analyses de l'agent de contenu

    // Exemple pour l'agent d'analyse de contenu
    const contentAnalysisAgent = this.agents.get('content-analysis');
    if (contentAnalysisAgent) {
      contentAnalysisAgent.on('analysis-completed', (data) => {
        this.logger.debug(`Analyse complétée: ${data.type} (ID: ${data.taskId})`);
        
        // Notifier les autres agents qui pourraient être intéressés
        this.notifyAgents('analysis-event', data, [contentAnalysisAgent.id]);
      });
    }
  }

  /**
   * Notifie tous les agents (sauf ceux exclus) d'un événement
   * @param {string} eventType - Type d'événement
   * @param {object} data - Données de l'événement
   * @param {array} excludeAgentIds - IDs des agents à exclure de la notification
   */
  notifyAgents(eventType, data, excludeAgentIds = []) {
    for (const [id, agent] of this.agents.entries()) {
      if (!excludeAgentIds.includes(id) && agent.running) {
        // Émettre l'événement pour chaque agent
        agent.emit(eventType, data);
        this.logger.debug(`Agent '${id}' notifié de l'événement '${eventType}'`);
      }
    }
  }

  /**
   * Arrête l'application et ses composants
   */
  async stop() {
    if (!this.started) {
      this.logger.warn('L\'application n\'est pas démarrée');
      return;
    }

    this.logger.info('Arrêt de l\'application Social MCP Agent');

    // Arrêter tous les agents dans l'ordre inverse de démarrage
    const agentIds = Array.from(this.agents.keys());
    for (let i = agentIds.length - 1; i >= 0; i--) {
      const id = agentIds[i];
      const agent = this.agents.get(id);
      
      this.logger.info(`Arrêt de l'agent '${id}'`);
      await agent.stop();
    }

    // Arrêter le middleware MCP
    await mcpMiddleware.shutdown();

    this.started = false;
    this.logger.info('Application arrêtée avec succès');
  }
}

// Création de l'instance de l'application
const app = new SocialMcpAgentApp();

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', async () => {
  logger.info('Signal SIGINT reçu, arrêt de l\'application...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu, arrêt de l\'application...');
  await app.stop();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error(`Erreur non capturée: ${error.message}`, { stack: error.stack });
  // Arrêt d'urgence de l'application
  app.stop().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Rejet de promesse non géré: ${reason}`, { reason });
  // Dans un environnement de production, on pourrait choisir de continuer
  // mais en développement, mieux vaut arrêter pour corriger les problèmes
  app.stop().finally(() => process.exit(1));
});

// Démarrer l'application directement
app.start().catch(error => {
  logger.error(`Erreur lors du démarrage de l'application: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

export default app; 