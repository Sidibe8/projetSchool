import {
  scrollToBottom,
  escapeHtml,
  delay,
  dynamicSpeak,
  stopSpeaking,
  isCurrentlySpeaking,
} from "./utils.js";

function isHtml(str) {
  const doc = new DOMParser().parseFromString(str, "text/html");
  return Array.from(doc.body.childNodes).some((node) => node.nodeType === 1);
}

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    navigator.clipboard
      .writeText(text)
      .then(resolve)
      .catch((err) => {
        console.error("Erreur lors de la copie: ", err);
        reject(err);
      });
  });
}

function speakText(text) {
  const maxLength = 200;
  if (text.length > maxLength) {
    const parts = text.match(new RegExp(`.{1,${maxLength}}(?:\\s|$)`, "g"));
    parts.forEach((part, index) => {
      setTimeout(() => dynamicSpeak(part), index * 1000);
    });
  } else {
    dynamicSpeak(text);
  }
}

export async function typeWriterEffect(element, text, speed = 20) {
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        element.innerHTML = text.substring(0, i + 1);
        i++;
        scrollToBottom();
      } else {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

export function addMessage(text, sender) {
  const chatWindow = document.getElementById("chatWindow");
  const messageDiv = document.createElement("div");
  messageDiv.className = `${sender}-message`;

  const safeText = isHtml(text) ? text : escapeHtml(text);

  messageDiv.innerHTML = `
    <div class="avatar">${
      sender === "user" ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'
    }</div>
    <div class="message-content">
        ${safeText}
        <div class="message-actions">
            <button class="action-btn copy-btn" title="Copier">
                <i class="fas fa-copy"></i>
            </button>
            <button class="action-btn speak-btn" title="Lire à haute voix">
                <i class="fas fa-volume-up"></i>
            </button>
            <button class="action-btn stop-speak-btn" title="Arrêter la lecture" style="display: none;">
                <i class="fas fa-stop"></i>
            </button>
        </div>
    </div>
  `;

  chatWindow.appendChild(messageDiv);

  const copyBtn = messageDiv.querySelector(".copy-btn");
  const speakBtn = messageDiv.querySelector(".speak-btn");
  const stopSpeakBtn = messageDiv.querySelector(".stop-speak-btn");

  copyBtn.addEventListener("click", async () => {
    const icon = copyBtn.querySelector("i");
    const originalIcon = icon.className;
    try {
      await copyToClipboard(text);
      icon.className = "fas fa-check";
      setTimeout(() => (icon.className = originalIcon), 2000);
    } catch {
      icon.className = "fas fa-times";
      setTimeout(() => (icon.className = originalIcon), 2000);
    }
  });

  speakBtn.addEventListener("click", () => {
    speakText(text);
    speakBtn.style.display = "none";
    stopSpeakBtn.style.display = "flex";

    const checkSpeakingState = setInterval(() => {
      if (!isCurrentlySpeaking()) {
        stopSpeakBtn.style.display = "none";
        speakBtn.style.display = "flex";
        clearInterval(checkSpeakingState);
      }
    }, 500);
  });

  stopSpeakBtn.addEventListener("click", () => {
    stopSpeaking();
    stopSpeakBtn.style.display = "none";
    speakBtn.style.display = "flex";
  });

  scrollToBottom();
  addToHistory({ text, sender });
}

export function showTypingIndicator() {
  const chatWindow = document.getElementById("chatWindow");
  const typingDiv = document.createElement("div");
  typingDiv.className = "bot-message typing-indicator";
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

export async function replaceTypingWithResponse(typingElement, responseObj) {
  const contentDiv = typingElement.querySelector(".message-content");
  typingElement.querySelector(".typing").style.opacity = "0";
  await delay(300);
  contentDiv.innerHTML = "";

  let responseHtml = "";
  let plainText = "";

  if (typeof responseObj === "string") {
    responseHtml = isHtml(responseObj) ? responseObj : escapeHtml(responseObj);
    plainText = responseObj;
  } else {
    switch (responseObj.type) {
      case "text":
        responseHtml = isHtml(responseObj.message)
          ? responseObj.message
          : escapeHtml(responseObj.message);
        plainText = responseObj.message;
        break;
      case "wikipedia":
        responseHtml = `
          <strong>${escapeHtml(responseObj.title)}</strong><br>
          ${escapeHtml(responseObj.summary)}<br>
          ${
            responseObj.image
              ? `<img src="${responseObj.image}" class="wiki-image"><br>`
              : ""
          }
          <a href="${responseObj.url}" target="_blank">Lire plus sur Wikipedia</a>
        `;
        plainText = `${responseObj.title} : ${responseObj.summary}`;
        break;
      case "error":
        responseHtml = `
          ❌ ${escapeHtml(responseObj.message)}<br>
          ${
            responseObj.search_url
              ? `<a href="${responseObj.search_url}" target="_blank">Voir sur Wikipedia</a>`
              : ""
          }
        `;
        plainText = responseObj.message;
        break;
      default:
        responseHtml = "❓ Réponse non comprise.";
        plainText = "❓ Réponse non comprise.";
    }
  }

  const typewriterContainer = document.createElement("div");
  typewriterContainer.className = "typewriter";
  contentDiv.appendChild(typewriterContainer);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "message-actions";
  actionsDiv.innerHTML = `
    <button class="action-btn copy-btn" title="Copier">
      <i class="fas fa-copy"></i>
    </button>
    <button class="action-btn speak-btn" title="Lire à haute voix">
      <i class="fas fa-volume-up"></i>
    </button>
    <button class="action-btn stop-speak-btn" title="Arrêter la lecture" style="display: none;">
      <i class="fas fa-stop"></i>
    </button>
  `;
  contentDiv.appendChild(actionsDiv);

  await typeWriterEffect(typewriterContainer, responseHtml);
  typewriterContainer.classList.remove("typewriter");
  typewriterContainer.style.borderRight = "none";

  const copyBtn = contentDiv.querySelector(".copy-btn");
  const speakBtn = contentDiv.querySelector(".speak-btn");
  const stopSpeakBtn = contentDiv.querySelector(".stop-speak-btn");

  copyBtn.addEventListener("click", async () => {
    const icon = copyBtn.querySelector("i");
    const originalIcon = icon.className;
    try {
      await copyToClipboard(plainText);
      icon.className = "fas fa-check";
      setTimeout(() => (icon.className = originalIcon), 2000);
    } catch {
      icon.className = "fas fa-times";
      setTimeout(() => (icon.className = originalIcon), 2000);
    }
  });

  speakBtn.addEventListener("click", () => {
    speakText(plainText);
    speakBtn.style.display = "none";
    stopSpeakBtn.style.display = "flex";

    const checkSpeakingState = setInterval(() => {
      if (!isCurrentlySpeaking()) {
        stopSpeakBtn.style.display = "none";
        speakBtn.style.display = "flex";
        clearInterval(checkSpeakingState);
      }
    }, 500);
  });

  stopSpeakBtn.addEventListener("click", () => {
    stopSpeaking();
    stopSpeakBtn.style.display = "none";
    speakBtn.style.display = "flex";
  });

  scrollToBottom();
  addToHistory({ text: plainText, sender: "bot" });
}

export function restoreChatHistory() {
  const chatWindow = document.getElementById("chatWindow");
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];

  history.forEach(({ text, sender, image, url }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `${sender}-message`;

    const safeText = isHtml(text) ? text : escapeHtml(text);
    let html = `
      <div class="avatar">${
        sender === "user" ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'
      }</div>
      <div class="message-content">
    `;

    html += image && url
      ? `${safeText}<br><img src="${image}" class="wiki-image"><br><a href="${url}" target="_blank">Lire plus</a>`
      : `${safeText}`;

    html += `
      <div class="message-actions">
        <button class="action-btn copy-btn" title="Copier">
          <i class="fas fa-copy"></i>
        </button>
        <button class="action-btn speak-btn" title="Lire à haute voix">
          <i class="fas fa-volume-up"></i>
        </button>
        <button class="action-btn stop-speak-btn" title="Arrêter la lecture" style="display: none;">
          <i class="fas fa-stop"></i>
        </button>
      </div>
    </div>`;

    messageDiv.innerHTML = html;
    chatWindow.appendChild(messageDiv);

    const copyBtn = messageDiv.querySelector(".copy-btn");
    const speakBtn = messageDiv.querySelector(".speak-btn");
    const stopSpeakBtn = messageDiv.querySelector(".stop-speak-btn");

    copyBtn.addEventListener("click", async () => {
      const icon = copyBtn.querySelector("i");
      const originalIcon = icon.className;
      try {
        await copyToClipboard(text);
        icon.className = "fas fa-check";
        setTimeout(() => (icon.className = originalIcon), 2000);
      } catch {
        icon.className = "fas fa-times";
        setTimeout(() => (icon.className = originalIcon), 2000);
      }
    });

    speakBtn.addEventListener("click", () => {
      speakText(text);
      speakBtn.style.display = "none";
      stopSpeakBtn.style.display = "flex";

      const checkSpeakingState = setInterval(() => {
        if (!isCurrentlySpeaking()) {
          stopSpeakBtn.style.display = "none";
          speakBtn.style.display = "flex";
          clearInterval(checkSpeakingState);
        }
      }, 500);
    });

    stopSpeakBtn.addEventListener("click", () => {
      stopSpeaking();
      stopSpeakBtn.style.display = "none";
      speakBtn.style.display = "flex";
    });
  });

  scrollToBottom();
}

export function updateModeIndicator() {
  const indicator = document.getElementById("modeIndicator");
  const exitButton = document.getElementById("exitResearchMode");
  const mode = localStorage.getItem("chatMode") || "normal";
  indicator.style.display = mode === "research" ? "flex" : "none";

  exitButton.onclick = () => {
    localStorage.setItem("chatMode", "normal");
    updateModeIndicator();
    addMessage("Mode recherche désactivé.", "bot");
  };
}

function addToHistory({ text, sender, image = null, url = null }) {
  const history = JSON.parse(localStorage.getItem("chatHistory")) || [];
  history.push({ text, sender, image, url });
  localStorage.setItem("chatHistory", JSON.stringify(history));
}
