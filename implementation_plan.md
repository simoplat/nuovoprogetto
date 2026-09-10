# Piano: Infiltrato Lupo Mannaro (Dado Luna Piena) & Pozione di Vita Strega

## Descrizione delle Modifiche

Abbiamo due aggiornamenti alle regole di gioco in `Lupus in Fabula`:

1. **L'Infiltrato diventa Lupo Mannaro Latente**:
   - Ogni notte (finché è vivo e non si è ancora trasformato) viene eseguito un passaggio notturno dedicato: **Il Richiamo della Luna** (`infiltrato_moon`).
   - Viene lanciato un dado percentuale (1-100). Se il risultato &le; soglia di Luna Piena, si trasforma.
   - **Probabilità**: parte bassa e sale con il passare delle notti, con una soglia massima `MAX` facilmente configurabile via costante (`INFILTRATO_CONFIG`):
     - `baseChance: 0.10` (10% Notte 1)
     - `chancePerNight: 0.08` (+8% per ogni notte successiva: Notte 2 = 18%, Notte 3 = 26%, ...)
     - `maxChance: 0.45` (Soglia massima modificabile: 45%)
   - **Permanenza**: **Non può tornare normale**. Una volta trasformato, resta lupo per tutta la partita e il passaggio del dado della luna non comparirà più.
   - **Effetti della trasformazione**:
     - Diventa a tutti gli effetti un Lupo del Branco e conta come Lupo nel bilanciamento vittoria (`aliveWolves` lo include, `aliveNonWolves` non lo include più).
     - Si sveglia nel passaggio successivo con il Branco dei Lupi per sbranare la vittima.
     - Al Veggente risulta **LUPO!** (mentre prima appariva Non Lupo).
     - Se la Donna lo visita da trasformato, muore perché ha visitato un Lupo.
     - Il Narratore riceve istruzioni chiare a schermo con un pulsante rapido per lanciare il dado ed eventuale override manuale (Forza Trasformazione / Annulla).

2. **Pozione di Vita della Strega su Qualsiasi Giocatore**:
   - La Strega può decidere chi salvare con la pozione di vita tra **tutti i giocatori vivi**, anche su qualcuno che non è stato attaccato dai lupi.
   - L'interfaccia mostra sia l'indicazione di chi è stato sbranato dai lupi, sia una griglia completa dei giocatori vivi (più "Non Usare").
   - Se usata:
     - La pozione viene consumata per la partita.
     - Se il bersaglio scelto è la vittima dei lupi: viene salvato dai lupi.
     - Se il bersaglio scelto NON è la vittima dei lupi: il bersaglio riceve la benedizione della pozione (nessun danno) e la pozione è consumata; la vittima dei lupi (se non protetta dalla Guardia o rifugiata) muore normalmente.

---

## Modifiche Proposte

### 1. File Principale del Gioco: [lupus_game.js](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/js/games/lupus_game.js)

#### [MODIFY] [lupus_game.js](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/js/games/lupus_game.js)

- **Definizione `INFILTRATO_CONFIG`**:
  ```javascript
  const INFILTRATO_CONFIG = {
    baseChance: 0.1, // 10% Notte 1
    chancePerNight: 0.08, // +8% ogni notte successiva
    maxChance: 0.45, // Tetto massimo modificabile (45%)
  };
  ```
- **Ruolo Infiltrato**: Aggiornato testo e descrizione di `LUPUS_ROLES.infiltrato` in "L'Infiltrato (Lupo Mannaro)", evidenziando la licantropia latente e la trasformazione irreversibile.
- **Inizializzazione giocatore**: Nel mapping delle assegnazioni, aggiungere `isTransformed: false`.
- **Inizializzazione azioni notturne**:
  - `witchHealTarget: null`
  - `infiltratoRoll: null`
