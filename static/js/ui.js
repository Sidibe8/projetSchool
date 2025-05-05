import { scrollToBottom, escapeHtml } from './utils.js';

export function addMessage(text, sender) {
    const chatWindow = document.getElementById('chatWindow');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message`;
    messageDiv.innerHTML = `
        <div class="avatar">${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
        <div class="message-content">${escapeHtml(text)}</div>
    `;
    chatWindow.appendChild(messageDiv);
    scrollToBottom();
    addToHistory({ text, sender });
}

export function showTypingIndicator() {
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

export function replaceTypingWithResponse(typingElement, responseObj) {
    const contentDiv = typingElement.querySelector('.message-content');
    typingElement.querySelector('.typing').style.opacity = '0';

    setTimeout(() => {
        contentDiv.innerHTML = '';
        if (typeof responseObj === 'string') {
            contentDiv.textContent = responseObj;
            addToHistory({ text: responseObj, sender: 'bot' });
            return;
        }

        switch (responseObj.type) {
            case 'text':
                contentDiv.textContent = responseObj.message;
                addToHistory({ text: responseObj.message, sender: 'bot' });
                break;
            case 'wikipedia':
                contentDiv.innerHTML = `
                    <strong>${escapeHtml(responseObj.title)}</strong><br>
                    ${escapeHtml(responseObj.summary)}<br>
                    ${responseObj.image ? `<img src="${responseObj.image}" class="wiki-image"><br>` : ''}
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
        }

        scrollToBottom();
    }, 300);
}

export function restoreChatHistory() {
    const chatWindow = document.getElementById('chatWindow');
    const history = JSON.parse(localStorage.getItem('chatHistory')) || [];

    history.forEach(({ text, sender, image, url }) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;

        let html = `
            <div class="avatar">${sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
            <div class="message-content">
        `;

        if (image && url) {
            html += `${escapeHtml(text)}<br><img src="${image}" class="wiki-image"><br><a href="${url}" target="_blank">Lire plus</a>`;
        } else {
            html += `${escapeHtml(text)}`;
        }

        html += '</div>';
        messageDiv.innerHTML = html;
        chatWindow.appendChild(messageDiv);
    });

    scrollToBottom();
}

export function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    const exitButton = document.getElementById('exitResearchMode');
    const mode = localStorage.getItem('chatMode') || 'normal';
    indicator.style.display = (mode === 'research') ? 'flex' : 'none';

    exitButton.onclick = () => {
        localStorage.setItem('chatMode', 'normal');
        updateModeIndicator();
        addMessage("Mode recherche désactivé.", 'bot');
    };
}

function addToHistory({ text, sender, image = null, url = null }) {
    const history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    history.push({ text, sender, image, url });
    localStorage.setItem('chatHistory', JSON.stringify(history));
}
