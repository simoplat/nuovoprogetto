/**
 * ruota_app.js - Controller Principale per La Ruota della Fortuna
 * 
 * Unifica il tabellone TV a 4 righe, la ruota con fisica a pioli,
 * la gestione di rete P2P (WebRTC), la selezione delle frasi del Master
 * e l'esperienza immersiva per i concorrenti.
 */

class RuotaApp {
  constructor() {
    this.board = null;
    this.wheel = null;
    this.p2p = new RuotaP2PController(this);

    this.isHost = false;
    this.isLocal = false;
    this.roundActive = false;

    this.currentPhrase = "";
    this.currentCategory = "";
    this.currentWedge = null;
    this.turnState = "idle"; // "idle" | "awaiting_spin" | "spinning" | "awaiting_letter" | "awaiting_solve"

    // Local / Host players
    this.players = [];
    this.activePlayerIndex = 0;
    this.usedLetters = {}; // letter -> { found: boolean, count: number }

    this.initDOM();
  }

  initDOM() {
    // 1. Inizializza il Tabellone TV
    const boardContainer = document.getElementById("ruota-board-container");
    if (boardContainer) {
      this.board = new RuotaBoard(boardContainer, {
        onAllRevealed: () => this.handleAllRevealed()
      });
    }

    // 2. Inizializza la Ruota Canvas
    const canvasEl = document.getElementById("ruota-canvas");
    if (canvasEl) {
      this.wheel = new RuotaWheel(canvasEl, {
        onSpinComplete: (wedge, index) => this.handleSpinComplete(wedge, index)
      });
    }

    // 3. Popola le categorie nel selettore del Master
    this.populateCategorySelect();

    // 4. Inizializza Tastiera
    this.initKeyboard();

    // 5. Registra eventi UI
    this.bindEvents();

    // 6. Controlla parametri URL (es. ?room=ABCD)
    this.checkUrlParams();
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      const joinPinInput = document.getElementById("join-pin-input");
      if (joinPinInput) joinPinInput.value = room.toUpperCase();
      this.switchView("view-join");
    }
  }

  populateCategorySelect() {
    const sel = document.getElementById("master-category-select");
    if (!sel || !window.RUOTA_CATEGORIES) return;

    sel.innerHTML = '<option value="">-- Seleziona una Categoria --</option>';
    Object.entries(window.RUOTA_CATEGORIES).forEach(([key, cat]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${cat.icon} ${cat.name} (${cat.phrases.length} frasi)`;
      sel.appendChild(opt);
    });
  }

  initKeyboard() {
    const keyboardContainer = document.getElementById("ruota-keyboard-container");
    if (!keyboardContainer) return;

    keyboardContainer.innerHTML = "";
    const rows = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M"]
    ];

    const vowels = new Set(["A", "E", "I", "O", "U"]);

    rows.forEach(r => {
      const rowEl = document.createElement("div");
      rowEl.className = "keyboard-row";

      r.forEach(letter => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key-btn" + (vowels.has(letter) ? " key-vowel" : "");
        btn.dataset.letter = letter;
        btn.textContent = letter;

        btn.addEventListener("click", () => {
          this.handleKeyClick(letter);
        });

        rowEl.appendChild(btn);
      });

      keyboardContainer.appendChild(rowEl);
    });
  }

  bindEvents() {
    // Navigazione / Tab
    document.getElementById("btn-back-hub")?.addEventListener("click", () => {
      window.location.href = "../../index.html";
    });

    document.getElementById("btn-audio-toggle")?.addEventListener("click", () => {
      const enabled = window.RuotaSound ? window.RuotaSound.toggle() : false;
      const btn = document.getElementById("btn-audio-toggle");
      if (btn) btn.textContent = enabled ? "🔊" : "🔇";
    });

    // Selettore Frase Casuale Master
    document.getElementById("btn-random-phrase")?.addEventListener("click", () => {
      const selCat = document.getElementById("master-category-select")?.value;
      const random = window.RuotaPhraseManager.getRandomPhrase(selCat || null);
      if (random) {
        const input = document.getElementById("master-phrase-input");
        const catInput = document.getElementById("master-custom-category");
        if (input) input.value = random.phrase;
        if (catInput) catInput.value = random.category;
        this.updatePhrasePreview();
      }
    });

    // Input Frase Master con anteprima live sulle 4 righe
    const phraseInput = document.getElementById("master-phrase-input");
    if (phraseInput) {
      phraseInput.addEventListener("input", () => this.updatePhrasePreview());
    }

    // Bottone Master: Carica Frase sul Tabellone
    document.getElementById("btn-load-board")?.addEventListener("click", () => {
      this.loadMasterPhrase();
    });

    // Toggle Anti-Spoiler Regia
    document.getElementById("btn-toggle-master-body")?.addEventListener("click", () => {
      const body = document.getElementById("master-panel-body");
      const btn = document.getElementById("btn-toggle-master-body");
      if (!body || !btn) return;
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "👁️ Nascondi Regia (Anti-Spoiler)" : "👁️ Mostra Regia";
    });

    // Scelta Modalità
    document.getElementById("btn-mode-host")?.addEventListener("click", () => {
      this.switchView("view-host-setup");
    });

    document.getElementById("btn-mode-join")?.addEventListener("click", () => {
      this.switchView("view-join");
    });

    document.getElementById("btn-mode-local")?.addEventListener("click", () => {
      this.startLocalGame();
    });

    // Crea Stanza P2P (Master)
    document.getElementById("btn-create-room")?.addEventListener("click", async () => {
      const nameInput = document.getElementById("host-name-input");
      const name = (nameInput?.value || "Master").trim();
      await this.startHostP2P(name);
    });

    // Entra in Stanza P2P (Giocatore)
    document.getElementById("btn-join-room")?.addEventListener("click", async () => {
      const name = (document.getElementById("join-name-input")?.value || "Giocatore").trim();
      const pin = (document.getElementById("join-pin-input")?.value || "").trim().toUpperCase();
      if (!pin) {
        alert("Inserisci il codice PIN a 4 caratteri della stanza!");
        return;
      }
      await this.joinPlayerP2P(pin, name);
    });

    // Pulsante Gira la Ruota
    document.getElementById("btn-spin-wheel")?.addEventListener("click", () => {
      if (this.p2p.room) {
        this.p2p.sendSpinRequest();
      } else {
        this.spinWheel();
      }
    });

    // Pulsante Dai la Soluzione
    document.getElementById("btn-open-solve-modal")?.addEventListener("click", () => {
      this.openSolveModal();
    });

    document.getElementById("btn-cancel-solve")?.addEventListener("click", () => {
      this.closeSolveModal();
    });

    document.getElementById("btn-submit-solve")?.addEventListener("click", () => {
      const input = document.getElementById("solve-phrase-input");
      const solution = input?.value || "";
      this.closeSolveModal();
      if (this.p2p.room) {
        this.p2p.sendSolveRequest(solution);
      } else {
        this.verifySolution(solution);
      }
    });

    // Emotes rapide
    document.querySelectorAll(".emote-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const emoji = btn.dataset.emoji;
        if (emoji) {
          if (this.p2p.room) {
            this.p2p.sendEmote(emoji);
          } else {
            this.showEmote("Tu", emoji);
          }
        }
      });
    });

    // QR Code / Share Room
    document.getElementById("btn-share-room")?.addEventListener("click", () => {
      this.openShareModal();
    });
    document.getElementById("btn-close-share")?.addEventListener("click", () => {
      document.getElementById("modal-share-room")?.style.setProperty("display", "none");
    });
  }

  switchView(viewId) {
    document.querySelectorAll(".ruota-view").forEach(v => {
      v.style.display = "none";
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = "block";
    }
  }

  // =========================================================================
  // LOGICA DI AVVIO PARTITA
  // =========================================================================

  async startHostP2P(masterName) {
    this.isHost = true;
    this.isLocal = false;
    try {
      const pin = await this.p2p.createRoom(masterName);
      this.players = this.p2p.players;
      this.updateRoomInfoUI(pin);
      this.switchView("view-game");
      document.getElementById("master-admin-deck")?.style.setProperty("display", "block");

      // Carica una frase predefinita o mostra il pannello
      this.updateScoreboardUI();
      this.setStatusMessage("Stanza creata! Condividi il PIN " + pin + " con i concorrenti, poi scegli la frase.");
    } catch (e) {
      console.error("[RuotaApp] Errore creazione stanza:", e);
      alert("Errore di connessione P2P. Verifica la connessione e riprova.");
    }
  }

  async joinPlayerP2P(pin, playerName) {
    this.isHost = false;
    this.isLocal = false;
    try {
      await this.p2p.joinRoom(pin, playerName);
      this.updateRoomInfoUI(pin);
      this.switchView("view-game");
      document.getElementById("master-admin-deck")?.style.setProperty("display", "none");
      this.setStatusMessage("Connesso alla stanza " + pin + "! In attesa del Master...");
    } catch (e) {
      console.error("[RuotaApp] Errore connessione:", e);
      alert("Impossibile connettersi alla stanza " + pin + ". Codice errato o host offline.");
    }
  }

  startLocalGame() {
    this.isHost = true;
    this.isLocal = true;
    this.players = [
      { id: "p1", playerId: "p1", name: "Giocatore 1", roundScore: 0, totalScore: 0, online: true },
      { id: "p2", playerId: "p2", name: "Giocatore 2", roundScore: 0, totalScore: 0, online: true },
      { id: "p3", playerId: "p3", name: "Giocatore 3", roundScore: 0, totalScore: 0, online: true }
    ];
    this.activePlayerIndex = 0;
    this.switchView("view-game");
    document.getElementById("master-admin-deck")?.style.setProperty("display", "block");
    this.updateScoreboardUI();
    this.setStatusMessage("Modalità Locale / TV avviata! Il Master imposta la frase, poi si gira a turno.");
  }

  updateRoomInfoUI(pin) {
    const codeEl = document.getElementById("ruota-room-pin-display");
    if (codeEl) codeEl.textContent = pin;

    // Genera QR Code
    const qrContainer = document.getElementById("ruota-qrcode-container");
    if (qrContainer && typeof QRCode !== "undefined") {
      qrContainer.innerHTML = "";
      const joinUrl = window.location.origin + window.location.pathname + "?room=" + encodeURIComponent(pin);
      new QRCode(qrContainer, {
        text: joinUrl,
        width: 180,
        height: 180,
        colorDark: "#031022",
        colorLight: "#00f2fe",
        correctLevel: QRCode.CorrectLevel.M
      });
      const linkEl = document.getElementById("ruota-share-link");
      if (linkEl) linkEl.value = joinUrl;
    }
  }

  openShareModal() {
    const modal = document.getElementById("modal-share-room");
    if (modal) modal.style.display = "flex";
  }

  // =========================================================================
  // GESTIONE FRASE MASTER & ANTEPRIMA 4 RIGHE
  // =========================================================================

  updatePhrasePreview() {
    const input = document.getElementById("master-phrase-input");
    const previewEl = document.getElementById("master-phrase-preview");
    if (!input || !previewEl) return;

    const text = input.value;
    const formatted = window.RuotaPhraseManager.formatPhraseForBoard(text);

    previewEl.innerHTML = "";
    if (!formatted.success) {
      const err = document.createElement("div");
      err.className = "preview-row overflow";
      err.textContent = formatted.error || "Formato non valido";
      previewEl.appendChild(err);
      return;
    }

    const capacities = window.RUOTA_ROW_CAPACITIES;
    formatted.centeredRows.forEach((row, i) => {
      const rowEl = document.createElement("div");
      rowEl.className = "preview-row valid";
      const display = row.replace(/ /g, "·");
      rowEl.textContent = `R${i + 1} [${capacities[i]}]: ${display}`;
      previewEl.appendChild(rowEl);
    });
  }

  loadMasterPhrase() {
    const input = document.getElementById("master-phrase-input");
    const catInput = document.getElementById("master-custom-category");
    const phrase = (input?.value || "").trim();
    const category = (catInput?.value || "TEMA MISTERIOSO").trim();

    if (!phrase) {
      alert("Inserisci prima una frase da caricare sul tabellone!");
      return;
    }

    const success = this.board.setPhrase(phrase, category);
    if (!success) {
      alert("Impossibile caricare la frase: verifica l'anteprima delle 4 righe!");
      return;
    }

    this.currentPhrase = phrase;
    this.currentCategory = category;
    this.roundActive = true;
    this.turnState = "awaiting_spin";
    this.usedLetters = {};
    this.resetKeyboardUI();

    // Aggiorna banner categoria
    const catDisplay = document.getElementById("ruota-category-text");
    if (catDisplay) catDisplay.textContent = category.toUpperCase();

    this.updateControlsForTurn();
    this.setStatusMessage(`Nuova manche avviata! Tema: "${category}". Tocca a ${this.getActivePlayerName()} girare la ruota!`);

    // In modalità locale (stesso schermo), collassa il pannello regia per non spoilerare la frase agli amici!
    if (this.isLocal) {
      const body = document.getElementById("master-panel-body");
      const btn = document.getElementById("btn-toggle-master-body");
      if (body && btn) {
        body.style.display = "none";
        btn.textContent = "👁️ Mostra Regia";
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Broadcast a tutti i client
    if (this.p2p.isHost) {
      this.p2p.broadcastFullState();
    }
  }

  // =========================================================================
  // GESTIONE GIRI DELLA RUOTA & TURNI
  // =========================================================================

  spinWheel(targetIndex = null) {
    if (this.wheel.isSpinning) return;
    this.turnState = "spinning";
    this.updateControlsForTurn();

    // Se Host, trasmetti inizio spin con indice predeterminato
    if (this.p2p.isHost) {
      let chosenIndex = targetIndex;
      if (chosenIndex === null) {
        chosenIndex = Math.floor(Math.random() * this.wheel.wedges.length);
      }
      this.p2p.broadcastSpinStart(chosenIndex);
      this.wheel.spin(chosenIndex);
    } else {
      this.wheel.spin(targetIndex);
    }
  }

  handleSpinComplete(wedge, wedgeIndex) {
    this.currentWedge = wedge;
    const resultBanner = document.getElementById("ruota-spin-result");

    if (wedge.type === "bankrupt") {
      if (resultBanner) {
        resultBanner.className = "ruota-spin-result-banner result-bankrupt";
        resultBanner.textContent = "💀 BANCAROTTA! Perdi tutti i punti del round!";
      }
      if (window.RuotaSound) window.RuotaSound.playBankrupt();

      const active = this.getActivePlayer();
      if (active) active.roundScore = 0;
      this.updateScoreboardUI();

      this.setStatusMessage(`Bancarotta per ${this.getActivePlayerName()}! Turno perso.`);
      setTimeout(() => this.passTurn(), 2000);
      return;
    }

    if (wedge.type === "pass") {
      if (resultBanner) {
        resultBanner.className = "ruota-spin-result-banner result-pass";
        resultBanner.textContent = "🚫 PASSA LA MANO! Turno al giocatore successivo.";
      }
      if (window.RuotaSound) window.RuotaSound.playBuzzer();

      this.setStatusMessage(`Passa mano! Il turno passa da ${this.getActivePlayerName()}.`);
      setTimeout(() => this.passTurn(), 2000);
      return;
    }

    if (wedge.type === "jolly") {
      if (resultBanner) {
        resultBanner.className = "ruota-spin-result-banner result-jolly";
        resultBanner.textContent = "⭐ JOLLY! Guadagni un'immunità speciale!";
      }
      if (window.RuotaSound) window.RuotaSound.playTileDing(2);
      this.turnState = "awaiting_letter";
      this.updateControlsForTurn();
      this.setStatusMessage(`Jolly conquistato! Ora chiama una consonante.`);
      return;
    }

    // Spicchio Punti standard
    if (resultBanner) {
      resultBanner.className = "ruota-spin-result-banner result-points";
      resultBanner.textContent = `🎯 ${wedge.value} PUNTI A LETTERA! Chiama una consonante.`;
    }

    this.turnState = "awaiting_letter";
    this.updateControlsForTurn();
    this.setStatusMessage(`${this.getActivePlayerName()} ha ottenuto ${wedge.value} punti! Chiama una consonante.`);

    if (this.p2p.isHost) {
      this.p2p.broadcastSpinResult(wedge);
    }
  }

  // =========================================================================
  // CHIAMATA LETTERE & ILLUMINAZIONE TABELLONE TV
  // =========================================================================

  handleKeyClick(letter) {
    if (this.turnState !== "awaiting_letter") return;

    // Se P2P client e non è il mio turno, ignora
    if (!this.isLocal && !this.p2p.isMyTurn()) return;

    if (this.p2p.room && !this.p2p.isHost) {
      this.p2p.sendCallLetter(letter);
    } else {
      this.callLetter(letter);
    }
  }

  callLetter(letter) {
    const upper = letter.toUpperCase();
    if (this.usedLetters[upper]) return;

    this.turnState = "revealing";
    this.updateControlsForTurn();

    // Esegui la chiamata sul tabellone: illuminazione sequenziale con "Ding!" e rotazione 3D
    this.board.callLetter(upper, (result) => {
      this.usedLetters[upper] = {
        found: result.found > 0,
        count: result.found
      };
      this.updateKeyUI(upper, result.found > 0);

      if (this.p2p.isHost) {
        this.p2p.broadcastLetterReveal(upper, result);
      }

      if (result.found > 0) {
        // Punti assegnati
        const pointsPerLetter = this.currentWedge ? this.currentWedge.value : 100;
        const totalEarned = pointsPerLetter * result.found;
        const active = this.getActivePlayer();
        if (active) {
          active.roundScore = (active.roundScore || 0) + totalEarned;
        }
        this.updateScoreboardUI();

        this.setStatusMessage(`Splendido! Ci sono ${result.found} lettere "${upper}" (+${totalEarned} pt)! ${this.getActivePlayerName()} può girare ancora o dare la soluzione!`);
        this.turnState = "awaiting_spin";
        this.updateControlsForTurn();
      } else {
        // Nessuna lettera presente
        this.setStatusMessage(`Nessuna lettera "${upper}" presente sul tabellone! Turno perso.`);
        setTimeout(() => this.passTurn(), 1600);
      }

      if (this.p2p.isHost) {
        this.p2p.broadcastFullState();
      }
    });
  }

  passTurn() {
    if (this.players.length === 0) return;
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.turnState = "awaiting_spin";
    this.currentWedge = null;

    const banner = document.getElementById("ruota-spin-result");
    if (banner) {
      banner.className = "ruota-spin-result-banner";
      banner.textContent = `Tocca a ${this.getActivePlayerName()}! Gira la ruota.`;
    }

    this.updateScoreboardUI();
    this.updateControlsForTurn();
    this.setStatusMessage(`Tocca a ${this.getActivePlayerName()}! Gira la ruota della fortuna.`);

    if (this.p2p.isHost) {
      this.p2p.broadcastFullState();
    }
  }

  // =========================================================================
  // RISOLUZIONE FRASE E VITTORIA
  // =========================================================================

  openSolveModal() {
    const modal = document.getElementById("modal-solve-phrase");
    const input = document.getElementById("solve-phrase-input");
    if (modal) modal.style.display = "flex";
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 150);
    }
  }

  closeSolveModal() {
    const modal = document.getElementById("modal-solve-phrase");
    if (modal) modal.style.display = "none";
  }

  verifySolution(attempt) {
    if (!attempt || !this.currentPhrase) return;

    const cleanAttempt = window.RuotaPhraseManager.cleanString(attempt).replace(/[^A-Z]/g, "");
    const cleanTarget = window.RuotaPhraseManager.cleanString(this.currentPhrase).replace(/[^A-Z]/g, "");

    if (cleanAttempt === cleanTarget) {
      // SOLUZIONE ESATTA!
      const active = this.getActivePlayer();
      if (active) {
        active.totalScore = (active.totalScore || 0) + (active.roundScore || 500);
      }
      this.updateScoreboardUI();

      this.setStatusMessage(`🎉 INCREDIBILE! ${this.getActivePlayerName()} HA INDOVINATO LA FRASE ESATTA!`);
      this.board.revealAll(() => {
        this.handleAllRevealed();
      });

      if (this.p2p.isHost) {
        this.p2p.broadcastSolveResult({
          winnerName: this.getActivePlayerName(),
          correct: true,
          phrase: this.currentPhrase
        });
        this.p2p.broadcastFullState();
      }
    } else {
      // Soluzione errata
      if (window.RuotaSound) window.RuotaSound.playBuzzer();
      this.setStatusMessage(`Soluzione errata per ${this.getActivePlayerName()}! Turno al prossimo giocatore.`);
      this.passTurn();
    }
  }

  handleAllRevealed() {
    this.roundActive = false;
    this.turnState = "idle";
    this.updateControlsForTurn();
    this.triggerConfetti();
  }

  triggerConfetti() {
    // Effetto celebrazione coriandoli a schermo
    const colors = ["#facc15", "#00f2fe", "#ff0055", "#10b981", "#a855f7"];
    for (let i = 0; i < 40; i++) {
      const drop = document.createElement("div");
      drop.className = "floating-emote";
      drop.textContent = ["🎉", "⭐", "💰", "👑", "🔥"][i % 5];
      drop.style.left = Math.random() * 90 + "vw";
      drop.style.bottom = "20px";
      drop.style.animationDuration = (1.8 + Math.random() * 1.5) + "s";
      document.body.appendChild(drop);
      setTimeout(() => drop.remove(), 3500);
    }
  }

  // =========================================================================
  // GESTIONE RETE P2P REMOTA (PER I CLIENT)
  // =========================================================================

  onRemoteSpinStarted(wedgeIndex) {
    this.setStatusMessage(`${this.getActivePlayerName()} sta girando la ruota...`);
    this.wheel.spin(wedgeIndex);
  }

  onRemoteSpinResult(wedge) {
    this.currentWedge = wedge;
  }

  onRemoteLetterReveal(letter, result) {
    this.setStatusMessage(`${this.getActivePlayerName()} chiama la lettera "${letter}"!`);
    this.board.callLetter(letter, () => {
      this.usedLetters[letter] = { found: result.found > 0, count: result.found };
      this.updateKeyUI(letter, result.found > 0);
    });
  }

  onRemoteSolveResult(data) {
    if (data.correct) {
      this.setStatusMessage(`🎉 VITTORIA! ${data.winnerName} ha indovinato la frase!`);
      this.board.revealAll();
    }
  }

  applyRemoteState(state) {
    this.players = state.players || [];
    this.activePlayerIndex = state.activePlayerIndex || 0;
    this.currentWedge = state.currentWedge;
    this.turnState = state.turnState || "idle";
    this.usedLetters = state.usedLetters || {};
    this.roundActive = state.roundActive;

    if (state.category) {
      const catEl = document.getElementById("ruota-category-text");
      if (catEl) catEl.textContent = state.category.toUpperCase();
    }

    if (state.boardState && this.board) {
      this.board.applyState(state.boardState);
    }

    // Aggiorna tastiera con le lettere usate
    Object.entries(this.usedLetters).forEach(([l, info]) => {
      this.updateKeyUI(l, info.found);
    });

    this.updateScoreboardUI();
    this.updateControlsForTurn();
  }

  handleClientSpinRequest(playerId) {
    const active = this.getActivePlayer();
    if (active && active.playerId === playerId && this.turnState === "awaiting_spin") {
      this.spinWheel();
    }
  }

  handleClientCallLetter(playerId, letter) {
    const active = this.getActivePlayer();
    if (active && active.playerId === playerId && this.turnState === "awaiting_letter") {
      this.callLetter(letter);
    }
  }

  handleClientSolveRequest(playerId, solution) {
    const active = this.getActivePlayer();
    if (active && active.playerId === playerId) {
      this.verifySolution(solution);
    }
  }

  showEmote(sender, emoji) {
    const el = document.createElement("div");
    el.className = "floating-emote";
    el.textContent = emoji;
    el.style.left = (20 + Math.random() * 60) + "vw";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // =========================================================================
  // AGGIORNAMENTO STATI UI & SCOREBOARD
  // =========================================================================

  getActivePlayer() {
    if (!this.players || this.players.length === 0) return null;
    return this.players[this.activePlayerIndex % this.players.length];
  }

  getActivePlayerName() {
    const p = this.getActivePlayer();
    return p ? p.name : "Concorrente";
  }

  updateScoreboardUI() {
    const container = document.getElementById("ruota-scoreboard-container");
    if (!container) return;

    container.innerHTML = "";
    this.players.forEach((p, idx) => {
      const isTurn = idx === this.activePlayerIndex;
      const card = document.createElement("div");
      card.className = "ruota-player-card" + (isTurn ? " active-turn" : "");

      if (isTurn) {
        const badge = document.createElement("span");
        badge.className = "player-turn-badge";
        badge.textContent = "IN GIOCO";
        card.appendChild(badge);
      }

      const nameEl = document.createElement("span");
      nameEl.className = "player-name";
      nameEl.textContent = p.name;

      const scoreEl = document.createElement("span");
      scoreEl.className = "player-score";
      scoreEl.textContent = `${p.roundScore || 0} pt`;

      card.append(nameEl, scoreEl);
      container.appendChild(card);
    });
  }

  updateControlsForTurn() {
    const isMyTurn = this.isLocal || (this.p2p.room && this.p2p.isMyTurn()) || (this.isHost && this.players.length === 1);
    const spinBtn = document.getElementById("btn-spin-wheel");
    const solveBtn = document.getElementById("btn-open-solve-modal");

    const canSpin = isMyTurn && this.roundActive && (this.turnState === "awaiting_spin");
    const canSolve = isMyTurn && this.roundActive && (this.turnState === "awaiting_spin" || this.turnState === "awaiting_letter");

    if (spinBtn) spinBtn.disabled = !canSpin;
    if (solveBtn) solveBtn.disabled = !canSolve;

    // Aggiorna tastiera
    const isAwaitingLetter = isMyTurn && this.roundActive && (this.turnState === "awaiting_letter");
    document.querySelectorAll(".key-btn").forEach(btn => {
      const letter = btn.dataset.letter;
      const isUsed = !!this.usedLetters[letter];
      btn.disabled = isUsed || !isAwaitingLetter;
    });
  }

  updateKeyUI(letter, isPresent) {
    const btn = document.querySelector(`.key-btn[data-letter="${letter}"]`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add(isPresent ? "key-used-present" : "key-used-absent");
    }
  }

  resetKeyboardUI() {
    document.querySelectorAll(".key-btn").forEach(btn => {
      btn.disabled = false;
      btn.classList.remove("key-used-present", "key-used-absent");
    });
  }

  setStatusMessage(msg) {
    const el = document.getElementById("ruota-status-banner");
    if (el) el.textContent = msg;
  }
}

// Inizializza all'avvio
window.addEventListener("DOMContentLoaded", () => {
  window.ruotaApp = new RuotaApp();
});
