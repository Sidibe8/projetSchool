# DeepThink Chatbot - Documentation

## 📌 Description
DeepThink est un chatbot intelligent développé avec Flask qui peut :
- Répondre à des questions basiques
- Donner l'heure, la date et la météo
- Effectuer des recherches sur Wikipedia
- Maintenir une conversation contextuelle

## 🛠 Installation

### Prérequis
- Python 3.8+
- Pipenv (recommandé)

### Étapes d'installation
1. Cloner le dépôt :
   ```bash
   git clone https://github.com/Sidibe8/projetSchool.git
   cd deepthink-chatbot
   ```

2. Installer les dépendances :
   ```bash
   pip install -r requirements.txt
   # OU avec Pipenv
   pipenv install
   ```

3. Configurer l'environnement :
   ```bash
   cp .env.example .env
   # Editer le fichier .env selon vos besoins
   ```

## 🏃‍♂️ Lancer l'application
```bash
python app.py
# OU avec Pipenv
pipenv run python app.py
```

L'application sera disponible sur : http://localhost:5000

## 📂 Structure des fichiers
```
deepthink-chatbot/
├── app.py                # Point d'entrée principal
├── knowledge/
│   ├── responses.json    # Réponses prédéfinies
│   └── ...               # Autres fichiers de connaissances
├── static/               # Fichiers statiques (CSS, JS)
│   └── js/
│       └── script.js     # Script JavaScript principal
├── templates/            # Templates HTML
│   └── index.html
├── utils/                # Utilitaires
│   ├── knowledge_loader.py
│   ├── dynamic_functions.py
│   ├── wikipedia_search.py
│   └── message_processor.py
└── requirements.txt      # Dépendances
```

## 🔧 Configuration
Modifiez `responses.json` pour ajouter ou modifier des réponses :
```json
{
  "salutations": {
    "keywords": ["salut", "bonjour"],
    "reponses": [
      "Bonjour !",
      "Salut à toi !"
    ]
  }
}
```

## 🌐 API Endpoints
- `GET /` - Interface web
- `POST /get_response` - Obtenir une réponse du chatbot

## 🤖 Fonctionnalités clés
- **Gestion de conversation** avec contexte
- **Recherche Wikipedia** intégrée
- **Réponses dynamiques** avec variables (heure, date...)
- **Système de commandes** (ex: `/recherche`, `/aide`)

## 📝 Personnalisation
Pour ajouter une nouvelle fonctionnalité :
1. Créez une fonction dans `utils/dynamic_functions.py`
2. Ajoutez une entrée dans un fichier JSON du dossier `knowledge/`
3. Définissez les mots-clés et les réponses associées

## ⚠️ Dépannage
Si les réponses de base ne fonctionnent pas :
1. Vérifiez que `responses.json` est dans le bon dossier
2. Vérifiez la structure du JSON
3. Consultez les logs pour des erreurs de chargement

## 📄 Licence
MIT License - Libre d'utilisation et de modification

## 🙏 Crédits
Développé par [Dinhojr] - [yorosidibe@arrowbaze.com]