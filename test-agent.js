/**
 * Script de test pour l'agent d'analyse de contenu
 */

import 'dotenv/config';
import ContentAnalysisAgent from './src/agents/content-analysis-agent.js';
import logger from './src/utils/logger.js';

async function testAgent() {
  try {
    logger.info('Démarrage du test de l\'agent d\'analyse de contenu');
    
    // Créer et initialiser l'agent
    const agent = new ContentAnalysisAgent();
    await agent.initialize();
    
    logger.info('Agent initialisé avec succès');
    
    // Démarrer l'agent
    await agent.start();
    
    logger.info('Agent démarré avec succès');
    
    // Tester l'analyse de texte
    logger.info('Test de l\'analyse de texte...');
    try {
      const textResult = await agent.analyzeText({
        text: 'Je suis très content de ce nouveau produit technologique !'
      });
      
      logger.info('Résultat de l\'analyse de texte:', { result: textResult });
    } catch (error) {
      logger.error('Erreur lors de l\'analyse de texte:', { error: error.message });
    }
    
    // Arrêter l'agent
    await agent.stop();
    
    logger.info('Test terminé avec succès');
  } catch (error) {
    logger.error('Erreur lors du test:', { error: error.message, stack: error.stack });
  }
}

// Exécuter le test
testAgent().catch(error => {
  logger.error('Erreur non gérée:', { error: error.message, stack: error.stack });
  process.exit(1);
}); 