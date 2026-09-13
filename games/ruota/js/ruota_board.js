/**
 * ruota_board.js - Gestione Tabellone TV a 4 Righe (12, 14, 14, 12 caselle)
 * 
 * Riproduce il leggendario tabellone da studio televisivo:
 * - Righe 1 e 4: 12 caselle
 * - Righe 2 e 3: 14 caselle
 * - Caselle inattive: vetro teal scuro retroilluminato con riflesso studio
 * - Caselle attive con lettera coperta: bianche con bordo nero
 * - Casella che si illumina: flash oro/ciano brillante con rintocco "Ding!"
 * - Rotazione 3D flip che svela la lettera
 */

class RuotaBoard {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = Object.assign({
      soundEnabled: true,
      onLetterRevealed: null,
      onAllRevealed: null
    }, options);

    this.capacities = [12, 14, 14, 12];
    this.matrix = []; // 4 righe, ciascuna un array di oggetti cella
    this.revealedLetters = new Set();
    this.category = "";
    this.rawPhrase = "";
    this.centeredRows = ["", "", "", ""];
    this.isAnimating = false;

    this.initBoardDOM();
  }

  /**
   * Crea la struttura HTML del tabellone a gradino (stepped TV frame)
   */
  initBoardDOM() {
    if (!this.container) return;
    this.container.innerHTML = "";

    const outerFrame = document.createElement("div");
    outerFrame.className = "ruota-tv-frame";

    // Luce neon studio attorno al tabellone
    const glowAura = document.createElement("div");
    glowAura.className = "ruota-frame-glow";
    outerFrame.appendChild(glowAura);

    // Contenitore delle 4 righe
    const gridContainer = document.createElement("div");
    gridContainer.className = "ruota-grid-container";
    gridContainer.id = "ruota-grid";

    this.matrix = [];

    for (let r = 0; r < 4; r++) {
      const rowCap = this.capacities[r];
      const rowEl = document.createElement("div");
      rowEl.className = `ruota-row ruota-row-${r} cells-${rowCap}`;
      rowEl.dataset.row = r;

      const rowCells = [];

      for (let c = 0; c < rowCap; c++) {
        const cellEl = document.createElement("div");
        cellEl.className = "ruota-cell cell-empty";
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;

        // Struttura interna per animazione 3D Flip
        const cellInner = document.createElement("div");
        cellInner.className = "cell-flipper";

        const cellFront = document.createElement("div");
        cellFront.className = "cell-front"; // Display coperto o teal inattivo

        const cellBack = document.createElement("div");
        cellBack.className = "cell-back"; // Mostra la lettera

        const letterSpan = document.createElement("span");
        letterSpan.className = "cell-letter";
        letterSpan.textContent = "";

        cellBack.appendChild(letterSpan);
        cellInner.append(cellFront, cellBack);
        cellEl.appendChild(cellInner);
        rowEl.appendChild(cellEl);

        rowCells.push({
          row: r,
          col: c,
          char: " ",
          isLetter: false,
          isRevealed: false,
          element: cellEl,
          letterSpan: letterSpan
        });
      }

      this.matrix.push(rowCells);
      gridContainer.appendChild(rowEl);
    }

    outerFrame.appendChild(gridContainer);
    this.container.appendChild(outerFrame);
  }

  /**
   * Carica e impagina una nuova frase sul tabellone
   * @param {string} phrase - La frase da mostrare
   * @param {string} category - Il tema/categoria (es. "Cinema", "Proverbi")
   */
  setPhrase(phrase, category = "") {
    this.category = category;
    this.rawPhrase = phrase;
    this.revealedLetters.clear();
    this.isAnimating = false;

    const formatted = window.RuotaPhraseManager
      ? window.RuotaPhraseManager.formatPhraseForBoard(phrase)
      : { success: false, error: "Manager non caricato" };

    if (!formatted.success) {
      console.error("[RuotaBoard] Errore formattazione:", formatted.error);
      return false;
    }

    this.centeredRows = formatted.centeredRows;

    for (let r = 0; r < 4; r++) {
      const line = this.centeredRows[r] || " ".repeat(this.capacities[r]);
      for (let c = 0; c < this.capacities[r]; c++) {
        const ch = line[c] || " ";
        const cell = this.matrix[r][c];
        cell.char = ch;
        cell.isLetter = /[A-Z0-9]/i.test(ch);
        cell.isPunctuation = /['\-.,!?]/.test(ch);
        cell.isRevealed = false;

        // Reset classi
        const el = cell.element;
        el.className = "ruota-cell";

        if (cell.isLetter) {
          // Casella attiva con lettera coperta (bianca con bordo nero, lettera vuota finché non svelata)
          el.classList.add("cell-hidden");
          cell.letterSpan.textContent = "";
        } else if (cell.isPunctuation) {
          // Punteggiatura (mostrata subito)
          el.classList.add("cell-revealed", "cell-punctuation");
          cell.letterSpan.textContent = ch;
          cell.isRevealed = true;
        } else {
          // Casella inattiva (vetro teal scuro da studio TV)
          el.classList.add("cell-empty");
          cell.letterSpan.textContent = "";
        }
      }
    }

    return true;
  }

  /**
   * Cerca e svela tutte le occorrenze di una lettera con la tipica animazione TV:
   * 1. La casella si illumina con luce intensa oro/ciano
   * 2. Rintocco di campana "DING!"
   * 3. Rotazione 3D flip per svelare la lettera
   * 
   * @param {string} letter - Consonante o vocale chiamata (A-Z)
   * @param {Function} callback - Chiamata al termine dell'animazione
   * @returns {{ found: number, positions: Array<{r, c}> }}
   */
  callLetter(letter, callback = null) {
    if (!letter || this.isAnimating) {
      if (callback) callback({ found: 0, isDuplicate: true });
      return { found: 0, positions: [] };
    }

    const upper = letter.toUpperCase();
    if (this.revealedLetters.has(upper)) {
      if (callback) callback({ found: 0, isDuplicate: true });
      return { found: 0, positions: [] };
    }

    this.revealedLetters.add(upper);

    // Trova tutte le celle corrispondenti ancora coperte
    const matches = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < this.capacities[r]; c++) {
        const cell = this.matrix[r][c];
        if (cell.isLetter && !cell.isRevealed && cell.char.toUpperCase() === upper) {
          matches.push(cell);
        }
      }
    }

    if (matches.length === 0) {
      if (window.RuotaSound) window.RuotaSound.playBuzzer();
      if (callback) callback({ found: 0, positions: [] });
      return { found: 0, positions: [] };
    }

    // Animazione sequenziale tipica dello show televisivo
    this.isAnimating = true;
    let stepIndex = 0;

    const revealNext = () => {
      if (stepIndex >= matches.length) {
        this.isAnimating = false;
        const allDone = this.isFullyRevealed();
        if (allDone && this.options.onAllRevealed) {
          this.options.onAllRevealed();
        }
        if (callback) callback({ found: matches.length, positions: matches.map(m => ({ r: m.row, c: m.col })), allRevealed: allDone });
        return;
      }

      const cell = matches[stepIndex];
      const el = cell.element;

      // FASE 1: Illuminazione intensa della casella + Campana DING!
      el.classList.remove("cell-hidden");
      el.classList.add("cell-illuminated");
      if (window.RuotaSound) {
        window.RuotaSound.playTileDing(stepIndex);
      }

      // FASE 2: Dopo 380ms, rotazione 3D e svelamento lettera
      setTimeout(() => {
        el.classList.remove("cell-illuminated");
        el.classList.add("cell-revealed");
        cell.letterSpan.textContent = cell.char.toUpperCase();
        cell.isRevealed = true;
        if (window.RuotaSound) {
          window.RuotaSound.playLetterFlip();
        }

        stepIndex++;
        // Intervallo prima della casella successiva (550ms di respiro scenico TV)
        setTimeout(revealNext, 550);
      }, 380);
    };

    revealNext();
    return { found: matches.length, positions: matches.map(m => ({ r: m.row, c: m.col })) };
  }

  /**
   * Svela istantaneamente o a cascata l'intero tabellone quando viene indovinata la soluzione
   */
  revealAll(callback = null) {
    const unrevealed = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < this.capacities[r]; c++) {
        const cell = this.matrix[r][c];
        if (cell.isLetter && !cell.isRevealed) {
          unrevealed.push(cell);
        }
      }
    }

    if (unrevealed.length === 0) {
      if (callback) callback();
      return;
    }

    this.isAnimating = true;
    let idx = 0;

    const flipNext = () => {
      if (idx >= unrevealed.length) {
        this.isAnimating = false;
        if (window.RuotaSound) window.RuotaSound.playSolveFanfare();
        if (callback) callback();
        return;
      }

      const cell = unrevealed[idx];
      const el = cell.element;
      el.classList.remove("cell-hidden");
      el.classList.add("cell-illuminated");
      if (window.RuotaSound) window.RuotaSound.playTileDing(idx % 4);

      setTimeout(() => {
        el.classList.remove("cell-illuminated");
        el.classList.add("cell-revealed");
        cell.letterSpan.textContent = cell.char.toUpperCase();
        cell.isRevealed = true;
        idx++;
        setTimeout(flipNext, 80); // Cascata rapida celebrativa
      }, 100);
    };

    flipNext();
  }

  /**
   * Verifica se tutte le lettere sono state scoperte
   */
  isFullyRevealed() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < this.capacities[r]; c++) {
        const cell = this.matrix[r][c];
        if (cell.isLetter && !cell.isRevealed) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Restituisce lo stato serializzabile del tabellone per sincronizzazione P2P
   */
  getState() {
    const revealedMatrix = [];
    for (let r = 0; r < 4; r++) {
      revealedMatrix.push(this.matrix[r].map(c => c.isRevealed));
    }
    return {
      rawPhrase: this.rawPhrase,
      category: this.category,
      revealedLetters: Array.from(this.revealedLetters),
      revealedMatrix: revealedMatrix
    };
  }

  /**
   * Applica uno stato ricevuto via P2P (utile per i client appena connessi)
   */
  applyState(state) {
    if (!state || !state.rawPhrase) return;
    this.setPhrase(state.rawPhrase, state.category || "");
    if (state.revealedLetters) {
      this.revealedLetters = new Set(state.revealedLetters);
    }
    if (state.revealedMatrix) {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < this.capacities[r]; c++) {
          const isRev = state.revealedMatrix[r] && state.revealedMatrix[r][c];
          const cell = this.matrix[r][c];
          if (cell.isLetter && isRev) {
            cell.isRevealed = true;
            cell.element.classList.remove("cell-hidden", "cell-illuminated");
            cell.element.classList.add("cell-revealed");
            cell.letterSpan.textContent = cell.char.toUpperCase();
          } else if (cell.isLetter) {
            cell.isRevealed = false;
            cell.letterSpan.textContent = "";
            cell.element.classList.remove("cell-revealed", "cell-illuminated");
            cell.element.classList.add("cell-hidden");
          }
        }
      }
    }
  }
}

// Esporta globalmente e per moduli Node
if (typeof window !== "undefined") {
  window.RuotaBoard = RuotaBoard;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = RuotaBoard;
}
