/**
 * LupusGameController - Controller per "Lupus in Fabula" (Modalità Locale "Passa il Telefono")
 * 
 * Supporta:
 * - Selezione N giocatori (4-20) con interfaccia identica a L'Impostore (Nomi modificabili, aggiunta, nomi casuali)
 * - Selezione lupi obbligatori (< N / 2)
 * - Timer di discussione villaggio configurabile (con possibilità di terminare in anticipo)
 * - Ruoli speciali disattivabili a piacere:
 *   * Veggente 🔮
 *   * Guardia 🛡️ (sceglie ogni notte un cittadino da difendere con il suo scudo)
 *   * Strega 🧙‍♀️
 *   * Cupido 💘
 *   * La Donna (Meretrice) 💃
 * - Calcolo automatico Contadini
 * - Rivelazione di sicurezza con Hold-to-Reveal (la carta resta visibile solo tenendo premuto)
 * - Sequenza Unificata Continua: Notte -> Alba -> Discussione & Timer -> Votazione Rogo (selezione di 1 solo giocatore)
 * - Risoluzione della condanna con verifica vittoria e prosecuzione fluida al round / notte successiva
 */

const LUPUS_ROLES = {
  lupo: {
    id: "lupo",
    name: "Lupo Mannaro",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺",
    icon: "🐺",
    image: "img/lupus/lupo.jpg",
    color: "#ff2a5f",
    description: "Ogni notte ti svegli insieme agli altri Lupi per scegliere una vittima da sbranare. Di giorno, bluffa e confondi il villaggio per non farti mandare al rogo!",
    nightAction: "I Lupi aprono gli occhi insieme, si coordinano silenziosamente e indicano la vittima al Narratore."
  },
  veggente: {
    id: "veggente",
    name: "Veggente",
    faction: "villaggio",
    factionLabel: "Villaggio 🔮",
    icon: "🔮",
    image: "img/lupus/veggente.jpg",
    color: "#a855f7",
    description: "Ogni notte puoi interrogare il Narratore su un giocatore per scoprire se appartiene al Branco dei Lupi o agli innocenti. Guida il villaggio senza esporti troppo!",
    nightAction: "Il Veggente apre gli occhi e indica un giocatore. Il Narratore annuisce (Lupo) o scuote la testa (Non Lupo)."
  },
  guardia: {
    id: "guardia",
    name: "Guardia",
    faction: "villaggio",
    factionLabel: "Villaggio 🛡️",
    icon: "🛡️",
    image: "img/lupus/guardia.jpg",
    color: "#3b82f6",
    description: "Ogni notte vegli sul villaggio e scegli un cittadino da difendere con il tuo scudo. Se i Lupi Mannari attaccano quella persona, il tuo intervento la salverà dalla morte!",
    nightAction: "La Guardia apre gli occhi e indica al Narratore il giocatore da proteggere per questa notte."
  },
  strega: {
    id: "strega",
    name: "Strega",
    faction: "villaggio",
    factionLabel: "Villaggio 🧙‍♀️",
    icon: "🧙‍♀️",
    image: "img/lupus/strega.jpg",
    color: "#10b981",
    description: "Possiedi due pozioni magiche monouso: la Pozione di Vita (salva la vittima dei lupi) e la Pozione di Morte (avvelena un giocatore a tua scelta).",
    nightAction: "La Strega apre gli occhi. Il Narratore le mostra la vittima dei Lupi; lei decide se salvarla e/o usare il veleno su qualcun altro."
  },
  cupido: {
    id: "cupido",
    name: "Cupido",
    faction: "villaggio",
    factionLabel: "Villaggio (Innamorati) 💘",
    icon: "💘",
    image: "img/lupus/cupido.jpg",
    color: "#f43f5e",
    description: "Nella prima notte scocchi le tue frecce e leghi due giocatori come Innamorati. Se uno muore, anche l'altro muore all'istante di crepacuore!",
    nightAction: "SOLO la prima notte: Cupido indica due giocatori. Il Narratore tocca le loro spalle per farli riconoscere."
  },
  donna: {
    id: "donna",
    name: "La Donna (Meretrice)",
    faction: "villaggio",
    factionLabel: "Villaggio 💃",
    icon: "💃",
    image: "img/lupus/donna.jpg",
    color: "#e11d48",
    description: "Ogni notte scegli un giocatore con cui rifugiarti. Se i lupi attaccano te, non ti trovano e ti salvi! Ma attenta: se scegli un lupo o se il tuo ospite muore, muori anche tu!",
    nightAction: "La Donna apre gli occhi e indica al Narratore la persona con cui trascorre la notte."
  },
  contadino: {
    id: "contadino",
    name: "Contadino",
    faction: "villaggio",
    factionLabel: "Villaggio 👨‍🌾",
    icon: "👨‍🌾",
    image: "img/lupus/contadino.jpg",
    color: "#eab308",
    description: "Non hai poteri notturni speciali. La tua forza risiede nella deduzione, nell'osservazione e nel voto diurno per mandare al rogo i Lupi Mannari!",
    nightAction: "I Contadini dormono sonni profondi durante tutta la notte."
  },
  giullare: {
    id: "giullare",
    name: "Il Giullare",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🃏",
    icon: "🃏",
    image: "img/lupus/giullare.jpg",
    color: "#f59e0b",
    description: "Il generatore di caos per eccellenza! Non appartieni a nessuna fazione e vinci UNICAMENTE se riesci a farti condannare al rogo dal villaggio. Comportati in modo ambiguo, semina il dubbio e fatti bruciare!",
    nightAction: "Il Giullare dorme sonni tranquilli tutta la notte sognando il suo rogo trionfale."
  },
  infiltrato: {
    id: "infiltrato",
    name: "L'Infiltrato (Traditore)",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🕵️",
    icon: "🕵️",
    image: "img/lupus/infiltrato.jpg",
    color: "#ef4444",
    description: "Sei un normale umano ma il tuo cuore appartiene ai Lupi! Vinci se il branco trionfa, ma non sai chi siano i veri lupi e non ti svegli con loro. Al Veggente risulti un innocente 'Non Lupo'. Depista il villaggio!",
    nightAction: "L'Infiltrato dorme con il resto degli umani: non si sveglia con i lupi e non conosce la loro identità."
  },
  lupo_bianco: {
    id: "lupo_bianco",
    name: "Il Lupo Bianco",
    faction: "solitario",
    factionLabel: "Fazione Solitaria 🐺❄️",
    icon: "🐺❄️",
    image: "img/lupus/lupo_bianco.jpg",
    color: "#38bdf8",
    description: "Ti svegli ogni notte con il branco e fingi alleanza. A notti alterne (notte 2, 4, 6...), però, ti svegli una seconda volta da solo e puoi sbranare uno degli altri lupi! Vinci SOLO se resti l'ultimo e unico sopravvissuto della partita.",
    nightAction: "Si sveglia con il branco per scegliere la vittima del villaggio. A notti alterne (pari) si sveglia da solo e può eliminare un compagno lupo."
  },
  lupo_stregone: {
    id: "lupo_stregone",
    name: "Il Lupo Stregone",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐺🔮",
    icon: "🐺🔮",
    image: "img/lupus/lupo_stregone.jpg",
    color: "#9333ea",
    description: "Ti svegli con il branco dei Lupi ogni notte. Subito dopo, ti svegli da solo e puoi scagliare la tua maledizione: indica un abitante al Narratore. Se quel giocatore ha un potere notturno attivo (Guardia, Veggente, Strega, Beccamorto), il suo potere sarà bloccato per questa notte!",
    nightAction: "Si sveglia con i lupi. Subito dopo apre gli occhi da solo e indica un giocatore per bloccarne il potere notturno se attivo."
  },
  beccamorto: {
    id: "beccamorto",
    name: "Il Beccamorto",
    faction: "villaggio",
    factionLabel: "Villaggio ⚰️",
    icon: "⚰️",
    image: "img/lupus/beccamorto.jpg",
    color: "#64748b",
    description: "I morti ti parlano nel silenzio del cimitero. Dalla Notte 2 in poi, ogni notte il Narratore ti sveglia e ti rivela segretamente il ruolo esatto del giocatore morto nel round precedente (con 1 giorno di ritardo).",
    nightAction: "Dalla Notte 2 in poi, il Beccamorto apre gli occhi. Il Narratore gli mostra la carta o mima il ruolo del morto del round precedente."
  },
  idiota: {
    id: "idiota",
    name: "L'Idiota del Villaggio",
    faction: "villaggio",
    factionLabel: "Villaggio 🤡",
    icon: "🤡",
    image: "img/lupus/idiota.jpg",
    color: "#14b8a6",
    description: "Sei un membro innocente del Villaggio, ma i tuoi modi stralunati ingannano le visioni mistiche: se il Veggente ti scruta di notte, il Narratore gli risponderà falsamente che sei un LUPO! Difenditi dal rogo!",
    nightAction: "L'Idiota dorme sonni beati. Al Veggente risulterà falsamente come 'Lupo'."
  },
  cane_nero: {
    id: "cane_nero",
    name: "Il Cane Nero (Lupo Illusionista)",
    faction: "lupi",
    factionLabel: "Branco dei Lupi 🐕‍🦺",
    icon: "🐕‍🦺",
    image: "img/lupus/cane_nero.jpg",
    color: "#dc2626",
    description: "Sei un feroce Lupo Mannaro sotto le sembianze di un fedele segugio nero. Ti svegli ogni notte con il branco per scegliere la vittima. La tua abilità illusoria: al Veggente risulti insospettabile come 'NON Lupo'!",
    nightAction: "Si sveglia con il branco dei lupi ogni notte. Se il Veggente lo scruta, il Narratore risponde che è 'Non Lupo'."
  }
};

