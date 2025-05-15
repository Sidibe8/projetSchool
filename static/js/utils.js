// Variables globales pour le contrôle de la lecture
let currentSpeechUtterance = null;
let responsiveVoiceQueue = [];
let isSpeaking = false;

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function scrollToBottom() {
  const chatWindow = document.getElementById("chatWindow");
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
}

export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function dynamicSpeak(text, lang = "fr-FR") {
  if (!text || typeof text !== "string") {
    console.error("Texte invalide pour la synthèse vocale");
    return;
  }

  // Arrête toute lecture en cours avant de commencer une nouvelle
  stopSpeaking();

  // Option 1: Utilisation de ResponsiveVoice si disponible
  if (typeof responsiveVoice !== "undefined") {
    try {
      isSpeaking = true;

      const voiceParams = {
        pitch: 0.9,
        rate: 0.85,
        volume: 1,
        onstart: () => {
          console.log("Début de la lecture");
          isSpeaking = true;
        },
        onend: () => {
          console.log("Lecture terminée");
          isSpeaking = false;
          processResponsiveVoiceQueue();
        },
        onerror: (e) => {
          console.error("Erreur ResponsiveVoice:", e);
          isSpeaking = false;
          processResponsiveVoiceQueue();
        },
      };

      const voiceName =
        lang.toLowerCase() === "fr-fr" ? "French Female" : "US English Female";

      // Découpage du texte long
      const maxChunkLength = 200;
      if (text.length > maxChunkLength) {
        const chunks = text.match(
          new RegExp(`.{1,${maxChunkLength}}(?:\\s|$)|\\S+?`, "g")
        );
        responsiveVoiceQueue = chunks.filter((chunk) => chunk.trim());
        processResponsiveVoiceQueue();
      } else {
        responsiveVoice.speak(text, voiceName, voiceParams);
      }

      return;
    } catch (e) {
      console.error(
        "Erreur avec ResponsiveVoice, basculement vers SpeechSynthesis:",
        e
      );
      // Continue avec l'API native en cas d'échec
    }
  }

  // Option 2: Fallback vers l'API Web Speech native
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      currentSpeechUtterance = new SpeechSynthesisUtterance(text);
      isSpeaking = true;

      currentSpeechUtterance.lang = lang;
      currentSpeechUtterance.rate = 0.9;
      currentSpeechUtterance.pitch = 0.95;
      currentSpeechUtterance.volume = 1;

      // Gestion des événements
      currentSpeechUtterance.onstart = () => {
        console.log("Début de la lecture native");
        isSpeaking = true;
      };

      currentSpeechUtterance.onend = () => {
        console.log("Fin de la lecture native");
        isSpeaking = false;
        currentSpeechUtterance = null;
      };

      currentSpeechUtterance.onerror = (e) => {
        console.error("Erreur SpeechSynthesis:", e.error);
        isSpeaking = false;
        currentSpeechUtterance = null;
      };

      window.speechSynthesis.speak(currentSpeechUtterance);
    } catch (e) {
      console.error("Erreur avec SpeechSynthesis API:", e);
      isSpeaking = false;
    }
  } else {
    console.warn("Aucun moteur de synthèse vocale disponible");
  }
}

// Fonction pour traiter la file d'attente de ResponsiveVoice
function processResponsiveVoiceQueue() {
  if (responsiveVoiceQueue.length === 0 || isSpeaking) return;

  isSpeaking = true;
  const chunk = responsiveVoiceQueue.shift();
  const voiceName =
    currentLang === "fr-FR" ? "French Female" : "US English Female";

  responsiveVoice.speak(chunk, voiceName, {
    pitch: 0.9,
    rate: 0.85,
    volume: 1,
    onend: () => {
      isSpeaking = false;
      processResponsiveVoiceQueue();
    },
    onerror: () => {
      isSpeaking = false;
      processResponsiveVoiceQueue();
    },
  });
}

export function stopSpeaking() {
  // Pour ResponsiveVoice
  if (typeof responsiveVoice !== "undefined") {
    try {
      responsiveVoice.cancel();
      responsiveVoiceQueue = [];
      isSpeaking = false;
    } catch (e) {
      console.error("Erreur lors de l'arrêt de ResponsiveVoice:", e);
    }
  }

  // Pour l'API native
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      if (currentSpeechUtterance) {
        currentSpeechUtterance.onend = null;
        currentSpeechUtterance = null;
      }
      isSpeaking = false;
    } catch (e) {
      console.error("Erreur lors de l'arrêt de SpeechSynthesis:", e);
    }
  }
}

export function isCurrentlySpeaking() {
  return isSpeaking;
}
