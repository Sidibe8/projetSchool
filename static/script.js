// Variables globales
let isBotTyping = false;
const CHAT_DELAY = 500;
let currentMode = localStorage.getItem('chatMode') || 'normal';
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatWindow = document.getElementById('chatWindow');
    const helpButton = document.getElementById('helpButton');
    const commandsPanel = document.getElementById('commandsPanel');
    const closeCommands = document.getElementById('closeCommands');
    const clearHistoryButton = document.getElementById('clearHistory');

    userInput.focus();
    updateModeIndicator();

    // Si aucun historique, ajouter message de bienvenue
    if (chatHistory.length === 0) {
        const welcomeText = "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?";
        addMessage(welcomeText, 'bot');
    } else {
        restoreChatHistory(); // 🔁 Restaurer messages précédents
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();

        if (message && !isBotTyping) {
            addMessage(message, 'user');
            userInput.value = '';
            await new Promise(resolve => setTimeout(resolve, 800));

            if (message.toLowerCase() === '/stop') {
                currentMode = 'normal';
                localStorage.setItem('chatMode', 'normal');
                updateModeIndicator();
                addMessage("Mode recherche désactivé.", 'bot');
                return;
            }

            const typingIndicator = showTypingIndicator();

            try {
                const botResponse = await getBotResponse(message);
                replaceTypingWithResponse(typingIndicator, botResponse);
            } catch (error) {
                replaceTypingWithResponse(typingIndicator, {
                    type: "text",
                    message: "Désolé, je rencontre un problème technique 😢"
                });
                console.error("Erreur:", error);
            }
        }
    });

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
    });

    helpButton.addEventListener('click', () => {
        commandsPanel.style.display = commandsPanel.style.display === 'block' ? 'none' : 'block';
    });

    closeCommands.addEventListener('click', () => {
        commandsPanel.style.display = 'none';
    });

    clearHistoryButton.addEventListener('click', () => {
        // Supprimer l'historique du localStorage et la mémoire
        localStorage.removeItem('chatHistory');
        chatHistory = [];

        // Vider la fenêtre de chat
        chatWindow.innerHTML = '';

        // Message de bienvenue
        const welcomeText = "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?";
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <div class="bot-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <div class="message-sender">DeepThink</div>
                <div class="message-text">${escapeHtml(welcomeText)}</div>
            </div>
        `;
        chatWindow.appendChild(welcomeMessage);

        // 🔐 Ajouter au localStorage
        chatHistory.push({ text: welcomeText, sender: 'bot' });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));

        scrollToBottom();
    });
});

// Restaurer les anciens messages
function restoreChatHistory() {
    const chatWindow = document.getElementById('chatWindow');

    chatHistory.forEach(({ text, sender, image, url }) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        let messageContent = `
            <div class="avatar">${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
            <div class="message-content">
        `;

        if (image && url) {
            // 📚 Affichage enrichi (Wikipedia)
            messageContent += `${escapeHtml(text)}<br>`;
            messageContent += `<img src="${image}" alt="illustration" class="wiki-image"><br>`;
            messageContent += `<a href="${url}" target="_blank">Lire plus sur Wikipedia</a>`;
        } else if (typeof text === 'string') {
            // 💬 Message simple
            messageContent += `${escapeHtml(text)}`;
        } else {
            // ❌ Problème de format
            messageContent += `<i>Données non lisibles</i>`;
        }

        messageContent += `</div>`;
        messageDiv.innerHTML = messageContent;
        chatWindow.appendChild(messageDiv);
    });

    scrollToBottom();
}




function addMessage(text, sender) {
    const chatWindow = document.getElementById('chatWindow');
    const messageDiv = document.createElement('div');

    messageDiv.className = `${sender}-message`;
    messageDiv.innerHTML = `
        <div class="avatar">${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
        <div class="message-content">${escapeHtml(text)}</div>
    `;

    chatWindow.appendChild(messageDiv);
    scrollToBottom();
    messageDiv.querySelector('.message-content').style.animation = 'fadeIn 0.3s ease';

    // 🔐 Ajouter au localStorage
    chatHistory.push({ text, sender });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function showTypingIndicator() {
    isBotTyping = true;
    const chatWindow = document.getElementById('chatWindow');
    const typingDiv = document.createElement('div');

    typingDiv.className = 'bot-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <span class="typing">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </span>
        </div>
    `;

    chatWindow.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

function replaceTypingWithResponse(typingElement, responseObj) {
    isBotTyping = false;
    const contentDiv = typingElement.querySelector('.message-content');
    typingElement.querySelector('.typing').style.opacity = '0';

    setTimeout(() => {
        contentDiv.innerHTML = '';

        if (typeof responseObj === "string") {
            typeText(contentDiv, responseObj);
            addToHistory(responseObj, 'bot');
            return;
        }

        switch (responseObj.type) {
            case "text":
                typeText(contentDiv, responseObj.message);
                addToHistory(responseObj.message, 'bot');
                break;

            case "wikipedia":
                // Affichage du résumé, de l'image et du lien
                contentDiv.innerHTML = `
                    <strong>${escapeHtml(responseObj.title)}</strong><br>
                    ${escapeHtml(responseObj.summary)}<br>
                    ${responseObj.image ? `<img src="${responseObj.image}" alt="${escapeHtml(responseObj.title)}" class="wiki-image"><br>` : ''}
                    <a href="${responseObj.url}" target="_blank">Lire plus sur Wikipedia</a>
                `;

                // Ajouter l'élément avec toutes les informations dans l'historique
                addToHistory({
                    text: `${responseObj.title} : ${responseObj.summary}`,
                    sender: 'bot',
                    image: responseObj.image,
                    url: responseObj.url
                });

                break;

            case "error":
                contentDiv.innerHTML = `
                    ❌ ${escapeHtml(responseObj.message)}<br>
                    ${responseObj.search_url ? `<a href="${responseObj.search_url}" target="_blank">Voir sur Wikipedia</a>` : ''}
                `;
                addToHistory(responseObj.message, 'bot');
                break;

            default:
                contentDiv.innerHTML = "❓ Réponse non comprise.";
                addToHistory("Réponse non comprise.", 'bot');
        }

        scrollToBottom();
    }, 300);
}

// Fonction modifiée pour ajouter tous les détails dans l'historique
function addToHistory(data, sender) {
    if (typeof data === "string") {
        chatHistory.push({ text: data, sender });
    } else {
        // Si on passe un objet déjà complet
        chatHistory.push({
            text: data.text,
            sender: sender || data.sender || 'bot',
            image: data.image || null,
            url: data.url || null
        });
    }

    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}





function addToHistory(text, sender) {
    chatHistory.push({ text, sender });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function typeText(element, text, speed = 20) {
    let i = 0;
    element.textContent = '';

    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
        }
    }, speed);
}

async function getBotResponse(message) {
    const response = await fetch('/get_response', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `question=${encodeURIComponent(message)}`
    });

    if (!response.ok) throw new Error('Erreur serveur');
    const data = await response.json();
    return data;
}

function scrollToBottom() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTo({
        top: chatWindow.scrollHeight,
        behavior: 'smooth'
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    const exitButton = document.getElementById('exitResearchMode');

    if (!indicator || !exitButton) return;

    if (currentMode === 'research') {
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }

    exitButton.onclick = () => {
        currentMode = 'normal';
        localStorage.setItem('chatMode', 'normal');
        updateModeIndicator();
        addMessage("Mode recherche désactivé.", 'bot');
    };
}
