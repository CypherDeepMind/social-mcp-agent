// Variables globales
let agentsStatus = {
    twitter: false,
    contentAnalysis: false
};

// Fonction d'initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Charger le statut des agents
    fetchAgentsStatus();
    
    // Gestionnaires d'événements
    document.getElementById('twitterSearchForm').addEventListener('submit', handleTwitterSearch);
    document.getElementById('contentAnalysisForm').addEventListener('submit', handleContentAnalysis);
    
    // Boutons de statut des agents
    document.querySelectorAll('.toggle-agent').forEach(button => {
        button.addEventListener('click', toggleAgentStatus);
    });
});

// Requêtes API
async function fetchAgentsStatus() {
    try {
        const response = await fetch('/api/agents/status');
        if (!response.ok) throw new Error('Erreur lors de la récupération du statut des agents');
        
        const data = await response.json();
        agentsStatus = data;
        updateAgentStatusUI();
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion à l\'API', 'danger');
    }
}

async function handleTwitterSearch(event) {
    event.preventDefault();
    
    const query = document.getElementById('twitterQuery').value.trim();
    const count = document.getElementById('tweetCount').value;
    
    if (!query) {
        showNotification('Veuillez entrer un terme de recherche', 'warning');
        return;
    }
    
    showLoading('twitterResults');
    
    try {
        const response = await fetch(`/api/twitter/search?q=${encodeURIComponent(query)}&count=${count}`);
        if (!response.ok) throw new Error('Erreur lors de la recherche Twitter');
        
        const data = await response.json();
        displayTweets(data);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('twitterResults').innerHTML = 
            '<div class="alert alert-danger">Erreur lors de la recherche. Veuillez réessayer.</div>';
    }
}

async function handleContentAnalysis(event) {
    event.preventDefault();
    
    const text = document.getElementById('analysisText').value.trim();
    
    if (!text) {
        showNotification('Veuillez entrer du texte à analyser', 'warning');
        return;
    }
    
    showLoading('analysisResults');
    
    try {
        const response = await fetch('/api/content-analysis/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) throw new Error('Erreur lors de l\'analyse');
        
        const data = await response.json();
        displayAnalysisResults(data);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('analysisResults').innerHTML = 
            '<div class="alert alert-danger">Erreur lors de l\'analyse. Veuillez réessayer.</div>';
    }
}

async function toggleAgentStatus(event) {
    const agentId = event.target.dataset.agent;
    const action = agentsStatus[agentId] ? 'stop' : 'start';
    
    try {
        const response = await fetch(`/api/agents/${agentId}/${action}`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error(`Erreur lors de la modification du statut de l'agent ${agentId}`);
        
        // Mettre à jour le statut local
        agentsStatus[agentId] = !agentsStatus[agentId];
        updateAgentStatusUI();
        
        showNotification(`Agent ${agentId} ${action === 'start' ? 'démarré' : 'arrêté'} avec succès`, 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification(`Erreur lors de la modification du statut de l'agent ${agentId}`, 'danger');
    }
}

// Fonctions d'UI
function updateAgentStatusUI() {
    for (const [agent, status] of Object.entries(agentsStatus)) {
        const card = document.querySelector(`.agent-card[data-agent="${agent}"]`);
        const statusIndicator = card.querySelector('.agent-status');
        const statusText = card.querySelector('.status-text');
        const button = card.querySelector('.toggle-agent');
        
        if (status) {
            card.classList.add('running');
            card.classList.remove('stopped');
            statusIndicator.classList.add('status-running');
            statusIndicator.classList.remove('status-stopped');
            statusText.textContent = 'En cours d\'exécution';
            button.textContent = 'Arrêter';
            button.classList.remove('btn-success');
            button.classList.add('btn-danger');
        } else {
            card.classList.add('stopped');
            card.classList.remove('running');
            statusIndicator.classList.add('status-stopped');
            statusIndicator.classList.remove('status-running');
            statusText.textContent = 'Arrêté';
            button.textContent = 'Démarrer';
            button.classList.remove('btn-danger');
            button.classList.add('btn-success');
        }
    }
}

function displayTweets(tweets) {
    const resultsContainer = document.getElementById('twitterResults');
    
    if (!tweets || tweets.length === 0) {
        resultsContainer.innerHTML = '<div class="alert alert-info">Aucun tweet trouvé.</div>';
        return;
    }
    
    let html = '';
    
    tweets.forEach(tweet => {
        // Processus simple pour formater les hashtags
        let tweetText = tweet.text;
        tweetText = tweetText.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
        
        html += `
            <div class="tweet-card">
                <div class="tweet-user">${tweet.user.name} <span class="text-muted">@${tweet.user.screen_name}</span></div>
                <div class="tweet-text">${tweetText}</div>
                <div class="tweet-meta">
                    ${new Date(tweet.created_at).toLocaleString()} · 
                    <i class="bi bi-heart"></i> ${tweet.favorite_count} · 
                    <i class="bi bi-arrow-repeat"></i> ${tweet.retweet_count}
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
}

function displayAnalysisResults(data) {
    const resultsContainer = document.getElementById('analysisResults');
    
    if (!data) {
        resultsContainer.innerHTML = '<div class="alert alert-warning">Aucun résultat d\'analyse disponible.</div>';
        return;
    }
    
    let sentimentClass = 'sentiment-neutral';
    let sentimentIcon = 'bi-emoji-neutral';
    
    if (data.sentiment > 0.2) {
        sentimentClass = 'sentiment-positive';
        sentimentIcon = 'bi-emoji-smile';
    } else if (data.sentiment < -0.2) {
        sentimentClass = 'sentiment-negative';
        sentimentIcon = 'bi-emoji-frown';
    }
    
    let html = `
        <div class="card mb-3">
            <div class="card-header">
                <h5>Analyse du sentiment</h5>
            </div>
            <div class="card-body">
                <p class="lead ${sentimentClass}">
                    <i class="bi ${sentimentIcon}"></i> 
                    ${getSentimentText(data.sentiment)}
                    (Score: ${data.sentiment.toFixed(2)})
                </p>
            </div>
        </div>
    `;
    
    if (data.entities && data.entities.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header">
                    <h5>Entités détectées</h5>
                </div>
                <div class="card-body">
                    <div class="entity-list">
                        ${data.entities.map(entity => `
                            <span class="entity-item ${entity.type.toLowerCase()}-item">
                                ${entity.text} (${entity.type})
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    if (data.keywords && data.keywords.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header">
                    <h5>Mots-clés</h5>
                </div>
                <div class="card-body">
                    <div class="keyword-list">
                        ${data.keywords.map(keyword => `
                            <span class="keyword-item">${keyword}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    if (data.topics && data.topics.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header">
                    <h5>Sujets identifiés</h5>
                </div>
                <div class="card-body">
                    <div class="topic-list">
                        ${data.topics.map(topic => `
                            <span class="entity-item topic-item">${topic}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = html;
}

function getSentimentText(score) {
    if (score > 0.5) return 'Très positif';
    if (score > 0.2) return 'Positif';
    if (score < -0.5) return 'Très négatif';
    if (score < -0.2) return 'Négatif';
    return 'Neutre';
}

function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = `
        <div class="text-center my-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <p class="mt-2">Chargement...</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
} 