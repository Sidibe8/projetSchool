from flask import Flask, render_template, request, json
from datetime import datetime
from babel.dates import format_datetime  # ✅ Pour afficher les jours en français sans locale système
import pytz
import random
import os
import requests
from bs4 import BeautifulSoup
import wikipediaapi  # ✅ Librairie Wikipedia sans clé API

app = Flask(__name__)

# ============================================
# 📂 Chargement des connaissances JSON
# ============================================

def load_knowledge():
    knowledge = {}

    if os.path.exists('responses.json'):
        with open('responses.json', 'r', encoding='utf-8') as f:
            knowledge["reponses"] = json.load(f)

    for root, _, files in os.walk('knowledge'):
        for file in files:
            if file.endswith('.json') and file != "responses.json":
                with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                    knowledge.update(json.load(f))

    return knowledge

# ============================================
# ⏰ Fonctions dynamiques
# ============================================

def get_time():
    return datetime.now().strftime("%H:%M")

def get_date():
    return datetime.now().strftime("%d/%m/%Y")

def get_day():
    now = datetime.now()
    return format_datetime(now, "EEEE", locale='fr_FR')  # ✅ Jour en français sans locale système

def get_weather():
    try:
        url = "https://wttr.in/Bamako?format=3"
        response = requests.get(url)
        return response.text.strip()
    except:
        return "Impossible de récupérer la météo."

# ============================================
# 🔍 Recherche Wikipedia sans clé API
# ============================================

def perform_web_search_scrape(query):
    print(f"[DEBUG] Requête originale reçue : {query}")
    
    try:
        wiki = wikipediaapi.Wikipedia(
            language='fr',
            user_agent='chatbot-flask/1.0 (contact: devscode3@gmail.com)'
        )
        
        page = wiki.page(query)
        print(f"[DEBUG] Titre Wikipedia : {page.title}")
        print(f"[DEBUG] Page trouvée ? {'Oui' if page.exists() else 'Non'}")

        if page.exists():
            summary = page.summary[:500] if page.summary else "Aucun résumé disponible."
            return {
                "type": "wikipedia",
                "title": page.title,
                "summary": summary,
                "url": page.fullurl
            }
        else:
            return {
                "type": "error",
                "message": f"Aucun article trouvé pour '{query}'",
                "search_url": f"https://fr.wikipedia.org/wiki/Special:Search?search={query}"
            }

    except Exception as e:
        print(f"[ERREUR] {e}")
        return {
            "type": "error",
            "message": "Erreur lors de la recherche. Veuillez reformuler."
        }

# ============================================
# 🌐 Routes Flask
# ============================================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get_response", methods=["POST"])
def get_response():
    user_id = request.remote_addr
    user_message = request.form["question"].strip().lower()

    knowledge = load_knowledge()
    response = process_message(user_id, user_message, knowledge)
    
    if isinstance(response, dict):
        return json.jsonify(response)
    
    return json.jsonify({
        "type": "text",
        "message": response
    })

# ============================================
# 🤖 Traitement principal des messages
# ============================================

conversation_context = {}

def process_message(user_id, message, knowledge):
    global conversation_context

    if message.startswith("/"):
        return handle_command(user_id, message[1:].strip())

    if user_id in conversation_context:
        context = conversation_context[user_id]

        if context.get("mode") == "recherche":
            conversation_context.pop(user_id)
            return perform_web_search_scrape(message)

        if context.get("mode") == "en_attente_question":
            conversation_context.pop(user_id)
            return "Je t'écoute, pose ta question !"

        if message in ["oui", "yes", "ok"]:
            return handle_positive_response(user_id)
        elif message in ["non", "no"]:
            return handle_negative_response(user_id)

    command_map = {
        "heure": ("get_time", "Il est {result}"),
        "date": ("get_date", "Nous sommes le {result}"),
        "jour": ("get_day", "Aujourd'hui, c'est {result}"),
        "temps": ("get_weather", "{result}")
    }

    for keyword, (func_name, response_format) in command_map.items():
        if keyword in message:
            result = globals()[func_name]()
            return response_format.format(result=result)

    if "reponses" in knowledge:
        words = message.split()
        for key, data in knowledge["reponses"].items():
            if any(kw in words for kw in data.get("keywords", [])):
                return random.choice(data.get("reponses", []))

    for key, data in knowledge.items():
        if key == "reponses":
            continue
        if key in message:
            if "function" in data:
                result = globals()[data["function"]]()
                return data["response"].format(**{key: result})
            return data["response"]

    return generate_contextual_response(user_id, message)

# ============================================
# 🛠️ Gestion des commandes
# ============================================

def handle_command(user_id, command):
    if command == "recherche":
        conversation_context[user_id] = {"mode": "recherche"}
        return "🔍 Mode recherche activé. Posez votre question, je vais essayer de trouver une réponse."

    elif command == "aide":
        return (
            "📋 Commandes disponibles :\n"
            "/recherche - Activer la recherche web\n"
            "/aide - Voir cette aide"
        )

    knowledge = load_knowledge()
    commandes = knowledge.get("commande", {})

    if command in commandes:
        cmd = commandes[command]
        if "function" in cmd and cmd["function"] in globals():
            result = globals()[cmd["function"]]() if "{" in cmd["response"] else ""
            return cmd["response"].format(heure=result, date=result)
        return cmd["response"]

    return "❌ Commande inconnue. Tapez /aide pour voir les options."

# ============================================
# 💬 Réponse contextuelle automatique
# ============================================

def generate_contextual_response(user_id, message):
    suggestions = [
        "Voulez-vous que je recherche cela sur le web ? Tapez /recherche",
        "Pouvez-vous reformuler votre question ?",
        "Je peux aussi vous dire l'heure, la date, etc.",
        "Dites 'oui' si vous voulez de l'aide."
    ]
    conversation_context[user_id] = {"last_message": message}
    return random.choice(suggestions)

# ============================================
# ✅ Réactions oui / non
# ============================================

def handle_positive_response(user_id):
    context = conversation_context.pop(user_id, {})
    if context.get("mode") == "recherche":
        conversation_context[user_id] = {"mode": "en_attente_question"}
        return "Très bien, quelle est votre question ?"
    return "D'accord, posez votre question."

def handle_negative_response(user_id):
    conversation_context.pop(user_id, None)
    return "Très bien. N'hésitez pas à me poser une autre question."

# ============================================
# 🚀 Lancer le serveur Flask
# ============================================

if __name__ == "__main__":
    app.run(debug=True)
