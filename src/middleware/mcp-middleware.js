/**
 * Middleware MCP - Couche d'interopérabilité entre les sous-agents
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import config from '../config/config.js';
import loggerModule from '../utils/logger.js';

const logger = loggerModule.createSubLogger('MCP-Middleware');

class McpMiddleware {
  constructor() {
    this.server = null;
    this.transport = null;
    this.app = express();
    this.agents = new Map();
    this.initialized = false;
    this.contextManager = new ContextManager();
    this.messageRouter = new MessageRouter();
    this.capabilityRegistry = new CapabilityRegistry();
  }

  /**
   * Initialise le middleware MCP
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Middleware MCP déjà initialisé');
      return;
    }

    logger.info('Initialisation du middleware MCP');

    // Création du serveur MCP
    this.server = new McpServer({
      name: config.app.name,
      version: config.app.version
    }, {
      capabilities: {
        tools: true,
        resources: true,
      }
    });

    // Initialisation des gestionnaires
    this.contextManager.initialize();
    this.messageRouter.initialize(this.server);
    this.capabilityRegistry.initialize(this.server);

    // Configuration de l'express pour SSE si nécessaire
    if (config.mcp.transport === 'sse') {
      this.app.use(express.json());
      
      this.app.get('/sse', async (req, res) => {
        logger.info('Nouvelle connexion SSE reçue');
        this.transport = new SSEServerTransport('/messages', res);
        await this.server.connect(this.transport);
      });
      
      this.app.post('/messages', async (req, res) => {
        if (this.transport) {
          await this.transport.handlePostMessage(req, res);
        } else {
          res.status(500).json({ error: 'Transport non initialisé' });
        }
      });
      
      // Démarrage du serveur HTTP
      this.app.listen(config.mcp.port, config.mcp.host, () => {
        logger.info(`Serveur MCP démarré sur http://${config.mcp.host}:${config.mcp.port}`);
      });
    } else {
      // Transport stdio par défaut
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      logger.info('Transport stdio initialisé');
    }

    this.initialized = true;
    logger.info('Middleware MCP initialisé avec succès');
  }

  /**
   * Enregistre un agent dans le middleware
   * @param {string} id - Identifiant unique de l'agent
   * @param {object} agent - Instance de l'agent à enregistrer
   */
  registerAgent(id, agent) {
    if (this.agents.has(id)) {
      logger.warn(`Agent avec l'ID ${id} déjà enregistré, sera remplacé`);
    }
    
    this.agents.set(id, agent);
    
    // Enregistrement des capacités de l'agent
    if (agent.getTools && typeof agent.getTools === 'function') {
      const tools = agent.getTools();
      tools.forEach(tool => {
        this.capabilityRegistry.registerTool(tool);
      });
    }
    
    if (agent.getResources && typeof agent.getResources === 'function') {
      const resources = agent.getResources();
      resources.forEach(resource => {
        this.capabilityRegistry.registerResource(resource);
      });
    }
    
    logger.info(`Agent '${id}' enregistré avec succès`);
  }

  /**
   * Désenregistre un agent du middleware
   * @param {string} id - Identifiant de l'agent à désenregistrer
   */
  unregisterAgent(id) {
    if (!this.agents.has(id)) {
      logger.warn(`Aucun agent trouvé avec l'ID ${id}`);
      return;
    }
    
    const agent = this.agents.get(id);
    
    // Désenregistrement des capacités de l'agent
    if (agent.getTools && typeof agent.getTools === 'function') {
      const tools = agent.getTools();
      tools.forEach(tool => {
        this.capabilityRegistry.unregisterTool(tool.name);
      });
    }
    
    if (agent.getResources && typeof agent.getResources === 'function') {
      const resources = agent.getResources();
      resources.forEach(resource => {
        this.capabilityRegistry.unregisterResource(resource.name);
      });
    }
    
    this.agents.delete(id);
    logger.info(`Agent '${id}' désenregistré avec succès`);
  }

  /**
   * Ferme proprement le middleware MCP
   */
  async shutdown() {
    logger.info('Arrêt du middleware MCP');
    
    // Fermeture du serveur MCP
    if (this.server) {
      await this.server.shutdown();
    }
    
    // Fermeture du transport
    if (this.transport) {
      await this.transport.close();
    }
    
    this.initialized = false;
    logger.info('Middleware MCP arrêté avec succès');
  }
}

/**
 * Gestionnaire de contexte pour le middleware MCP
 */
class ContextManager {
  constructor() {
    this.sharedContext = {};
    this.logger = loggerModule.createSubLogger('ContextManager');
  }

  initialize() {
    this.logger.info('Gestionnaire de contexte initialisé');
  }

  /**
   * Définit une valeur dans le contexte partagé
   * @param {string} key - Clé du contexte
   * @param {any} value - Valeur à stocker
   */
  setContext(key, value) {
    this.sharedContext[key] = value;
    this.logger.debug(`Contexte '${key}' défini`);
  }

