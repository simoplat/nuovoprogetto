# 🎮 Party Game Hub

Una moderna web application **100% serverless, reattiva e modulare** per giocare ai migliori **Party Game di gruppo** sia da **smartphone** che da **desktop**.

L'applicazione è progettata per serate tra amici, feste, viaggi e pub: funziona direttamente dal browser senza installare app, senza registrazioni e senza server di gioco dedicati, ideale per il deploy su **GitHub Pages**!

---

## 🎲 I Giochi Disponibili

### 1. 🕵️ L'Impostore (Undercover / Spyfall)
Un gioco di deduzione sociale, bluff e ingegno. Tutti i cittadini innocenti conoscono la parola segreta e la categoria, mentre gli impostori devono mimetizzarsi ascoltando gli indizi degli altri e bluffare senza farsi scoprire.

- **📱 Modalità "Passa il Telefono" (100% Offline)**:
  - Basta un solo smartphone per tutto il gruppo ($N \ge 3$ giocatori, default 3).
  - Ognuno tiene premuto lo schermo a turno per scoprire la propria identità segreta. Rilasciando il dito, la carta si nasconde all'istante per massima riservatezza.
  - Timer discussione e votazione finale.
- **⚡ Modalità "Stanza Online P2P" (Multi-Dispositivo via WebRTC)**:
  - Ognuno gioca dal proprio smartphone (Wi-Fi, 4G o 5G).
  - Uno smartphone fa da **Host** generando un codice PIN a 4 lettere e un **QR Code / Link diretto**. Gli amici inquadrano il QR Code e si collegano direttamente in stanza P2P!
  - **🗳️ Votazione Distribuita Democratica**: Ogni partecipante esprime il proprio voto dal proprio schermo (`CAST_VOTE`) con monitoraggio in tempo reale dell'avanzamento dei voti.
  - **⚖️ Spareggio a Oltranza (Tie-Breaker Runoff)**: Se due o più giocatori ottengono lo stesso numero massimo di voti, scatta automaticamente un ballottaggio continuo ristretto ai soli pareggiati finché non emerge una maggioranza netta!
  - **🔄 Resilienza di Rete P2P & Host Migration**:
    - *Grace Period (0–25s)*: Se l'Host perde momentaneamente la connessione, un banner con countdown tiene viva la stanza e tenta la riconnessione ogni 3s.
    - *Ripresa Sessione Host*: Se l'Host ricarica la pagina, un banner rapido permette di riprendere la stanza con lo stesso codice PIN.
    - *Migrazione Host (Failover)*: Se l'Host si disconnette per oltre 25s, la stanza viene migrata automaticamente al giocatore successivo senza cambiare PIN né disconnettere gli altri!

---

### 2. 🐺 Lupus in Fabula (Lupus in Tabula)
Il celebre gioco di bluff, strategia e lupi mannari, integrato in modalità **"Passa il Telefono"** per gruppi da **4 a 20 giocatori**.

