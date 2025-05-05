import random
from pathlib import Path
import json
from utils.dynamic_functions import replace_placeholders
from utils.wikipedia_search import perform_web_search_scrape

conversation_context = {}

def load_knowledge():
    """Charge la base de connaissances"""
    knowledge = {}
    base_dir = Path(__file__).parent.parent

    # 1. Chargement obligatoire de responses.json
    responses_path = base_dir / 'knowledge' / 'responses.json'
    if responses_path.exists():
        with open(responses_path, 'r', encoding='utf-8') as f:
            knowledge["responses"] = json.load(f)

    # 2. Chargement des autres connaissances
    knowledge_dir = base_dir / 'knowledge'
    for file_path in knowledge_dir.glob('**/*.json'):
        if file_path.name != 'responses.json':
            with open(file_path, 'r', encoding='utf-8') as f:
                knowledge.update(json.load(f))

    return knowledge

def handle_context(user_id, message):
    """Gère les messages en fonction du contexte de la conversation"""
    context = conversation_context.get(user_id)

    if context and context.get("mode") == "recherche":
        if message.strip().lower() == "/quitter":
            conversation_context.pop(user_id, None)
            return "🚪 <strong>Mode recherche désactivé.</strong> Vous pouvez continuer une conversation normale."

        result = perform_web_search_scrape(message)
        reminder = "<strong>🧠 Mode recherche toujours actif. Tapez /quitter pour sortir.</strong> "
        if isinstance(result, dict):
            if 'message' in result:
                result['message'] += reminder
            else:
                result['message'] = reminder
            return result
        else:
            return (result or "Désolé, je n'ai rien trouvé sur ce sujet.") + reminder


    return None

def process_message(user_id, message, knowledge=None):
    """Traite le message utilisateur"""
    global conversation_context

    if knowledge is None:
        knowledge = load_knowledge()

    message_lower = message.lower().strip()

    # 1. Vérifier si c'est une commande
    if message_lower.startswith("/"):
        command = message_lower[1:]
        if command == "recherche":
            conversation_context[user_id] = {"mode": "recherche"}
            return "🔍 <strong>Mode recherche activé.</strong> Posez votre question :"
        elif command == "quitter":
            conversation_context.pop(user_id, None)
            return "🚪 <strong>Mode recherche désactivé.</strong> Vous pouvez continuer une conversation normale."
        elif command == "aide":
            return (
                "📋 <strong>Commandes disponibles :</strong><br><ul>"
                "<li><code>/recherche</code> - Activer la recherche web</li>"
                "<li><code>/quitter</code> - Quitter le mode recherche</li>"
                "<li><code>/aide</code> - Voir cette aide</li>"
                "</ul>"
            )
        else:
            result = perform_web_search_scrape(command)
            return result or "Désolé, je n'ai rien trouvé sur ce sujet."

    # 2. Vérifier le mode contextuel actif
    if user_id in conversation_context:
        response = handle_context(user_id, message_lower)
        if response:
            return response

    # 3. Réponses prédéfinies
    if "responses" in knowledge:
        for _, data in knowledge["responses"].items():
            if any(kw.lower() in message_lower for kw in data.get("keywords", [])):
                return replace_placeholders(random.choice(data["reponses"]))

    # 4. Connaissances personnalisées
    for key, data in knowledge.items():
        if key == "responses":
            continue
        if key.lower() in message_lower:
            if "function" in data:
                result = globals()[data["function"]]()
                return data["response"].format(**{key: result})
            return data["response"]

    # 5. Réponse par défaut
    return generate_default_response(user_id)

def handle_command(user_id, command):
    """Gère les commandes spéciales"""
    if command == "recherche":
        conversation_context[user_id] = {"mode": "recherche"}
        return "🔍 <strong>Mode recherche activé.</strong> Posez votre question :"
    elif command == "quitter":
        conversation_context.pop(user_id, None)
        return "🚪 <strong>Mode recherche désactivé.</strong> Vous pouvez continuer une conversation normale."
    elif command == "aide":
        return (
            "<strong>📋 Commandes disponibles :</strong><br>"
            "<ul>"
            "<li><code>/recherche</code> - Activer la recherche web</li>"
            "<li><code>/quitter</code> - Quitter le mode recherche</li>"
            "<li><code>/aide</code> - Voir cette aide</li>"
            "</ul>"
        )

    return "Commande inconnue. Tapez <code>/aide</code> pour les options."

def generate_default_response(user_id):
    """Génère une réponse quand aucune correspondance n'est trouvée"""
    responses = [
        "Je n'ai pas compris. Essayez de reformuler !",
        "Pouvez-vous préciser votre demande ?",
        "Je ne sais pas répondre à cela. Essayez une autre question.",
        "Hum... Je ne suis pas sûr de comprendre."
    ]
    return random.choice(responses)