  /**
   * Récupère une valeur du contexte partagé
   * @param {string} key - Clé du contexte
   * @returns {any} La valeur stockée ou undefined
   */
  getContext(key) {
    return this.sharedContext[key];
  }

  /**
   * Supprime une valeur du contexte partagé
   * @param {string} key - Clé du contexte à supprimer
   */
  deleteContext(key) {
    delete this.sharedContext[key];
    this.logger.debug(`Contexte '${key}' supprimé`);
  }
}

/**
 * Routeur de messages pour le middleware MCP
 */
class MessageRouter {
  constructor() {
    this.routes = new Map();
    this.logger = loggerModule.createSubLogger('MessageRouter');
  }

  initialize(server) {
    this.server = server;
    this.logger.info('Routeur de messages initialisé');
  }

  /**
   * Enregistre une route pour un type de message
   * @param {string} method - Méthode JSON-RPC
   * @param {Function} handler - Gestionnaire de la route
   */
  registerRoute(method, handler) {
    this.routes.set(method, handler);
    this.logger.debug(`Route '${method}' enregistrée`);
  }

  /**
   * Achemine un message vers son gestionnaire approprié
   * @param {Object} message - Message JSON-RPC
   * @returns {Promise<Object>} Réponse au message
   */
  async routeMessage(message) {
    const { method } = message;
    
    if (!this.routes.has(method)) {
      this.logger.warn(`Aucune route trouvée pour la méthode '${method}'`);
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Méthode '${method}' non trouvée`
        }
      };
    }
    
    const handler = this.routes.get(method);
    try {
      return await handler(message);
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de la méthode '${method}': ${error.message}`);
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: `Erreur interne: ${error.message}`
        }
      };
    }
  }
}

/**
 * Registre des capacités pour le middleware MCP
 */
class CapabilityRegistry {
  constructor() {
    this.tools = new Map();
    this.resources = new Map();
    this.logger = loggerModule.createSubLogger('CapabilityRegistry');
  }

  initialize(server) {
    this.server = server;
    
    // Enregistrement des gestionnaires pour les capacités en utilisant les méthodes disponibles
    this.server.setToolRequestHandlers({
      list: async () => {
        return { tools: Array.from(this.tools.values()) };
      },
      call: async (params) => {
        const { name, params: toolParams } = params;
        if (!this.tools.has(name)) {
          throw new Error(`Outil '${name}' non trouvé`);
        }
        
        const tool = this.tools.get(name);
        try {
          return await tool.handler(toolParams);
        } catch (error) {
          this.logger.error(`Erreur lors de l'exécution de l'outil '${name}': ${error.message}`);
          return {
            isError: true,
            content: {
              message: `Erreur: ${error.message}`
            }
          };
        }
      }
    });
    
    this.server.setResourceRequestHandlers({
      list: async () => {
        return { resources: Array.from(this.resources.values()) };
      },
      get: async (params) => {
        const { name, params: resourceParams } = params;
        if (!this.resources.has(name)) {
          throw new Error(`Ressource '${name}' non trouvée`);
        }
        
        const resource = this.resources.get(name);
        try {
          return await resource.handler(resourceParams);
        } catch (error) {
          this.logger.error(`Erreur lors de la récupération de la ressource '${name}': ${error.message}`);
          throw error;
        }
      }
    });
    
    this.logger.info('Registre des capacités initialisé');
  }

  /**
   * Enregistre un outil dans le registre
   * @param {Object} tool - Définition de l'outil
   */
  registerTool(tool) {
    if (!tool.name || !tool.handler) {
      throw new Error('Un outil doit avoir un nom et un gestionnaire');
    }
    
    this.tools.set(tool.name, tool);
    this.logger.debug(`Outil '${tool.name}' enregistré`);
  }

  /**
   * Supprime un outil du registre
   * @param {string} name - Nom de l'outil à supprimer
   */
  unregisterTool(name) {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      this.logger.debug(`Outil '${name}' désenregistré`);
    }
  }

  /**
   * Enregistre une ressource dans le registre
   * @param {Object} resource - Définition de la ressource
   */
  registerResource(resource) {
    if (!resource.name || !resource.handler) {
      throw new Error('Une ressource doit avoir un nom et un gestionnaire');
    }
    
    this.resources.set(resource.name, resource);
    this.logger.debug(`Ressource '${resource.name}' enregistrée`);
  }

  /**
   * Supprime une ressource du registre
   * @param {string} name - Nom de la ressource à supprimer
   */
  unregisterResource(name) {
    if (this.resources.has(name)) {
      this.resources.delete(name);
      this.logger.debug(`Ressource '${name}' désenregistrée`);
    }
  }
}

// Exporter une instance singleton du middleware
const mcpMiddleware = new McpMiddleware();
export default mcpMiddleware; 