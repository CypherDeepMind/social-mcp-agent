// Importations
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import ContentAnalysisAgent from './agents/content-analysis-agent.js';
import TwitterAgent from './agents/twitter-agent.js';

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

// Route de base
app.get('/', (req, res) => {
  res.send('Social MCP Agent API');
});

// Statut des agents
app.get('/api/status', (req, res) => {
  res.json(agentStatus);
});

// Route par défaut pour servir l'application React
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  logger.info(`Accédez à l'application à l'adresse: http://localhost:${PORT}`);
}); 