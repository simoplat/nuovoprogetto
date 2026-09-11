/**
 * lupus_setup_ui.js - Gestione Setup, Lista Giocatori e Svelamento Segreto (Passa il Telefono)
 */

class LupusSetupUI {
  constructor(game) {
    this.game = game;
  }

  loadSavedPlayers() {
    try {
      const saved = localStorage.getItem("lupus_saved_players");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) return parsed;
      }
    } catch (e) {}
    return null;
  }

  savePlayers() {
    try {
      localStorage.setItem("lupus_saved_players", JSON.stringify(this.game.players));
    } catch (e) {}
  }

  bindSetupEvents() {
    const game = this.game;

    // Stepper Lupi
    const minusWolves = document.getElementById("lupus-wolves-minus");
    const plusWolves = document.getElementById("lupus-wolves-plus");
    if (minusWolves && plusWolves) {
      minusWolves.addEventListener("click", () => this.adjustWolvesCount(-1));
      plusWolves.addEventListener("click", () => this.adjustWolvesCount(1));
    }

    // Stepper Durata Discussione
    const timeMinus = document.getElementById("lupus-time-minus");
    const timePlus = document.getElementById("lupus-time-plus");
    if (timeMinus && timePlus) {
      timeMinus.addEventListener("click", () => this.adjustDiscussionTime(-1));
      timePlus.addEventListener("click", () => this.adjustDiscussionTime(1));
    }

    // Aggiungi Giocatore
    const addBtn = document.getElementById("lupus-add-player-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => this.addNewPlayer());
    }

    // Nomi Rapidi Casuali
    const quickBtn = document.getElementById("lupus-quick-names-btn");
    if (quickBtn) {
      quickBtn.addEventListener("click", () => this.fillQuickNames());
    }

    // Tasti Ruoli Speciali (Checkbox/Toggles)
    [
      "veggente", "guardia", "strega", "cupido", "donna",
      "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero", "necromante"
    ].forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) {
        toggle.addEventListener("change", (e) => {
          game.enabledRoles[roleKey] = e.target.checked;
          Sound.playClick();

          // Se si attiva un lupo speciale con abilità, assicurati che wolvesCount sia sufficiente
          const specialWolfKeys = ["lupo_stregone", "cane_nero", "infiltrato", "lupo_bianco"];
          if (specialWolfKeys.includes(roleKey) && e.target.checked) {
            const activeSpecialCount = specialWolfKeys.filter(k => game.enabledRoles[k]).length;
            if (activeSpecialCount > game.wolvesCount) {
              const maxWolves = Math.max(1, Math.floor((game.players.length - 1) / 2));
              if (game.wolvesCount < maxWolves) {
                game.wolvesCount = Math.min(activeSpecialCount, maxWolves);
                this.updateWolvesDisplay();
              }
            }
          }

          this.validateRolesAndRenderSummary();
        });
      }
    });

    // Avvia Partita
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (startBtn) {
      startBtn.addEventListener("click", () => game.startGame());
    }

    // Gestione Tasto Hold to Reveal
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    if (holdBtn) {
      const startHold = (e) => {
        if (e.cancelable) e.preventDefault();
        this.onHoldStart();
      };
      const endHold = () => {
        if (!game.isHolding) return;
        this.onHoldEnd();
      };

      holdBtn.addEventListener("pointerdown", startHold);
      window.addEventListener("pointerup", endHold);
      window.addEventListener("pointercancel", endHold);

      holdBtn.addEventListener("touchstart", startHold, { passive: false });
      window.addEventListener("touchend", endHold);
      window.addEventListener("touchcancel", endHold);

      holdBtn.addEventListener("mousedown", startHold);
      window.addEventListener("mouseup", endHold);

      const secretCard = document.getElementById("lupus-secret-revealed-card");
      if (secretCard) {
        secretCard.addEventListener("pointerup", endHold);
        secretCard.addEventListener("touchend", endHold);
        secretCard.addEventListener("mouseup", endHold);
        secretCard.addEventListener("pointercancel", endHold);
        secretCard.addEventListener("touchcancel", endHold);
      }
    }

    // Tasto Avanzamento Turno Passa il Telefono
    const nextTurnBtn = document.getElementById("lupus-next-turn-btn");
    if (nextTurnBtn) {
      nextTurnBtn.addEventListener("click", () => this.nextTurn());
    }

    // Master Dashboard Step Controls
    const nextStepBtn = document.getElementById("lupus-master-next-step");
    if (nextStepBtn) {
      nextStepBtn.addEventListener("click", () => game.masterNextStep());
    }

    const prevStepBtn = document.getElementById("lupus-master-prev-step");
    if (prevStepBtn) {
      prevStepBtn.addEventListener("click", () => game.masterPrevStep());
    }

    // Timer Discussione Giorno / Rogo
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) {
      timerBtn.addEventListener("click", () => game.toggleDiscussionTimer());
    }

    // Concludi Timer in Anticipo & Vai al Voto del Rogo
    const earlyEndBtn = document.getElementById("lupus-end-discussion-early-btn");
    if (earlyEndBtn) {
      earlyEndBtn.addEventListener("click", () => game.endDiscussionEarly());
    }

    // Tasto Conferma Votazione del Rogo
    const confirmVoteBtn = document.getElementById("lupus-confirm-vote-btn");
    if (confirmVoteBtn) {
      confirmVoteBtn.addEventListener("click", () => game.confirmRogoVote());
    }

    // Tasto Passa alla Notte Successiva
    const nextNightBtn = document.getElementById("lupus-btn-next-night");
    if (nextNightBtn) {
      nextNightBtn.addEventListener("click", () => game.startNextNight());
    }

    // Riavvia / Nuova Partita
    const resetGameBtn = document.getElementById("lupus-btn-restart-game");
    if (resetGameBtn) {
      resetGameBtn.addEventListener("click", () => {
        if (confirm("Vuoi iniziare una nuova partita con gli stessi giocatori?")) {
          game.startGame();
        }
      });
    }
  }

  renderSetupView() {
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.updateWolvesDisplay();
    this.updateDiscussionTimeLimits();

    // Aggiorna checkbox ruoli
    Object.keys(this.game.enabledRoles).forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) toggle.checked = !!this.game.enabledRoles[roleKey];
    });

    this.validateRolesAndRenderSummary();
  }

  renderPlayersList() {
    const container = document.getElementById("lupus-players-container");
    const countEl = document.getElementById("lupus-players-count");
    if (!container) return;

    if (countEl) countEl.textContent = this.game.players.length;
    container.innerHTML = "";

    this.game.players.forEach((name, index) => {
      const row = document.createElement("div");
      row.className = "player-row";

      const numSpan = document.createElement("span");
      numSpan.className = "player-num";
      numSpan.textContent = `${index + 1}.`;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "player-input";
      input.value = name;
      input.maxLength = 22;
      input.placeholder = `Nome giocatore ${index + 1}`;
      input.addEventListener("input", (e) => {
        this.game.players[index] = e.target.value.trim() || `Giocatore ${index + 1}`;
        this.savePlayers();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "player-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.title = "Rimuovi giocatore";
      deleteBtn.disabled = this.game.players.length <= 4;
      deleteBtn.addEventListener("click", () => {
        if (this.game.players.length > 4) {
          Sound.playClick();
          this.game.players.splice(index, 1);
          this.savePlayers();
          this.renderPlayersList();
          this.ensureValidWolvesCount();
          this.validateRolesAndRenderSummary();
        }
      });

      row.appendChild(numSpan);
      row.appendChild(input);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });

    const addBtn = document.getElementById("lupus-add-player-btn");
    if (addBtn) addBtn.disabled = this.game.players.length >= 20;
  }

  addNewPlayer() {
    if (this.game.players.length >= 20) return;
    Sound.playClick();
    const newIdx = this.game.players.length + 1;
    this.game.players.push(`Giocatore ${newIdx}`);
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();

    setTimeout(() => {
      const container = document.getElementById("lupus-players-container");
      if (container && container.lastElementChild) {
        const input = container.lastElementChild.querySelector("input");
        if (input) input.focus();
      }
    }, 50);
  }

  fillQuickNames() {
    Sound.playClick();
    const italianNames = [
      "Marco", "Sofia", "Luca", "Giulia", "Andrea", "Chiara",
      "Matteo", "Elena", "Davide", "Valentina", "Lorenzo", "Federica",
      "Alessandro", "Francesca", "Gabriele", "Sara", "Simone", "Martina", "Tommaso", "Alice"
    ];
    const shuffled = [...italianNames].sort(() => 0.5 - Math.random());
    const count = Math.max(4, this.game.players.length);
    this.game.players = [];
    for (let i = 0; i < count; i++) {
      this.game.players.push(shuffled[i % shuffled.length]);
    }
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();
  }

  adjustDiscussionTime(delta) {
    Sound.playClick();
    this.game.discussionMinutes = Math.max(1, Math.min(10, this.game.discussionMinutes + delta));
    this.game.initialDiscussionSeconds = this.game.discussionMinutes * 60;
    this.game.discussionSeconds = this.game.initialDiscussionSeconds;
    try { localStorage.setItem("lupus_discussion_minutes", this.game.discussionMinutes); } catch (e) {}
    this.updateDiscussionTimeLimits();
  }

  updateDiscussionTimeLimits() {
    const valEl = document.getElementById("lupus-time-value");
    if (valEl) valEl.textContent = `${this.game.discussionMinutes} min`;

    const minusBtn = document.getElementById("lupus-time-minus");
    const plusBtn = document.getElementById("lupus-time-plus");
    if (minusBtn) minusBtn.disabled = this.game.discussionMinutes <= 1;
    if (plusBtn) plusBtn.disabled = this.game.discussionMinutes >= 10;
  }

  adjustWolvesCount(delta) {
    Sound.playClick();
    const maxWolves = Math.max(1, Math.floor((this.game.players.length - 1) / 2));
    this.game.wolvesCount = Math.min(Math.max(1, this.game.wolvesCount + delta), maxWolves);
    this.updateWolvesDisplay();
    this.validateRolesAndRenderSummary();
  }

  ensureValidWolvesCount() {
    const maxWolves = Math.max(1, Math.floor((this.game.players.length - 1) / 2));
    if (this.game.wolvesCount > maxWolves) {
      this.game.wolvesCount = maxWolves;
    }
    if (this.game.wolvesCount < 1) {
      this.game.wolvesCount = 1;
    }
    this.updateWolvesDisplay();
  }

  updateWolvesDisplay() {
    const valEl = document.getElementById("lupus-wolves-value");
    if (valEl) valEl.textContent = this.game.wolvesCount;
  }

  validateRolesAndRenderSummary() {
    const summaryBox = document.getElementById("lupus-roles-summary");
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (!summaryBox) return;

    const total = this.game.players.length;
    const wolves = this.game.wolvesCount;

    // 1. Ruoli speciali dei Lupi (con abilità) che rientrano nel conteggio dei lupi
    const activeSpecialWolves = [];
    if (this.game.enabledRoles.lupo_stregone) activeSpecialWolves.push("1 Lupo Stregone 🐺🔮");
    if (this.game.enabledRoles.cane_nero) activeSpecialWolves.push("1 Cane Nero 🐕‍🦺");
    if (this.game.enabledRoles.infiltrato) activeSpecialWolves.push("1 Lupo Mannaro 🐺🌕");
    if (this.game.enabledRoles.lupo_bianco) activeSpecialWolves.push("1 Lupo Bianco 🐺❄️");

    const specialWolvesCount = activeSpecialWolves.length;
    const normalWolves = wolves - specialWolvesCount;

    if (normalWolves < 0) {
      summaryBox.className = "lupus-summary-box error";
      summaryBox.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 700;">⚠️ Troppi Lupi Speciali selezionati!</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          Hai attivato <strong>${specialWolvesCount}</strong> lupi con poteri speciali, ma il totale lupi è impostato a <strong>${wolves}</strong>. Aumenta il numero di lupi o disattiva un lupo speciale per continuare.
        </div>
      `;
      if (startBtn) startBtn.disabled = true;
      return;
    }

    // 2. Ruoli speciali del Villaggio e Solitari (esclusi i lupi)
    const activeVillageSpecials = [];
    if (this.game.enabledRoles.veggente) activeVillageSpecials.push("1 Veggente 🔮");
    if (this.game.enabledRoles.guardia) activeVillageSpecials.push("1 Guardia 🛡️");
    if (this.game.enabledRoles.strega) activeVillageSpecials.push("1 Strega 🧙‍♀️");
    if (this.game.enabledRoles.cupido) activeVillageSpecials.push("1 Cupido 💘");
    if (this.game.enabledRoles.donna) activeVillageSpecials.push("1 Donna 💃");
    if (this.game.enabledRoles.beccamorto) activeVillageSpecials.push("1 Beccamorto ⚰️");
    if (this.game.enabledRoles.idiota) activeVillageSpecials.push("1 Idiota 🤡");
    if (this.game.enabledRoles.necromante) activeVillageSpecials.push("1 Necromante 🕯️💀");
    if (this.game.enabledRoles.giullare) activeVillageSpecials.push("1 Giullare 🃏");

    const villageSpecialsCount = activeVillageSpecials.length;
    const peasants = (total - wolves) - villageSpecialsCount;

    if (peasants < 0) {
      summaryBox.className = "lupus-summary-box error";
      summaryBox.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 700;">⚠️ Troppi ruoli speciali per il Villaggio!</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          Con ${total} giocatori e ${wolves} lupi in totale, puoi attivare al massimo ${Math.max(0, total - wolves)} figure speciali non-lupo. Disattivane qualcuna per procedere.
        </div>
      `;
      if (startBtn) startBtn.disabled = true;
      return;
    }

    if (startBtn) startBtn.disabled = false;
    summaryBox.className = "lupus-summary-box";

    const parts = [];

    // Composizione Branco dei Lupi
    const wolfBreakdown = [];
    if (normalWolves > 0) {
      wolfBreakdown.push(`<strong>${normalWolves}</strong> Lup${normalWolves === 1 ? "o" : "i"} Normal${normalWolves === 1 ? "e" : "i"} 🐺`);
    }
    if (activeSpecialWolves.length > 0) {
      wolfBreakdown.push(activeSpecialWolves.join(", "));
    }
    parts.push(`Branco Lupi (${wolves}): ${wolfBreakdown.join(", ")}`);

    // Figure Speciali Villaggio
    if (activeVillageSpecials.length > 0) {
      parts.push(activeVillageSpecials.join(", "));
    }

    // Contadini
    if (peasants > 0) {
      parts.push(`<strong>${peasants}</strong> Contadin${peasants === 1 ? "o" : "i"} 👨‍🌾`);
    } else {
      parts.push(`<span style="color: var(--accent-warning);">0 Contadini</span>`);
    }

    summaryBox.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;">Composizione Villaggio (${total} Giocatori • ${wolves} Lupi Totali):</div>
      <div style="font-size: 0.95rem; margin-top: 5px; line-height: 1.5; color: var(--text-primary);">${parts.join(" &bull; ")}</div>
    `;
  }

  renderTurnReveal() {
    const current = this.game.assignments[this.game.currentTurnIndex];
    if (!current) return;

    const targetNameEl = document.getElementById("lupus-pass-target-name");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const nextBtnContainer = document.getElementById("lupus-pass-next-btn-container");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    const nextTurnBtn = document.getElementById("lupus-next-turn-btn");

    if (targetNameEl) targetNameEl.textContent = current.name;
    if (progressEl) progressEl.textContent = `Giocatore ${this.game.currentTurnIndex + 1} di ${this.game.assignments.length}`;
    if (promptWrap) promptWrap.style.display = "block";

    if (secretCard) secretCard.style.display = "none";
    document.body.style.overflow = "";
    if (holdBtn) {
      holdBtn.style.display = "flex";
      holdBtn.classList.remove("holding");
    }
    if (nextBtnContainer) nextBtnContainer.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";

    if (nextTurnBtn) {
      if (this.game.currentTurnIndex < this.game.assignments.length - 1) {
        nextTurnBtn.innerHTML = "✅ Ho visto! Passa al prossimo giocatore";
      } else {
        nextTurnBtn.innerHTML = "📜 Ho visto! Vai alla Guida del Narratore";
      }
    }

    window.scrollTo(0, 0);
  }

  onHoldStart() {
    const game = this.game;
    if (game.isHolding) return;
    game.isHolding = true;
    game.holdStartTime = Date.now();

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    Sound.playHoldTick();

    clearInterval(game.holdProgressInterval);
    game.holdProgressInterval = setInterval(() => {
      const elapsed = Date.now() - game.holdStartTime;
      const pct = Math.min(100, (elapsed / game.holdRequiredMs) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= game.holdRequiredMs) {
        clearInterval(game.holdProgressInterval);
        this.revealCardContent();
      }
    }, 25);
  }

  onHoldEnd() {
    const game = this.game;
    if (!game.isHolding) return;
    game.isHolding = false;
    clearInterval(game.holdProgressInterval);

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    document.body.style.overflow = "";

    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const nextBtnContainer = document.getElementById("lupus-pass-next-btn-container");
    if (secretCard && secretCard.style.display !== "none") {
      secretCard.style.display = "none";
      if (promptWrap) promptWrap.style.display = "block";
      if (progressEl) progressEl.textContent = `Giocatore ${game.currentTurnIndex + 1} di ${game.assignments.length}`;
      if (holdBtn) holdBtn.style.display = "flex";
      if (nextBtnContainer) nextBtnContainer.style.display = "block";
    }
  }

  revealCardContent() {
    const game = this.game;
    const current = game.assignments[game.currentTurnIndex];
    if (!current) return;

    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (!secretCard) return;

    const role = current.role;

    if (promptWrap) promptWrap.style.display = "none";
    if (progressEl) {
      progressEl.innerHTML = `👤 <strong>${current.name}</strong> • Giocatore ${game.currentTurnIndex + 1} di ${game.assignments.length}`;
    }

    const imgEl = document.getElementById("lupus-card-img");
    const titleEl = document.getElementById("lupus-card-title");
    const factionEl = document.getElementById("lupus-card-faction");
    const descEl = document.getElementById("lupus-card-desc");
    const alliesBox = document.getElementById("lupus-card-allies-box");
    const alliesList = document.getElementById("lupus-card-allies-list");
    const cardContainer = document.getElementById("lupus-card-box");

    if (imgEl) {
      imgEl.src = role.image;
      imgEl.alt = role.name;
      imgEl.onerror = () => {
        if (imgEl.src.includes("img/lupus/")) {
          imgEl.src = role.image.replace("img/lupus/", "img/");
        } else if (!imgEl.src.includes("img/lupus/")) {
          imgEl.src = role.image.replace("img/", "img/lupus/");
        }
      };
    }
    if (titleEl) titleEl.textContent = role.name;
    if (factionEl) {
      factionEl.textContent = role.factionLabel;
      factionEl.className = `lupus-faction-badge faction-${role.faction}`;
    }
    if (descEl) descEl.textContent = role.description;

    if (cardContainer) {
      cardContainer.className = `lupus-tarot-card theme-${role.faction}`;
    }

    const isWakingWithWolves = ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(role.id);

    if (isWakingWithWolves) {
      Sound.playImpostorReveal();
      const otherWolves = game.assignments
        .filter(a => ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(a.roleKey) && a.name !== current.name)
        .map(a => a.name);

      if (alliesBox && alliesList) {
        alliesBox.style.display = "block";
        const titleSpan = alliesBox.querySelector(".lupus-allies-title");
        if (titleSpan) {
          titleSpan.textContent = role.id === "lupo_bianco"
            ? "🐺 Branco con cui fingi alleanza (Lupi):"
            : "🐺 Compagni del Branco (Lupi):";
        }
        if (otherWolves.length > 0) {
          alliesList.innerHTML = otherWolves.map(name => `
            <span class="lupus-ally-pill">🐺 ${name} (Lupo)</span>
          `).join(" ");
        } else {
          alliesList.innerHTML = `<span class="lupus-ally-pill solo">Sei l'unico Lupo del branco! 🐺</span>`;
        }
      }
    } else {
      Sound.playInnocentReveal();
      if (alliesBox) alliesBox.style.display = "none";
    }

    if (holdBtn) holdBtn.style.display = "none";
    secretCard.style.display = "flex";
    document.body.style.overflow = "hidden";
    const modalTheme = role.faction === "lupi" ? "impostor" : role.faction === "solitario" ? "solitario" : "innocent";
    secretCard.className = `secret-card lupus-card-modal-overlay ${modalTheme}`;

    window.scrollTo(0, 0);
  }

  nextTurn() {
    Sound.playClick();
    this.game.currentTurnIndex++;

    if (this.game.currentTurnIndex < this.game.assignments.length) {
      this.renderTurnReveal();
    } else {
      this.game.initMasterDashboard();
      window.App.switchView("view-lupus-master");
    }
  }
}

if (typeof window !== "undefined") {
  window.LupusSetupUI = LupusSetupUI;
}
