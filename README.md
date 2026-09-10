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
Il celebre gioco di deduzione sociale, bluff, strategia e inganno, ottimizzato in modalità **"Passa il Telefono"** per gruppi da **4 a 20 giocatori** con dashboard interattiva del Narratore.

---

#### 🎭 Le Tre Fazioni & Tutti i 14 Ruoli Disponibili

##### 🏛️ Alleati del Villaggio
L'obiettivo dei cittadini è smascherare ed eliminare tutti i Lupi Mannari mediante il voto diurno al rogo.

* **👨‍🌾 Contadino**: Il cuore pulsante del villaggio. Non possiede poteri notturni speciali: dorme durante la notte e usa osservazione, intuito, logica e dialettica per smascherare i colpevoli durante il dibattito e il voto diurno.
* **🔮 Veggente**: Ogni notte viene svegliato dal Narratore per scrutare l'identità di un giocatore. Il Narratore risponde silenziosamente con un cenno del capo: *Lupo* o *Non Lupo*.  
  *(⚠️ Eccezioni mistiche: l'Idiota del Villaggio appare falsamente come Lupo; il Cane Nero e l'Infiltrato appaiono come Non Lupo).*
* **🛡️ Guardia**: Ogni notte veglia sul villaggio e indica un giocatore da difendere con il suo scudo (può proteggere anche se stessa). Se la persona protetta viene presa di mira dall'attacco notturno dei Lupi, lo scudo la salverà impedendone la morte.
* **🧙‍♀️ Strega**: Possiede due potenti pozioni alchemiche monouso da usare nel corso della partita:
  * *Pozione di Vita*: salva la vittima designata dai Lupi nella notte corrente.
  * *Pozione di Morte*: avvelena ed elimina istantaneamente un qualsiasi altro giocatore a sua scelta.
* **💘 Cupido**: Durante la primissima notte di gioco scocca le sue frecce legando due giocatori come *Innamorati*. I due innamorati si riconoscono aprendo gli occhi su tocco del Narratore. Se uno dei due muore in qualsiasi modo (sbranato, avvelenato o arso al rogo), l'altro muore all'istante di crepacuore!
* **💃 La Donna (Meretrice)**: Ogni notte sceglie un giocatore da cui rifugiarsi.
  * Se i Lupi attaccano la sua casa, non la trovano e si salva.
  * Se si rifugia da un Lupo, viene sbranata.
  * Se il suo ospite viene attaccato e ucciso, muore insieme a lui.
* **⚰️ Il Beccamorto**: Dalla Notte 2 in poi, si sveglia nel cuore delle tenebre e il Narratore gli svela segretamente il **ruolo esatto del giocatore morto nel round precedente** (rivelazione postuma con 1 turno di ritardo), fornendo preziose conferme sulle accuse del villaggio.
* **🤡 L'Idiota del Villaggio**: Un fedele cittadino del villaggio la cui eccentricità inganna la chiaroveggenza: se scrutato dal Veggente, il Narratore risponderà falsamente che si tratta di un **Lupo**! Deve difendersi dalle false accuse senza farsi bruciare ingiustamente.

##### 🐺 Branco dei Lupi & Alleati Oscuri
L'obiettivo dei Lupi è decimare gli abitanti fino a eguagliare o superare il numero dei superstiti non-lupi.

* **🐺 Lupo (Branco)**: Si sveglia ogni notte con i suoi compagni di branco per scegliere consensualmente una vittima silenziosamente indicata al Narratore. Di giorno, si mimetizza fingendosi un pacifico villico.
* **🐺🔮 Il Lupo Stregone**: Si sveglia e attacca regolarmente con il branco dei Lupi. Subito dopo, si risveglia una seconda volta da solo e scaglia la sua maledizione: indica un giocatore al Narratore; se quel giocatore possiede un potere notturno attivo (*Guardia, Veggente, Strega, Beccamorto*), la sua abilità viene **annullata e bloccata** per tutta la notte corrente!
* **🐕‍🦺 Il Cane Nero (Lupo Illusionista)**: Lupo mannaro a tutti gli effetti che si risveglia con il branco per scegliere la vittima notturna. Tuttavia, la sua illusione canina inganna le visioni mistiche: al Veggente risulta insospettabilmente come **Non Lupo**.
* **🐺🌕 Il Lupo Mannaro (Licantropo Latente)**: Un essere umano affetto dalla maledizione della licantropia. Dorme con gli umani e al Veggente appare *Non Lupo*, ma ogni notte viene lanciato il dado della Luna Piena: se si trasforma, diventa per sempre un Lupo del Branco a tutti gli effetti!

##### 🃏 Fazione Solitaria (Cani Sciolti)
Ruoli indipendenti con obiettivi di vittoria propri ed esclusivi.

* **🃏 Il Giullare**: Il maestro assoluto del caos e del bluff inverso. Non appartiene ad alcuna fazione: **vince la partita unicamente se riesce a farsi condannare al rogo dal Villaggio**! Deve comportarsi in modo abbastanza sospetto da farsi votare dalla maggioranza, ma senza essere troppo ovvio. Se viene bruciato al rogo, la partita termina istantaneamente con il suo trionfo solitario!
* **🐺❄️ Il Lupo Bianco**: Un lupo albino solitario. Si sveglia ogni notte con il branco fingendo alleanza per la vittima del villaggio. A **notti alterne** (notti pari: 2, 4, 6...), si risveglia da solo e ha la facoltà di sbranare uno degli altri Lupi! **Vince unicamente se rimane l'ultimo e unico sopravvissuto in assoluto** della partita.

