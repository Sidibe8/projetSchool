from flask import Flask, render_template, request, json
from datetime import datetime
import pytz
import locale
import random
import os
import requests
from bs4 import BeautifulSoup
import wikipediaapi

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

locale.setlocale(locale.LC_TIME, "fr_FR.UTF-8")

def get_day():
    return datetime.now().strftime("%A")

def get_weather():
    try:
        latitude = 12.6392
        longitude = -8.0028
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current_weather=true"
        response = requests.get(url)
        data = response.json()
        
        weather = data.get("current_weather", {})
        temp = weather.get("temperature")
        wind = weather.get("windspeed")
        
        if temp is not None and wind is not None:
            return f"Il fait actuellement {temp}°C à Bamako avec un vent de {wind} km/h."
        else:
            return "Impossible d'obtenir les données météo pour le moment."
    except Exception as e:
        print(f"[DEBUG] Erreur get_weather : {e}")
        return "Erreur lors de la récupération de la météo."



# ============================================
# 🔍 Recherche Wikipedia sans clé API
# ============================================


def perform_web_search_scrape(query):
    print(f"[DEBUG] 🔎 Requête reçue : {query}")

    try:
        wiki = wikipediaapi.Wikipedia(
            language='fr',
            user_agent='chatbot-flask/1.0 (contact: devscode3@gmail.com)'
        )

        page = wiki.page(query)
        print(f"[DEBUG] 🔍 Titre exact cherché : {query}")
        print(f"[DEBUG] 📄 Titre trouvé : {page.title}")
        print(f"[DEBUG] ✅ Page existe ? {'Oui' if page.exists() else 'Non'}")

        if page.exists():
            print(f"[DEBUG] 📚 Résumé brut : {page.summary[:200]}...")

            # 🔖 Vérification de l'image avec l'API REST
            image_url = None
            description = None
            try:
                title_encoded = page.title.replace(" ", "_")
                img_api_url = f"https://fr.wikipedia.org/api/rest_v1/page/summary/{title_encoded}"
                img_response = requests.get(img_api_url).json()
                print(f"[DEBUG] 🖼️ Données image (REST) : {img_response}")
                image_url = img_response.get("thumbnail", {}).get("source")
                description = img_response.get("description")
            except Exception as e:
                print(f"[DEBUG] ⚠️ REST API image failed: {e}")

            # 🔁 Fallback via pageimages si REST ne fournit pas d'image
            if not image_url:
                print("[DEBUG] 🔁 REST n'a pas fourni d'image, fallback via pageimages...")
                try:
                    fallback_url = "https://fr.wikipedia.org/w/api.php"
                    fallback_params = {
                        "action": "query",
                        "titles": page.title,
                        "prop": "pageimages",
                        "format": "json",
                        "pithumbsize": 500
                    }
                    fallback_response = requests.get(fallback_url, params=fallback_params).json()
                    pages = fallback_response.get("query", {}).get("pages", {})
                    for p in pages.values():
                        image_url = p.get("thumbnail", {}).get("source")
                        print(f"[DEBUG] ✅ Image de fallback trouvée : {image_url}")
                        break
                except Exception as e:
                    print(f"[DEBUG] ⚠️ Erreur fallback image : {e}")

            # Ajouter des liens internes pour les sections
            section_links = []
            for section in page.sections:
                section_links.append({
                    "section_title": section.title,
                    "section_url": page.fullurl + "#" + section.title.replace(" ", "_")
                })

            # Renvoi des données sous forme de dictionnaire avec résumé complet
            return {
                "type": "wikipedia",
                "title": page.title,
                "requested": query,
                "summary": page.summary,  # Utilisation du résumé complet
                "url": page.fullurl,
                "image": image_url,
                "description": description,
                "sections": section_links  # Ajout des liens vers les sections
            }

        # 🔁 Si pas trouvé, faire une recherche plus large
        print("[DEBUG] ❌ Pas de correspondance exacte. Tentative de suggestion via API...")

        search_url = f"https://fr.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json"
        }

        response = requests.get(search_url, params=params)
        data = response.json()
        print(f"[DEBUG] 📦 Résultat brut de la recherche API : {json.dumps(data, indent=2, ensure_ascii=False)}")

        if "query" in data and "search" in data["query"] and data["query"]["search"]:
            best_match_title = data["query"]["search"][0]["title"]
            print(f"[DEBUG] 🧠 Meilleure suggestion : {best_match_title}")

            suggested_page = wiki.page(best_match_title)

            if suggested_page.exists():
                summary = suggested_page.summary  # Résumé complet
                print(f"[DEBUG] 📚 Résumé suggéré : {summary[:200]}...")

                # Miniature facultative
                image_url = None
                try:
                    title_encoded = best_match_title.replace(" ", "_")
                    img_api_url = f"https://fr.wikipedia.org/api/rest_v1/page/summary/{title_encoded}"
                    img_response = requests.get(img_api_url).json()
                    print(f"[DEBUG] 🖼️ Données image : {img_response}")
                    image_url = img_response.get("thumbnail", {}).get("source")
                except Exception as e:
                    print(f"[DEBUG] ⚠️ Erreur image : {e}")

                return {
                    "type": "wikipedia",
                    "title": suggested_page.title,
                    "requested": query,
                    "summary": summary,  # Résumé complet
                    "url": suggested_page.fullurl,
                    "image": image_url
                }

        print("[DEBUG] ❌ Aucun résultat dans la recherche API.")
        return {
            "type": "error",
            "message": f"Aucun article trouvé pour '{query}'",
            "search_url": f"https://fr.wikipedia.org/wiki/Special:Search?search={query}"
        }

    except Exception as e:
        print(f"[ERREUR] 🛑 Exception levée : {e}")
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
    return json.jsonify({"type": "text", "message": response})

def replace_placeholders(text):
    dynamic_values = {
        "heure": get_time(),
        "date": get_date(),
        "jour": get_day(),
        "meteo": get_weather()  # bien forcée ici
    }
    for tag, value in dynamic_values.items():
        text = text.replace(f"{{{tag}}}", value)
    return text




# ============================================
# 🤖 Traitement principal des messages
# ============================================

conversation_context = {}

def process_message(user_id, message, knowledge):
    global conversation_context

    if message.startswith("/"):
        command_or_query = message[1:].strip()
        known_commands = ["recherche", "aide"]
        if command_or_query in known_commands:
            return replace_placeholders(handle_command(user_id, command_or_query))
        return perform_web_search_scrape(command_or_query)

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

    if "reponses" in knowledge:
        for key, data in knowledge["reponses"].items():
            if any(kw in message for kw in data.get("keywords", [])):
                raw_response = random.choice(data.get("reponses", []))
                dynamic_values = {
                    "heure": get_time(),
                    "date": get_date(),
                    "jour": get_day(),
                    "meteo": get_weather()
                }
                for tag, value in dynamic_values.items():
                    raw_response = raw_response.replace("{" + tag + "}", value)
                return raw_response

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
