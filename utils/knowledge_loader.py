import os
import json
from pathlib import Path

def load_knowledge():
    knowledge = {}
    base_dir = Path(__file__).parent.parent  # Remonte d'un niveau depuis le dossier utils
    
    # Chemin vers responses.json
    responses_path = base_dir / 'knowledge' / 'responses.json'
    
    # Charger responses.json en premier
    if responses_path.exists():
        with open(responses_path, 'r', encoding='utf-8') as f:
            knowledge["reponses"] = json.load(f)
    
    # Charger les autres fichiers JSON
    knowledge_dir = base_dir / 'knowledge'
    for file_path in knowledge_dir.glob('**/*.json'):
        if file_path.name != 'responses.json':
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Fusionner sans écraser les réponses existantes
                for key, value in data.items():
                    if key not in knowledge:
                        knowledge[key] = value
    
    return knowledge