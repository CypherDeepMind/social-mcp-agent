/**
 * Agent de base - Classe abstraite pour tous les agents
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

class BaseAgent extends EventEmitter {
  /**
   * Constructeur de l'agent de base
   * @param {string} id - Identifiant unique de l'agent
   * @param {object} config - Configuration de l'agent
   */
  constructor(id, config) {
    super();
    this.id = id;
    this.config = config;
    this.tools = [];
    this.resources = [];
    this.running = false;
    this.logger = logger.createSubLogger(`Agent-${id}`);
    this.logger.info(`Agent '${id}' créé`);
  }

  /**
   * Méthode d'initialisation de l'agent
   * À surcharger dans les classes filles
   */
  async initialize() {
    this.logger.info(`Initialisation de l'agent '${this.id}'`);
    // À implémenter dans les sous-classes
  }

  /**
   * Méthode de démarrage de l'agent
   * À surcharger dans les classes filles
   */
  async start() {
    if (this.running) {
      this.logger.warn(`L'agent '${this.id}' est déjà en cours d'exécution`);
      return;
    }
    
    try {
      await this.initialize();
      this.running = true;
      this.logger.info(`Agent '${this.id}' démarré`);
      this.emit('started');
    } catch (error) {
      this.logger.error(`Erreur lors du démarrage de l'agent '${this.id}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Méthode d'arrêt de l'agent
   * À surcharger dans les classes filles
   */
  async stop() {
    if (!this.running) {
      this.logger.warn(`L'agent '${this.id}' n'est pas en cours d'exécution`);
      return;
    }
    
    try {
      // Code d'arrêt à implémenter dans les sous-classes
      this.running = false;
      this.logger.info(`Agent '${this.id}' arrêté`);
      this.emit('stopped');
    } catch (error) {
      this.logger.error(`Erreur lors de l'arrêt de l'agent '${this.id}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Enregistre un outil fourni par l'agent
   * @param {object} tool - Définition de l'outil
   */
  registerTool(tool) {
    // Validation basique
    if (!tool.name || !tool.description || !tool.handler) {
      throw new Error('Un outil doit avoir un nom, une description et un gestionnaire');
    }
    
    // Ajouter l'ID de l'agent à l'outil pour le suivi
    const toolWithAgent = {
      ...tool,
      agentId: this.id
    };
    
    this.tools.push(toolWithAgent);
    this.logger.debug(`Outil '${tool.name}' enregistré par l'agent '${this.id}'`);
    this.emit('tool-registered', toolWithAgent);
    
    return toolWithAgent;
  }

  /**
   * Enregistre une ressource fournie par l'agent
   * @param {object} resource - Définition de la ressource
   */
  registerResource(resource) {
    // Validation basique
    if (!resource.name || !resource.description || !resource.handler) {
      throw new Error('Une ressource doit avoir un nom, une description et un gestionnaire');
    }
    
    // Ajouter l'ID de l'agent à la ressource pour le suivi
    const resourceWithAgent = {
      ...resource,
      agentId: this.id
    };
    
    this.resources.push(resourceWithAgent);
    this.logger.debug(`Ressource '${resource.name}' enregistrée par l'agent '${this.id}'`);
    this.emit('resource-registered', resourceWithAgent);
    
    return resourceWithAgent;
  }

  /**
   * Retourne la liste des outils fournis par l'agent
   * @returns {array} Liste des outils
   */
  getTools() {
    return this.tools;
  }

  /**
   * Retourne la liste des ressources fournies par l'agent
   * @returns {array} Liste des ressources
   */
  getResources() {
    return this.resources;
  }

  /**
   * Gère un message reçu par l'agent
   * @param {object} message - Message à traiter
   * @returns {Promise<object>} Réponse au message
   */
  async handleMessage(message) {
    this.logger.debug(`Message reçu par l'agent '${this.id}': ${JSON.stringify(message)}`);
    // À implémenter dans les sous-classes
    throw new Error('La méthode handleMessage doit être implémentée par les sous-classes');
  }

  /**
   * Envoie un message à un autre agent via le middleware
   * @param {string} targetAgentId - ID de l'agent cible
   * @param {string} type - Type de message
   * @param {object} payload - Contenu du message
   */
  async sendMessage(targetAgentId, type, payload) {
    const message = {
      from: this.id,
      to: targetAgentId,
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    
    this.logger.debug(`Envoi d'un message de type '${type}' à l'agent '${targetAgentId}'`);
    this.emit('message-sent', message);
    
    // La logique d'envoi réel sera gérée par le middleware MCP
    return message;
  }
}

export default BaseAgent; 