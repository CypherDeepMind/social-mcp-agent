/**
 * Configuration principale pour le système multi-agents dédié aux réseaux sociaux
 */

// Configuration de base
const config = {
  // Informations sur l'application
  app: {
    name: 'Social MCP Agent',
    version: '1.0.0',
    description: 'Agent IA multi-agents pour les réseaux sociaux basé sur MCP'
  },

  // Configuration des sous-agents
  agents: {
    contentAnalysis: {
      name: 'agent-analyse-contenu',
      description: 'Analyse le contenu des réseaux sociaux (texte, images, vidéos)',
      models: {
        text: 'gpt-4',
        image: 'vision-model'
      }
    },
    trendsAgent: {
      name: 'agent-tendances',
      description: 'Surveille et identifie les tendances sur les réseaux sociaux',
      refreshInterval: 15 * 60 * 1000, // 15 minutes en millisecondes
    },
    engagementAgent: {
      name: 'agent-engagement',
      description: 'Optimise les interactions et les réponses',
      responseTime: 5 * 60 * 1000, // 5 minutes en millisecondes
    },
    personalizationAgent: {
      name: 'agent-personnalisation',
      description: 'Adapte le contenu aux préférences individuelles',
    },
    planningAgent: {
      name: 'agent-planification',
      description: 'Gère les calendriers de publication',
    },
    ethicsAgent: {
      name: 'agent-ethique',
      description: 'Surveille la conformité aux valeurs et règles',
      strictnessLevel: 'medium', // low, medium, high
    }
  },

  // Configuration MCP
  mcp: {
    port: process.env.MCP_PORT || 3000,
    host: process.env.MCP_HOST || 'localhost',
    transport: process.env.MCP_TRANSPORT || 'stdio', // stdio ou sse
  },

  // Configuration des API des réseaux sociaux
  socialAPIs: {
    twitter: {
      enabled: true,
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
    instagram: {
      enabled: false,
      apiKey: process.env.INSTAGRAM_API_KEY,
      apiSecret: process.env.INSTAGRAM_API_SECRET
    },
    linkedin: {
      enabled: false,
      apiKey: process.env.LINKEDIN_API_KEY,
      apiSecret: process.env.LINKEDIN_API_SECRET
    },
    facebook: {
      enabled: false,
      apiKey: process.env.FACEBOOK_API_KEY,
      apiSecret: process.env.FACEBOOK_API_SECRET
    }
  },

  // Paramètres de journalisation
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filename: 'social-mcp-agent.log'
  }
};

export default config; 