- **Passaggi del Round (`getRoundSteps`)**:
  - Aggiungere lo step `infiltrato_moon` subito prima di `lupi`, attivo se l'infiltrato è vivo e `!isTransformed`.
  - Aggiornare lo step `lupi` per indicare che se l'infiltrato si è trasformato, apre gli occhi assieme al branco.
- **Widget Azioni Notturne (`renderNightActionWidget`)**:
  - Caso `infiltrato_moon`: interfaccia con probabilità calcolata in base alla notte corrente, barra di stato, pulsante `🎲 Lancia Dado Luna Piena`, pulsante di override manuale e istruzioni per il narratore (toccare la spalla del giocatore).
  - Caso `veggente`: se il bersaglio è l'infiltrato trasformato, risponde `LUPO!`; se non trasformato, `NON LUPO`.
  - Caso `strega`: la Pozione di Vita offre una griglia con tutti i giocatori vivi + opzione "Non Usare", evidenziando chi è stato bersagliato dai lupi.
- **Risoluzione della Notte (`resolveNight`)**:
  - Se `witchHealTarget` è impostato, consuma la pozione di vita (`this.witchLifeUsed = true`).
  - Se `wolfVictim && wolfVictim.id === witchHealTargetId`, salva la vittima.
  - Se `witchHealTargetId !== wolfVictim?.id`, segnala nel report dell'alba che la Strega ha somministrato la pozione a un giocatore non ferito, mentre la vittima dei lupi soccombe (salvo guardia/donna).
  - La Donna muore se visita un infiltrato se e solo se `infiltrato.isTransformed === true`.
- **Condizioni di Vittoria (`checkVictoryCondition` e `renderGameOverCard`)**:
  - `aliveWolves` include l'infiltrato se `p.isTransformed`.
  - `aliveNonWolves` esclude l'infiltrato se `p.isTransformed`.
  - Nel branco (`packWolves`), l'infiltrato trasformato mantiene in vita la minaccia dei lupi anche se i lupi originari sono caduti.

### 2. Stili CSS: [style.css](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/css/style.css)

#### [MODIFY] [style.css](file:///c:/Users/simop/Documents/GitHub/nuovoprogetto/css/style.css)

- Aggiungere classi per la carta della Luna Piena: `.lupus-moon-box`, `.lupus-moon-chance-bar`, `.lupus-moon-result-box.transformed`, `.lupus-moon-result-box.dormant`.
- Aggiungere stati di selezione per la Pozione di Vita: `.lupus-action-card.selected-heal` e contrassegno bersaglio lupi `.lupus-action-card.card-wolf-target`.

---

## Piano di Verifica

### Test Automatizzati Headless Edge (Python)

Creare uno script di verifica in `scratch/test_lupus_infiltrato_strega.py` che:

1. Simula una partita con **Infiltrato**:
   - Notte 1: dado non supera la soglia -> `isTransformed = false`. Il Veggente lo scruta -> riceve `NON LUPO`. Nel conteggio vittoria conta come non-lupo.
   - Notte 2: dado supera la soglia (o override) -> `isTransformed = true`.
   - Verifica che:
     - `isTransformed` resta `true` per sempre ("non può tornare normale").
     - Nella notte successiva lo step `infiltrato_moon` non si ripete più.
     - Il Veggente ora riceve `LUPO!`.
     - Se la Donna visita l'infiltrato trasformato, muore.
     - Nel calcolo vittoria dei lupi, conta ufficialmente tra i Lupi.
2. Simula la **Pozione di Vita della Strega**:
   - Test A: La Strega usa la pozione su un giocatore che NON è la vittima dei lupi.
     - Verifica che la pozione viene consumata (`witchLifeUsed === true`).
     - Verifica che la vittima dei lupi muore.
     - Verifica che il report dell'alba segnala l'uso della pozione sul giocatore non ferito.
   - Test B: La Strega usa la pozione sulla vittima dei lupi.
     - Verifica che la vittima si salva.
3. Esecuzione del test headless Edge e verifica dell'integrità del DOM e della console (0 errori).
