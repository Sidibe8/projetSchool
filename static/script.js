// === VARIABLES GLOBALES ===
let isBotTyping = false;
const CHAT_DELAY = 500;
let currentMode = localStorage.getItem('chatMode') || 'normal';
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

// === INITIALISATION ===
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

    if (chatHistory.length === 0) {
        addMessage("Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?", 'bot');
    } else {
        restoreChatHistory();
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message || isBotTyping) return;

        addMessage(message, 'user');
        userInput.value = '';
        await delay(800);

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
        localStorage.removeItem('chatHistory');
        chatHistory = [];
        chatWindow.innerHTML = '';
        addMessage("Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?", 'bot');
    });
});

// === MESSAGES ===
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
    addToHistory({ text, sender });
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

        if (typeof responseObj === 'string') {
            typeText(contentDiv, responseObj);
            addToHistory({ text: responseObj, sender: 'bot' });
            return;
        }

        switch (responseObj.type) {
            case 'text':
                typeText(contentDiv, responseObj.message);
                addToHistory({ text: responseObj.message, sender: 'bot' });
                break;

            case 'wikipedia':
                contentDiv.innerHTML = `
                    <strong>${escapeHtml(responseObj.title)}</strong><br>
                    ${escapeHtml(responseObj.summary)}<br>
                    ${responseObj.image ? `<img src="${responseObj.image}" alt="${escapeHtml(responseObj.title)}" class="wiki-image"><br>` : ''}
                    <a href="${responseObj.url}" target="_blank">Lire plus sur Wikipedia</a>
                `;
                addToHistory({
                    text: `${responseObj.title} : ${responseObj.summary}`,
                    sender: 'bot',
                    image: responseObj.image || null,
                    url: responseObj.url
                });
                break;

            case 'error':
                contentDiv.innerHTML = `
                    ❌ ${escapeHtml(responseObj.message)}<br>
                    ${responseObj.search_url ? `<a href="${responseObj.search_url}" target="_blank">Voir sur Wikipedia</a>` : ''}
                `;
                addToHistory({ text: responseObj.message, sender: 'bot' });
                break;

            default:
                contentDiv.innerHTML = "❓ Réponse non comprise.";
                addToHistory({ text: "Réponse non comprise.", sender: 'bot' });
        }

        scrollToBottom();
    }, 300);
}

function typeText(element, text, speed = 20) {
    let i = 0;
    if (/<[a-z][\s\S]*>/i.test(text)) {
        element.innerHTML = text;
        scrollToBottom();
        return;
    }

    element.textContent = '';
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i++);
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
        }
    }, speed);
}

// === HISTORIQUE ===
function restoreChatHistory() {
    const chatWindow = document.getElementById('chatWindow');
    chatHistory.forEach(({ text, sender, image, url }) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;

        let html = `
            <div class="avatar">${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
            <div class="message-content">
        `;

        if (image && url) {
            html += `${escapeHtml(text)}<br><img src="${image}" class="wiki-image"><br><a href="${url}" target="_blank">Lire plus sur Wikipedia</a>`;
        } else {
            html += `${escapeHtml(text)}`;
        }

        html += '</div>';
        messageDiv.innerHTML = html;
        chatWindow.appendChild(messageDiv);
    });
    scrollToBottom();
}

function addToHistory({ text, sender, image = null, url = null }) {
    chatHistory.push({ text, sender, image, url });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// === OUTILS ===
function scrollToBottom() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === API CALL ===
async function getBotResponse(message) {
    const response = await fetch('/api/get_response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `question=${encodeURIComponent(message)}`
    });

    if (!response.ok) throw new Error('Erreur serveur');
    return await response.json();
}

// === MODE INDICATEUR ===
function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    const exitButton = document.getElementById('exitResearchMode');

    if (!indicator || !exitButton) return;

    indicator.style.display = (currentMode === 'research') ? 'flex' : 'none';

    exitButton.onclick = () => {
        currentMode = 'normal';
        localStorage.setItem('chatMode', 'normal');
        updateModeIndicator();
        addMessage("Mode recherche désactivé.", 'bot');
    };
}