class LupusGameController {
  constructor() {
    this.players = this.loadSavedPlayers() || [
      "Marco", "Sofia", "Luca", "Giulia", "Matteo", "Elena"
    ];
    this.wolvesCount = 1;

    // Timer Discussione (come Impostore)
    this.discussionMinutes = 3;
    try {
      const savedMin = parseInt(localStorage.getItem("lupus_discussion_minutes"), 10);
      if (savedMin >= 1 && savedMin <= 10) this.discussionMinutes = savedMin;
    } catch (e) {}
    this.discussionSeconds = this.discussionMinutes * 60;
    this.initialDiscussionSeconds = this.discussionSeconds;
    this.discussionTimer = null;
    this.isDiscussionRunning = false;

    // Ruoli speciali abilitati
    this.enabledRoles = {
      veggente: true,
      guardia: true,
      strega: true,
      cupido: true,
      donna: false,
      giullare: false,
      infiltrato: false,
      lupo_bianco: false,
      lupo_stregone: false,
      beccamorto: false,
      idiota: false,
      cane_nero: false
    };

    // Stato partita
    this.assignments = []; // [{ id, name, roleKey, role, isAlive, isLover }]
    this.currentTurnIndex = 0;

    // Gestione Hold-to-Reveal di sicurezza (come Impostore)
    this.holdProgressInterval = null;
    this.holdStartTime = 0;
    this.isHolding = false;
    this.holdRequiredMs = 350;

    // Master Dashboard state: round continuo
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.autoNextNightTimer = null;

    this.bindSetupEvents();
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
      localStorage.setItem("lupus_saved_players", JSON.stringify(this.players));
    } catch (e) {}
  }

  // =========================================================================
  // SETUP & CONFIGURAZIONE (Stile L'Impostore)
  // =========================================================================

  bindSetupEvents() {
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
      "giullare", "infiltrato", "lupo_bianco", "lupo_stregone", "beccamorto", "idiota", "cane_nero"
    ].forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) {
        toggle.addEventListener("change", (e) => {
          this.enabledRoles[roleKey] = e.target.checked;
          Sound.playClick();
          this.validateRolesAndRenderSummary();
        });
      }
    });

    // Avvia Partita
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startGame());
    }

    // Gestione Tasto Hold to Reveal (Tieni premuto per vedere di sicurezza)
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    if (holdBtn) {
      const startHold = (e) => {
        if (e.cancelable) e.preventDefault();
        this.onHoldStart();
      };
      const endHold = () => {
        if (!this.isHolding) return;
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

    // Master Dashboard Step Controls (Scorrimento continuo di tutte le fasi)
    const nextStepBtn = document.getElementById("lupus-master-next-step");
    if (nextStepBtn) {
      nextStepBtn.addEventListener("click", () => this.masterNextStep());
    }

    const prevStepBtn = document.getElementById("lupus-master-prev-step");
    if (prevStepBtn) {
      prevStepBtn.addEventListener("click", () => this.masterPrevStep());
    }

    // Timer Discussione Giorno / Rogo
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) {
      timerBtn.addEventListener("click", () => this.toggleDiscussionTimer());
    }

    // Concludi Timer in Anticipo & Vai al Voto del Rogo
    const earlyEndBtn = document.getElementById("lupus-end-discussion-early-btn");
    if (earlyEndBtn) {
      earlyEndBtn.addEventListener("click", () => this.endDiscussionEarly());
    }

    // Tasto Conferma Votazione del Rogo (Unico giocatore)
    const confirmVoteBtn = document.getElementById("lupus-confirm-vote-btn");
    if (confirmVoteBtn) {
      confirmVoteBtn.addEventListener("click", () => this.confirmRogoVote());
    }

    // Tasto Passa alla Notte Successiva
    const nextNightBtn = document.getElementById("lupus-btn-next-night");
    if (nextNightBtn) {
      nextNightBtn.addEventListener("click", () => this.startNextNight());
    }

    // Riavvia / Nuova Partita
    const resetGameBtn = document.getElementById("lupus-btn-restart-game");
    if (resetGameBtn) {
      resetGameBtn.addEventListener("click", () => {
        if (confirm("Vuoi iniziare una nuova partita con gli stessi giocatori?")) {
          this.startGame();
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
    Object.keys(this.enabledRoles).forEach(roleKey => {
      const toggle = document.getElementById(`lupus-toggle-${roleKey}`);
      if (toggle) toggle.checked = !!this.enabledRoles[roleKey];
    });

    this.validateRolesAndRenderSummary();
  }

  renderPlayersList() {
    const container = document.getElementById("lupus-players-container");
    const countEl = document.getElementById("lupus-players-count");
    if (!container) return;

    if (countEl) countEl.textContent = this.players.length;
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
      input.maxLength = 22;
      input.placeholder = `Nome giocatore ${index + 1}`;
      input.addEventListener("input", (e) => {
        this.players[index] = e.target.value.trim() || `Giocatore ${index + 1}`;
        this.savePlayers();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "player-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.title = "Rimuovi giocatore";
      deleteBtn.disabled = this.players.length <= 4;
      deleteBtn.addEventListener("click", () => {
        if (this.players.length > 4) {
          Sound.playClick();
          this.players.splice(index, 1);
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
    if (addBtn) addBtn.disabled = this.players.length >= 20;
  }

  addNewPlayer() {
    if (this.players.length >= 20) return;
    Sound.playClick();
    const newIdx = this.players.length + 1;
    this.players.push(`Giocatore ${newIdx}`);
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();

    // Focus sull'ultimo input appena aggiunto
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
    const count = Math.max(4, this.players.length);
    this.players = [];
    for (let i = 0; i < count; i++) {
      this.players.push(shuffled[i % shuffled.length]);
    }
    this.savePlayers();
    this.renderPlayersList();
    this.ensureValidWolvesCount();
    this.validateRolesAndRenderSummary();
  }

  adjustDiscussionTime(delta) {
    Sound.playClick();
    this.discussionMinutes = Math.max(1, Math.min(10, this.discussionMinutes + delta));
    this.initialDiscussionSeconds = this.discussionMinutes * 60;
    this.discussionSeconds = this.initialDiscussionSeconds;
    try { localStorage.setItem("lupus_discussion_minutes", this.discussionMinutes); } catch (e) {}
    this.updateDiscussionTimeLimits();
  }

  updateDiscussionTimeLimits() {
    const valEl = document.getElementById("lupus-time-value");
    if (valEl) valEl.textContent = `${this.discussionMinutes} min`;

    const minusBtn = document.getElementById("lupus-time-minus");
    const plusBtn = document.getElementById("lupus-time-plus");
    if (minusBtn) minusBtn.disabled = this.discussionMinutes <= 1;
    if (plusBtn) plusBtn.disabled = this.discussionMinutes >= 10;
  }

  adjustWolvesCount(delta) {
    Sound.playClick();
    const maxWolves = Math.max(1, Math.floor((this.players.length - 1) / 2));
    this.wolvesCount = Math.min(Math.max(1, this.wolvesCount + delta), maxWolves);
    this.updateWolvesDisplay();
    this.validateRolesAndRenderSummary();
  }

  ensureValidWolvesCount() {
    const maxWolves = Math.max(1, Math.floor((this.players.length - 1) / 2));
    if (this.wolvesCount > maxWolves) {
      this.wolvesCount = maxWolves;
    }
    if (this.wolvesCount < 1) {
      this.wolvesCount = 1;
    }
    this.updateWolvesDisplay();
  }

  updateWolvesDisplay() {
    const valEl = document.getElementById("lupus-wolves-value");
    if (valEl) valEl.textContent = this.wolvesCount;
  }

  validateRolesAndRenderSummary() {
    const summaryBox = document.getElementById("lupus-roles-summary");
    const startBtn = document.getElementById("lupus-btn-start-game");
    if (!summaryBox) return;

    const total = this.players.length;
    const wolves = this.wolvesCount;

    let specials = 0;
    const activeSpecialNames = [];
    if (this.enabledRoles.veggente) { specials++; activeSpecialNames.push("1 Veggente 🔮"); }
    if (this.enabledRoles.guardia) { specials++; activeSpecialNames.push("1 Guardia 🛡️"); }
    if (this.enabledRoles.strega) { specials++; activeSpecialNames.push("1 Strega 🧙‍♀️"); }
    if (this.enabledRoles.cupido) { specials++; activeSpecialNames.push("1 Cupido 💘"); }
    if (this.enabledRoles.donna) { specials++; activeSpecialNames.push("1 Donna 💃"); }
    if (this.enabledRoles.beccamorto) { specials++; activeSpecialNames.push("1 Beccamorto ⚰️"); }
    if (this.enabledRoles.idiota) { specials++; activeSpecialNames.push("1 Idiota 🤡"); }
    if (this.enabledRoles.lupo_stregone) { specials++; activeSpecialNames.push("1 Lupo Stregone 🐺🔮"); }
    if (this.enabledRoles.cane_nero) { specials++; activeSpecialNames.push("1 Cane Nero 🐕‍🦺"); }
    if (this.enabledRoles.infiltrato) { specials++; activeSpecialNames.push("1 Infiltrato 🕵️"); }
    if (this.enabledRoles.giullare) { specials++; activeSpecialNames.push("1 Giullare 🃏"); }
    if (this.enabledRoles.lupo_bianco) { specials++; activeSpecialNames.push("1 Lupo Bianco 🐺❄️"); }

    const peasants = total - (wolves + specials);

    if (peasants < 0) {
      summaryBox.className = "lupus-summary-box error";
      summaryBox.innerHTML = `
        <div style="color: var(--accent-danger); font-weight: 700;">⚠️ Troppi ruoli speciali selezionati!</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
          Con ${total} giocatori e ${wolves} lupi base, puoi attivare al massimo ${Math.max(0, total - wolves)} figure speciali. Disattivane qualcuna per procedere.
        </div>
      `;
      if (startBtn) startBtn.disabled = true;
      return;
    }

    if (startBtn) startBtn.disabled = false;
    summaryBox.className = "lupus-summary-box";

    const parts = [`<strong>${wolves}</strong> Lup${wolves === 1 ? "o" : "i"} Base 🐺`];
    if (activeSpecialNames.length > 0) {
      parts.push(activeSpecialNames.join(", "));
    }
    if (peasants > 0) {
      parts.push(`<strong>${peasants}</strong> Contadin${peasants === 1 ? "o" : "i"} 👨‍🌾`);
    } else {
      parts.push(`<span style="color: var(--accent-warning);">0 Contadini</span>`);
    }

    summaryBox.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;">Composizione Villaggio (${total} Giocatori):</div>
      <div style="font-size: 0.95rem; margin-top: 5px; line-height: 1.5; color: var(--text-primary);">${parts.join(" • ")}</div>
    `;
  }

  // =========================================================================
  // AVVIO PARTITA & DISTRIBUZIONE RUOLI
  // =========================================================================

  startGame() {
    Sound.playClick();

    // Raccogli nomi validi
    this.players = this.players.map((p, idx) => (p || "").trim() || `Giocatore ${idx + 1}`);
    this.savePlayers();

    if (this.players.length < 4) {
      alert("Sono necessari almeno 4 giocatori per Lupus in Fabula!");
      return;
    }

    const total = this.players.length;
    const wolves = this.wolvesCount;
    const roleDeck = [];

    // 1. Inserisci Lupi base
    for (let i = 0; i < wolves; i++) {
      roleDeck.push("lupo");
    }

    // 2. Inserisci ruoli speciali attivi
    if (this.enabledRoles.veggente) roleDeck.push("veggente");
    if (this.enabledRoles.guardia) roleDeck.push("guardia");
    if (this.enabledRoles.strega) roleDeck.push("strega");
    if (this.enabledRoles.cupido) roleDeck.push("cupido");
    if (this.enabledRoles.donna) roleDeck.push("donna");
    if (this.enabledRoles.beccamorto) roleDeck.push("beccamorto");
    if (this.enabledRoles.idiota) roleDeck.push("idiota");
    if (this.enabledRoles.lupo_stregone) roleDeck.push("lupo_stregone");
    if (this.enabledRoles.cane_nero) roleDeck.push("cane_nero");
    if (this.enabledRoles.infiltrato) roleDeck.push("infiltrato");
    if (this.enabledRoles.giullare) roleDeck.push("giullare");
    if (this.enabledRoles.lupo_bianco) roleDeck.push("lupo_bianco");

    // 3. I restanti sono Contadini
    while (roleDeck.length < total) {
      roleDeck.push("contadino");
    }

    // 4. Mescola il mazzo (Fisher-Yates)
    for (let i = roleDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleDeck[i], roleDeck[j]] = [roleDeck[j], roleDeck[i]];
    }

    // 5. Assegna a ciascun giocatore
    this.assignments = this.players.map((name, i) => {
      const roleKey = roleDeck[i];
      return {
        id: `p_${i}`,
        name: name,
        roleKey: roleKey,
        role: LUPUS_ROLES[roleKey],
        isAlive: true,
        isLover: false
      };
    });

    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const victoryBanner = document.getElementById("lupus-victory-banner");
    if (victoryBanner) victoryBanner.style.display = "none";
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";

    this.currentTurnIndex = 0;
    this.isHolding = false;
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;

    window.App.switchView("view-lupus-pass");
    this.renderTurnReveal();
  }

  // =========================================================================
  // ROTAZIONE "PASSA IL TELEFONO" CON HOLD-TO-REVEAL (Stile L'Impostore)
  // =========================================================================

  renderTurnReveal() {
    const current = this.assignments[this.currentTurnIndex];
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
    if (progressEl) progressEl.textContent = `Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
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
      if (this.currentTurnIndex < this.assignments.length - 1) {
        nextTurnBtn.innerHTML = "✅ Ho visto! Passa al prossimo giocatore";
      } else {
        nextTurnBtn.innerHTML = "📜 Ho visto! Vai alla Guida del Narratore";
      }
    }

    window.scrollTo(0, 0);
  }

  onHoldStart() {
    if (this.isHolding) return;
    this.isHolding = true;
    this.holdStartTime = Date.now();

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    if (holdBtn) holdBtn.classList.add("holding");

    Sound.playHoldTick();

    clearInterval(this.holdProgressInterval);
    this.holdProgressInterval = setInterval(() => {
      const elapsed = Date.now() - this.holdStartTime;
      const pct = Math.min(100, (elapsed / this.holdRequiredMs) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= this.holdRequiredMs) {
        clearInterval(this.holdProgressInterval);
        this.revealCardContent();
      }
    }, 25);
  }

  onHoldEnd() {
    if (!this.isHolding) return;
    this.isHolding = false;
    clearInterval(this.holdProgressInterval);

    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const progressBar = document.getElementById("lupus-hold-progress-bar");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (holdBtn) holdBtn.classList.remove("holding");
    if (progressBar) progressBar.style.width = "0%";

    // Ripristina lo scroll del body
    document.body.style.overflow = "";

    // Per sicurezza la carta modale viene occultata all'istante non appena si rilascia il dito
    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const nextBtnContainer = document.getElementById("lupus-pass-next-btn-container");
    if (secretCard && secretCard.style.display !== "none") {
      secretCard.style.display = "none";
      if (promptWrap) promptWrap.style.display = "block";
      if (progressEl) progressEl.textContent = `Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
      if (holdBtn) holdBtn.style.display = "flex";
      if (nextBtnContainer) nextBtnContainer.style.display = "block";
    }
  }

  revealCardContent() {
    const current = this.assignments[this.currentTurnIndex];
    if (!current) return;

    const secretCard = document.getElementById("lupus-secret-revealed-card");
    const holdBtn = document.getElementById("lupus-hold-reveal-btn");
    const promptWrap = document.getElementById("lupus-pass-prompt-wrap");
    const progressEl = document.getElementById("lupus-pass-progress-chip");
    if (!secretCard) return;

    const role = current.role;

    // Ottimizzazione visuale: nascondi istruzioni ingombranti e mostra nome sul badge compatto
    if (promptWrap) promptWrap.style.display = "none";
    if (progressEl) {
      progressEl.innerHTML = `👤 <strong>${current.name}</strong> • Giocatore ${this.currentTurnIndex + 1} di ${this.assignments.length}`;
    }

    // Popola carta
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
      const otherWolves = this.assignments
        .filter(a => ["lupo", "lupo_bianco", "lupo_stregone", "cane_nero"].includes(a.roleKey) && a.name !== current.name)
        .map(a => `${a.name} (${a.role.name})`);

      if (alliesBox && alliesList) {
        alliesBox.style.display = "block";
        const titleSpan = alliesBox.querySelector(".lupus-allies-title");
        if (titleSpan) {
          titleSpan.textContent = role.id === "lupo_bianco"
            ? "🐺 Branco con cui fingi alleanza:"
            : "🐺 Compagni del Branco:";
        }
        if (otherWolves.length > 0) {
          alliesList.innerHTML = otherWolves.map(name => `
            <span class="lupus-ally-pill">🐺 ${name}</span>
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

    // Fissa la vista in alto per evitare che scenda e tagli
    window.scrollTo(0, 0);
  }

  nextTurn() {
    Sound.playClick();
    this.currentTurnIndex++;

    if (this.currentTurnIndex < this.assignments.length) {
      this.renderTurnReveal();
    } else {
      // Tutti i partecipanti hanno scoperto la loro identità: vai alla Guida Narratore
      this.initMasterDashboard();
      window.App.switchView("view-lupus-master");
    }
  }

  // =========================================================================
  // DASHBOARD INTERATTIVA DEL NARRATORE (Sequenza Unificata Continua)
  // =========================================================================

  initMasterDashboard() {
    this.nightCount = 1;
    this.masterStepIndex = 0;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.resetDiscussionTimer();

    this.renderMasterRoster();
    this.renderMasterPhaseGuide();
    this.checkVictoryCondition();
  }

  renderMasterRoster() {
    const grid = document.getElementById("lupus-master-roster");
    if (!grid) return;

    const steps = this.getRoundSteps();
    const curStep = steps[this.masterStepIndex];
    // Solo all'Alba (risveglio villaggio) è possibile segnare chi è morto nella notte!
    // Durante la notte, il dibattito e la votazione, lo stato è esclusivamente informativo.
    const isDawn = curStep && curStep.type === "dawn";
    const isStatusDisabled = !isDawn;

    const rosterLabel = document.getElementById("lupus-roster-label");
    if (rosterLabel) {
      if (!curStep) {
        rosterLabel.textContent = "👥 Registro Abitanti:";
      } else if (curStep.type === "dawn") {
        rosterLabel.textContent = "👥 Registro Abitanti (tocca per segnare chi è morto nella notte):";
      } else if (curStep.type === "night") {
        rosterLabel.textContent = "👥 Registro Abitanti (notte in corso • status informativo):";
      } else if (curStep.type === "discussion") {
        rosterLabel.textContent = "👥 Registro Abitanti (dibattito in corso • status informativo):";
      } else if (curStep.type === "voting") {
        rosterLabel.textContent = "👥 Registro Abitanti (Status informativo • Vota nella sezione sotto):";
      } else {
        rosterLabel.textContent = "👥 Registro Abitanti (status informativo):";
      }
    }

    grid.innerHTML = "";
    this.assignments.forEach(player => {
      const chip = document.createElement("div");
      chip.className = `lupus-roster-chip ${player.isAlive ? "alive" : "dead"} ${isStatusDisabled ? "readonly-phase" : ""}`;

      let btnTitle = "";
      if (isStatusDisabled) {
        if (curStep && curStep.type === "night") {
          btnTitle = "Durante la notte il villaggio dorme: annuncia i caduti al risveglio all'Alba.";
        } else if (curStep && curStep.type === "voting") {
          btnTitle = "Status informativo durante la votazione: seleziona e vota nella sezione apposita sottostante.";
        } else if (curStep && curStep.type === "discussion") {
          btnTitle = "Status informativo durante il dibattito: vota al rogo nel passaggio successivo.";
        } else {
          btnTitle = "Status informativo: modifica abilitata solo al risveglio all'Alba.";
        }
      } else {
        btnTitle = player.isAlive ? "Segna come Eliminato nella notte" : "Riporta in Vita";
      }

      chip.innerHTML = `
        <div class="roster-chip-info">
          <span class="roster-chip-icon">${player.role.icon}</span>
          <div>
            <div class="roster-chip-name">${player.name}</div>
            <div class="roster-chip-role">${player.role.name}</div>
          </div>
        </div>
        <button type="button" class="btn-roster-status ${isStatusDisabled ? 'readonly-status' : ''}" ${isStatusDisabled ? 'disabled aria-disabled="true"' : ''} title="${btnTitle}">
          ${player.isAlive ? "🟢 Vivo" : "🔴 Morto"}
        </button>
      `;

      const statusBtn = chip.querySelector(".btn-roster-status");
      if (!isStatusDisabled) {
        statusBtn.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          player.isAlive = !player.isAlive;
          this.renderMasterRoster();
          const isGameOver = this.checkVictoryCondition();
          if (isGameOver) {
            this.renderGameOverCard(player, isGameOver);
          } else {
            // Se eravamo nello step del voto, riaggiorna la griglia
            const currentSteps = this.getRoundSteps();
            if (currentSteps[this.masterStepIndex] && currentSteps[this.masterStepIndex].type === "voting") {
              this.renderVotingGrid();
            }
          }
        });
      }

      grid.appendChild(chip);
    });

    const aliveCount = this.assignments.filter(p => p.isAlive).length;
    const totalCount = this.assignments.length;
    const countBadge = document.getElementById("lupus-alive-count-badge");
    if (countBadge) countBadge.textContent = `${aliveCount}/${totalCount} Vivi`;
  }

  /**
   * Genera l'elenco sequenziale completo di tutti i passaggi del round:
   * Chiamate Notturne -> Alba & Risveglio -> Discussione Diurna & Timer -> Votazione Rogo (1 solo giocatore)
   */
  getRoundSteps() {
    const steps = [];

    // 1. Calano le tenebre
    steps.push({
      type: "night",
      phaseBadge: `Notte ${this.nightCount} 🌙`,
      badgeClass: "badge-night",
      title: `🌙 Calano le Tenebre (Notte ${this.nightCount})`,
      instruction: "Il Narratore annuncia ad alta voce: <em>'Cala la notte sul villaggio. Tutti gli abitanti chiudono gli occhi e si addormentano!'</em>"
    });

    // 2. Cupido (SOLO Notte 1 se abilitato)
    if (this.enabledRoles.cupido && this.nightCount === 1) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "💘 Risveglio di Cupido",
        instruction: "Il Narratore dice: <em>'Cupido, apri gli occhi e indica i due Innamorati.'</em> Cupido indica due persone. Il Narratore annuisce, fa richiudere gli occhi a Cupido e tocca discretamente le spalle dei due innamorati, dicendo: <em>'Gli Innamorati aprano gli occhi per guardarsi e riconoscersi.'</em>"
      });
    }

    // 3. La Donna (se abilitata e viva)
    const donnaAlive = this.assignments.some(p => p.roleKey === "donna" && p.isAlive);
    if (this.enabledRoles.donna && donnaAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "💃 Risveglio della Donna",
        instruction: "Il Narratore dice: <em>'La Donna apre gli occhi e indica con chi trascorrerà la notte.'</em> La Donna indica un giocatore. Il Narratore memorizza la scelta e la fa riaddormentare."
      });
    }

    // 4. I Lupi Mannari (se ci sono lupi del branco vivi: normali, stregone, cane nero o lupo bianco)
    const wolfRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"];
    const wolvesAlive = this.assignments.some(p => wolfRoles.includes(p.roleKey) && p.isAlive);
    if (wolvesAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺 Risveglio del Branco dei Lupi",
        instruction: "Il Narratore dice: <em>'I Lupi Mannari aprano gli occhi, si riconoscano e scelgano silenziosamente la loro vittima.'</em> (Si svegliano tutti i Lupi: normali, Lupo Stregone, Cane Nero e Lupo Bianco. L'Infiltrato NON si sveglia). I lupi concordano una vittima indicandola al Narratore. Il Narratore memorizza la vittima e fa riaddormentare i Lupi."
      });
    }

    // 4b. Il Lupo Stregone (se abilitato e vivo)
    const stregoneAlive = this.assignments.some(p => p.roleKey === "lupo_stregone" && p.isAlive);
    if (this.enabledRoles.lupo_stregone && stregoneAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺🔮 Risveglio del Lupo Stregone",
        instruction: "Il Narratore dice: <em>'Il Lupo Stregone apra gli occhi.'</em> Il Lupo Stregone indica un giocatore al Narratore per annullarne il potere notturno. Se quel giocatore ha un potere notturno attivo (Guardia, Veggente, Strega, Beccamorto), il suo potere è <strong>bloccato</strong> per questa notte! Poi il Lupo Stregone si riaddormenta."
      });
    }

    // 4c. Il Lupo Bianco (a notti alterne: 2, 4, 6... se abilitato e vivo)
    const lupoBiancoAlive = this.assignments.some(p => p.roleKey === "lupo_bianco" && p.isAlive);
    if (this.enabledRoles.lupo_bianco && lupoBiancoAlive && (this.nightCount % 2 === 0)) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🐺❄️ Risveglio Solitario del Lupo Bianco",
        instruction: "A notti alterne (notte pari), il Lupo Bianco si risveglia da solo per tradire il branco! Il Narratore dice: <em>'Il Lupo Bianco apra gli occhi.'</em> Può decidere di sbranare uno degli altri Lupi indicandolo al Narratore, oppure rinunciare (scuotendo la testa). Il Narratore memorizza l'eventuale seconda vittima e fa riaddormentare il Lupo Bianco."
      });
    }

    // 5. La Guardia (se abilitata e viva)
    const guardiaAlive = this.assignments.some(p => p.roleKey === "guardia" && p.isAlive);
    if (this.enabledRoles.guardia && guardiaAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🛡️ Risveglio della Guardia",
        instruction: "Il Narratore dice: <em>'La Guardia apra gli occhi e indichi chi proteggere con il suo scudo.'</em> La Guardia indica un abitante (può proteggere anche se stessa). Il Narratore memorizza la scelta e la fa riaddormentare. <strong>Se i Lupi hanno attaccato quel giocatore, il suo scudo lo salverà e non morirà!</strong>"
      });
    }

    // 6. Il Veggente (se abilitato e vivo)
    const veggenteAlive = this.assignments.some(p => p.roleKey === "veggente" && p.isAlive);
    if (this.enabledRoles.veggente && veggenteAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🔮 Risveglio del Veggente",
        instruction: "Il Narratore dice: <em>'Il Veggente apra gli occhi e indichi la persona di cui vuole scoprire l'identità.'</em> Il Veggente indica una persona. Il Narratore annuisce silenziosamente (Lupo) o scuote la testa (Non Lupo). Poi fa riaddormentare il Veggente.<br><span style='font-size: 0.84rem; color: #fbbf24;'>⚠️ Guida risposte Narratore: l'<strong>Idiota del Villaggio</strong> risponde <strong>LUPO</strong>. Il <strong>Cane Nero</strong> e l'<strong>Infiltrato</strong> rispondono <strong>NON LUPO</strong>.</span>"
      });
    }

    // 6b. Il Beccamorto (dalla Notte 2 in poi, se abilitato e vivo)
    const beccamortoAlive = this.assignments.some(p => p.roleKey === "beccamorto" && p.isAlive);
    if (this.enabledRoles.beccamorto && beccamortoAlive && this.nightCount >= 2) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "⚰️ Risveglio del Beccamorto",
        instruction: "Il Narratore dice: <em>'Il Beccamorto apra gli occhi.'</em> Il Narratore rivela segretamente al Beccamorto (mostrando la carta o mimando il ruolo) l'<strong>esatta identità del giocatore morto nel round precedente</strong> (con 1 giorno di ritardo). Poi fa riaddormentare il Beccamorto."
      });
    }

    // 7. La Strega (se abilitata e viva)
    const stregaAlive = this.assignments.some(p => p.roleKey === "strega" && p.isAlive);
    if (this.enabledRoles.strega && stregaAlive) {
      steps.push({
        type: "night",
        phaseBadge: `Notte ${this.nightCount} 🌙`,
        badgeClass: "badge-night",
        title: "🧙‍♀️ Risveglio della Strega",
        instruction: "Il Narratore dice: <em>'La Strega apra gli occhi.'</em> Il Narratore le indica con un gesto la vittima dei lupi. La Strega decide se usare la pozione di vita (pollice in su) e se usare la pozione di morte su qualcun altro (indica la persona). Poi si riaddormenta."
      });
    }

    // 8. Risveglio del Villaggio (Alba)
    steps.push({
      type: "dawn",
      phaseBadge: "Alba 🌅",
      badgeClass: "badge-day",
      title: `☀️ Risveglio del Villaggio (Giorno ${this.nightCount})`,
      instruction: "Il Narratore annuncia ad alta voce: <em>'Sorge il sole sul villaggio! Tutti gli abitanti aprano gli occhi!'</em> Il Narratore comunica chi è morto nella notte (ricorda: chi è stato protetto dalla Guardia o curato dalla Strega non muore!). Tocca il nome nel <strong>Registro Abitanti</strong> qui sopra per segnarlo come 🔴 Morto."
    });

    // 9. Dibattito & Timer del Villaggio (Giorno)
    steps.push({
      type: "discussion",
      phaseBadge: `Giorno ${this.nightCount} ☀️`,
      badgeClass: "badge-day",
      title: "⏱️ Dibattito & Timer del Villaggio",
      instruction: "Gli abitanti discutono animatamente per trovare i colpevoli. Avvia il timer di discussione oppure concludi in anticipo non appena il gruppo è pronto a votare."
    });

    // 10. Votazione del Rogo (Eliminazione di un solo giocatore)
    steps.push({
      type: "voting",
      phaseBadge: "Rogo ⚖️",
      badgeClass: "badge-night",
      title: "🔥 Votazione del Rogo",
      instruction: "Il villaggio vota chi mandare al rogo. Seleziona <strong>l'unico abitante</strong> accusato dalla maggioranza:"
    });

    return steps;
  }

  renderMasterPhaseGuide() {
    const phaseTitle = document.getElementById("lupus-phase-title");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");
    const stepCounter = document.getElementById("lupus-step-counter");
    const timerWidget = document.getElementById("lupus-step-timer-widget");
    const votingWidget = document.getElementById("lupus-step-voting-widget");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const prevBtn = document.getElementById("lupus-master-prev-step");
    const nextBtn = document.getElementById("lupus-master-next-step");

    const steps = this.getRoundSteps();
    if (this.masterStepIndex >= steps.length) {
      this.masterStepIndex = steps.length - 1;
    }
    if (this.masterStepIndex < 0) {
      this.masterStepIndex = 0;
    }

    const curStep = steps[this.masterStepIndex];
    if (!curStep) return;

    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";

    if (phaseTitle) phaseTitle.textContent = `Round ${this.nightCount} 🐺`;
    if (phaseBadge) {
      phaseBadge.textContent = curStep.phaseBadge;
      phaseBadge.className = `phase-badge ${curStep.badgeClass}`;
    }
    if (stepCounter) stepCounter.textContent = `Passaggio ${this.masterStepIndex + 1} di ${steps.length}`;
    if (stepTitle) {
      stepTitle.textContent = curStep.title;
      stepTitle.style.color = "";
    }
    if (stepDesc) stepDesc.innerHTML = curStep.instruction;

    if (prevBtn) prevBtn.disabled = this.masterStepIndex === 0;

    // Gestione Widget specifici per ciascun passaggio
    if (curStep.type === "discussion") {
      if (timerWidget) timerWidget.style.display = "block";
      if (votingWidget) votingWidget.style.display = "none";
      if (navControls) navControls.style.display = "flex";
      // Togli 'vai al voto': lascia solo '⚖️ Concludi e Vai al Voto' nel widget timer
      if (nextBtn) nextBtn.style.display = "none";
      // Avvia automaticamente il timer di discussione
      this.startDiscussionTimerAuto();
    } else if (curStep.type === "voting") {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "block";
      this.renderVotingGrid();

      if (navControls) navControls.style.display = "flex";
      // Nello step del voto il tasto Avanti è nascosto per costringere a confermare la votazione o andare indietro
      if (nextBtn) nextBtn.style.display = "none";

      if (this.isDiscussionRunning) {
        clearInterval(this.discussionTimer);
        this.discussionTimer = null;
        this.isDiscussionRunning = false;
      }
    } else {
      if (timerWidget) timerWidget.style.display = "none";
      if (votingWidget) votingWidget.style.display = "none";
      if (navControls) navControls.style.display = "flex";
      if (nextBtn) {
        nextBtn.style.display = "inline-flex";
        nextBtn.textContent = (this.masterStepIndex === steps.length - 2) ? "Vai al Dibattito ☀️" : "Avanti ➡️";
      }

      if (this.isDiscussionRunning) {
        clearInterval(this.discussionTimer);
        this.discussionTimer = null;
        this.isDiscussionRunning = false;
        const timerBtn = document.getElementById("lupus-timer-toggle-btn");
        if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
      }
    }

    // Aggiorna sempre il registro abitanti per riflettere lo stato informativo/interattivo della fase corrente
    this.renderMasterRoster();
  }

  masterNextStep() {
    Sound.playClick();
    const steps = this.getRoundSteps();
    if (this.masterStepIndex < steps.length - 1) {
      this.masterStepIndex++;
      this.renderMasterPhaseGuide();
    }
  }

  masterPrevStep() {
    Sound.playClick();
    if (this.masterStepIndex > 0) {
      this.masterStepIndex--;
      this.renderMasterPhaseGuide();
    }
  }

  // =========================================================================
  // GESTIONE TIMER DISCUSSIONE / ROGO (Come Impostore)
  // =========================================================================

  resetDiscussionTimer() {
    clearInterval(this.discussionTimer);
    this.discussionTimer = null;
    this.isDiscussionRunning = false;
    this.discussionSeconds = this.initialDiscussionSeconds;
    this.updateTimerDisplay();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "▶️ Avvia Timer";
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById("lupus-timer-display");
    if (timerDisplay) {
      const mins = Math.floor(this.discussionSeconds / 60);
      const secs = this.discussionSeconds % 60;
      timerDisplay.textContent = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
  }

  startDiscussionTimerAuto() {
    if (this.isDiscussionRunning) return;
    if (this.discussionSeconds <= 0) {
      this.discussionSeconds = this.initialDiscussionSeconds;
    }
    this.isDiscussionRunning = true;
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");
    if (timerBtn) timerBtn.textContent = "⏸️ Pausa Timer";
    this.updateTimerDisplay();

    clearInterval(this.discussionTimer);
    this.discussionTimer = setInterval(() => {
      if (this.discussionSeconds > 0) {
        this.discussionSeconds--;
        this.updateTimerDisplay();

        // Audio feedback
        if (this.discussionSeconds <= 10 && this.discussionSeconds > 0) {
          Sound.playTimerTick(true);
        } else if (this.discussionSeconds % 30 === 0 && this.discussionSeconds > 0) {
          Sound.playTimerTick(false);
        }
      } else {
        clearInterval(this.discussionTimer);
        this.discussionTimer = null;
        this.isDiscussionRunning = false;
        Sound.playTimerEnd();
        const tb = document.getElementById("lupus-timer-toggle-btn");
        if (tb) tb.textContent = "⏱️ Tempo Scaduto!";
        this.updateTimerDisplay();

        // Dopo 1 secondo avanza direttamente alla votazione del rogo
        setTimeout(() => {
          const steps = this.getRoundSteps();
          const votingIdx = steps.findIndex(s => s.type === "voting");
          if (votingIdx !== -1 && this.masterStepIndex !== votingIdx) {
            this.masterStepIndex = votingIdx;
            this.renderMasterPhaseGuide();
          }
        }, 1200);
      }
    }, 1000);
  }

  toggleDiscussionTimer() {
    Sound.playClick();
    const timerBtn = document.getElementById("lupus-timer-toggle-btn");

    if (this.isDiscussionRunning) {
      clearInterval(this.discussionTimer);
      this.discussionTimer = null;
      this.isDiscussionRunning = false;
      if (timerBtn) timerBtn.textContent = "▶️ Riprendi Timer";
    } else {
      this.startDiscussionTimerAuto();
    }
  }

  endDiscussionEarly() {
    Sound.playClick();
    clearInterval(this.discussionTimer);
    this.isDiscussionRunning = false;
    this.discussionSeconds = 0;
    this.updateTimerDisplay();
    Sound.playTimerEnd();

    // Avanza direttamente allo step di votazione
    const steps = this.getRoundSteps();
    const votingIdx = steps.findIndex(s => s.type === "voting");
    if (votingIdx !== -1) {
      this.masterStepIndex = votingIdx;
      this.renderMasterPhaseGuide();
    }
  }

  // =========================================================================
  // GESTIONE VOTAZIONE DEL ROGO (Selezione Singola & Prosecuzione Partita)
  // =========================================================================

  renderVotingGrid() {
    const grid = document.getElementById("lupus-voting-grid");
    const confirmBtn = document.getElementById("lupus-confirm-vote-btn");
    const resultBox = document.getElementById("lupus-vote-result-box");
    const prompt = document.getElementById("lupus-voting-prompt");
    if (!grid) return;

    if (this.voteConfirmed) {
      grid.style.display = "none";
      if (prompt) prompt.style.display = "none";
      if (confirmBtn) confirmBtn.style.display = "none";
      if (resultBox) resultBox.style.display = "block";
      return;
    }

    if (prompt) prompt.style.display = "block";
    grid.style.display = "grid";
    if (resultBox) resultBox.style.display = "none";

    if (confirmBtn) {
      confirmBtn.style.display = "block";
      confirmBtn.disabled = !this.selectedVotePlayerId;
      if (this.selectedVotePlayerId) {
        const selPlayer = this.assignments.find(p => p.id === this.selectedVotePlayerId);
        confirmBtn.innerHTML = `🔥 Condanna al Rogo: <strong>${selPlayer ? selPlayer.name : ''}</strong>`;
      } else {
        confirmBtn.innerHTML = "🔥 Seleziona un solo giocatore da condannare";
      }
    }

    grid.innerHTML = "";
    const alivePlayers = this.assignments.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
      const card = document.createElement("div");
      const isSelected = this.selectedVotePlayerId === player.id;
      card.className = `vote-card ${isSelected ? "selected" : ""}`;
      card.innerHTML = `
        <div class="vote-avatar">${player.role.icon}</div>
        <div class="vote-name">${player.name}</div>
      `;

      card.addEventListener("click", () => {
        try { Sound.playClick(); } catch (e) {}
        this.selectedVotePlayerId = player.id;
        this.renderVotingGrid();
      });

      grid.appendChild(card);
    });
  }

  confirmRogoVote() {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    if (!this.selectedVotePlayerId) {
      alert("Seleziona prima l'unico abitante da condannare al rogo toccando la sua scheda.");
      return;
    }

    const condemned = this.assignments.find(p => p.id === this.selectedVotePlayerId);
    if (!condemned) return;

    try {
      Sound.playGameOver();
    } catch (e) {
      console.warn("Audio error:", e);
    }

    condemned.isAlive = false;
    this.voteConfirmed = true;

    // Aggiorna registro abitanti
    this.renderMasterRoster();

    // 1. Vittoria immediata se il Giullare viene condannato al rogo dal Villaggio!
    if (condemned.roleKey === "giullare") {
      this.renderGameOverCard(condemned, "giullare");
      return;
    }

    // 2. Verifica se la partita è finita per altre condizioni di vittoria
    const winType = this.checkVictoryCondition();

    if (winType) {
      this.renderGameOverCard(condemned, winType);
      return;
    }

    // Se la partita non è finita, mostra esito e avanza fluidamente
    this.renderRoundProceedCard(condemned);
  }

  renderRoundProceedCard(condemned) {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const grid = document.getElementById("lupus-voting-grid");
    const confirmBtn = document.getElementById("lupus-confirm-vote-btn");
    const votingPrompt = document.getElementById("lupus-voting-prompt");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const resultBox = document.getElementById("lupus-vote-result-box");
    const resultText = document.getElementById("lupus-vote-result-text");
    const countdownSec = document.getElementById("lupus-countdown-sec");
    const nextNightBtn = document.getElementById("lupus-btn-next-night");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepCounter = document.getElementById("lupus-step-counter");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");

    // Nascondi griglia e prompt selezione
    if (grid) grid.style.display = "none";
    if (confirmBtn) confirmBtn.style.display = "none";
    if (votingPrompt) votingPrompt.style.display = "none";
    if (navControls) navControls.style.display = "none";

    const aliveCount = this.assignments.filter(p => p.isAlive).length;
    const aliveWolves = this.assignments.filter(p => p.isAlive && p.roleKey === "lupo").length;
    const sfx = condemned.name.endsWith("a") ? "a" : "o";

    if (phaseBadge) {
      phaseBadge.textContent = "Sentenza Eseguita 🔥";
      phaseBadge.className = "phase-badge badge-night";
    }
    if (stepCounter) {
      stepCounter.textContent = `Fine Round ${this.nightCount}`;
    }
    if (stepTitle) {
      stepTitle.textContent = `🔥 ${condemned.name} è stat${sfx} arso sul rogo!`;
    }
    if (stepDesc) {
      stepDesc.innerHTML = `
        La sentenza del villaggio è compiuta. L'identità di <strong>${condemned.name}</strong> è svelata: era un <strong>${condemned.role.name}</strong> (${condemned.role.factionLabel}).<br>
        Il villaggio non è ancora salvo! Restano <strong>${aliveCount}</strong> abitanti vivi (${aliveWolves} lup${aliveWolves === 1 ? 'o' : 'i'}).
      `;
    }

    if (resultText) {
      resultText.innerHTML = `
        🔥 <strong>${condemned.name}</strong> (${condemned.role.name}) è fuori dal gioco.<br>
        <span style="font-size: 0.88rem; color: #94a3b8; font-weight: 500;">
          Tutti gli abitanti chiudono gli occhi. È ora di iniziare il prossimo round notturno.
        </span>
      `;
    }

    const nextNightNum = this.nightCount + 1;
    if (nextNightBtn) {
      nextNightBtn.textContent = `🌙 Inizia la Notte ${nextNightNum} (Round ${nextNightNum}) ➡️`;
    }

    if (resultBox) {
      resultBox.style.display = "block";
    }

    // Timer di avanzamento automatico (4 secondi)
    let secondsLeft = 4;
    if (countdownSec) countdownSec.textContent = secondsLeft;

    this.autoNextNightTimer = setInterval(() => {
      secondsLeft--;
      if (countdownSec) countdownSec.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(this.autoNextNightTimer);
        this.autoNextNightTimer = null;
        this.startNextNight();
      }
    }, 1000);

    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  renderGameOverCard(condemned, winType) {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }

    const timerWidget = document.getElementById("lupus-step-timer-widget");
    const votingWidget = document.getElementById("lupus-step-voting-widget");
    const navControls = document.getElementById("lupus-step-nav-controls");
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    const gameoverContent = document.getElementById("lupus-gameover-content");
    const phaseTitle = document.getElementById("lupus-phase-title");
    const phaseBadge = document.getElementById("lupus-phase-badge");
    const stepTitle = document.getElementById("lupus-step-title");
    const stepDesc = document.getElementById("lupus-step-desc");
    const stepCounter = document.getElementById("lupus-step-counter");

    if (timerWidget) timerWidget.style.display = "none";
    if (votingWidget) votingWidget.style.display = "none";
    if (navControls) navControls.style.display = "none";

    // Nascondi eventuale banner globale di vittoria duplicato sopra il registro, per non avere titoli ripetuti
    const victoryBanner = document.getElementById("lupus-victory-banner");
    if (victoryBanner) victoryBanner.style.display = "none";

    // Nascondi intestazione duplicata dello step nella scheda per lasciare spazio esclusivo alla card finale
    if (stepTitle) stepTitle.style.display = "none";
    if (stepDesc) stepDesc.style.display = "none";
    if (stepCounter) stepCounter.style.display = "none";

    if (!winType) {
      const alive = this.assignments.filter(p => p.isAlive);
      const aliveWolves = alive.filter(p => ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"].includes(p.roleKey));
      winType = (aliveWolves.length === 0) ? "villaggio" : "lupi";
    }

    const isVillageWin = (winType === "villaggio");
    const isGiullareWin = (winType === "giullare");
    const isLupoBiancoWin = (winType === "lupo_bianco");
    const isWolvesWin = (winType === "lupi");

    if (phaseTitle) phaseTitle.textContent = `Round ${this.nightCount} - Epilogo 🏆`;
    if (phaseBadge) {
      phaseBadge.textContent = "🏆 Fine Partita";
      phaseBadge.className = "phase-badge " + (isVillageWin ? "badge-day" : (isGiullareWin || isLupoBiancoWin) ? "badge-solitario" : "badge-night");
    }

    if (gameoverWidget && gameoverContent) {
      gameoverWidget.style.display = "block";

      let playersHtml = "";
      this.assignments.forEach(p => {
        const isDead = !p.isAlive;
        const statusClass = isDead ? "dead" : "alive";
        const statusBadge = isDead ? "🔴 Morto" : "🟢 Sopravvissuto";
        const badgeClass = isDead ? "dead-badge" : "alive-badge";
        const factionColor = p.role.color || "#eab308";

        let extraBadge = "";
        if (isGiullareWin && p.roleKey === "giullare") {
          extraBadge = `<span style="font-size: 0.72rem; color: #f59e0b; font-weight: 800; margin-left: 6px;">🃏 VINCITORE SOLITARIO!</span>`;
        } else if (isLupoBiancoWin && p.roleKey === "lupo_bianco") {
          extraBadge = `<span style="font-size: 0.72rem; color: #38bdf8; font-weight: 800; margin-left: 6px;">🐺❄️ VINCITORE SOLITARIO!</span>`;
        } else if (isWolvesWin && p.roleKey === "infiltrato") {
          extraBadge = `<span style="font-size: 0.72rem; color: #ef4444; font-weight: 800; margin-left: 6px;">🕵️ Vince con i Lupi!</span>`;
        }

        playersHtml += `
          <div class="lupus-gameover-player ${statusClass}">
            <div class="gameover-player-info">
              <span style="font-size: 1.35rem; flex-shrink: 0; line-height: 1;">${p.role.icon}</span>
              <div class="gameover-player-texts">
                <div class="gameover-player-name">${p.name} ${extraBadge}</div>
                <div class="gameover-player-role" style="color: ${factionColor};">${p.role.name} (${p.role.factionLabel})</div>
              </div>
            </div>
            <span class="role-badge ${badgeClass}">${statusBadge}</span>
          </div>
        `;
      });

      let headline = "TRIONFO DEL VILLAGGIO";
      let headlineColor = "#10b981";
      let victoryEmoji = "🎉👨‍🌾✨";
      let boxThemeClass = "village-wins";
      let victoryDesc = "Tutti i Lupi Mannari sono stati eliminati. Il villaggio è finalmente al sicuro!";

      if (isGiullareWin) {
        headline = "TRIONFO DEL GIULLARE!";
        headlineColor = "#f59e0b";
        victoryEmoji = "🃏🎭👑";
        boxThemeClass = "solitario-wins giullare-wins";
        victoryDesc = "Il Giullare è riuscito a farsi bruciare al rogo dal villaggio! Ha seminato il caos e vince la partita da solo!";
      } else if (isLupoBiancoWin) {
        headline = "IL LUPO BIANCO HA VINTO DA SOLO!";
        headlineColor = "#38bdf8";
        victoryEmoji = "🐺❄️👑";
        boxThemeClass = "solitario-wins lupo-bianco-wins";
        victoryDesc = "Il Lupo Bianco ha ingannato il branco ed è l'ultimo e unico sopravvissuto di tutta la partita!";
      } else if (isWolvesWin) {
        headline = "IL BRANCO DEI LUPI DOMINA";
        headlineColor = "var(--accent-danger)";
        victoryEmoji = "🐺🩸🌑";
        boxThemeClass = "wolves-win";
        victoryDesc = "I Lupi Mannari e i loro alleati hanno conquistato il villaggio! Le tenebre trionfano.";
      }

      gameoverContent.innerHTML = `
        <div class="lupus-gameover-box ${boxThemeClass}">
          <div style="font-size: 2.8rem; margin-bottom: 8px; line-height: 1;">
            ${victoryEmoji}
          </div>
          <h3 style="font-size: 1.4rem; font-weight: 900; margin: 0 0 8px; line-height: 1.25; color: ${headlineColor};">
            ${headline}
          </h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 auto 12px; max-width: 440px; line-height: 1.4;">
            ${victoryDesc}
          </p>
          ${condemned ? `
            <div style="font-size: 0.92rem; color: #fbbf24; margin: 0 auto 14px; font-weight: 700; line-height: 1.35; padding: 6px 12px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: var(--radius-sm); display: inline-block;">
              🔥 Ultimo condannato al rogo: <strong>${condemned.name}</strong> (${condemned.role.name})
            </div>
          ` : ''}

          <div style="font-size: 0.82rem; color: var(--text-secondary); margin: 6px 0 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
            Identità Segrete di Tutti i Partecipanti:
          </div>

          <div class="lupus-gameover-roster">
            ${playersHtml}
          </div>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-primary" id="lupus-endgame-restart-btn" style="flex: 1.2; font-weight: 800;">
              🔄 Nuova Partita
            </button>
            <button type="button" class="btn btn-secondary btn-back-to-hub" style="flex: 1;">
              ⬅️ Hub Giochi
            </button>
          </div>
        </div>
      `;

      const restartBtn = document.getElementById("lupus-endgame-restart-btn");
      if (restartBtn) {
        restartBtn.addEventListener("click", () => {
          try { Sound.playClick(); } catch (e) {}
          this.startGame();
        });
      }
    }

    try {
      if (isVillageWin || isGiullareWin || isLupoBiancoWin) {
        Sound.playSuccess();
      } else {
        Sound.playGameOver();
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }

    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  startNextNight() {
    if (this.autoNextNightTimer) {
      clearInterval(this.autoNextNightTimer);
      this.autoNextNightTimer = null;
    }
    try {
      Sound.playClick();
    } catch (e) {}

    this.nightCount++;
    this.selectedVotePlayerId = null;
    this.voteConfirmed = false;
    this.masterStepIndex = 0;
    this.resetDiscussionTimer();

    // Reset visivo dei widget del rogo e del gameover
    const resultBox = document.getElementById("lupus-vote-result-box");
    if (resultBox) resultBox.style.display = "none";
    const gameoverWidget = document.getElementById("lupus-step-gameover-widget");
    if (gameoverWidget) gameoverWidget.style.display = "none";
    const votingPrompt = document.getElementById("lupus-voting-prompt");
    if (votingPrompt) votingPrompt.style.display = "block";

    this.renderMasterPhaseGuide();
    this.renderMasterRoster();

    // Scroll verso la scheda dei passaggi
    const cardEl = document.querySelector(".lupus-phase-card");
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // =========================================================================
  // VERIFICA CONDIZIONE DI VITTORIA
  // =========================================================================

  checkVictoryCondition() {
    const banner = document.getElementById("lupus-victory-banner");

    const alive = this.assignments.filter(p => p.isAlive);
    const wolfThreatRoles = ["lupo", "lupo_stregone", "cane_nero", "lupo_bianco"];
    const aliveWolves = alive.filter(p => wolfThreatRoles.includes(p.roleKey));
    // User instruction: "Infiltrato vale come non lupo e lupo bianco è ultimo in assoluto"
    const aliveNonWolves = alive.filter(p => !wolfThreatRoles.includes(p.roleKey));

    // 1. Lupo Bianco: ultimo in assoluto (unico superstite di tutta la partita)
    if (alive.length === 1 && alive[0].roleKey === "lupo_bianco") {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner solitario-wins";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🐺❄️👑</div>
          <h3 style="font-size: 1.4rem; color: #38bdf8; font-weight: 900;">IL LUPO BIANCO HA VINTO DA SOLO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            Il Lupo Bianco è l'ultimo e unico sopravvissuto della partita! Ha sterminato sia il branco che il villaggio.
          </p>
        `;
      }
      try { Sound.playSuccess(); } catch (e) {}
      return "lupo_bianco";
    }

    // 2. Tutti i lupi morti -> Vittoria Villaggio!
    if (aliveWolves.length === 0) {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner village-wins";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🎉👨‍🌾</div>
          <h3 style="font-size: 1.4rem; color: #10b981; font-weight: 900;">IL VILLAGGIO HA VINTO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            Tutti i Lupi Mannari sono stati individuati ed eliminati! Il villaggio è finalmente al sicuro.
          </p>
        `;
      }
      try { Sound.playSuccess(); } catch (e) {}
      return "villaggio";
    }

    // 3. I Lupi (Branco) vincono quando eguagliano o superano i non-lupi (Infiltrato conta tra i non-lupi ma vince con loro)
    const packWolves = alive.filter(p => ["lupo", "lupo_stregone", "cane_nero"].includes(p.roleKey));
    if (packWolves.length > 0 && aliveWolves.length >= aliveNonWolves.length) {
      if (banner) {
        banner.style.display = "block";
        banner.className = "lupus-victory-banner wolves-win";
        banner.innerHTML = `
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🐺🩸</div>
          <h3 style="font-size: 1.4rem; color: var(--accent-danger); font-weight: 900;">I LUPI HANNO VINTO!</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            I Lupi Mannari eguagliano o superano i cittadini rimasti. Il villaggio è caduto nelle fauci del branco!
          </p>
        `;
      }
      try { Sound.playGameOver(); } catch (e) {}
      return "lupi";
    }

    if (banner) banner.style.display = "none";
    return false;
  }
}

// Esporta globalmente
if (typeof window !== "undefined") {
  window.LupusGameController = LupusGameController;
}
