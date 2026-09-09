# 🕵️ Il Gioco dell'Impostore

Un'applicazione web elegante, reattiva e divertente per giocare al **Gioco dell'Impostore** (Undercover / Spyfall) sia su **smartphone** che su **desktop**.

L'applicazione supporta **2 modalità di gioco 100% serverless**, perfette per giocare ovunque (al parco, al pub, a casa o in viaggio) senza bisogno di alcun computer o installazione:

---

## 🎮 Le Modalità di Gioco

### 1. 📱 Modalità "Passa il Telefono" (1 Solo Smartphone / 100% Offline)
- **Zero PC, zero internet, zero installazioni**: serve solo un unico smartphone in tutto il gruppo!
- Inserisci i nomi dei giocatori ($N \ge 3$) e il numero di impostori ($1 \le K < N$).
- Ci si passa il telefono a turno: ognuno **tiene premuto lo schermo** per visualizzare il proprio ruolo in segreto.
  - *Cittadino*: vede la parola segreta e la categoria.
  - *Impostore*: vede l'allarme rosso ("SEI L'IMPOSTORE!") e non conosce la parola.
- Rilasciando il dito la carta si nasconde all'istante per sicurezza.
- Timer di discussione e votazione finale con verdetto drammatico.

### 2. ⚡ Modalità "Stanza Online P2P" (Multi-Smartphone / 4G, 5G o Wi-Fi)
- **Zero server! Funziona al 100% nel browser via WebRTC (PeerJS)**.
- Uno smartphone fa da **Host** cliccando *"Crea Nuova Stanza"* e ottiene un codice PIN a 4 lettere (es. `AB7K`) e un **QR Code / Link diretto**.
- Tutti gli amici aprono il link o inquadrano il QR Code dal proprio telefono (connessi con **5G, 4G o Wi-Fi**).
- **Accesso diretto**: chi riceve il link bypassa ogni selezione e trova subito il campo per digitare il proprio nome ed entrare in partita!
- L'Host sceglie la categoria e il numero di impostori, poi preme *"Avvia Partita per Tutti"*.
- Ciascun giocatore riceve in tempo reale sul proprio display il proprio ruolo personale!

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

---

## 📝 Come Personalizzare Parole e Indizi (`words.json`)

Tutte le parole, gli indizi per l'impostore e le categorie sono memorizzati nel file **[`words.json`](words.json)** nella cartella principale:

> 💡 **Regola Indizi**: Ogni indizio deve essere **una sola parola generica riferita al contesto** (es. *"Forno"*, *"Pesce"*, *"Savana"*). Se non ci sono indizi associati, l'indizio sarà vuoto e l'impostore giocherà senza suggerimento.

### 1. Aggiungere una parola con indizio a una categoria esistente:
```json
{
  "cibo": {
    "name": "Cibo & Bevande 🍕",
    "words": [
      { "word": "Cannolo Siciliano", "clue": "Pasticceria" }
    ]
  }
}
```

### 2. Aggiungere una parola senza indizio (l'indizio sarà vuoto):
```json
"words": [
  "Tiramisù",
  "Lasagne"
]
```

### 3. Creare una nuova categoria personalizzata:
Basta aggiungere un nuovo blocco in `words.json`:
```json
"anime": {
  "name": "Anime & Manga ⛩️",
  "words": [
    { "word": "Goku", "clue": "Combattimento" },
    { "word": "Naruto", "clue": "Ninja" },
    "One Piece"
  ]
}
```
Salva il file `words.json` e ricarica la pagina: la nuova categoria e le nuove parole saranno **subito disponibili nel gioco senza toccare una sola riga di codice JavaScript!**

