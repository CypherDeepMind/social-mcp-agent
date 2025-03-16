/**
 * Agent Twitter
 * Responsable de l'interaction avec l'API Twitter
 */

import BaseAgent from './base-agent.js';
import config from '../config/config.js';

class TwitterAgent extends BaseAgent {
  constructor(agentConfig = {}) {
    super('twitter', { ...config.socialAPIs.twitter, ...agentConfig });
    this.logger.info('Agent Twitter créé');
  }

  async initialize() {
    await super.initialize();
    this.registerTool({
      name: 'search_tweets',
      description: 'Recherche des tweets',
      handler: this.searchTweets.bind(this)
    });
  }
  
  async searchTweets(params) {
    return { success: true, content: [] };
  }
}

export default TwitterAgent;