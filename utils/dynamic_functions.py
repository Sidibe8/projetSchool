from datetime import datetime
import requests

def get_time():
    return datetime.now().strftime("%H:%M")

def get_date():
    return datetime.now().strftime("%d/%m/%Y")

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

def replace_placeholders(text):
    dynamic_values = {
        "heure": get_time(),
        "date": get_date(),
        "jour": get_day(),
        "meteo": get_weather()
    }
    for tag, value in dynamic_values.items():
        text = text.replace(f"{{{tag}}}", value)
    return text