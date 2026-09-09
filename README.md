# 🕵️ Il Gioco dell'Impostore

Un'applicazione web elegante, reattiva e divertente per giocare al **Gioco dell'Impostore** (Undercover / Spyfall) sia su **smartphone** che su **desktop**.

L'applicazione supporta **3 diverse modalità di gioco**, ideali sia per giocare offline con un solo telefono, sia per giocare online tra smartphone senza alcun computer, sia con server locale:

---

## 🎮 Le 3 Modalità di Gioco

### 1. 📱 Modalità "Passa il Telefono" (1 Solo Smartphone / 100% Offline)
- **Zero PC, zero internet, zero installazioni**: serve solo un unico smartphone in tutto il gruppo!
- Inserisci i nomi dei giocatori ($N \ge 3$) e il numero di impostori ($1 \le K < N$).
- Ci si passa il telefono a turno: ognuno **tiene premuto lo schermo** per visualizzare il proprio ruolo in segreto.
  - *Cittadino*: vede la parola segreta e la categoria.
  - *Impostore*: vede l'allarme rosso ("SEI L'IMPOSTORE!") e non conosce la parola.
- Rilasciando il dito la carta si nasconde all'istante per sicurezza.
- Timer di discussione e votazione finale con verdetto drammatico.

### 2. ⚡ Modalità "Stanza Online P2P" (Senza PC / Ideale per GitHub Pages & Smartphone)
- **Nessun PC necessario! Funziona al 100% nel browser via WebRTC (PeerJS)**.
- Uno smartphone fa da **Host** cliccando *"Crea Nuova Stanza"* e ottiene un codice PIN a 4 lettere (es. `AB7K`) e un **QR Code**.
- Tutti gli amici inquadrano il QR Code (o digitano il codice) dal proprio telefono (connessi via Wi-Fi o rete cellulare 4G/5G).
- L'Host sceglie la categoria e il numero di impostori, poi preme *"Avvia Partita per Tutti"*.
- Ciascun giocatore riceve in tempo reale sul proprio display il proprio ruolo personale!

### 3. 💻 Modalità "Server Locale Wi-Fi" (LAN con PC Host)
- Per chi gioca a casa e preferisce usare il PC come server locale.
- Avviabile con un doppio clic su `avvia_gioco.bat` (oppure `python server.py`).
- Rileva l'IP locale (es. `http://192.168.1.XX:8000`) e genera il QR Code locale.

---

## 🚀 Come Pubblicare su GitHub Pages (Gratis in 1 Minuto)

Poiché il gioco è sviluppato interamente in HTML, CSS e JavaScript client-side (con PeerJS per il multiplayer):

1. Carica la cartella del progetto sul tuo repository GitHub:
   ```bash
   git add .
   git commit -m "Aggiunto Gioco dell'Impostore con P2P WebRTC"
   git push origin main
   ```
2. Vai su **GitHub** nel tuo browser e apri la pagina del repository.
3. Clicca su **Settings** (in alto a destra).
4. Nel menu a sinistra seleziona **Pages**.
5. Sotto la voce **Build and deployment** / **Branch**:
   - Seleziona **`main`** (o `master`) e cartella **`/ (root)`**.
   - Clicca su **Save**.
6. Dopo circa 30-60 secondi, GitHub ti fornirà un link HTTPS pubblico:
   `https://<tuo-username>.github.io/<nome-repo>/`
7. Condividi questo link con chiunque! Funzionerà sia la modalità *"Passa il Telefono"* che la modalità *"Stanza Online P2P"* direttamente dagli smartphone di tutti!

---

## 🎨 Caratteristiche Tecniche
- **Design Cyberpunk Neon & Glassmorphism**: Ottimizzato con `touch-action: manipulation`, feedback visivo e supporto sicuro per iOS/Android.
- **Web Audio API**: Effetti sonori procedurali (suspense, allarme, vittoria, timer) sintetizzati via codice senza scaricare file audio pesanti.
- **WebRTC DataChannels**: Comunicazione crittografata e a bassissima latenza diretta tra smartphone.
