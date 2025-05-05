export async function getBotResponse(message) {
    const response = await fetch('/api/get_response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `question=${encodeURIComponent(message)}`
    });

    if (!response.ok) throw new Error('Erreur serveur');
    return await response.json();
}