- **Configurazione Dinamica del Villaggio (Stile L'Impostore)**:
  - **Elenco Giocatori Intuitivo**: Inserimento nomi personalizzati, pulsante `➕ Aggiungi Giocatore` con focus automatico e `🎲 Nomi Casuali` con elenco di 20 nomi italiani.
  - **🐺 Lupi Mannari (Obbligatori)**: Selezionabili con stepper dedicato, con vincolo automatico ($1 \le \text{Lupi} < N / 2$).
  - **⏱️ Durata Discussione Villaggio**: Stepper configurabile da 1 a 10 minuti (con possibilità di concludere in anticipo).
  - **Figure Speciali Opzionali (Attivabili/Disattivabili)**:
    - 🔮 **Veggente**: Ogni notte scopre la vera identità di un giocatore.
    - 🛡️ **Guardia**: Ogni notte protegge un cittadino dal morso dei lupi con il suo scudo (può difendere anche se stessa).
    - 🧙‍♀️ **Strega**: Possiede la *Pozione di Vita* (per salvare la vittima dei lupi) e la *Pozione di Morte* (per avvelenare un sospetto).
    - 💘 **Cupido**: Nella prima notte lega due *Innamorati* (se uno muore, anche l'altro muore all'istante).
    - 💃 **La Donna (Meretrice)**: Ogni notte sceglie un ospite da cui rifugiarsi (se attaccano lei a casa si salva; se sceglie un lupo o l'ospite muore, muori anche lei).
  - **Contadini 👨‍🌾**: I restanti abitanti del villaggio calcolati automaticamente:
    $$\text{Contadini} = N - (\text{Lupi} + \text{Ruoli Speciali})$$
- **🔒 Rivelazione Segreta di Sicurezza con Hold-to-Reveal**:
  - Il telefono viene passato indicando chiaramente il destinatario (`Passa il dispositivo a: [Nome]`).
  - La carta del ruolo **resta visibile esclusivamente tenendo premuto lo schermo** (350ms con indicatore di progresso animato e tick sonoro).
  - Al rilascio del dito la carta scompare all'istante per impedire a chiunque sia vicino di sbirciare, visualizzando il pulsante per passare avanti.
- **🎴 Carte Ruolo con Illustrazioni Artistiche**:
  - Illustrazioni ad alta risoluzione in stile *Tarocco Dark Fantasy* per ogni ruolo (`img/lupus/`).
  - Badge fazione (*Branco dei Lupi 🐺* o *Villaggio 👨‍🌾*), descrizione dei poteri e indicazioni notturne.
  - **Supporto Branco**: Ciascun lupo visualizza sulla propria carta i **nomi dei compagni lupi** per coordinarsi.
- **📜 Dashboard Interattiva del Narratore**:
  - **Registro Abitanti in Tempo Reale**: Tocca un giocatore per passare istantaneamente tra `🟢 Vivo` e `🔴 Morto`.
  - **Chiamata Notturna Guidata**: Passaggi sequenziali nell'ordine corretto: Cupido, Donna, Lupi, Guardia, Veggente e Strega.
  - **Fase Giorno & Timer Rogo**: Timer configurabile con avvisi acustici e pulsante `⚖️ Concludi in Anticipo & Vai al Rogo` per chiudere la discussione appena il gruppo è pronto.
  - **Verifica Automatica della Vittoria**: Annuncio automatico di *Vittoria del Villaggio* (tutti i lupi eliminati) o *Vittoria dei Lupi* (lupi $\ge$ contadini vivi).

---

## 🛠️ Architettura e Caratteristiche Tecniche

- **100% Client-Side & Serverless**: Nessun backend o database Node.js/Python da manutenere; l'app può essere servita come sito statico (GitHub Pages, Netlify, Vercel).
- **WebRTC DataChannels (PeerJS)**: Comunicazione diretta P2P criptata a bassissima latenza tra dispositivi mobili, con connessione broker solo per l'handshake iniziale.
- **Web Audio API**: Effetti sonori procedurali sintetizzati direttamente via codice JavaScript senza file MP3 pesanti.
- **Design System Cyberpunk & Glassmorphism**: Interfaccia moderna con palette colori armoniose, tipografia Google Fonts (Outfit & Plus Jakarta Sans), micro-animazioni e supporto per safe areas mobili.
- **Catalogo Modulare (`js/games/game_registry.js`)**: Architettura a plugin che permette di registrare nuovi giochi con poche righe di configurazione.

---

## 📝 Personalizzazione del Database Parole (`words.json`)

Le parole e gli indizi de **L'Impostore** sono memorizzati in [`words.json`](words.json). Attualmente sono presenti **12 categorie tematiche** con oltre **290 parole segrete** (Cibo, Animali, Oggetti, Luoghi, Mestieri, Sport, Film, Musica, Scienza, Mitologia, Natura, Storia).

> 💡 **Regola degli Indizi**: Ogni indizio è composto da **una sola parola descrittiva** riferita al contesto (es. *"Pasticceria"*, *"Savana"*).

### 1. Aggiungere una parola con indizio:
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

### 2. Aggiungere una parola senza indizio:
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
Ricaricando la pagina, la nuova categoria sarà immediatamente disponibile nel gioco senza dover modificare il codice JavaScript!

---

## 🚀 Come Eseguire il Progetto

Poiché il progetto è composto da file statici HTML, CSS e JavaScript:

1. **In Locale**:
   - Apri semplicemente `index.html` con qualsiasi browser moderno (Chrome, Safari, Edge, Firefox).
   - Oppure avvia un server locale veloce (es. con l'estensione *Live Server* di VS Code o `python -m http.server 8000`).
2. **Online su GitHub Pages**:
   - Vai su **Settings** del repository GitHub $\to$ **Pages**.
   - Seleziona il branch `main` e la cartella `/ (root)`.
   - L'applicazione sarà subito giocabile online gratuitamente da qualsiasi smartphone nel mondo!