---

#### 🔄 Struttura del Round di Gioco

Ogni round di *Lupus in Fabula* è suddiviso in 4 fasi continue guidate dalla dashboard del Narratore:

1. **🌙 La Notte (Chiamate Guidate)**:
   * *Calano le Tenebre*: Tutti i giocatori chiudono gli occhi.
   * *Cupido*: Solo Notte 1, sceglie i due innamorati e il Narratore li tocca per farli riconoscere.
   * *La Donna*: Indica l'ospite da cui rifugiarsi.
   * *Il Branco dei Lupi*: Si risvegliano tutti i lupi (*Lupi base, Lupo Stregone, Cane Nero e Lupo Bianco*) e scelgono la vittima designata.
   * *Lupo Stregone*: Si sveglia da solo e blocca il potere notturno di un giocatore.
   * *Lupo Bianco*: Solo notti pari (2, 4, 6...), può eliminare a tradimento un altro lupo del branco.
   * *La Guardia*: Indica chi proteggere con il proprio scudo.
   * *Il Veggente*: Indica chi scrutare (risposta: Lupo o Non Lupo, tenendo conto di Idiota, Cane Nero e Infiltrato).
   * *Il Beccamorto*: Dalla Notte 2 in poi, scopre l'identità del morto del round precedente.
   * *La Strega*: Vede la vittima dei lupi e sceglie se usare la pozione di vita e/o morte.

2. **☀️ L'Alba (Risveglio del Villaggio)**:
   * Il sole sorge e tutti gli abitanti aprono gli occhi.
   * Il Narratore annuncia chi è caduto nella notte (chi è stato protetto dalla Guardia o salvato dalla Strega sopravvive).
   * **Registro Abitanti Interattivo**: Esclusivamente in questa fase è abilitata la modifica dello status (`🟢 Vivo` / `🔴 Morto`) toccando il chip del giocatore, per evitare tocchi accidentali durante le altre fasi.

3. **⏱️ Il Giorno & Dibattito del Villaggio**:
   * Gli abitanti discutono, si accusano, si difendono ed elaborano teorie per scoprire i Lupi.
   * **Timer Automatico Intelligente**: Si avvia automaticamente con feedback acustico al secondo (tick ritmico e allarme negli ultimi 10 secondi).
   * **Concludi e Vai al Voto**: Pulsante rapido per passare direttamente alla votazione senza attendere lo scadere dei minuti se il gruppo è già compatto.

4. **🔥 La Votazione del Rogo**:
   * Il villaggio vota chi mandare al rogo tra i cittadini ancora in vita.
   * Si tocca la scheda dell'**unico accusato** e si preme `🔥 Condanna al Rogo`.
   * **Risoluzione Immediata**:
     * Se il condannato è il **Giullare**, la partita si chiude sul colpo con il trionfo del Giullare!
     * Se una fazione vince, compare la schermata di riepilogo con tutte le identità segrete svelate.
     * Se la partita prosegue, compare il banner di esito con countdown di 4 secondi (o pulsante manuale) per passare fluidamente alla Notte successiva.

---

#### 🏆 Condizioni di Fine Partita

| Esito | Condizione di Attivazione | Vincitori |
|---|---|---|
| **🎉 Trionfo del Villaggio** | Tutti i lupi ostili (*Lupo base, Lupo Stregone, Cane Nero, Lupo Bianco*) sono morti. | Contadini, Veggente, Guardia, Strega, Cupido, Donna, Beccamorto, Idiota. |
| **🐺 Dominio dei Lupi** | I Lupi vivi eguagliano o superano i non-lupi vivi ($N_{\text{lupi}} \ge N_{\text{non-lupi}}$). | Lupi base, Lupo Stregone, Cane Nero e l'**Infiltrato**. |
| **🃏 Trionfo del Giullare** | Il Giullare viene condannato e arso al rogo dal Villaggio. | **Il Giullare** (vittoria solitaria istantanea). |
| **🐺❄️ Supremazia del Lupo Bianco** | Il Lupo Bianco è l'ultimo e unico sopravvissuto di tutta la partita ($N_{\text{vivi}} = 1$). | **Il Lupo Bianco** (vittoria solitaria). |

---

#### 🔒 Modalità Passa il Telefono con Tarocchi Gotici
* **Hold-to-Reveal**: Il dispositivo mostra `Passa a: [Nome]` e richiede una pressione continua di 350ms con indicatore radiale per rivelare l'identità.
* **Massima Riservatezza**: Appena si stacca il dito, la schermata si oscura istantaneamente impedendo occhiate indiscrete.
* **14 Tarocchi Gotico-Medievali**: Illustrazioni ad altissima risoluzione a 3:4 con cornici dorate, rune incise, gemme mistiche e cartigli decorativi per ciascun ruolo.
* **Compagni di Branco**: Chi si risveglia con i lupi (*Lupo base, Lupo Bianco, Lupo Stregone, Cane Nero*) vede elencati i nomi dei propri compagni di branco direttamente sulla carta segreta.

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
