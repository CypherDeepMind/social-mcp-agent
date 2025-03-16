/**
 * Test de base pour le SDK MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

async function testMcp() {
  // Créer une instance du serveur MCP
  const server = new McpServer({
    name: 'Test MCP Server',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: true,
      resources: true,
    }
  });
  
  // Vérifier les méthodes disponibles sur le serveur
  console.log('Méthodes disponibles sur le serveur MCP :', Object.getOwnPropertyNames(Object.getPrototypeOf(server)));
  
  // Tenter d'enregistrer une méthode simple
  if (typeof server.registerMethod === 'function') {
    server.registerMethod('test/hello', () => {
      return { message: 'Hello MCP!' };
    });
    console.log('Méthode test/hello enregistrée avec succès');
  } else {
    console.error('La méthode registerMethod n\'est pas disponible sur le serveur MCP');
    console.log('Objet serveur :', server);
  }
  
  // Créer un transport stdio
  const transport = new StdioServerTransport();
  
  // Connecter le serveur au transport
  try {
    await server.connect(transport);
    console.log('Serveur connecté au transport avec succès');
  } catch (error) {
    console.error('Erreur lors de la connexion au transport :', error);
  }
}

// Exécuter le test
testMcp().catch(error => {
  console.error('Erreur non gérée :', error);
}); 