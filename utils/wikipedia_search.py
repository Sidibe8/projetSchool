import requests
import json
import wikipediaapi

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

            image_url = None
            description = None

            try:
                title_encoded = page.title.replace(" ", "_")
                img_api_url = f"https://fr.wikipedia.org/api/rest_v1/page/summary/{title_encoded}"
                img_response = requests.get(img_api_url, timeout=10).json()
                print(f"[DEBUG] 🖼️ Données image (REST) : {img_response}")
                image_url = img_response.get("thumbnail", {}).get("source")
                description = img_response.get("description")
            except requests.exceptions.RequestException as e:
                print(f"[DEBUG] ⚠️ REST API image failed : {e}")

            # Fallback via pageimages
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
                    fallback_response = requests.get(fallback_url, params=fallback_params, timeout=10).json()
                    pages = fallback_response.get("query", {}).get("pages", {})
                    for p in pages.values():
                        image_url = p.get("thumbnail", {}).get("source")
                        print(f"[DEBUG] ✅ Image de fallback trouvée : {image_url}")
                        break
                except requests.exceptions.RequestException as e:
                    print(f"[DEBUG] ⚠️ Erreur fallback image : {e}")

            # Sections cliquables
            section_links = []
            for section in page.sections:
                section_links.append({
                    "section_title": section.title,
                    "section_url": page.fullurl + "#" + section.title.replace(" ", "_")
                })

            return {
                "type": "wikipedia",
                "title": page.title,
                "requested": query,
                "summary": page.summary,
                "url": page.fullurl,
                "image": image_url,
                "description": description,
                "sections": section_links
            }

        print("[DEBUG] ❌ Pas de correspondance exacte. Tentative de suggestion via API...")

        search_url = "https://fr.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json"
        }

        response = requests.get(search_url, params=params, timeout=10)
        data = response.json()
        print(f"[DEBUG] 📦 Résultat brut de la recherche API : {json.dumps(data, indent=2, ensure_ascii=False)}")

        if "query" in data and "search" in data["query"] and data["query"]["search"]:
            best_match_title = data["query"]["search"][0]["title"]
            print(f"[DEBUG] 🧠 Meilleure suggestion : {best_match_title}")

            suggested_page = wiki.page(best_match_title)

            if suggested_page.exists():
                summary = suggested_page.summary
                print(f"[DEBUG] 📚 Résumé suggéré : {summary[:200]}...")

                image_url = None
                try:
                    title_encoded = best_match_title.replace(" ", "_")
                    img_api_url = f"https://fr.wikipedia.org/api/rest_v1/page/summary/{title_encoded}"
                    img_response = requests.get(img_api_url, timeout=10).json()
                    print(f"[DEBUG] 🖼️ Données image : {img_response}")
                    image_url = img_response.get("thumbnail", {}).get("source")
                except requests.exceptions.RequestException as e:
                    print(f"[DEBUG] ⚠️ Erreur image : {e}")

                return {
                    "type": "wikipedia",
                    "title": suggested_page.title,
                    "requested": query,
                    "summary": summary,
                    "url": suggested_page.fullurl,
                    "image": image_url
                }

        print("[DEBUG] ❌ Aucun résultat dans la recherche API.")
        return {
            "type": "error",
            "message": f"Aucun article trouvé pour '{query}'",
            "search_url": f"https://fr.wikipedia.org/wiki/Special:Search?search={query}"
        }

    except requests.exceptions.Timeout:
        print("[ERREUR] 🕒 La requête a dépassé le temps limite.")
        return {
            "type": "error",
            "message": "⏳ La connexion à Wikipédia a expiré. Réessayez plus tard."
        }
    except requests.exceptions.RequestException as e:
        print(f"[ERREUR] 🔌 Erreur réseau : {e}")
        return {
            "type": "error",
            "message": "Une erreur réseau est survenue. Vérifiez votre connexion."
        }
    except Exception as e:
        print(f"[ERREUR] 🛑 Erreur inconnue : {e}")
        return {
            "type": "error",
            "message": "Erreur lors de la recherche. Veuillez reformuler."
        }
