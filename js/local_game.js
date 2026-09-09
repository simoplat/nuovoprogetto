/**
 * Logica per la modalità "Passa il Telefono" (Dispositivo Singolo / Offline)
 */

class LocalGameController {
  constructor() {
    this.players = this.loadSavedPlayers() || ["Giocatore 1", "Giocatore 2", "Giocatore 3", "Giocatore 4"];
    this.impostorCount = 1;
    this.category = "random";
    this.customWord = "";
    this.isCustomWord = false;

    // Stato partita attiva
    this.gameActive = false;
    this.turnIndex = 0;
    this.assignments = []; // { name, isImpostor, word, category }
    this.starterPlayer = "";
    this.timerSeconds = 180; // 3 minuti standard
    this.initialTimerSeconds = 180;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.remainingImpostors = 0;
    this.votedPlayer = null;

    // Gestione pressione prolungata (Hold to reveal)
    this.holdTimer = null;
    this.holdProgressInterval = null;
    this.holdStartTime = 0;
    this.isHolding = false;
    this.holdRequiredMs = 350; // Tempo minimo per svelare (previene tocchi accidentali)

    this.bindEvents();
  }

  loadSavedPlayers() {
    try {
      const saved = localStorage.getItem("impostore_saved_players");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3) return parsed;
      }
    } catch (e) {}
    return null;
  }

  savePlayers() {
    try {
      localStorage.setItem("impostore_saved_players", JSON.stringify(this.players));
    } catch (e) {}
  }

  bindEvents() {
    // Gestione Stepper Impostori
    const minusBtn = document.getElementById("local-imp-minus");
    const plusBtn = document.getElementById("local-imp-plus");
    if (minusBtn && plusBtn) {
      minusBtn.addEventListener("click", () => this.adjustImpostorCount(-1));
      plusBtn.addEventListener("click", () => this.adjustImpostorCount(1));
    }

    // Aggiungi Giocatore
    const addPlayerBtn = document.getElementById("local-add-player-btn");
    if (addPlayerBtn) {
      addPlayerBtn.addEventListener("click", () => this.addNewPlayer());
    }

    // Reset o Nomi Veloci
    const quickNamesBtn = document.getElementById("local-quick-names-btn");
    if (quickNamesBtn) {
      quickNamesBtn.addEventListener("click", () => this.fillQuickNames());
    }

    // Selettore Categoria
    const catSelect = document.getElementById("local-category-select");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        this.category = e.target.value;
        const customContainer = document.getElementById("local-custom-word-container");
        if (customContainer) {
          customContainer.style.display = this.category === "custom" ? "block" : "none";
        }
      });
    }

    // Tasto Avvia Partita
    const startBtn = document.getElementById("local-start-game-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startGame());
    }

    // Tasto Hold to Reveal (Tieni premuto per vedere)
    const holdBtn = document.getElementById("hold-reveal-btn");
    if (holdBtn) {
      const startHold = (e) => {
        e.preventDefault();
        this.onHoldStart();
      };
      const endHold = (e) => {
        e.preventDefault();
        this.onHoldEnd();
      };

      // Pointer / Touch / Mouse support
      holdBtn.addEventListener("pointerdown", startHold);
      window.addEventListener("pointerup", endHold);
      window.addEventListener("pointercancel", endHold);

      holdBtn.addEventListener("touchstart", startHold, { passive: false });
      window.addEventListener("touchend", endHold, { passive: false });
      window.addEventListener("touchcancel", endHold, { passive: false });

      holdBtn.addEventListener("mousedown", startHold);
      window.addEventListener("mouseup", endHold);
    }

    // Tasto Prossimo Turno
    const nextTurnBtn = document.getElementById("next-turn-btn");
    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => this.nextTurn());
    }

    // Timer Controls
    const timerToggleBtn = document.getElementById("timer-toggle-btn");
    if (timerToggleBtn) {
      timerToggleBtn.addEventListener("click", () => this.toggleTimer());
    }

    const timerAddMinBtn = document.getElementById("timer-add-min-btn");
    if (timerAddMinBtn) {
      timerAddMinBtn.addEventListener("click", () => this.addTimerMinute());
    }

    const goToVoteBtn = document.getElementById("go-to-vote-btn");
    if (goToVoteBtn) {
      goToVoteBtn.addEventListener("click", () => this.openVotingPhase());
    }

    // Tasto Conferma Voto
    const confirmVoteBtn = document.getElementById("confirm-vote-btn");
    if (confirmVoteBtn) {
      confirmVoteBtn.addEventListener("click", () => this.executeVote());
    }

    // Tasto Nuova Partita / Rivincita
    const rematchBtn = document.getElementById("local-rematch-btn");
    if (rematchBtn) {
      rematchBtn.addEventListener("click", () => this.startGame());
    }

    const editSetupBtn = document.getElementById("local-edit-setup-btn");
    if (editSetupBtn) {
      editSetupBtn.addEventListener("click", () => this.returnToSetup());
    }
  }

  renderSetupView() {
    this.renderCategoryOptions();
    this.renderPlayerInputs();
    this.updateImpostorLimits();
  }

  renderCategoryOptions() {
    const catSelect = document.getElementById("local-category-select");
    if (!catSelect) return;

    catSelect.innerHTML = "";
    const categories = getAvailableCategories();
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      if (cat.id === this.category) opt.selected = true;
      catSelect.appendChild(opt);
    });

    // Opzione parola personalizzata
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "✏️ Parola Segreta Personalizzata";
    catSelect.appendChild(customOpt);
  }

  renderPlayerInputs() {
    const container = document.getElementById("local-players-list");
    if (!container) return;

    container.innerHTML = "";
    this.players.forEach((name, index) => {
      const row = document.createElement("div");
      row.className = "player-row";

      const numSpan = document.createElement("span");
      numSpan.className = "player-num";
      numSpan.textContent = `${index + 1}.`;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "player-input";
      input.value = name;
      input.placeholder = `Nome giocatore ${index + 1}`;
      input.maxLength = 22;
      input.addEventListener("input", (e) => {
        this.players[index] = e.target.value.trim() || `Giocatore ${index + 1}`;
        this.savePlayers();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "player-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.title = "Rimuovi giocatore";
      deleteBtn.disabled = this.players.length <= 3;
      deleteBtn.addEventListener("click", () => {
        if (this.players.length > 3) {
          Sound.playClick();
          this.players.splice(index, 1);
          this.savePlayers();
          this.renderPlayerInputs();
          this.updateImpostorLimits();
        }
      });

      row.appendChild(numSpan);
      row.appendChild(input);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });

    const totalCountEl = document.getElementById("local-total-players-count");
    if (totalCountEl) totalCountEl.textContent = this.players.length;
  }

  addNewPlayer() {
    Sound.playClick();
    const newIdx = this.players.length + 1;
    this.players.push(`Giocatore ${newIdx}`);
    this.savePlayers();
    this.renderPlayerInputs();
    this.updateImpostorLimits();
    
    // Focus sull'ultimo input appena aggiunto
    setTimeout(() => {
      const container = document.getElementById("local-players-list");
      if (container && container.lastElementChild) {
        const input = container.lastElementChild.querySelector("input");
        if (input) input.focus();
      }
    }, 50);
  }

  fillQuickNames() {
    Sound.playClick();
    const italianNames = ["Marco", "Sofia", "Luca", "Giulia", "Andrea", "Chiara", "Matteo", "Elena", "Davide", "Valentina", "Lorenzo", "Federica"];
    const shuffled = [...italianNames].sort(() => 0.5 - Math.random());
    const count = Math.max(4, this.players.length);
    this.players = shuffled.slice(0, count);
    this.savePlayers();
    this.renderPlayerInputs();
    this.updateImpostorLimits();
  }

  adjustImpostorCount(delta) {
    Sound.playClick();
    const maxImpostors = Math.max(1, Math.floor((this.players.length - 1) / 2));
    this.impostorCount = Math.max(1, Math.min(maxImpostors, this.impostorCount + delta));
    this.updateImpostorLimits();
  }

  updateImpostorLimits() {
    const maxImpostors = Math.max(1, Math.floor((this.players.length - 1) / 2));
    if (this.impostorCount > maxImpostors) {
      this.impostorCount = maxImpostors;
    }
    const valEl = document.getElementById("local-imp-value");
    if (valEl) valEl.textContent = this.impostorCount;

    const minusBtn = document.getElementById("local-imp-minus");
    const plusBtn = document.getElementById("local-imp-plus");
    if (minusBtn) minusBtn.disabled = this.impostorCount <= 1;
    if (plusBtn) plusBtn.disabled = this.impostorCount >= maxImpostors;
  }

  startGame() {
    Sound.playClick();
    // Validazione nomi
    this.players = this.players.map((p, idx) => p.trim() || `Giocatore ${idx + 1}`);
    this.savePlayers();

    if (this.players.length < 3) {
      alert("Sono necessari almeno 3 giocatori per giocare!");
      return;
    }

    // Estrazione parola segreta
    let secretWord = "";
    let categoryName = "";
    if (this.category === "custom") {
      const customInput = document.getElementById("local-custom-word-input");
      secretWord = customInput ? customInput.value.trim() : "";
      if (!secretWord) {
        alert("Inserisci la parola segreta personalizzata!");
        return;
      }
      categoryName = "Parola Personalizzata";
    } else {
      const picked = pickSecretWord(this.category);
      secretWord = picked.word;
      categoryName = picked.categoryName;
    }

    // Assegnazione ruoli (Algoritmo Fisher-Yates per mescolare equamente)
    const indices = Array.from({ length: this.players.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const impostorIndices = new Set(indices.slice(0, this.impostorCount));
    this.assignments = this.players.map((name, index) => ({
      name: name,
      isImpostor: impostorIndices.has(index),
      word: secretWord,
      category: categoryName
    }));

    // Estrazione casuale di chi apre il giro
    this.starterPlayer = this.players[Math.floor(Math.random() * this.players.length)];
    this.turnIndex = 0;
    this.remainingImpostors = this.impostorCount;
    this.gameActive = true;

    // Mostra schermata Rivelazione Passa Telefono
    window.App.switchView("view-pass-reveal");
    this.renderTurnReveal();
  }

  renderTurnReveal() {
    const current = this.assignments[this.turnIndex];
    if (!current) return;

    // Ripristina visuale oscurata
    const targetNameEl = document.getElementById("pass-player-name");
    const turnCountEl = document.getElementById("pass-turn-count");
    const secretCard = document.getElementById("secret-revealed-card");
    const holdBtn = document.getElementById("hold-reveal-btn");
    const nextBtnContainer = document.getElementById("pass-next-btn-container");
    const progressBar = document.getElementById("hold-progress-bar");

    if (targetNameEl) targetNameEl.textContent = current.name;
    if (turnCountEl) turnCountEl.textContent = `Giocatore ${this.turnIndex + 1} di ${this.assignments.length}`;

    if (secretCard) secretCard.style.display = "none";
    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (nextBtnContainer) nextBtnContainer.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";
  }

  onHoldStart() {
    if (this.isHolding) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("hold-reveal-btn");
    const progressBar = document.getElementById("hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    Sound.playHoldTick();

    // Aggiornamento progress bar rapido
    clearInterval(this.holdProgressInterval);
    this.holdProgressInterval = setInterval(() => {
      const elapsed = Date.now() - this.holdStartTime;
      const pct = Math.min(100, (elapsed / this.holdRequiredMs) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= this.holdRequiredMs) {
        clearInterval(this.holdProgressInterval);
        this.revealRole();
      }
    }, 25);
  }

  onHoldEnd() {
    if (!this.isHolding) return;
    this.isHolding = false;
    clearInterval(this.holdProgressInterval);

    const holdBtn = document.getElementById("hold-reveal-btn");
    const progressBar = document.getElementById("hold-progress-bar");
    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    // Se aveva rivelato la carta, nascondila subito per sicurezza e mostra tasto "Ho visto, passa avanti"
    const secretCard = document.getElementById("secret-revealed-card");
    const nextBtnContainer = document.getElementById("pass-next-btn-container");
    if (secretCard && secretCard.style.display !== "none") {
      secretCard.style.display = "none";
      if (holdBtn) holdBtn.style.display = "flex";
      if (nextBtnContainer) nextBtnContainer.style.display = "block";
    }
  }

  revealRole() {
    const current = this.assignments[this.turnIndex];
    if (!current) return;

    const secretCard = document.getElementById("secret-revealed-card");
    const holdBtn = document.getElementById("hold-reveal-btn");
    const nextBtnContainer = document.getElementById("pass-next-btn-container");

    if (!secretCard) return;

    secretCard.className = `secret-card ${current.isImpostor ? "impostor" : "innocent"}`;

    if (current.isImpostor) {
      Sound.playImpostorReveal();
      secretCard.innerHTML = `
        <div class="secret-badge">Allerta Intrusione ⚠️</div>
        <div class="impostor-title">SEI L'IMPOSTORE!</div>
        <p class="impostor-warning">
          Non conosci la parola segreta! Ascolta attentamente gli altri, bluffa con astuzia e non farti scoprire dal gruppo.
        </p>
      `;
    } else {
      Sound.playInnocentReveal();
      secretCard.innerHTML = `
        <div class="secret-badge">Cittadino Innocente 🛡️</div>
        <div class="secret-word-title">La tua parola segreta è:</div>
        <div class="secret-word-value">${current.word}</div>
        <div class="secret-category">Categoria: ${current.category}</div>
      `;
    }

    secretCard.style.display = "block";
    if (holdBtn) holdBtn.style.display = "none";
    if (nextBtnContainer) nextBtnContainer.style.display = "block";
  }

  nextTurn() {
    Sound.playClick();
    this.turnIndex++;
    if (this.turnIndex < this.assignments.length) {
      this.renderTurnReveal();
    } else {
      // Tutti i giocatori hanno visto il ruolo! Inizia la discussione
      this.startDiscussionPhase();
    }
  }

  startDiscussionPhase() {
    window.App.switchView("view-discussion");
    Sound.playFanfare();

    const starterEl = document.getElementById("starter-player-name");
    if (starterEl) starterEl.textContent = this.starterPlayer;

    this.timerSeconds = this.initialTimerSeconds;
    this.isTimerRunning = true;
    this.updateTimerDisplay();
    this.startTimerInterval();
  }

  startTimerInterval() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.isTimerRunning) return;

      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();

        // Audio ticks
        if (this.timerSeconds <= 10 && this.timerSeconds > 0) {
          Sound.playTimerTick(true);
        } else if (this.timerSeconds % 30 === 0 && this.timerSeconds > 0) {
          Sound.playTimerTick(false);
        }

        if (this.timerSeconds === 0) {
          Sound.playTimerEnd();
          this.isTimerRunning = false;
          this.updateTimerControls();
        }
      }
    }, 1000);
  }

  toggleTimer() {
    Sound.playClick();
    this.isTimerRunning = !this.isTimerRunning;
    this.updateTimerControls();
  }

  addTimerMinute() {
    Sound.playClick();
    this.timerSeconds += 60;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById("timer-display");
    if (!timerDisplay) return;

    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (this.timerSeconds <= 10 && this.timerSeconds > 0) {
      timerDisplay.classList.add("urgent");
    } else {
      timerDisplay.classList.remove("urgent");
    }
  }

  updateTimerControls() {
    const toggleBtn = document.getElementById("timer-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = this.isTimerRunning ? "⏸️ Pausa" : "▶️ Riprendi";
    }
  }

  openVotingPhase() {
    Sound.playClick();
    clearInterval(this.timerInterval);
    window.App.switchView("view-voting");
    this.renderVotingCards();
  }

  renderVotingCards() {
    const container = document.getElementById("vote-grid-container");
    const confirmBtn = document.getElementById("confirm-vote-btn");
    if (!container) return;

    container.innerHTML = "";
    this.votedPlayer = null;
    if (confirmBtn) confirmBtn.disabled = true;

    this.assignments.forEach((playerObj) => {
      const card = document.createElement("div");
      card.className = "vote-card";

      const avatar = document.createElement("div");
      avatar.className = "vote-avatar";
      avatar.textContent = playerObj.name.charAt(0).toUpperCase();

      const name = document.createElement("div");
      name.className = "vote-name";
      name.textContent = playerObj.name;

      card.appendChild(avatar);
      card.appendChild(name);

      card.addEventListener("click", () => {
        Sound.playClick();
        document.querySelectorAll(".vote-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this.votedPlayer = playerObj;
        if (confirmBtn) confirmBtn.disabled = false;
      });

      container.appendChild(card);
    });
  }

  executeVote() {
    if (!this.votedPlayer) return;
    Sound.playClick();

    window.App.switchView("view-game-over");
    this.renderGameOver();
  }

  renderGameOver() {
    const titleEl = document.getElementById("game-over-title");
    const iconEl = document.getElementById("game-over-icon");
    const descEl = document.getElementById("game-over-desc");
    const impostorsListEl = document.getElementById("game-over-impostors-list");
    const wordEl = document.getElementById("game-over-word");

    const impostorPlayers = this.assignments.filter(a => a.isImpostor);
    const wasImpostor = this.votedPlayer.isImpostor;

    if (wasImpostor) {
      Sound.playFanfare();
      if (titleEl) {
        titleEl.textContent = "Vittoria dei Cittadini!";
        titleEl.className = "game-over-title citizens-win";
      }
      if (iconEl) iconEl.textContent = "🎉";
      if (descEl) {
        descEl.innerHTML = `<strong>${this.votedPlayer.name}</strong> è stato scoperto: <strong>ERA L'IMPOSTORE!</strong>`;
      }
    } else {
      Sound.playImpostorReveal();
      if (titleEl) {
        titleEl.textContent = "L'Impostore Ha Vinto!";
        titleEl.className = "game-over-title impostor-wins";
      }
      if (iconEl) iconEl.textContent = "😈";
      if (descEl) {
        descEl.innerHTML = `<strong>${this.votedPlayer.name}</strong> era innocente! Gli impostori sono riusciti a ingannare il gruppo.`;
      }
    }

    if (impostorsListEl) {
      impostorsListEl.innerHTML = impostorPlayers.map(p => `
        <div class="impostor-pill">🕵️ ${p.name}</div>
      `).join("");
    }

    if (wordEl) {
      const word = this.assignments[0]?.word || "N/A";
      const cat = this.assignments[0]?.category || "";
      wordEl.textContent = `${word} (${cat})`;
    }
  }

  returnToSetup() {
    Sound.playClick();
    clearInterval(this.timerInterval);
    this.gameActive = false;
    window.App.switchView("view-local-setup");
    this.renderSetupView();
  }
}
