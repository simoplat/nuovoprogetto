# Piano di Implementazione: Azioni Notturne Interattive & Risoluzione Automatica all'Alba

## Descrizione dell'Obiettivo
Attualmente, nella schermata del Narratore di **Lupus in Fabula**, i passaggi notturni forniscono istruzioni testuali e il Narratore doveva ricordare a memoria le scelte e segnare manualmente i morti all'Alba.
L'obiettivo è rendere **ogni singolo step notturno interattivo con controlli dedicati** (pulsanti/griglie di selezione giocatore, toggle pozioni, indicatore chiaro delle scelte effettuate) e **calcolare automaticamente all'Alba l'esito della notte**:
1. Chi è stato sbranato dai Lupi
2. Se la vittima è stata salvata dalla Guardia o dalla Strega
3. Se la Donna è morta (ha visitato un lupo, o l'ospite è morto, o è stata sbranata mentre era a casa)
4. Se la Strega ha avvelenato qualcuno
5. Se il Lupo Bianco ha sbranato un lupo
6. Morte a catena degli Innamorati (crepacuore) se uno dei due muore
7. Conteggio e memoria delle pozioni residue della Strega (Vita e Morte) durante tutta la partita.

---

## 1. Dettagli delle Azioni Notturne per Step

### A. Cupido (Notte 1)
- **Scelta**: Selezione di 2 giocatori tra i vivi da legare come Innamorati.
- **Effetto**: Imposta `isLover = true` e salva i riferimenti. Se durante il gioco uno dei due muore (notte o rogo), l'altro muore all'istante di crepacuore con notifica al narratore.

### B. La Donna (Ogni notte se viva)
- **Scelta**: Seleziona il giocatore da visitare questa notte (tra i vivi, escluso se stessa).
- **Regole ufficiali**:
  - Se la Donna visita un Lupo (o Lupo Stregone, Lupo Bianco, Cane Nero) $\to$ **La Donna muore sbranata**.
  - Se il giocatore ospite viene ucciso dai lupi $\to$ **Muoiono sia l'ospite che la Donna** (a meno che non sia salvato da pozione vita).
  - Se i lupi attaccano la Donna ma lei è via da un ospite innocente $\to$ **La Donna è salva** perché non era a casa!
  - Se la Donna non visita nessuno o è bloccata $\to$ vulnerabile a casa sua.

### C. Branco dei Lupi (Ogni notte se ci sono lupi vivi)
- **Scelta**: Seleziona la vittima designata dal branco tra tutti i giocatori vivi non-lupi (o qualsiasi vivo).

### D. Lupo Stregone (Ogni notte se vivo)
- **Scelta**: Seleziona 1 giocatore da silenziare/bloccare per la notte.
- **Effetto**: Se quel giocatore è Guardia, Veggente o Strega, il suo potere per questa notte viene annullato!

### E. Lupo Bianco (Notti pari 2, 4, 6... se vivo)
- **Scelta**: Può scegliere 1 lupo del branco da sbranare alle spalle, oppure "Nessuno (Passa)".

### F. Guardia (Ogni notte se viva)
- **Scelta**: Seleziona 1 giocatore da proteggere con lo scudo (anche se stessa).
- **Effetto**: Se quel giocatore è la vittima dei lupi, **sopravvive**.

### G. Veggente (Ogni notte se vivo)
- **Scelta**: Seleziona 1 giocatore da scrutare.
- **Feedback istantaneo al Narratore**: Viene mostrato a schermo il cartello chiaro da comunicare:
  - 🐺 **LUPO!** (se Lupo, Lupo Stregone, Lupo Bianco, o se è l'**Idiota del Villaggio**)
  - 👤 **NON LUPO** (se Contadino, Guardia, Strega, Cupido, Donna, Beccamorto, o se è l'**Infiltrato** o il **Cane Nero**)

### H. Beccamorto (Notte 2+ se vivo)
- **Feedback istantaneo al Narratore**: Mostra la carta/ruolo del giocatore eliminato nel turno precedente da rivelare al Beccamorto.

### I. Strega (Ogni notte se viva)
- **Stato Pozioni**: Indicatore visivo costante:
  - 🧪 **Pozione di Vita**: [Disponibile / Usata]
  - ☠️ **Pozione di Morte**: [Disponibile / Usata]
- **Opzione Salva**: Se la pozione di vita è disponibile e ci sono vittime dei lupi $\to$ Switch "Usa Pozione di Vita su [Nome Vittima]".
- **Opzione Veleno**: Se la pozione di morte è disponibile $\to$ Può selezionare un giocatore da avvelenare (o "Non usare veleno").

---

## 2. All'Alba: Risoluzione Automatica & Riepilogo Trasparente

Quando si arriva allo step dell'**Alba**:
1. L'algoritmo di risoluzione notturna analizza tutte le scelte registrate:
   - Vittime lupi vs Scudo Guardia vs Pozione Vita Strega
   - Esito visita della Donna
   - Vittima del Lupo Bianco
   - Vittima avvelenata dalla Strega
   - Effetto a catena Innamorati
2. Viene visualizzato un **Riepilogo Dettagliato della Notte**:
   - Mostra chi è morto e perché (es. *"Marco è stato sbranato dai lupi"*, *"Sofia (Donna) ha visitato un Lupo ed è morta"*, *"Luca è morto di crepacuore per la perdita dell'innamorato"*).
   - Se qualcuno è stato salvato, mostra: *"Nessun morto dai lupi: lo scudo della Guardia ha protetto la vittima!"* o *"La Strega ha usato la Pozione di Vita!"*.
3. Il **Registro Abitanti** viene aggiornato automaticamente impostando `isAlive = false` per tutti i caduti, con verifica istantanea delle condizioni di vittoria (Lupi, Villaggio, Lupo Bianco).
4. Il Narratore ha comunque la facoltà di correggere manualmente nel registro se necessario.

---

## 3. File Interessati
- [MODIFY] [`index.html`](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/index.html): Aggiunta del contenitore UI per le azioni notturne dinamiche (`#lupus-step-action-widget`) all'interno di `#lupus-master-step-box`.
- [MODIFY] [`js/games/lupus_game.js`](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/js/games/lupus_game.js):
  - Inizializzazione dello stato notturno (`nightActions = { wolfTarget, guardTarget, witchHeal, witchKill, witchLifeUsed, witchDeathUsed, donnaTarget, loverIds, stregoneTarget, lupoBiancoTarget, seerTarget }`).
  - Rendering dei widget interattivi di selezione per ciascuno step notturno.
  - Funzione `resolveNightOutcomes()` invocata all'ingresso dell'Alba che calcola morti, protezioni, pozioni e innamorati.
- [MODIFY] [`css/style.css`](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/css/style.css): Stili per le schede di selezione giocatore notturna, badge di stato pozioni della strega, esito chiaroveggenza e banner riassunto dell'Alba.

---

## 4. Piano di Verifica
- Test con script headless Edge per simulare:
  1. Selezione vittima lupi + Guardia che protegge $\to$ all'Alba la vittima si salva e resta viva.
  2. Strega che usa pozione vita $\to$ vittima salvata, la pozione risulta consumata per le notti successive.
  3. Strega che usa veleno $\to$ la persona indicata muore all'Alba.
  4. Donna che visita un lupo $\to$ la Donna muore all'Alba.
  5. Innamorati legati da Cupido $\to$ la morte di uno provoca la morte dell'altro.
  6. Veggente che scruta l'Idiota $\to$ cartello "LUPO", e Cane Nero $\to$ cartello "NON LUPO".
