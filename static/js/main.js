import {
  addMessage,
  showTypingIndicator,
  replaceTypingWithResponse,
  updateModeIndicator,
  restoreChatHistory,
} from "./ui.js";
import { delay } from "./utils.js";
import { getBotResponse } from "./api.js";
// Précharge les voix disponibles
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = function () {
    console.log("Voix chargées:", window.speechSynthesis.getVoices());
  };

  // Force le chargement des voix si nécessaire
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.getVoices();
  }
}

let isBotTyping = false;
let currentMode = localStorage.getItem("chatMode") || "normal";
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const helpButton = document.getElementById("helpButton");
  const closeCommands = document.getElementById("closeCommands");
  const commandsPanel = document.getElementById("commandsPanel");
  const clearHistoryButton = document.getElementById("clearHistory");

  updateModeIndicator();
  userInput.focus();

  if (chatHistory.length === 0) {
    addMessage(
      "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
      "bot"
    );
  } else {
    restoreChatHistory();
  }

  // Dans le gestionnaire d'événements submit du formulaire, modifiez comme suit :
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message || isBotTyping) return;

    addMessage(message, "user");
    userInput.value = "";
    await delay(800);

    if (message.toLowerCase() === "/stop") {
      currentMode = "normal";
      localStorage.setItem("chatMode", "normal");
      updateModeIndicator();
      addMessage("Mode recherche désactivé.", "bot");
      return;
    }

    isBotTyping = true;
    const typingIndicator = showTypingIndicator();
    try {
      const botResponse = await getBotResponse(message);
      await replaceTypingWithResponse(typingIndicator, botResponse);
    } catch (error) {
      await replaceTypingWithResponse(typingIndicator, {
        type: "text",
        message: "Désolé, je rencontre un problème technique 😢",
      });
    } finally {
      isBotTyping = false;
    }
  });

  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
  });

  helpButton.addEventListener("click", () => {
    commandsPanel.style.display =
      commandsPanel.style.display === "block" ? "none" : "block";
  });

  closeCommands.addEventListener("click", () => {
    commandsPanel.style.display = "none";
  });

  clearHistoryButton.addEventListener("click", () => {
    localStorage.removeItem("chatHistory");
    chatHistory = [];
    document.getElementById("chatWindow").innerHTML = "";
    addMessage(
      "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
      "bot"
    );
  });
});
