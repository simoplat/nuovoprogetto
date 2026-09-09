#!/usr/bin/env python3
"""
Server di Rete Locale per il Gioco dell'Impostore
Costruito interamente con la libreria standard di Python (Zero dipendenze pip!)
Multithreaded, rileva l'IP LAN locale e gestisce la sincronizzazione in tempo reale per tutti i telefoni.
"""

import os
import sys
import json
import time
import socket
import random
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# Porta predefinita
PORT = 8000

def get_lan_ip():
    """Rileva l'indirizzo IP locale del computer all'interno della rete Wi-Fi/LAN"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Non invia traffico reale, serve solo per scoprire l'interfaccia di rete primaria
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# Database di parole sul server (replicato da words.js per assegnazione sicura server-side)
SERVER_WORD_DATABASE = {
    "cibo": {
        "name": "Cibo & Bevande 🍕",
        "words": ["Pizza", "Sushi", "Gelato", "Lasagne", "Tiramisù", "Hamburger", "Cappuccino", "Spaghetti", "Cioccolato", "Risotto", "Patatine fritte", "Crepes", "Nutella", "Tacos", "Kebab", "Pancake", "Macedonia", "Bistecca", "Gnocchi", "Croissant"]
    },
    "animali": {
        "name": "Animali 🐾",
        "words": ["Pinguino", "Leone", "Delfino", "Canguro", "Camaleonte", "Squalo", "Panda", "Pipistrello", "Aquila", "Giraffa", "Serpente", "Zebra", "Koala", "Coccodrillo", "Gufo", "Polpo", "Elefante", "Tartaruga", "Lupo"]
    },
    "luoghi": {
        "name": "Luoghi & Viaggi ✈️",
        "words": ["Spiaggia", "Montagna", "Aeroporto", "Colosseo", "Parigi", "Discoteca", "Ospedale", "Museo", "Cinema", "Stadio", "Supermercato", "Stazione dei treni", "Luna Park", "Biblioteca", "Castello", "Piscina", "Hotel di lusso", "Venezia"]
    },
    "cinema": {
        "name": "Cinema & Personaggi 🎬",
        "words": ["Harry Potter", "Batman", "Spider-Man", "Il Gladiatore", "Shrek", "Star Wars", "Titanic", "Sherlock Holmes", "Jack Sparrow", "James Bond", "Darth Vader", "Joker", "Barbie", "Super Mario", "Gollum"]
    },
    "oggetti": {
        "name": "Oggetti Quotidiani 📦",
        "words": ["Ombrello", "Spazzolino", "Forchetta", "Smartphone", "Sveglia", "Occhiali da sole", "Cuscino", "Portafoglio", "Scarpe da ginnastica", "Zaino", "Chiavi di casa", "Phon per capelli", "Lampada", "Borraccia", "Telecomando"]
    },
    "mestieri": {
        "name": "Mestieri & Ruoli 💼",
        "words": ["Astronauta", "Pompiere", "Medico chirurgo", "Detective privato", "Pizzaiolo", "Pilota di aerei", "Calciatore famoso", "Attore di Hollywood", "Archeologo", "Barbiere", "Spia segreta", "Giudice", "Chef stellato", "Mago"]
    },
    "sport": {
        "name": "Sport & Tempo Libero ⚽",
        "words": ["Calcio", "Tennis", "Pallacanestro", "Scacchi", "Nuoto", "Pugilato", "Bowling", "Sci alpino", "Formula 1", "Arrampicata", "Biliardo", "Surf", "Padel", "Ciclismo", "Videogiochi"]
    }
}

class RoomState:
    """Stato centralizzato della stanza Wi-Fi"""
    def __init__(self):
        self.reset_to_lobby()

    def reset_to_lobby(self):
        self.status = "lobby" # lobby, revealing, discussion, voting, game_over
        self.host_id = None
        self.players = [] # list of { id, name, last_seen, is_host }
        self.impostor_count = 1
        self.category = "random"
        self.secret_word = None
        self.category_name = None
        self.assignments = {} # player_id -> { is_impostor, word, category }
        self.starter_name = None
        self.voted_player = None
        self.timer_duration = 180
        self.timer_started_at = None

    def get_public_state(self, current_player_id=None):
        """Restituisce lo stato pubblico della partita SENZA svelare chi sono gli impostori"""
        return {
            "status": self.status,
            "host_id": self.host_id,
            "players": [{
                "id": p["id"],
                "name": p["name"],
                "is_host": p["id"] == self.host_id
            } for p in self.players],
            "player_count": len(self.players),
            "impostor_count": self.impostor_count,
            "starter_name": self.starter_name,
            "voted_player": self.voted_player,
            "category_name": self.category_name if self.status in ["discussion", "voting", "game_over"] else None,
            "secret_word": self.secret_word if self.status == "game_over" else None,
            "impostors": [p["name"] for p in self.players if self.assignments.get(p["id"], {}).get("is_impostor")] if self.status == "game_over" else None
        }

room = RoomState()

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class ImpostorRequestHandler(SimpleHTTPRequestHandler):
    """Gestore delle richieste HTTP per file statici e API REST"""
    protocol_version = "HTTP/1.0"

    def address_string(self):
        # Evita lookup DNS lento su Windows che causa 2 secondi di ritardo a richiesta
        return str(self.client_address[0])

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/info':
            lan_ip = get_lan_ip()
            self.send_json({
                "lan_ip": lan_ip,
                "port": PORT,
                "url": f"http://{lan_ip}:{PORT}?join=1"
            })
            return

        elif path == '/api/room/state':
            player_id = query.get('player_id', [None])[0]
            self.send_json(room.get_public_state(player_id))
            return

        elif path == '/api/room/my_secret':
            player_id = query.get('player_id', [None])[0]
            if not player_id or player_id not in room.assignments:
                self.send_json({"error": "Nessun ruolo assegnato o giocatore non trovato"}, 400)
                return
            
            secret = room.assignments[player_id]
            self.send_json({
                "is_impostor": secret["is_impostor"],
                "word": secret["word"] if not secret["is_impostor"] else None,
                "category": secret["category"]
            })
            return

        # Serve static assets
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if path == '/api/room/join':
            player_name = data.get('player_name', '').strip()
            player_id = data.get('player_id') or f"p_{int(time.time() * 1000)}_{random.randint(100, 999)}"

            if not player_name:
                player_name = f"Giocatore {len(room.players) + 1}"

            # Controlla se il giocatore esiste già (riconnessione)
            existing = next((p for p in room.players if p["id"] == player_id), None)
            if existing:
                existing["name"] = player_name
                existing["last_seen"] = time.time()
            else:
                is_first = len(room.players) == 0
                if is_first or not room.host_id:
                    room.host_id = player_id

                room.players.append({
                    "id": player_id,
                    "name": player_name,
                    "last_seen": time.time()
                })

            self.send_json({
                "success": True,
                "player_id": player_id,
                "is_host": player_id == room.host_id,
                "state": room.get_public_state(player_id)
            })
            return

        elif path == '/api/room/start':
            player_id = data.get('player_id')
            if player_id != room.host_id:
                self.send_json({"error": "Solo l'Host può avviare la partita"}, 403)
                return

            if len(room.players) < 3:
                self.send_json({"error": "Servono almeno 3 giocatori per avviare"}, 400)
                return

            impostor_count = int(data.get('impostor_count', 1))
            max_imp = max(1, (len(room.players) - 1) // 2)
            impostor_count = max(1, min(max_imp, impostor_count))
            room.impostor_count = impostor_count

            category_id = data.get('category', 'random')
            custom_word = data.get('custom_word', '').strip()

            if custom_word:
                secret_word = custom_word
                category_name = "Parola Personalizzata"
            else:
                cat_keys = list(SERVER_WORD_DATABASE.keys())
                sel_cat = category_id if category_id in SERVER_WORD_DATABASE else random.choice(cat_keys)
                cat_data = SERVER_WORD_DATABASE[sel_cat]
                secret_word = random.choice(cat_data["words"])
                category_name = cat_data["name"]

            room.secret_word = secret_word
            room.category_name = category_name

            # Assegna gli impostori a caso in modo equo
            player_ids = [p["id"] for p in room.players]
            random.shuffle(player_ids)
            impostors_set = set(player_ids[:impostor_count])

            room.assignments = {}
            for pid in player_ids:
                is_imp = pid in impostors_set
                room.assignments[pid] = {
                    "is_impostor": is_imp,
                    "word": secret_word if not is_imp else None,
                    "category": category_name
                }

            # Estrai il primo che parla
            starter = random.choice(room.players)
            room.starter_name = starter["name"]
            room.status = "revealing"
            room.voted_player = None

            self.send_json({"success": True, "state": room.get_public_state(player_id)})
            return

        elif path == '/api/room/start_discussion':
            player_id = data.get('player_id')
            if player_id != room.host_id:
                self.send_json({"error": "Solo l'Host può avviare la discussione"}, 403)
                return

            room.status = "discussion"
            room.timer_duration = int(data.get('timer_duration', 180))
            room.timer_started_at = time.time()
            self.send_json({"success": True, "state": room.get_public_state(player_id)})
            return

        elif path == '/api/room/start_voting':
            player_id = data.get('player_id')
            if player_id != room.host_id:
                self.send_json({"error": "Solo l'Host può avviare la votazione"}, 403)
                return

            room.status = "voting"
            self.send_json({"success": True, "state": room.get_public_state(player_id)})
            return

        elif path == '/api/room/vote':
            player_id = data.get('player_id')
            target_id = data.get('target_id')
            if player_id != room.host_id:
                self.send_json({"error": "Solo l'Host registra il verdetto finale"}, 403)
                return

            target = next((p for p in room.players if p["id"] == target_id), None)
            if not target:
                self.send_json({"error": "Giocatore votato non valido"}, 400)
                return

            is_imp = room.assignments.get(target_id, {}).get("is_impostor", False)
            room.voted_player = {
                "id": target_id,
                "name": target["name"],
                "was_impostor": is_imp
            }
            room.status = "game_over"
            self.send_json({"success": True, "state": room.get_public_state(player_id)})
            return

        elif path == '/api/room/reset':
            player_id = data.get('player_id')
            if player_id != room.host_id:
                self.send_json({"error": "Solo l'Host può ripristinare la lobby"}, 403)
                return

            # Mantieni i giocatori, resetta lo stato della partita
            room.status = "lobby"
            room.secret_word = None
            room.category_name = None
            room.assignments = {}
            room.starter_name = None
            room.voted_player = None
            self.send_json({"success": True, "state": room.get_public_state(player_id)})
            return

        elif path == '/api/room/clear':
            room.reset_to_lobby()
            room.players = []
            room.host_id = None
            self.send_json({"success": True, "state": room.get_public_state()})
            return

        self.send_json({"error": "Endpoint non trovato"}, 404)

def run_server():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    lan_ip = get_lan_ip()
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadingHTTPServer(server_address, ImpostorRequestHandler)

    print("=" * 60)
    print(" [IMPOSTORE] SERVER DI RETE LOCALE AVVIATO CON SUCCESSO! ")
    print("=" * 60)
    print(f" -> Sul computer Host apri:    http://localhost:{PORT}")
    print(f" -> Da smartphone/altri PC:    http://{lan_ip}:{PORT}")
    print("=" * 60)
    print(" Premi CTRL+C per arrestare il server.")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArresto del server...")
        httpd.server_close()
        sys.exit(0)

if __name__ == '__main__':
    run_server()
