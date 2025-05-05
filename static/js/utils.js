export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function scrollToBottom() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
