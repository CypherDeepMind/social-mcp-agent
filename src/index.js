/**
 * Point d'entrée principal de l'application
 * Initialise et orchestre tous les agents via le middleware MCP
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from './utils/logger.js';
import mcpMiddleware from './middleware/mcp-middleware.js';
import ContentAnalysisAgent from './agents/content-analysis-agent.js';
import TwitterAgent from './agents/twitter-agent.js';
// Importer les autres agents à mesure qu'ils sont implémentés

// Charger les variables d'environnement
dotenv.config();

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware pour les logs
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Initialisation des agents
const agents = {
  contentAnalysis: new ContentAnalysisAgent(),
  twitter: new TwitterAgent({
    apiKey: process.env.TWITTER_API_KEY,
    apiSecretKey: process.env.TWITTER_API_SECRET_KEY,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  })
};

// Stockage des états des agents
let agentStatus = {
  contentAnalysis: false,
  twitter: false
};

// Démarrer les agents
async function startAgent(name) {
  if (agents[name]) {
    try {
      const agent = agents[name];
      await agent.start();
      logger.info(`Agent ${name} démarré`);
      agentStatus[name] = true;
      return true;
    } catch (error) {
      logger.error(`Erreur lors du démarrage de l'agent ${name}: ${error.message}`);
      return false;
    }
  }
  return false;
}

// Arrêter les agents
async function stopAgent(name) {
  if (agents[name]) {
    try {
      const agent = agents[name];
      await agent.stop();
      logger.info(`Agent ${name} arrêté`);
      agentStatus[name] = false;
      return true;
    } catch (error) {
      logger.error(`Erreur lors de l'arrêt de l'agent ${name}: ${error.message}`);
      return false;
    }
  }
  return false;
}

// Intégration du middleware MCP
// app.use('/mcp', mcpMiddleware(agents));

// Routes pour les API

// Statut des agents
app.get('/api/agents/status', (req, res) => {
  res.json(agentStatus);
});

// Gestion des agents (démarrage/arrêt)
app.post('/api/agents/:agent/:action', async (req, res) => {
  const { agent, action } = req.params;
  
  if (!['twitter', 'contentAnalysis'].includes(agent)) {
    return res.status(404).json({ error: `Agent ${agent} non trouvé` });
  }
  
  if (!['start', 'stop'].includes(action)) {
    return res.status(400).json({ error: `Action ${action} non valide` });
  }
  
  try {
    let success = false;
    if (action === 'start') {
      success = await startAgent(agent);
    } else {
      success = await stopAgent(agent);
    }
    
    res.json({ success, status: agentStatus[agent] });
  } catch (error) {
    logger.error(`Erreur lors de l'action ${action} sur l'agent ${agent}: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Routes pour l'agent Twitter
app.get('/api/twitter/search', async (req, res) => {
  const { q, count = 10 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Un terme de recherche est requis' });
  }
  
  try {
    if (!agentStatus.twitter) {
      return res.status(400).json({ error: 'L\'agent Twitter n\'est pas actif' });
    }
    
    const result = await agents.twitter.searchTweets({ query: q, count: parseInt(count, 10) });
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.content);
  } catch (error) {
    logger.error(`Erreur lors de la recherche de tweets: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twitter/user/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    if (!agentStatus.twitter) {
      return res.status(400).json({ error: 'L\'agent Twitter n\'est pas actif' });
    }
    
    const result = await agents.twitter.getUserProfile({ username });
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.content);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du profil utilisateur: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twitter/timeline/:username', async (req, res) => {
  const { username } = req.params;
  const { count = 10 } = req.query;
  
  try {
    if (!agentStatus.twitter) {
      return res.status(400).json({ error: 'L\'agent Twitter n\'est pas actif' });
    }
    
    const result = await agents.twitter.getUserTimeline({ 
      username, 
      count: parseInt(count, 10) 
    });
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json(result.content);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la timeline: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Routes pour l'agent d'analyse de contenu
app.post('/api/content-analysis/analyze', async (req, res) => {
  const { text, platform } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Un texte est requis pour l\'analyse' });
  }
  
  try {
    if (!agentStatus.contentAnalysis) {
      return res.status(400).json({ error: 'L\'agent d\'analyse de contenu n\'est pas actif' });
    }
    
    const analysis = await agents.contentAnalysis.analyzeContent(text, platform);
    res.json(analysis);
  } catch (error) {
    logger.error(`Erreur lors de l'analyse de contenu: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Route par défaut pour servir l'application React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  logger.info(`Accédez à l'application à l'adresse: http://localhost:${PORT}`);
});

export default app; 